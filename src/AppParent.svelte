<script>
  import App from './App.svelte';

  import {
    compress,
    decompress
  } from './util';

  import {
    debounce
  } from 'min-dash';


  let params;

  async function parseParams() {

    const hash = window.location.hash;

    if (hash) {
      const [
        expression,
        contextString,
        _,
        dialect
      ] = hash.slice(1).split(';').map(decodeURIComponent);

      return {
        expression,
        contextString,
        dialect
      };
    }

    const url = new URL(window.location.href);

    const [
      expression,
      contextString
    ] = await Promise.all([
      decompress(url.searchParams.get('e')),
      decompress(url.searchParams.get('c'))
    ]);

    const dialect = url.searchParams.get('t');
    const showSyntaxTree = url.searchParams.get('st') !== 'false';

    return {
      expression,
      contextString,
      dialect: dialect === 'unaryTest' ? 'unaryTests' : dialect,
      showSyntaxTree
    };
  }

  const onParamsChanged = debounce(async (expression, contextString, dialect, showSyntaxTree) => {

    const url = new URL(window.location.href);

    const [
      e,
      c
    ] = await Promise.all([
      compress(expression),
      compress(contextString)
    ]);

    url.searchParams.set('e', e);
    url.searchParams.set('c', c);
    url.searchParams.set('t', dialect);
    url.searchParams.set('st', showSyntaxTree || false);
    url.hash = '';

    window.history.pushState({}, null, url.toString());
  }, 1000);

  parseParams().then(_params => {
    params = _params;
  });
</script>

