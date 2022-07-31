<script>
  import JsonEditor from './editors/JsonEditor';
  import FeelEditor from './editors/FeelEditor';

  import {
    evaluate as evaluateFeel,
    parse as parseFeel
  } from './FeelEngine';

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
      expression: url.searchParams.get('e'),
      contextString: url.searchParams.get('c'),
      dialect: url.searchParams.get('t')
    };
  }

  const pushParams = debounce((expression, contextString, dialect) => {

    const url = new URL(window.location.href);

    url.searchParams.set('e', expression);
    url.searchParams.set('c', contextString);
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
          name === expression.slice(from, to)
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
      <a href="/" class="app-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22.962 22.962"><path d="M5 0h12.962c2.77 0 5 2.23 5 5v12.962c0 2.77-2.23 5-5 5H5c-2.77 0-5-2.23-5-5V5c0-2.77 2.23-5 5-5z" fill="#4682b4"/><path d="M5.664 15.22q-.579-.329-.888-.927-.308-.598-.347-1.138.058-.463.25-.714.175-.27.425-.424.251-.174.521-.25.27-.097.521-.155l.29.096q.096.097.192.174.116.077.213.154.193-.077.231-.231l.116-.309q.058-.212.135-.424.077-.213.193-.425-.02-.174.02-.309.038-.135.076-.231-.115-.097-.173-.097-.039-.019-.155-.057H7.17q-.058-.02-.135-.039-.29-.212-.386-.347-.077-.155-.174-.309-.096-.154-.173-.27-.078-.116-.174-.212l-.232-.155.116-.231q.039-.039.039-.097 0-.077-.077-.212-.058-.25-.02-.366l.039-.232q.193-.25.212-.29l.193-.192q.444-.116.907-.251.463-.154.906-.309.444-.154.907-.308.463-.155.926-.27.155-.135.328-.155.193-.038.347-.058.136 0 .251-.019.116-.02.174-.096.328-.116.637-.193.578-.155 1.524-.367.945-.212 2.122-.309l.405-.019q.116.02.232.02.115-.02.231-.02 1.003 0 1.331.618.193.096.347.25.155.135.29.27l.174.174q.077.058.135.096l.154.155q.212.463.077.907-.116.231-.25.27l-.27.077-.252.135q-.25-.02-.385-.02h-.27q-.58 0-1.351.078-.752.058-1.543.193-.791.115-1.544.308-.752.174-1.312.386-.154.116-.405.212-.058.02-.174.097.02.154 0 .309-.019.135-.057.27-.02.096-.039.212 0 .096-.02.212-.404.482-.385 1.138l-.097.193q-.077.077-.135.232-.038.135 0 .29l.078.23.752-.076q.386-.058.81-.116.54-.097 1.08-.155.56-.077 1.158-.077h.753l-.174.174.212.02-.116.308q.135.058.193.096.077.02.135.058l.135.193q.097.058.174.193.077.116.097.328l-.058.193-.907 1.158-.116.154-.193-.058q-.366-.02-.694.077-.155.039-.328.097-.174.038-.348.038-.463.077-.771.135l-.618.077q-.424.078-.83.155-.385.058-.732.193-.213.019-.251.019-.039-.02-.077-.02-.193 0-.386.059-.193.057-.367.115-.115.097-.154.213-.039.096-.077.212-.039.135-.116.27-.058.116-.154.25l.019.348q-.174.038-.174.058H8.25q0 .154-.058.29-.038.134-.077.25-.039.077-.058.135-.02.058-.02.116.194.347.097.79-.077.367-.29.657-.211.27-.5.424-.31.039-.464-.02-.135-.057-.29-.115-.096-.038-.192-.058-.097-.038-.193-.058l-.231-.193q-.058-.115-.136-.212l-.154-.231-.193-.27q-.096-.135-.173-.31-.135-.674-.058-1.118.096-.463.25-.907.04-.154.078-.29.038-.134.077-.289z" aria-label="F" fill="#fff" stroke-width=".265"/></svg>
      </a>

      <span class="app-name"><span aria-hidden="false" style="display: none;">F</span>EEL Playground</span>
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
              Input <b><code>?</code></b> is treated as value to test.
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
    box-shadow: 0 0 3px 0 #999;
    background: hsl(207, 56%, 99%);

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
    height: 26px;
    vertical-align: bottom;
  }

  .app-name {
    font-weight: bold;
    font-size: 1.2em;
    color: steelblue;
    margin-left: -.1rem;
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