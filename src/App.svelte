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

  export let params;
  export let onParamsChanged;

  let codeEditorElement;
  let contextEditorElement;
  let outputElement;

  let codeEditor;
  let _contextEditor;
  let outputViewer;

  let treeRoot = { name: 'Expression', from: 0, to: 0, children: [] };

  let editorSelection;

  let treeSelection;
  let codeSelection;

  let dialect = params.dialect || 'expression';

  let expression = params.expression || `for
  fruit in [ "apple", "bananas" ], vegetable in vegetables
return
  { ingredients: [ fruit, vegetable ] }`;
  let expressionErrors = [];

  let showSyntaxTree = params.showSyntaxTree || false;

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
      onSelectionChange: (selection) => editorSelection = selection,
      parent: codeEditorElement
    });

    _contextEditor = new JsonEditor({
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

  function selectExpression(node) {
    treeSelection = node;
    codeSelection = null;
  }

  function renderSelection(codeEditor, node) {
    console.time('renderSelection');

    codeEditor && codeEditor.highlight(node);

    console.timeEnd('renderSelection');
  }

  function findTreeNode(position, treeRoot) {

    if (position.from > treeRoot.to || position.to < treeRoot.from) {
      return null;
    }

    let node = treeRoot;

    outer: for (;;) {

      // find child that matches node
      for (const child of node.children) {

        if (child.from <= position.from && child.to >= position.to) {
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

  function computeCodeSelection(treeRoot, selection) {

    if (!treeRoot || !selection || selection.ranges.length !== 1) {
      codeSelection = null;
    } else {
      const newSelection = findTreeNode(selection.ranges[0], treeRoot);

      if (newSelection !== codeSelection) {
        codeSelection = newSelection;
      }
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

  $: computeCodeSelection(treeRoot, editorSelection);

  $: renderSelection(codeEditor, treeSelection);

  $: onParamsChanged(expression, contextString, dialect, showSyntaxTree);
</script>


<div class="views hcontainer">

  <div class="vcontainer" style="flex: 1">

    <div class="container code-editor">
      <h3 class="legend">
        Code

        <select class="type-select" name="dialect" bind:value={ dialect }>
          <option value="expression">Expression</option>
          <option value="unaryTests">Unary Test</option>
        </select>

        {#if expressionErrors.length }
          <div class="error">
            <ErrorIndicator error={ expressionErrors[0] } />
          </div>
        {/if}

        {#if !showSyntaxTree}
          <button title="Show syntax tree" class="btn btn-small btn-none collapse-btn" on:click={ () => showSyntaxTree = !showSyntaxTree }>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-text-fill" viewBox="0 0 16 16">
  <path d="M12 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M5 4h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1m-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5M5 8h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1m0 2h3a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1"/>
</svg>
          </button>
        {/if}
      </h3>

      <div class="content" bind:this={ codeEditorElement }>
      </div>

    </div>

    <div class="hcontainer">
      <div class="container context-editor">

        <h3 class="legend">
          JSON Input

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

        {#if dialect === 'unaryTests'}
          <div class="note">
            Input <code class="qmark">?</code> is treated as value to test.
          </div>
        {/if}
      </div>

      <div class="container output">

        <h3 class="legend">
          JSON Output

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

  {#if showSyntaxTree}
    <div class="container tree">

      <h3 class="legend">
        <span class="label">Syntax Tree</span>

        {#if expressionErrors.length }
          <div class="error">
            <ErrorIndicator error={ expressionErrors[0] } />
          </div>
        {/if}

        <button title="Hide syntax tree" class="btn btn-small btn-none collapse-btn" on:click={ () => showSyntaxTree = !showSyntaxTree }>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-text" viewBox="0 0 16 16">
  <path d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5M5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1z"/>
  <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1"/>
</svg>
        </button>
      </h3>

      <div class="content" class:with-error={ expressionErrors[0] }>
        <TreeNode
          node={ treeRoot }
          selection={ treeSelection || codeSelection }
          onSelect={ selectExpression } />
      </div>
    </div>
  {/if}
</div>

<style>

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

  .type-select {
    display: inline-block;
    padding: .225rem 1.75rem .225rem .5rem;
    margin-left: .5rem;
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

  .legend .error {
    flex: 1;
    text-align: right;
  }

  .legend {
    font-size: 1.1em;
    color: #444;
    border-radius: 3px;
    margin: .25em 0;
    display: flex;
    align-items: center;
    padding: 0;
    line-height: 2em;
  }

  .legend .btn {
    padding: .5rem;
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


  .tree {
    flex: 0.5;
    min-width: 300px;
  }

  .collapse-btn {
    margin-left: auto;
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