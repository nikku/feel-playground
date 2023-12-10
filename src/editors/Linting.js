import { jsonParseLinter } from '@codemirror/lang-json';
import { syntaxTree } from '@codemirror/language';
import { linter } from '@codemirror/lint';


export const jsonLinter = linter(jsonParseLinter());

export const feelLinter = linter(view => {

  /**
   * @type { import('@codemirror/lint').Diagnostic[] }
   */
  let diagnostics = [];

  syntaxTree(view.state).cursor().iterate(node => {
    if (!node.type.isError) {
      return;
    }

    const {
      from,
      to,
      message
    } = lintError(node);

    diagnostics.push({
      from,
      to,
      severity: 'error',
      message
    });
  });

  return diagnostics;
});


/**
 * @param { import('@lezer/common').SyntaxNodeRef } nodeRef
 *
 * @return { { from: number, to: number, message: string } }
 */
export function lintError(nodeRef) {

  const node = nodeRef.node;
  const parent = node.parent;

  if (node.from !== node.to) {
    return {
      from: node.from,
      to: node.to,
      message: `Unrecognized token in <${parent.name}>`
    };
  }

  const next = findNext(node);

  if (next) {
    return {
      from: node.from,
      to: next.to,
      message: `Unrecognized token <${next.name}> in <${parent.name}>`
    };
  } else {
    const unfinished = parent.enterUnfinishedNodesBefore(nodeRef.to);

    return {
      from: node.from,
      to: node.to,
      message: `Incomplete <${ (unfinished || parent).name }>`
    };
  }
}

/**
 * @param { import('@lezer/common').SyntaxNodeRef } nodeRef
 *
 * @return { import('@lezer/common').SyntaxNode }
 */
function findNext(nodeRef) {

  const node = nodeRef.node;

  let next, parent = node;

  do {
    next = parent.nextSibling;

    if (next) {
      return next;
    }

    parent = parent.parent;
  } while (parent);

  return null;
}