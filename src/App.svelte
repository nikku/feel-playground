<script>

  Feelin = window.Feelin;
  CodeMirror = window.CodeMirror;

  import TreeNode from './TreeNode.svelte';

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

  let expression = params.expression || 'for fruit in [ "apple", "bananas" ], vegetable in vegetables return makeSalat(fruit, vegetable)';

  let context = params.context || '{}';

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

    const [ expression, context ] = hash.slice(1).split(';').map(decodeURIComponent);

    return {
      expression,
      context
    };
  }

  function serializeHash(expression, context) {
    window.location.hash = '#' + [ expression, context ].map(encodeURIComponent).join(';');
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

  function renderSyntax(editor, treeTokens) {

    syntaxMarks.forEach(e => e.clear());

    if (!editor) {
      return;
    }

    syntaxMarks = treeTokens.reduce((marks, node) => {

      const { tokenType } = node;

      if (tokenType) {
        marks.push(mark(editor, node, tokenType));
      }

      return marks;
    }, []);
  }

  function renderSelection(editor, node) {

    if (selectionMark) {
      selectionMark.clear();
    }

    if (!node || !editor) {
      return;
    }

    selectionMark = mark(editor, node, 'selection');
  }

  function handleEditorOver(event) {
    const position = editor.coordsChar({
      left: event.clientX,
      top: event.clientY
    });

    const index = editor.getDoc().indexFromPos(position);

    treeSelection = findTreeNode(index, treeRoot);
  }

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

    const stack = [
      {
        children: []
      }
    ];

    const tokens = [];

    const {
      tree,
      context
    } = Feelin.parseExpressions(expression, parseContext(rawContext));

    let txt = '';

    let indent = 0;

    tree.iterate({
      enter(node, start, end) {

        const error = node.prop(NodeProp.error);

        const _node = {
          name: node.name,
          start,
          end,
          children: [],
          error
        };

        stack.push({
          ..._node,
          tokenType: getTokenType(_node)
        });

      },

      leave(node, start, end) {

        const current = stack.pop();

        const parent = stack[stack.length - 1];

        parent.children.push(current);

        tokens.push(current);
      }
    });

    treeRoot = stack[0].children[0];
    treeTokens = tokens;
  }

  function getTokenType(node) {

    const {
      name,
      error
    } = node;

    const brackets = {
      ')': 1,
      '(': 1,
      ']': 1,
      '[': 1,
    };

    if (error) {
      return 'error';
    }

    if (brackets[name]) {
      return 'bracket';
    }

    if (name.endsWith('Literal')) {
      return 'literal';
    }

    if (name === 'QualifiedName') {
      return 'qname';
    }

    if (name === 'Name') {
      return 'name';
    }

    if (name.charAt(0).toLowerCase() === name.charAt(0)) {
      return 'keyword';
    }
  }

  function parseContext(context) {
    if (!context) {
      return {};
    }

    try {
      return JSON.parse(context);
    } catch (e) {
      return {};
    }
  }

  $: expression !== undefined && updateStack(expression, context);

  $: renderSelection(editor, treeSelection);

  $: renderSyntax(editor, treeTokens);

  $: serializeHash(expression, context);
</script>

<main>
  <h1>Try FEEL</h1>

  <div class="views">

    <div class="vcontainer" style="flex: .7">

      <div class="container editor">
        <h3 class="legend">
          Code <select value="expression">
            <option value="expression">Expressions</option>
            <option value="unaryTest">Unary Tests</option>
          </select>
        </h3>

        <div class="content" on:mousemove={ handleEditorOver }>
          <textarea bind:this={ editorElement } bind:value={ expression }></textarea>
        </div>

      </div>

      <div class="hcontainer">
        <div class="container context">

          <h3 class="legend">
            Context
          </h3>

          <textarea class="content" bind:value={ context }></textarea>
        </div>

        <div class="container output">

          <h3 class="legend">
            Output
          </h3>

          <div class="content"></div>
        </div>
      </div>
    </div>

    <div class="container tree" style="flex: .3">

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

  h1 {
    margin: 10px;
  }

  main {
    font-family: sans-serif;

    display: flex;
    flex-direction: column;
  }

  .views {
    display: flex;
    flex: 1;
  }

  .hcontainer {
    display: flex;
    flex: 1;
  }

  .vcontainer {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .container {
    margin: 10px;
    flex: 1;
  }

  .legend {
    font-size: 1.2em;
    color: #444;
    display: inline-block;
    padding: 5px 0;
    border-radius: 3px;
    margin-bottom: 5px;
  }

  select {
    color: inherit;
    margin-left: 10px;
    font-size: .95em;
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

  .context {
    display: block;
  }

  .context .content {
    padding: 4px;
    display: block;
    width: 100%;
  }

  .context .content,
  .output .content {
    min-height: 150px;
    min-width: 100%;
  }

  :global(.mark-selection) {
    background: bisque;
  }

  :global(.mark-error) {
    text-decoration: underline;
    color: red;
  }

  :global(.mark-literal) {
    color: #d14;
  }

  :global(.mark-keyword) {
    color: #333;
    font-weight: bold;
  }

  :global(.mark-bracket) {
    color: #333;
  }

  :global(.mark-qname) {
    color: #0086b3;
    font-weight: bold;
  }

  :global(.mark-name) {
    font-weight: normal;
    color: #0086b3;
  }
</style>