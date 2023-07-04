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
  let contextEditor;
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

  function selectExpression(node) {
    treeSelection = node;
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

  $: onParamsChanged(expression, contextString, dialect);
</script>


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
      <TreeNode node={ treeRoot } selection={ treeSelection || codeSelection } onSelect={ selectExpression } />
    </div>
  </div>

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