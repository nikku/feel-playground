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

  let feelType = params.feelType || 'expression';

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
      onChange: (doc) => expression = doc,
      onMousemove: (position) => {
        if (treeRoot) {
          const newSelection = findTreeNode(position, treeRoot);

          if (newSelection !== treeSelection) {
            treeSelection = newSelection;
          }
        }
      },
      onMouseout: () => {
        treeSelection = null;
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
        feelType
      ] = hash.slice(1).split(';').map(decodeURIComponent);

      return {
        expression,
        contextString,
        feelType
      };
    }

    const url = new URL(window.location.href);

    return {
      expression: url.searchParams.get('e'),
      contextString: url.searchParams.get('c'),
      feelType: url.searchParams.get('t')
    };
  }

  const pushParams = debounce((expression, contextString, feelType) => {

    const url = new URL(window.location.href);

    url.searchParams.set('e', expression);
    url.searchParams.set('c', contextString);
    url.searchParams.set('t', feelType);
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

  const updateStack = debounce(function updateStack(feelType, expression = '', rawContext) {

    console.time('updateStack');

    const stack = [
      {
        children: []
      }
    ];

    const {
      tree,
      parsedInput
    } = parseFeel(feelType, expression, rawContext);

    tree.iterate({
      enter(node) {

        const {
          name,
          from,
          to
        } = node;

        const skip = name === parsedInput.slice(from, to);

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
          ..._node,
          tokenType: getTokenType(_node)
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
  }, 300);

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
  }, 300);

  function getTokenType(node) {

    const {
      name,
      error
    } = node;

    if (error) {
      return 'error';
    }

    if (name === 'BuiltInFunctionName') {
      return 'builtin';
    }

    if (
      name === 'BuiltInType' ||
      name === 'ListType' ||
      name === 'ContextType' ||
      name === 'FunctionType'
    ) {
      return 'builtin';
    }

    if (name === 'BlockComment' || name === 'LineComment') {
      return 'comment';
    }

    if (name === 'Parameters') {
      return 'parameters';
    }

    if (name === 'List') {
      return 'list';
    }

    if (name === 'Context') {
      return 'context';
    }

    if (name === 'Interval') {
      return 'interval';
    }

    if (name === 'StringLiteral') {
      return 'string';
    }

    if (name === 'NumericLiteral') {
      return 'number';
    }

    if (name === 'BooleanLiteral') {
      return 'boolean';
    }

    if (name === 'QualifiedName') {
      return 'qname';
    }

    if (name === 'Name') {
      return 'name';
    }

  }

  const evaluateExpression = debounce((feelType, expression, context) => {

    try {
      output = evaluateFeel(feelType, expression, context);
      outputError = null;
    } catch (err) {
      console.error(err);

      output = undefined;
      outputError = err;
    }
  }, 300);

  function setDialect(codeEditor, feelType) {
    codeEditor && codeEditor.setDialect(feelType);
  }

  $: setDialect(codeEditor, feelType);

  $: parseContext(contextString);

  $: updateStack(feelType, expression, context);

  $: evaluateExpression(feelType, expression, context);

  $: renderSelection(codeEditor, treeSelection);

  $: pushParams(expression, contextString, feelType);
</script>

<main class="vcontainer">
  <header class="hcontainer">

    <a href="/" class="logo">
      <img alt="F" src="logo.svg" />
    </a>

    <span style="
        font-weight: bold;
        font-size: 1.2em;
        color: steelblue;
        margin-left: 2px;
    "><span aria-hidden="false" style="
        display: none;
    ">F</span>eel Playground</span>

    <div class="menu">
      <a href="https://github.com/nikku/feel-playground/issues">Report an Issue</a> ·
      <a href="https://github.com/nikku/feel-playground">View on GitHub</a>
    </div>

  </header>

  <div class="views hcontainer">

    <div class="vcontainer" style="flex: 1">

      <div class="container code-editor">
        <h3 class="legend">
          Code

          <select class="typeselect" name="feelType" bind:value={ feelType }>
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

          {#if feelType === 'unaryTest'}
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
            Re-computes automatically once you change code or input.
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

  .logo {
    margin: 0;
    display: block;
    height: 26px;
  }

  .logo img {
    height: 100%;
  }

  .menu {
    line-height: 32px;
    flex-grow: 1;
    text-align: right;
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
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
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