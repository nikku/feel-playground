<script>

  Feelin = window.Feelin;
  CodeMirror = window.CodeMirror;

  import TreeNode from './TreeNode.svelte';

  import {
    debounce
  } from 'min-dash';

  import { NodeProp } from 'lezer';

  import { onMount } from 'svelte';

  const params = parseParams();

  let editorElement;
  let treeElement;

  let editor;

  let treeRoot = { name: 'Expression', start: 0, end: 0, children: [] };
  let treeTokens = [];

  let treeSelection;

  let syntaxMarks = [];
  let selectionMark;

  let syntaxHighlight = params.syntaxHighlight !== 'false';

  let expression = params.expression || 'for fruit in [ "apple", "bananas" ], vegetable in vegetables return makeSalat(fruit, vegetable)';

  let context;

  let contextString = params.contextString || '{}';
  let contextParseError;

  onMount(() => {
    editor = CodeMirror.fromTextArea(editorElement, {
      lineNumbers: true
    });

    const updateExpression = () => {
      expression = editor.getDoc().getValue();
    };

    editor.on('change', updateExpression);
  });

  function parseParams() {

    const hash = window.location.hash;

    const [ expression, contextString, syntaxHighlight ] = hash.slice(1).split(';').map(decodeURIComponent);

    return {
      expression,
      contextString,
      syntaxHighlight
    };
  }

  function serializeHash(expression, contextString, syntaxHighlight) {
    window.location.hash = '#' + [ expression, contextString, syntaxHighlight ].map(encodeURIComponent).join(';');
  }

  function mark(editor, node, className) {

    const doc = editor.getDoc();

    const startCoords = doc.posFromIndex(node.start);
    const endCoords = doc.posFromIndex(node.end);

    return editor.markText(
      startCoords,
      endCoords,
      { className: `mark-${className}` }
    );
  }

  function selectExpression(node) {
    treeSelection = node;
  }

  function clearMark(mark) {
    mark.clear();
  }

  function renderSyntax(editor, treeTokens) {

    console.time('renderSyntax');

    syntaxMarks.forEach(clearMark);

    if (editor) {

      syntaxMarks = treeTokens.reduce((marks, node) => {

        marks.push(mark(editor, node, node.tokenType));

        return marks;
      }, []);
    }

    console.timeEnd('renderSyntax');
  }

  function renderSelection(editor, node) {
    console.time('renderSelection');

    if (selectionMark) {
      clearMark(selectionMark);
    }

    if (node && editor) {
      selectionMark = mark(editor, node, 'selection');
    }

    console.timeEnd('renderSelection');
  }

  const handleEditorOver = debounce(function(event) {

    const position = editor.coordsChar({
      left: event.clientX,
      top: event.clientY
    }, 'window');

    const index = editor.getDoc().indexFromPos(position);

    const selectedNode = findTreeNode(index, treeRoot);

    if (selectedNode !== treeSelection) {
      treeSelection = selectedNode;
    }
  }, 50);

  function findTreeNode(index, treeRoot) {

    if (index >= treeRoot.end || index <= treeRoot.start) {
      return null;
    }

    let node = treeRoot;

    outer: for (;;) {

      // find child that matches node
      for (const child of node.children) {

        if (child.start <= index && child.end > index) {
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

  function updateStack(expression, rawContext) {

    console.time('updateStack');

    const stack = [
      {
        children: []
      }
    ];

    const tokens = [];

    const {
      tree,
      context,
      input
    } = Feelin.parseExpressions(expression, rawContext);

    let txt = '';

    let indent = 0;

    tree.iterate({
      enter(node, start, end) {

        const {
          name
        } = node;

        const parent = stack[stack.length - 1];

        const skip = name === input.slice(start, end);

        const error = node.prop(NodeProp.error);

        const _node = {
          name,
          start,
          end,
          children: [],
          error,
          skip
        };

        stack.push({
          ..._node,
          tokenType: getTokenType(_node)
        });

      },

      leave(node, start, end) {

        const current = stack.pop();

        if (current.skip) {
          return;
        }

        const parent = stack[stack.length - 1];

        parent.children.push(current);

        if (current.tokenType) {
          tokens.push(current);
        }
      }
    });

    treeRoot = stack[0].children[0];
    treeTokens = tokens;

    console.timeEnd('updateStack');
  }

  function getTokenType(node) {

    const {
      name,
      error
    } = node;

    if (error) {
      return 'error';
    }

    if (name === 'Parameters') {
      return 'parameters';
    }

    if (name === 'List') {
      return 'list';
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

  $: try {
    context = JSON.parse(contextString || {});

    if (typeof context !== 'object') {
      context = {};

      throw new Error('expected Object literal');
    }
    contextParseError = null;
  } catch (err) {
    contextParseError = err;
  }

  $: expression !== undefined && updateStack(expression, context);

  $: output = (function() {
    try {
      return Feelin.evaluate(expression, context);
    } catch (err) {
      console.error(err);
      return 'ERROR';
    }
  })();

  $: renderSelection(editor, treeSelection);

  $: renderSyntax(editor, syntaxHighlight ? treeTokens : []);

  $: serializeHash(expression, contextString, syntaxHighlight);
</script>

<main class="vcontainer">
  <h1>Try FEEL</h1>

  <div class="views hcontainer">

    <div class="vcontainer" style="flex: .6">

      <div class="container editor">
        <h3 class="legend">
          Code <select value="expression" disabled="disabled">
            <option value="expression">Expression(s)</option>
            <option value="unaryTest">Unary Test(s)</option>
          </select>

          <label><input type="checkbox" bind:checked={ syntaxHighlight }> Syntax highlight</label>
        </h3>

        <div class:highlight-container={ syntaxHighlight } class="content" on:mousemove={ handleEditorOver }>
          <textarea bind:this={ editorElement } bind:value={ expression }></textarea>
        </div>

      </div>

      <div class="hcontainer">
        <div class="container context">

          <h3 class="legend">
            Context
          </h3>

          <textarea class="content" bind:value={ contextString }></textarea>

          <div class="note" class:error-note={ contextParseError } >
            {#if contextParseError}
              Failed to parse as JSON.
            {:else}
              Enter JSON object literal.
            {/if}
          </div>
        </div>

        <div class="container output">

          <h3 class="legend">
            Output
          </h3>

          <div class="content">{ JSON.stringify(output, 0, 2) }</div>
        </div>
      </div>
    </div>

    <div class="container tree" style="flex: .4">

      <h3 class="legend">
        Tree
      </h3>

      <div class="content">
        <TreeNode node={ treeRoot } selection={ treeSelection } onSelect={ selectExpression } />
      </div>
    </div>

  </div>

</main>

<style>

  :global(*) {
    box-sizing: border-box;
  }

  :global(body, html) {
    height: 100%;
    width: 100%;

    margin: 0;
  }

  h1 {
    margin: 10px;
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
    margin-top: 7px;
    color: #666;
  }

  .error-note {
    color: red;
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
  }

  .container .content {
    flex: 1;
    align-self: stretch;
  }

  .legend {
    font-size: 1.2em;
    color: #444;
    display: inline-block;
    padding: 5px 0;
    border-radius: 3px;
    margin: 0 0 5px;
  }

  .legend label {
    font-weight: normal;
    font-size: .90em;
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

  .editor .content {
    overflow: hidden;
  }

  .tree .content {
    overflow: auto;
    padding: 4px;
  }

  .context .content {
    padding: 4px;
    display: block;
  }

  .output .content {
    white-space: pre-wrap;
    font-family: monospace;
    padding: 4px;
  }

  :global(.highlight-container .CodeMirror-code) {
    color: rgb(0, 151, 157);
  }

  :global(.mark-selection) {
    background: bisque;
  }

  :global(.mark-parameters),
  :global(.mark-list),
  :global(.mark-interval) {
    color: rgb(67, 79, 84);
  }

  :global(.mark-string) {
    color: #c41a16;
  }

  :global(.mark-number) {
    color: #1c00cf;
  }

  :global(.mark-boolean) {
    color: #aa0d91;
  }

  :global(.mark-qname) {
    color: rgb(67, 79, 84);
  }

  :global(.mark-name) {
    color: rgb(67, 79, 84);
  }

  :global(.mark-error) {
    text-decoration: underline;
    color: red;
  }
</style>