<script>
  import JsonEditor from './editors/JsonEditor';
  import FeelEditor from './editors/FeelEditor';

  import {
    evaluate as evaluateFeel,
    parse as parseFeel
  } from './FeelEngine';

  import {
    compress,
    decompress
  } from './util';

  import {
    lintError
  } from './editors/Linting';

  import TreeNode from './TreeNode.svelte';
  import ErrorIndicator from './ErrorIndicator.svelte';

  import {
    debounce
  } from 'min-dash';

  import { onMount } from 'svelte';

  const params = parseParams();

  let codeEditorElement;
  let contextEditorElement;
  let outputElement;

  let codeEditor;
  let contextEditor;
  let outputViewer;

  let treeRoot = { name: 'Expressions', from: 0, to: 0, children: [] };

  let treeSelection;

  let dialect = params.dialect || 'expression';

  let expression = params.expression || `for
  fruit in [ "apple", "bananas" ], vegetable in vegetables
return
  { ingredients: [ fruit, vegetable ] }`;
  let expressionErrors = [];

  let output = undefined;
  let outputError = null;

  let context;

  let contextString = params.contextString || `{
  "vegetables": [ "garlic", "tomato" ],
  "Mike's age": 35
}`;

  let contextError;

  onMount(() => {
    codeEditor = new FeelEditor({
      doc: expression,
      context,
      dialect,
      onChange: (doc) => expression = doc,
      onMousemove: (position) => {
        if (treeRoot) {
          const newSelection = findTreeNode(position, treeRoot);

          if (newSelection !== treeSelection) {
            treeSelection = newSelection;
          }
        }
      },
      parent: codeEditorElement
    });

    contextEditor = new JsonEditor({
      doc: contextString,
      onChange: (doc) => contextString = doc,
      parent: contextEditorElement
    });

    outputViewer = new JsonEditor({
      doc: typeof output === 'undefined' ? '' : output,
      parent: outputElement,
      readOnly: true
    });
  });

  $: outputViewer && outputViewer.setDoc(
    typeof output !== 'undefined' && JSON.stringify(output, null, 2) || ''
  );

  function parseParams() {

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

    return {
      expression: decompress(url.searchParams.get('e')),
      contextString: decompress(url.searchParams.get('c')),
      dialect: url.searchParams.get('t')
    };
  }

  const pushParams = debounce((expression, contextString, dialect) => {

    const url = new URL(window.location.href);

    url.searchParams.set('e', compress(expression));
    url.searchParams.set('c', compress(contextString));
    url.searchParams.set('t', dialect);
    url.hash = '';

    window.history.pushState({}, null, url.toString());
  }, 300);

  function selectExpression(node) {
    treeSelection = node;
  }

  function renderSelection(codeEditor, node) {
    console.time('renderSelection');

    codeEditor && codeEditor.highlight(node);

    console.timeEnd('renderSelection');
  }

  function findTreeNode(index, treeRoot) {

    if (index >= treeRoot.to || index <= treeRoot.from) {
      return null;
    }

    let node = treeRoot;

    outer: for (;;) {

      // find child that matches node
      for (const child of node.children) {

        if (child.from <= index && child.to > index) {
          if (!child.children.length) {
            return child;
          }

          node = child;

          continue outer;
        }
      }

      // no child found, must be myself
      return node;
    }

  }

  const updateStack = debounce(function updateStack(dialect, expression = '', context) {

    console.time('updateStack');

    const stack = [
      {
        children: []
      }
    ];

    const tree = parseFeel(dialect, expression, context);

    tree.iterate({
      enter(node) {

        const {
          name,
          from,
          to
        } = node;

        const skip = (
          (name === expression.slice(from, to) && name !== 'null')
            || name === 'Identifier'
        );

        const error = node.type.isError && lintError(node);

        const _node = {
          name,
          from,
          to,
          children: [],
          error,
          skip
        };

        stack.push({
          ..._node
        });

      },

      leave(node) {

        const current = stack.pop();

        if (current.skip) {
          return;
        }

        const parent = stack[stack.length - 1];

        parent.children.push(current);
      }
    });

    treeRoot = stack[0].children[0];

    console.timeEnd('updateStack');
  }, 0);

  const parseContext = debounce(function parseContext(contextString) {
    try {
      context = JSON.parse(contextString || {});

      if (typeof context !== 'object') {
        context = {};

        throw new Error('Object literal expected');
      }
      contextError = null;
    } catch (err) {
      contextError = err;
    }
  }, 0);

  const evaluateExpression = debounce((dialect, expression, context) => {

    try {
      output = evaluateFeel(dialect, expression, context);
      outputError = null;
    } catch (err) {
      console.error(err);

      output = undefined;
      outputError = err;
    }
  }, 0);

  function setDialect(codeEditor, dialect) {
    codeEditor && codeEditor.setDialect(dialect);
  }

  function setContext(codeEditor, context) {
    codeEditor && codeEditor.setContext(context);
  }

  $: setDialect(codeEditor, dialect);

  $: setContext(codeEditor, context);

  $: parseContext(contextString);

  $: updateStack(dialect, expression, context);

  $: evaluateExpression(dialect, expression, context);

  $: renderSelection(codeEditor, treeSelection);

  $: pushParams(expression, contextString, dialect);
