import type { SP } from "spell/parser/spell"
import { ValuePopups } from "spell/app/app/ui/ValuePopups"
import type { monaco } from "./monaco"
import { ValueChoices } from "./ValueChoices"

/****************
 * ### `ValuePicker`
 * An attribute's value picked rather than typed, in a popup at a Monaco editor's caret (epic `editor` T61):
 * the color palette for `color="|"`, the icon picker for `icon="|"`.
 * - What it shows and how its keys work is the editor-neutral `ValuePopups`' picker, CodeMirror's too:
 *   this is only Monaco's door to it, opened by the words list's first row, "Pick a color…"
 *   (`LSP.PICK_VALUE_COMMAND`, which `SpellMonaco` registers).
 * - The Monaco side it uses is `ValueChoices.hostFor()`'s, the choices strip's.
 ****************/
export class ValuePicker {
  /**
   * Open the picker `picker` says at `editor`'s caret, for the quoted value it's in.
   * - `values`:  the attribute's words, as the file's language writes them (a palette's, each `picker.colors`' colour).
   * - NEVER throws:  no quoted value at the caret, nothing opens.
   */
  static open(editor: monaco.editor.ICodeEditor, picker: SP.ComponentValuePicker, values: readonly string[]): void {
    ValuePopups.pick(ValueChoices.hostFor(editor), picker, values)
  }
}
