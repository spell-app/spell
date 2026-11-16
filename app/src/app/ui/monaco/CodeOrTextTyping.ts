import { LSP } from "spell/app/lsp"
import type { monaco } from "./monaco"

/****************
 * ### `CodeOrTextTyping`
 * A drawing's attribute value switched between text and code as a person types (epic `editor` T74):
 * - `{` typed anywhere inside a quoted value turns its two quotes into braces:  `color="bl{ue"` => `color={blue}`
 * - `"` typed right after a code value's `{` turns its braces back into quotes:  `color={"its color}` =>
 *   `color="its color"`;  further in, a `"` starts a string in the code (`{say "hi"}`), so it's typed as itself
 * - The caret stays in the same words.
 * - Its own undo step:  one undo leaves the plain character typed, as if this help weren't there.
 * - Which values, and what they switch to:  `LSP.CodeOrText`, which the right-click menu's "Make it code" and
 *   "Make it text" ask too, so the two agree.
 * - One per editor, made as each editor is (`SpellMonaco.register()`), beside `SpellTyping`'s helps.
 *   - Several editors can show one file:  each hears every edit, so only the one typed in helps (epic `editor` I150).
 * - Only Monaco's TYPE (`import type`):  the rules are `LSP.CodeOrText`'s, tested without an editor.
 ****************/
export class CodeOrTextTyping {
  constructor(
    private readonly editor: monaco.editor.ICodeEditor,
    /** the languages it helps in:  a Spell file's drawing's tags, and an HTML page's */
    private readonly languages: readonly string[]
  ) {
    editor.onDidChangeModelContent((event) => this.typed(event))
  }

  /** One keystroke's edit:  a `{` or a `"` (Monaco's closing one with it, `{}` or `""`), switching its value. */
  private typed(event: monaco.editor.IModelContentChangedEvent) {
    const { editor } = this
    if (event.isUndoing || event.isRedoing || event.isFlush || event.changes.length !== 1) return
    // every editor showing the file hears the edit:  only the one typed in helps (I150)
    if (!editor.hasTextFocus()) return
    const model = editor.getModel()
    const change = event.changes[0]!
    if (!model || change.rangeLength !== 0 || !TYPED.test(change.text)) return
    if (!this.languages.includes(model.getLanguageId()) || editor.getRawOptions().readOnly) return
    const offset = change.rangeOffset
    const text = model.getValue()
    const before = text.slice(0, offset) + text.slice(offset + change.text.length)
    const switching = LSP.CodeOrText.typing(before, offset, change.text[0]!)
    if (!switching) return
    const version = model.getVersionId()
    // once the keystroke's own edit is done, as its own undo step after it
    queueMicrotask(() => {
      if (model.getVersionId() !== version || editor.getModel() !== model) return
      const { value, switched } = switching
      const start = model.getPositionAt(value.start)
      const end = model.getPositionAt(value.end + change.text.length)
      const range = { startLineNumber: start.lineNumber, startColumn: start.column, ...endOf(end) }
      editor.pushUndoStop()
      editor.executeEdits(CODE_OR_TEXT, [{ range, text: switched }])
      editor.setPosition(model.getPositionAt(offset))
      editor.pushUndoStop()
    })
  }
}

/** What a keystroke wrote that may switch a value:  a `{` or a `"`, or Monaco's pair of either. */
const TYPED = /^(?:\{\}?|""?)$/

/** The source its edits are marked with, in Monaco's undo stack. */
const CODE_OR_TEXT = "code-or-text"

/** `position` as a range's end. */
function endOf(position: monaco.IPosition): { endLineNumber: number; endColumn: number } {
  return { endLineNumber: position.lineNumber, endColumn: position.column }
}
