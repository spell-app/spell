import { isolateHistory } from "@codemirror/commands"
import { type Extension, Prec } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { LSP } from "spell/app/lsp"

/****************
 * ### `CodeMirrorCodeOrText`
 * A drawing's attribute value switched between text and code as a person types, in a CodeMirror editor
 * (epic `codemirror` P4):
 * - `{` typed anywhere inside a quoted value turns its two quotes into braces:  `color="bl{ue"` => `color={blue}`
 * - `"` typed right after a code value's `{` turns its braces back into quotes:  `color={"its color}` =>
 *   `color="its color"`;  further in, a `"` starts a string in the code (`{say "hi"}`), so it's typed as itself
 * - The caret stays in the same words.
 * - Its own undo step:  one undo leaves the plain character typed, as if this help weren't there.
 * - Which values, and what they switch to:  `LSP.CodeOrText`, which the right-click menu's "Make it code" and
 *   "Make it text" ask too, so the two agree.
 * - Only the editor typed in hears the key, so two editors on one file switch it once.
 * - Ahead of the closing of pairs (`closeBrackets()`):  a `{` or `"` it takes is never paired.
 ****************/
export class CodeMirrorCodeOrText {
  /** The help, for a Spell file's editor. */
  static extension(): Extension {
    return Prec.high(
      EditorView.inputHandler.of((view, from, to, text) => CodeMirrorCodeOrText.typed(view, from, to, text))
    )
  }

  /**
   * `text` typed over `from` ... `to`:  a `{` or a `"` that switches its value is written, then the switch.
   * - `true` when it wrote them;  `false` leaves the key to the rest.
   */
  private static typed(view: EditorView, from: number, to: number, text: string): boolean {
    const { state } = view
    if (from !== to || (text !== "{" && text !== '"') || state.readOnly || state.selection.ranges.length !== 1)
      return false
    const switching = LSP.CodeOrText.typing(state.doc.toString(), from, text)
    if (!switching) return false
    const { value, switched } = switching
    view.dispatch({ changes: { from, insert: text }, selection: { anchor: from + 1 }, userEvent: "input.type" })
    // the switch an undo step of its own:  it joins neither the typing before it nor after it
    view.dispatch({
      changes: { from: value.start, to: value.end + text.length, insert: switched },
      selection: { anchor: from },
      userEvent: "input",
      annotations: isolateHistory.of("full")
    })
    return true
  }
}
