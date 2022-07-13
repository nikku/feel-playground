import { EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

const highlightMark = Decoration.mark({ class: 'cm-highlight' });

/**
 * @typedef { import('@codemirror/view').DecorationSet } DecorationSet
 *
 * @typedef { { from: number, to: number } } Range
 */

/**
 * @type { import('@codemirror/state').StateEffectType<Range> }
 */
const addHighlight = StateEffect.define();

/**
 * @type { import('@codemirror/state').StateField<DecorationSet> }
 */
const highlightField = StateField.define({

  create() {
    return Decoration.none;
  },
  update(highlights, tr) {
    highlights = highlights.map(tr.changes);
    for (let e of tr.effects) {
      if (e.is(addHighlight)) {
        highlights = highlights.update({
          filter: () => false,
          add: [ highlightMark.range(e.value.from, e.value.to) ]
        });
      }
    }
    return highlights;
  },
  provide: f => EditorView.decorations.from(f)
});

const highlightTheme = EditorView.baseTheme({
  '.cm-highlight': { textDecoration: 'highlight 3px red' }
});

/**
 * @param { import('@codemirror/view').EditorView } view
 * @param { Range|null } range
 */
export function highlightSelection(view, range) {

  const effects = [];

  if (range) {
    effects.push(addHighlight.of(range));
  }

  if (!view.state.field(highlightField, false)) {
    effects.push(StateEffect.appendConfig.of([
      highlightField, highlightTheme
    ]));
  }

  view.dispatch({
    effects
  });

  return true;
}