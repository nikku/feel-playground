import {
  LanguageSupport,
  LRLanguage,
  foldNodeProp
} from '@codemirror/language';

import {
  Compartment
} from '@codemirror/state';


import { parser, trackVariables } from 'lezer-feel';

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


function feelLanguage(dialect, context) {

  const top = dialect === 'unaryTest' ? 'UnaryTests' : 'Expressions';
  const contextTracker = trackVariables(context);

  const FeelLanguage = LRLanguage.define({
    parser: parser.configure({
      contextTracker,
      props: [
        foldNodeProp.add({
          Context(node) {
            const first = node.firstChild;
            const last = node.lastChild;

            if (!first || first.name != '{') return null;

            return {
              from: first.to,
              to: last.name == '}' ? last.from : node.to
            };
          },
          List(node) {
            const first = node.firstChild;
            const last = node.lastChild;

            if (!first || first.name != '[') return null;

            return {
              from: first.to,
              to: last.name == ']' ? last.from : node.to
            };
          },
          FunctionDefinition(node) {
            const last = node.getChild(')');

            if (!last) return null;

            return {
              from: last.to,
              to: node.to
            };
          }
        })
      ],
      top
    }),
    languageData: {
      commentTokens: {
        line: '//',
        block: {
          open: '/*',
          close: '*/'
        }
      }
    }
  });

  return new LanguageSupport(FeelLanguage, [ ]);
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
  context = {},
  dialect = 'expression',
  readOnly = false,
  onChange,
  onMousemove,
  onMouseout
}) {

  const languageConfig = new Compartment();

  const extensions = [
    languageConfig.of(feelLanguage(dialect, context))
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
    effects: this._languageConfig.reconfigure(
      feelLanguage(dialect, context)
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