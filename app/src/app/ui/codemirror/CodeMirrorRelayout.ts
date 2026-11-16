import { type EditorState, type Extension, Prec, StateEffect, StateField } from "@codemirror/state"
import { type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"

import { after, type CancelablePromise } from "spell/util/timing"
import { CodeMirrorSetup } from "./CodeMirrorSetup"

/****************
 * ### `CodeMirrorRelayout`
 * Decorations worked out from the whole text, which follow the text as it's typed,
 * and are worked out again once the typing pauses.
 * - Typing never waits:  CodeMirror moves the marks with each change at once (`decorations.map()`).
 * - Worked out again after an edit, or a new parse (`CodeMirrorSetup.PARSED`), once nothing has changed for `msec`.
 * - In the editor's state, not a view plugin's, so its decorations may be block widgets.
 * - Drawn at the lowest precedence:  CodeMirror draws a lower source's marks OUTSIDE a higher's,
 *   so a found word's or a problem's mark goes inside, rather than cutting one of these in two.
 * - Its position in the import graph:  CodeMirror and util's timing alone.
 ****************/
export class CodeMirrorRelayout {
  /**
   * The extension keeping `decorationsOf(state)` on the editor:  at once, then again `msec` after the typing pauses.
   * - `decorationsOf()` MUST NOT throw:  it's called from CodeMirror's update.
   */
  static extension(decorationsOf: (state: EditorState) => DecorationSet, msec: number): Extension {
    const laidOut = StateEffect.define<DecorationSet>()
    const field = StateField.define<DecorationSet>({
      create: (state) => decorationsOf(state),
      update(decorations, transaction) {
        for (const effect of transaction.effects) if (effect.is(laidOut)) return effect.value
        return transaction.docChanged ? decorations.map(transaction.changes) : decorations
      },
      provide: (it) => Prec.lowest(EditorView.decorations.from(it))
    })
    const relayout = ViewPlugin.fromClass(
      class {
        private timer: CancelablePromise<void> | undefined

        constructor(readonly view: EditorView) {}

        update(update: ViewUpdate) {
          const isParsed = update.transactions.some((it) => it.effects.some((e) => e.is(CodeMirrorSetup.PARSED)))
          if (!update.docChanged && !isParsed) return
          this.timer?.cancel()
          this.timer = after(msec / 1000, () => {
            this.view.dispatch({ effects: laidOut.of(decorationsOf(this.view.state)) })
          })
        }

        destroy() {
          this.timer?.cancel()
        }
      }
    )
    return [field, relayout]
  }
}
