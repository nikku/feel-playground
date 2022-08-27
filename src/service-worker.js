// eslint-disable-next-line
/// <reference lib="WebWorker" />

const CACHE = 'feel-playground-cache-v1';

function precache() {
  return caches.open(CACHE).then(function(cache) {
    return cache.addAll([
      './',
      './bundle.css',
      './bundle.js',
      './favicon.png',
      './logo.svg',
      './manifest.json'
    ]).catch(err => console.error('caching failed', err));
  });
}

/**
 * @param { Request } request
 *
 * @return { Request }
 */
function normalizeRequest(request) {
  const url = new URL(request.url);

  url.search = '';

  return new Request(url);
}

function cacheResponse(event, request, response) {

  const normalizedRequest = normalizeRequest(request);

  return caches.open(CACHE).then(cache => {

    if (!event.clientId) {
      cache.put(normalizedRequest, response);

      return;
    }

    /* global clients */
    return clients.get(event.clientId).then(client => {

      return cache.match(normalizedRequest).then(matchingResponse => {

        if (matchingResponse) {

          const oldEtag = matchingResponse.headers.get('ETag');
          const newEtag = response.headers.get('ETag');

          if (oldEtag !== newEtag) {
            client.postMessage({
              message: 'resource.changed',
              url: request.url
            });
          }
        }

        cache.put(normalizedRequest, response);
      });
    });
  });
}

function fromNetwork(event, request) {

  return fetch(request).then(response => {

    if (response && response.status === 200) {
      const cachedResponse = response.clone();

      event.waitUntil(
        cacheResponse(event, request, cachedResponse)
      );
    }

    return response;
  });
}

/**
 * @param { FetchEvent } event
 * @param { Request } request
 *
 * @return { Promise<Request> }
 */
function fromCache(event, request) {
  return caches.open(CACHE).then(cache => {
    return cache.match(normalizeRequest(request)).then(matching => {
      return matching || Promise.reject('not-in-cache');
    });
  });
}

self.addEventListener('install', event => {
  event.waitUntil(
    precache(event)
  );

  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// actual fetching logic ////////////

self.addEventListener('fetch', function(event) {

  const { request } = event;

  const remoteFetch = fromNetwork(event, request);

  event.respondWith(
    fromCache(event, request)
      .catch(() => remoteFetch)
      .catch(() => null)
  );

  event.waitUntil(remoteFetch);

});