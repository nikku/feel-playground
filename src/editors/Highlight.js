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

    const highlightMarks = tr.effects.filter(
      effect => effect.is(addHighlight)
    ).map(
      effect => effect.value && highlightMark.range(effect.value.from, effect.value.to)
    );

    if (highlightMarks.length) {
      highlights = highlights.update({
        filter: () => false,
        add: highlightMarks.filter(m => m)
      });
    }

    return highlights;
  },
  provide: field => EditorView.decorations.from(field)
});

/**
 * @param { import('@codemirror/view').EditorView } view
 * @param { Range|null } range
 */
export function highlightSelection(view, range) {

  const effects = [];

  if (range) {
    effects.push(addHighlight.of(range));
  } else {
    effects.push(addHighlight.of(null));
  }

  if (!view.state.field(highlightField, false)) {
    effects.push(StateEffect.appendConfig.of([
      highlightField
    ]));
  }

  view.dispatch({
    effects
  });

  return true;
}