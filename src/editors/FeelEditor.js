import {
  LanguageSupport,
  language
} from '@codemirror/language';

import {
  Compartment
} from '@codemirror/state';

import { LRLanguage, syntaxTree } from '@codemirror/language';

import { parser, feelHighlighting } from 'lezer-feel';

import { highlightSelection } from './Highlight';
import { feelLinter } from './Linting';

import {
  createEditor,
  onChangeHandler,
  onMouseHandlers,
  basicEditor,
  advancedEditor,
  basicViewer
} from './BaseEditor';


const ExpressionsLanguage = LRLanguage.define({
  parser: parser.configure({
    top: 'Expressions',
    props: [
      feelHighlighting
    ]
  })
});

const UnaryTestLanguage = LRLanguage.define({
  parser: parser.configure({
    top: 'UnaryTests',
    props: [
      feelHighlighting
    ]
  })
});

function feelExpressions() {
  return new LanguageSupport(ExpressionsLanguage, [ ]);
}

function feelUnaryTests() {
  return new LanguageSupport(UnaryTestLanguage, [ ]);
}

/**
 * @param { {
 *   doc: string,
 *   readOnly?: boolean,
 *   parent: Element,
 *   onChange?: (value: string) -> void,
 *   onMousemove?: (number: position) -> void,
 *   onMouseout?: (number: position) -> void
 * } } options
 */
export default function FeelEditor({
  doc = '',
  parent,
  readOnly = false,
  onChange,
  onMousemove,
  onMouseout
}) {

  const languageConfig = new Compartment();

  const extensions = [
    languageConfig.of(feelExpressions())
  ];

  if (onMousemove || onMouseout) {
    extensions.push(onMouseHandlers({
      'mousemove': onMousemove,
      'mouseout': onMouseout
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

  this._cm = createEditor({
    doc,
    extensions,
    parent
  });

  this._languageConfig = languageConfig;

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

FeelEditor.prototype.setDialect = function(feelType) {

  var targetLanguage = feelType === 'unaryTest'
    ? UnaryTestLanguage
    : ExpressionsLanguage;

  if (this._cm.state.facet(language) == targetLanguage) {
    return;
  }

  const doc = this._cm.state.doc;

  this._cm.dispatch({
    effects: this._languageConfig.reconfigure(
      feelType === 'unaryTest'
        ? feelUnaryTests()
        : feelExpressions()
    ),
    changes: {
      from: 0,
      to: doc.length,
      insert: doc
    }
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