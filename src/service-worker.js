const CACHE = 'feel-playground-cache-v1';

function precache() {
  return caches.open(CACHE).then(function(cache) {
    return cache.addAll([
      '/',
      '/vendor/codemirror/lib/codemirror.css',
      '/vendor/codemirror/lib/codemirror.js',
      '/vendor/codemirror/mode/javascript/javascript.js',
      '/vendor/feelin/dist/feelin.umd.js',
      '/bundle.css',
      '/bundle.js',
      '/favicon.png',
      '/logo.svg',
      '/manifest.json'
    ]).catch(err => console.error('caching failed', err));
  });
}

function cacheResponse(event, request, response) {

  return caches.open(CACHE).then(cache => {

    if (!event.clientId) {
      cache.put(request, response);

      return;
    }

    /* global clients */
    return clients.get(event.clientId).then(client => {

      return cache.match(request).then(matchingResponse => {

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

        cache.put(request, response);
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

function fromCache(event, request) {
  return caches.open(CACHE).then(cache => {
    return cache.match(request).then(matching => {
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

  const { url } = request;

  const remoteFetch = fromNetwork(event, request);

  event.respondWith(
    fromCache(event, request)
      .catch(() => remoteFetch)
  );

  event.waitUntil(remoteFetch);

});