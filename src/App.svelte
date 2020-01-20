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

  let codeEditorElement;
  let contextEditorElement;
  let treeElement;

  let codeEditor;
  let contextEditor;

  let treeRoot = { name: 'Expression', start: 0, end: 0, children: [] };
  let treeTokens = [];

  let treeSelection;

  let feelType = params.feelType || 'expression';

  let syntaxMarks = [];
  let selectionMark;

  let syntaxHighlight = params.syntaxHighlight !== 'false';

  let expression = params.expression || `for
  fruit in [ "apple", "bananas" ], vegetable in vegetables
return
  { ingredients: [ fruit, vegetable ] }`;

  let output = undefined;
  let outputError = null;

  let context;

  let contextString = params.contextString || `{
  "vegetables": [ "garlic", "tomato" ],
  "Mike's age": 35
}`;

  let contextParseError;

  onMount(() => {
    codeEditor = CodeMirror.fromTextArea(codeEditorElement, {
      lineNumbers: true,
      mode: null
    });

    const updateExpression = () => {
      expression = codeEditor.getDoc().getValue();
    };

    codeEditor.on('change', updateExpression);

    contextEditor = CodeMirror.fromTextArea(contextEditorElement, {
      mode: { name: 'javascript', json: true },
      theme: 'default'
    });

    const updateContext = () => {
      contextString = contextEditor.getDoc().getValue();
    };

    contextEditor.on('change', updateContext);
  });

  function parseParams() {

    const hash = window.location.hash;

    const [ expression, contextString, syntaxHighlight, feelType ] = hash.slice(1).split(';').map(decodeURIComponent);

    return {
      expression,
      contextString,
      syntaxHighlight,
      feelType
    };
  }

  function serializeHash(expression, contextString, syntaxHighlight, feelType) {
    window.location.hash = '#' + [ expression, contextString, syntaxHighlight, feelType ].map(encodeURIComponent).join(';');
  }

  function mark(editor, node, className) {

    const doc = editor.getDoc();

    let start = node.start;
    let end = node.end;

    let type = '';

    if (start === end) {

      if (start > 0) {
        start--;
        type = '-after';
      } else {
        end++;
        type = '-before';
      }
    }

    const startCoords = doc.posFromIndex(start);

    const endCoords = doc.posFromIndex(end);

    return editor.markText(
      startCoords,
      endCoords,
      { className: `mark-${className}${type}` }
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

  const handleEditorOver = function(event) {

    const position = codeEditor.coordsChar({
      left: event.clientX,
      top: event.clientY
    }, 'window');

    const index = codeEditor.getDoc().indexFromPos(position);

    const selectedNode = findTreeNode(index, treeRoot);

    if (selectedNode !== treeSelection) {
      treeSelection = selectedNode;
    }
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

  const updateStack = debounce(function updateStack(feelType, expression, rawContext, syntaxHighlight) {

    console.time('updateStack');

    const stack = [
      {
        children: []
      }
    ];

    const tokens = [];

    const parse = feelType === 'unaryTest' ? Feelin.parseUnaryTests : Feelin.parseExpressions;

    const {
      tree,
      parsedInput
    } = parse(expression, rawContext);

    let txt = '';

    let indent = 0;

    tree.iterate({
      enter(node, start, end) {

        const {
          name
        } = node;

        const parent = stack[stack.length - 1];

        const skip = name === parsedInput.slice(start, end);

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

        if (syntaxHighlight && current.tokenType || current.error) {
          tokens.push(current);
        }
      }
    });

    treeRoot = stack[0].children[0];
    treeTokens = tokens;

    console.timeEnd('updateStack');
  }, 300);

  const parseContext = debounce(function parseContext(contextString) {
    try {
      context = JSON.parse(contextString || {});

      if (typeof context !== 'object') {
        context = {};

        throw new Error('expected Object literal');
      }
      contextParseError = null;
    } catch (err) {
      contextParseError = err;
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

  const evaluateExpression = debounce(function evaluateExpression(feelType, expression, context) {

    const evaluate = feelType === 'unaryTest' ? Feelin.unaryTest : Feelin.evaluate;

    try {
      output = evaluate(expression, context);
      outputError = null;
    } catch (err) {
      console.error(err);

      output = undefined;
      outputError = err;
    }
  }, 300);

  $: parseContext(contextString);

  $: expression !== undefined && updateStack(feelType, expression, context, syntaxHighlight);

  $: evaluateExpression(feelType, expression, context);

  $: renderSelection(codeEditor, treeSelection);

  $: renderSyntax(codeEditor, treeTokens);

  $: serializeHash(expression, contextString, syntaxHighlight, feelType);
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

    <div class="vcontainer" style="flex: .6">

      <div class="container code-editor">
        <h3 class="legend">
          Code <select class="typeselect" name="feelType" bind:value={ feelType }>
            <option value="expression">Expression</option>
            <option value="unaryTest">Unary Test</option>
          </select>

          <span class="right">
            <label><input type="checkbox" bind:checked={ syntaxHighlight }> Syntax highlight</label>
          </span>
        </h3>

        <div class:highlight-container={ syntaxHighlight } class="content" on:mousemove={ handleEditorOver }>
          <textarea name="expression" bind:this={ codeEditorElement } bind:value={ expression }></textarea>
        </div>

      </div>

      <div class="hcontainer">
        <div class="container context-editor">

          <h3 class="legend">
            Input
          </h3>

          <div class="content">
            <textarea name="contextString" bind:this={ contextEditorElement } bind:value={ contextString }></textarea>
          </div>

          <div class="note" class:error-note={ contextParseError } >
            {#if contextParseError}
              Failed to parse as JSON.
            {:else}
              Enter JSON object literal.
              {#if feelType === 'unaryTest'}
                Input named <code>?</code> is treated as value to test.
              {/if}
            {/if}
          </div>
        </div>

        <div class="container output">

          <h3 class="legend">
            Output
          </h3>

          <div class="content">{ typeof output !== 'undefined' && JSON.stringify(output, 0, 2) || '' }</div>

          <div class="note" class:error-note={ outputError }>
            {#if outputError}
              Evaluation failed: { outputError.message }
            {:else}
              Change code or input to re-compute output.
            {/if}
          </div>
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
    margin-top: 7px;
    color: #666;
  }

  .note code {
    font-weight: bold;
  }

  .error-note {
    color: red;
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

  .legend .right {
    flex-grow: 1;
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

  .code-editor .content,
  .context-editor .content {
    overflow: hidden;
  }

  .tree .content {
    overflow: auto;
    padding: 4px;
    min-width: 200px;
  }

  .output .content {
    white-space: pre-wrap;
    font-family: monospace;
    padding: 4px;
    overflow: auto;
  }

  :global(.CodeMirror) {
    height: 100%;
  }

  :global(.highlight-container .CodeMirror-code) {
    color: #708;
  }

  :global(.mark-comment) {
    color: #a50;
  }

  :global(.mark-selection) {
    background: bisque;
  }

  :global(.mark-parameters),
  :global(.mark-context),
  :global(.mark-list),
  :global(.mark-interval) {
    color: rgb(67, 79, 84);
  }

  :global(.mark-string) {
    color: #a11;
  }

  :global(.mark-builtin) {
    color: #30a;
  }

  :global(.mark-number) {
    color: #164;
  }

  :global(.mark-boolean) {
    color: #219;
  }

  :global(.mark-qname) {
    color: #05a;
  }

  :global(.mark-name) {
    color: #05a;
  }

  :global(.mark-error) {
    text-decoration: underline;
    color: red;
  }

  :global(.mark-error-before) {
    position: relative;
  }

  :global(.mark-error-before):before {
    position: absolute;
    z-index: 300;
    content: '\200B';
    border-left: dotted 1px red;
    margin-left: -1px;
  }

  :global(.mark-error-after) {
    position: relative;
  }

  :global(.mark-error-after):after {
    position: absolute;
    z-index: 300;
    content: '\200B';
    border-right: dotted 1px red;
    margin-right: -1px;
  }
</style>