<header>
  <nav class="hcontainer">
    <a href="./" class="app-logo">
      <svg viewBox="0 0 69.25 7.41" xmlns="http://www.w3.org/2000/svg">
        <g aria-label="FEEL">
          <path fill="currentColor" d="M3.32 3.45v-.83H1.03V1.17H3.6V.33H0v5.33h1.03v-2.2zM7.71 3.32v-.81H5.52V1.17h2.55V.33H4.5v5.33h3.6v-.83H5.51v-1.5ZM12.21 3.32v-.81h-2.19V1.17h2.55V.33H9v5.33h3.6v-.83h-2.57v-1.5ZM14.53 4.83V.33H13.5v5.33h3.53v-.83z"/>
        </g>
        <g fill="currentColor" aria-label="Playground">
          <path d="M21.57 5.65h.8v-2h.85c1.13 0 1.95-.52 1.95-1.65 0-1.17-.8-1.57-1.95-1.57h-1.65zm.8-2.64V1.07h.77c.83 0 1.24.24 1.24.93 0 .7-.4 1.01-1.24 1.01zM28.81 5.74c.44 0 .7-.08 1.08-.22l-.2-.59c-.26.11-.48.17-.7.17-.42 0-.73-.22-.73-.77V0h-2.12v.63h1.33v3.66c0 .94.47 1.45 1.34 1.45zM32.3 5.74c.53 0 1.07-.28 1.48-.6h.03l.06.5h.65V3.32c0-1.03-.55-1.65-1.63-1.65-.68 0-1.32.28-1.75.55l.3.53c.38-.22.84-.44 1.32-.44.69 0 .94.4.97.87-1.96.15-2.75.57-2.75 1.45 0 .69.56 1.12 1.31 1.12zm.22-.63c-.43 0-.78-.16-.78-.55 0-.47.46-.77 1.99-.89v.93c-.4.32-.8.51-1.21.51zM36.22 7.28c.9 0 1.39-.56 1.7-1.39l1.66-4.14h-.75l-.77 2.03-.4 1.14h-.03l-.45-1.14-.88-2.03h-.79l1.78 3.87-.1.27c-.18.43-.5.75-1 .75-.13 0-.25-.02-.34-.05l-.16.61c.14.05.34.08.53.08zM42.25 7.4c1.35 0 2.2-.61 2.2-1.37 0-.66-.5-.93-1.5-.93h-.83c-.5 0-.78-.13-.78-.4 0-.18.1-.3.27-.41.21.08.44.12.63.12.86 0 1.53-.47 1.53-1.33 0-.28-.13-.54-.28-.7h.94v-.63h-1.6a1.7 1.7 0 0 0-.59-.1c-.84 0-1.57.54-1.57 1.4 0 .47.22.81.49 1.01v.03c-.29.2-.46.48-.46.74 0 .32.19.52.4.64v.03c-.42.24-.63.53-.63.85 0 .68.67 1.06 1.78 1.06zm0-3.5a.8.8 0 0 1-.83-.84c0-.51.38-.85.82-.85.45 0 .82.34.82.85 0 .52-.37.84-.82.84zm.08 2.96c-.77 0-1.2-.23-1.2-.6 0-.2.12-.4.44-.59.16.05.35.07.6.07h.69c.55 0 .82.08.82.43s-.52.69-1.35.69zM45.81 5.65h.79V3.43c.43-.78.97-1.06 1.53-1.06.3 0 .45.04.7.12l.18-.67a1.69 1.69 0 0 0-.76-.16 2 2 0 0 0-1.7 1h-.02l-.06-.9h-.66zM51.88 5.74c1.02 0 1.95-.75 1.95-2.04 0-1.3-.93-2.04-1.95-2.04s-1.94.75-1.94 2.04c0 1.3.92 2.04 1.94 2.04zm0-.64c-.7 0-1.13-.56-1.13-1.4 0-.83.44-1.39 1.13-1.39.7 0 1.13.56 1.13 1.4 0 .83-.44 1.39-1.13 1.39zM56.18 5.74c.6 0 1.03-.3 1.41-.74h.04l.06.65h.64v-3.9h-.78v2.67c-.39.46-.69.65-1.1.65-.59 0-.8-.32-.8-1V1.74h-.8v2.42c0 1.02.42 1.57 1.33 1.57zM59.75 5.65h.8V2.96c.39-.41.68-.62 1.1-.62.59 0 .81.32.81 1v2.3h.79v-2.4c0-1.02-.41-1.58-1.32-1.58-.6 0-1.05.32-1.44.72h-.03l-.06-.63h-.65zM65.96 5.74c.46 0 .9-.26 1.22-.57h.02l.06.48h.65V0h-.79v1.45l.04.7h-.02a1.52 1.52 0 0 0-1.12-.5c-.9 0-1.74.79-1.74 2.05 0 1.3.67 2.04 1.68 2.04zm.18-.65c-.66 0-1.05-.5-1.05-1.4 0-.84.5-1.37 1.1-1.37.32 0 .62.1.93.4v1.84c-.3.35-.63.53-.98.53z"/>
        </g>
      </svg>
    </a>

    <div class="spacer"></div>

    <div class="menu">
      <a class="menu-item" href="https://github.com/nikku/feel-playground" target="_blank" rel="noopener" title="View on GitHub">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 499.36" role="img"><path fill="currentColor" fill-rule="evenodd" d="M256 0C114.64 0 0 114.61 0 256c0 113.09 73.34 209 175.08 242.9 12.8 2.35 17.47-5.56 17.47-12.34 0-6.08-.22-22.18-.35-43.54-71.2 15.49-86.2-34.34-86.2-34.34-11.64-29.57-28.42-37.45-28.42-37.45-23.27-15.84 1.73-15.55 1.73-15.55 25.69 1.81 39.21 26.38 39.21 26.38 22.84 39.12 59.92 27.82 74.5 21.27 2.33-16.54 8.94-27.82 16.25-34.22-56.84-6.43-116.6-28.43-116.6-126.49 0-27.95 10-50.8 26.35-68.69-2.63-6.48-11.42-32.5 2.51-67.75 0 0 21.49-6.88 70.4 26.24a242.65 242.65 0 0 1 128.18 0c48.87-33.13 70.33-26.24 70.33-26.24 14 35.25 5.18 61.27 2.55 67.75 16.41 17.9 26.31 40.75 26.31 68.69 0 98.35-59.85 120-116.88 126.32 9.19 7.9 17.38 23.53 17.38 47.41 0 34.22-.31 61.83-.31 70.23 0 6.85 4.61 14.81 17.6 12.31C438.72 464.97 512 369.08 512 256.02 512 114.62 397.37 0 256 0z"></path></svg>
      </a>
    </div>
  </nav>
</header>

<main class="hcontainer">
  {#if params}
    <App params={ params } onParamsChanged={ onParamsChanged } />
  {/if}
</main>

<style>

  :root {
    --gutter-x: 3rem;
  }

  main {
    --color-error-fg: #FEFEFE;
    --color-error-bg: #d11;
    --color-error-border: #d11;

    --color-warning-fg: #333;
    --color-warning-bg: #f7b576;
    --color-warning-border: #c7711e;
  }

  header {
    border-bottom: none;
    background: #333;

    margin: 0;
    padding: .75rem 0;
  }

  header .hcontainer {
    flex-grow: 0;
    flex-shrink: 0;
    overflow: initial;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding-right: calc(var(--gutter-x) * .5);
    padding-left: calc(var(--gutter-x) * .5);
    margin-right: auto;
    margin-left: auto;
  }

  header .app-logo {
    margin-right: calc(var(--gutter-x) * .5);
  }

  header .app-logo svg {
    height: 23px;
    color: #FAFAFA;
    margin: 0 .25rem;
    margin-bottom: -.5em;
  }

  header .spacer {
    flex: 1;
  }

  header .menu {
    display: flex;
    align-items: center;
  }

  header .menu-item {
    color: white;
    opacity: .9;
  }

  header .menu-item:hover {
    opacity: 1
  }

  main {
    display: flex;
    flex-direction: column;

    width: 100%;
    height: 100%;

    padding: calc(var(--gutter) * .5);
  }
</style>