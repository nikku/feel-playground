import { json } from '@codemirror/lang-json';
import { jsonLinter } from './Linting';

import {
  createEditor,
  basicEditor,
  basicViewer,
  onChangeHandler
} from './BaseEditor';

/**
 * @param { {
 *   doc: string,
 *   readOnly?: boolean,
 *   parent: Element,
 *   onChange?: (value: string) -> void
 * } } options
 */
export default function JsonEditor({
  doc = '',
  parent,
  readOnly = false,
  onChange
}) {

  const extensions = [
    json()
  ];

  if (readOnly) {
    extensions.push(basicViewer);
  } else {
    extensions.push(
      jsonLinter,
      basicEditor
    );
  }

  if (onChange) {
    extensions.push(onChangeHandler(onChange));
  }

  this._cm = createEditor({
    doc,
    extensions,
    parent
  });
}

JsonEditor.prototype.setDoc = function(doc) {

  const currentDoc = this._cm.state.doc;

  if (currentDoc === doc) {
    return;
  }

  this._cm.dispatch({
    changes: {
      from: 0,
      to: currentDoc.length,
      insert: doc
    }
  });
};