</script>

<main class="vcontainer">
  <header class="hcontainer">

    <div class="app-title">
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
    </div>

    <div class="spacer"></div>

    <div class="menu">
      <a class="btn btn-feel item" href="https://github.com/nikku/feel-playground/issues" >Report issue</a>

      <a class="btn item" href="https://github.com/nikku/feel-playground">
        View on GitHub
      </a>
    </div>

  </header>

  <div class="views hcontainer">

    <div class="vcontainer" style="flex: 1">

      <div class="container code-editor">
        <h3 class="legend">
          Code

          <select class="typeselect" name="dialect" bind:value={ dialect }>
            <option value="expression">Expression</option>
            <option value="unaryTest">Unary Test</option>
          </select>

          {#if expressionErrors.length }
            <div class="error">
              <ErrorIndicator error={ expressionErrors[0] } />
            </div>
          {/if}
        </h3>

        <div class="content" bind:this={ codeEditorElement }>
        </div>

      </div>

      <div class="hcontainer">
        <div class="container context-editor">

          <h3 class="legend">
            Input

            {#if contextError }
              <div class="error">
                <ErrorIndicator error={ contextError } />
              </div>
            {/if}

          </h3>

          <div
            class="content"
            bind:this={ contextEditorElement }
            class:with-error={ contextError }
          ></div>

          {#if contextError}
            <div class="note error-note">
              { contextError.message }.
            </div>
          {/if}

          <div class="note">
            Define your input variables as a JSON object literal.
          </div>

          {#if dialect === 'unaryTest'}
            <div class="note">
              Input <code class="qmark">?</code> is treated as value to test.
            </div>
          {/if}
        </div>

        <div class="container output">

          <h3 class="legend">
            Output

            {#if outputError }
              <div class="error">
                <ErrorIndicator error={ outputError } />
              </div>
            {/if}
          </h3>

          <div class="content"
               bind:this={ outputElement }
               class:with-error={ outputError }
          ></div>


          {#if outputError}
            <div class="note error-note">
              Evaluation error: { outputError.message }
            </div>
          {/if}

          <div class="note">
            Re-computes once you change code or input.
          </div>
        </div>
      </div>
    </div>

    <div class="container tree" style="flex: 0.5; min-width: 300px;">

      <h3 class="legend">
        Tree

        {#if expressionErrors.length }
          <div class="error">
            <ErrorIndicator error={ expressionErrors[0] } />
          </div>
        {/if}
      </h3>

      <div class="content" class:with-error={ expressionErrors.length }>
        <TreeNode node={ treeRoot } selection={ treeSelection } onSelect={ selectExpression } />
      </div>
    </div>

  </div>

</main>

<style>

  main {
    --color-error-fg: white;
    --color-error-bg: #d11;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body, html) {
    height: 100%;
    width: 100%;

    margin: 0;
  }

  header {
    border-bottom: solid 1px #999;
    background: #FCFCFC;

    margin: 0;
    margin-bottom: 10px;
    padding: 7px 10px;
  }

  header.hcontainer {
    flex-grow: 0;
    flex-shrink: 0;
    overflow: initial;
    align-items: center;
  }

  .app-logo svg {
    height: 23px;
    color: steelblue;
    margin: 0 5px;
    margin-bottom: -.5em;
  }

  header .spacer {
    flex: 1;
  }

  header .menu {
    display: flex;
    align-items: center;
  }

  header .menu .item + .item {
    margin-left: 1em;
  }

  main {
    font-family: sans-serif;

    display: flex;
    flex-direction: column;

    width: 100%;
    height: 100%;
  }

  .note {
    font-size: .9em;
    line-height: 1.3;
    margin-top: .5em;
    color: #666;
  }

  .note code {
    font-weight: bold;
  }

  .content.with-error {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .error-note {
    background: var(--color-error-bg);
    color: var(--color-error-fg);
    padding: .5em .75em;
    margin-top: 0;
    border-radius: 0 0 3px 3px;
    font-family: monospace;
  }

  .typeselect {
    display: inline-block;
    padding: .275rem 2rem .275rem .75rem;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.3;
    color: #495057;
    vertical-align: middle;
    background: #fff url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e") no-repeat right .75rem center/8px 10px;
    border: 1px solid #ced4da;
    border-radius: .25rem;
    appearance: none;
  }

  .btn {
    display: inline-block;
    padding: .275rem .75rem;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.3;
    color: #495057;
    border: 1px solid #999;
    border-radius: .25rem;
  }

  a.btn {
    text-decoration: none;
  }

  .btn-feel {
    color: steelblue;
    border-color: steelblue;
  }

  .btn:hover {
    background: #F0F0F0;
    border-color: #999;
    color: #333;
  }

  .hcontainer,
  .vcontainer {
    display: flex;
    align-self: stretch;
    flex: 1;

    overflow: hidden;
  }

  .vcontainer {
    flex-direction: column;
  }

  .hcontainer {
    flex-direction: row;
  }

  .container {
    margin: 10px;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .container .content {
    flex: 1;
    align-self: stretch;
  }

  .legend .error {
    flex: 1;
    text-align: right;
  }

  .legend {
    font-size: 1.2em;
    color: #444;
    border-radius: 3px;
    margin: 0 0 5px;
    display: flex;
    align-items: center;
    padding: 0;
    line-height: 2em;
  }

  select {
    color: inherit;
    margin-left: 10px;
    font-size: .90em;
  }

  .content {
    font-size: 1.3em;
    font-family: monospace;

    border: solid 1px #CCC;
    border-radius: 3px;
  }

  .code-editor .content,
  .context-editor .content,
  .output .content {
    overflow: hidden;
  }

  .tree .content {
    overflow: auto;
    padding: 4px;
    width: 100%;
  }

  .qmark {
    background: steelblue;
    padding: .1em .4em;
    display: inline-block;
    border-radius: 0.3em;
    color: white;
    vertical-align: middle;
    font-weight: bold;
  }

  :global(.cm-editor) {
    height: 100%;
  }

  :global(.cm-highlight) {
    background: bisque;
  }

  :global(.cm-lintPoint):after {
    left: -3px !important;
    border-left: 5px solid transparent !important;
    border-right: 5px solid transparent !important;
    border-bottom: 5px solid #d11 !important;
    bottom: -3px !important;
  }
</style>