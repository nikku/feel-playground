import {
  syntaxTree
} from '@codemirror/language';

import {
  Compartment
} from '@codemirror/state';

import {
  feel
} from 'lang-feel';

import { highlightSelection } from './Highlight';
import { feelLinter, feelWarningsLinter } from './Linting';

import {
  createEditor,
  onChangeHandler,
  onMouseHandlers,
  basicEditor,
  advancedEditor,
  basicViewer,
  onSelectionChangeHandler
} from './BaseEditor';

/**
 * @param { 'expressions' | 'unaryTests' } dialect
 * @param { Record<string, any> } context
 *
 * @return { LanguageSupport }
 */
function feelLanguage(dialect, context) {
  return feel({
    dialect,
    context
  });
}


/**
 * @param { {
 *   doc: string,
 *   readOnly?: boolean,
 *   parent: Element,
 *   onChange?: (value: string) -> void,
 *   onMousemove?: (number: position) -> void,
 *   onMouseout?: (number: position) -> void,
 *   onBlur?: () -> void
 * } } options
 */
export default function FeelEditor({
  doc = '',
  parent,
  context = {},
  dialect = 'expression',
  readOnly = false,
  onChange,
  onSelectionChange,
  onMousemove,
  onMouseout,
  onBlur
}) {

  const warnings = new Compartment();

  const language = new Compartment();

  const extensions = [
    language.of(feelLanguage(dialect, context)),
    warnings.of(feelWarningsLinter([]))
  ];

  if (onMousemove || onMouseout) {
    extensions.push(onMouseHandlers({
      'mousemove': onMousemove,
      'mouseout': onMouseout,
      'blur': onBlur,
      'mouseleave': onBlur
    }));
  }

  if (readOnly) {
    extensions.push(basicViewer);
  } else {
    extensions.push(
      basicEditor,
      advancedEditor,
      feelLinter
    );
  }

  if (onChange) {
    extensions.push(onChangeHandler(onChange));
  }

  if (onSelectionChange) {
    extensions.push(onSelectionChangeHandler(onSelectionChange));
  }

  this._cm = createEditor({
    doc,
    extensions,
    parent
  });

  this._language = language;
  this._warnings = warnings;

  this._dialect = dialect;
  this._context = context;

  return this;
}

/**
 * @param { { from: number, to: number } | null } range
 */
FeelEditor.prototype.highlight = function(range) {
  if (range && range.from === range.to) {
    range = null;
  }

  highlightSelection(this._cm, range);
};

/**
 * @param { { anchor: number, head?: number } } anchor
 */
FeelEditor.prototype.setSelection = function(selection) {
  this._cm.dispatch({
    selection
  });

  this._cm.focus();
};

FeelEditor.prototype.setDialect = function(dialect) {
  this._configureLanguage(dialect, this._context);
};

FeelEditor.prototype.setContext = function(context) {
  this._configureLanguage(this._dialect, context);
};

FeelEditor.prototype._configureLanguage = function(dialect, context) {

  if (dialect === this._dialect && context === this._context) {
    return;
  }

  const doc = this._cm.state.doc;

  this._dialect = dialect;
  this._context = context;

  this._cm.dispatch({
    effects: this._language.reconfigure(
      feelLanguage(dialect, context)
    ),
    changes: {
      from: 0,
      to: doc.length,
      insert: doc
    }
  });
};

FeelEditor.prototype.setWarnings = function(warnings) {

  this._cm.dispatch({
    effects: this._warnings.reconfigure(
      feelWarningsLinter(warnings)
    )
  });
};

FeelEditor.prototype.getSyntaxTree = function() {
  return syntaxTree(this._cm.state);
};

/**
 * Replaces the content of the Editor
 *
 * @param {String} value
 */
FeelEditor.prototype.setDoc = function(doc) {

  if (this._cm.state.doc === doc) {
    return;
  }

  this._cm.dispatch({
    changes: {
      from: 0,
      to: this._cm.state.doc.length,
      insert: doc
    }
  });
};

/**
 * Sets the focus in the editor.
 */
FeelEditor.prototype.focus = function() {
  this._cm.focus();
};

/**
 * Returns the current selection ranges. If no text is selected, a single
 * range with the start and end index at the cursor position will be returned.
 *
 * @returns {Object} selection
 * @returns {Array} selection.ranges
 */
FeelEditor.prototype.getSelection = function() {
  return this._cm.state.selection;
};