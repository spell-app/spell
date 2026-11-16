import { LSP } from "spell/app/lsp"
import { ValuePopups, type CaretValue, type ValuePopupHost } from "spell/app/app/ui/ValuePopups"
import { monaco } from "./monaco"

/****************
 * ### `ValueChoices`
 * An attribute's words, shown quietly under its value once the caret has rested in it (epic `editor` T70),
 * in a Monaco editor:  `spacing="x|s"` shows `none  xs  s  m  l  xl`, `xs` ticked.
 * - What it shows and how its keys work is the editor-neutral `ValuePopups`' choices strip, CodeMirror's too:
 *   this class is only Monaco's wiring onto it.
 *   - Typing or moving the caret restarts its wait;  a scroll or the editor losing the keys hides it.
 *   - ⌥↓ steps in, taking the key from Monaco only when it does;  Ctrl+Space is Monaco's own suggestion list,
 *     which lists the same words.
 *   - Choosing writes the word as ONE undo step, between two undo stops.
 * - The words are the language service's (`attributeValuesAt()`), as the suggestion list's are.
 * - Also makes the Monaco side of `ValuePicker`'s popup:  `hostFor()`.
 * - Plain DOM, one per editor, made as each editor is (`SpellMonaco.register()`).
 ****************/
export class ValueChoices {
  /** The strip, through the editor-neutral popups. */
  private readonly popups: ValuePopups

  constructor(
    editor: monaco.editor.ICodeEditor,
    valuesAt: (model: monaco.editor.ITextModel, position: monaco.Position) => LSP.AttributeValues | undefined
  ) {
    const popups = new ValuePopups(ValueChoices.hostFor(editor, valuesAt))
    this.popups = popups
    editor.onDidChangeCursorPosition(() => popups.restart())
    editor.onDidChangeModelContent(() => popups.restart())
    editor.onDidScrollChange(() => popups.hide())
    editor.onDidBlurEditorText(() => popups.blurred())
    editor.onDidDispose(() => popups.dispose())
    editor.onKeyDown((event) => this.keyDown(event))
  }

  /**
   * What `ValuePopups` needs of a Monaco editor:  its caret's quoted value, its words, its keys.
   * - `valuesAt`:  the attribute's words;  none for the picker, which is handed its words.
   */
  static hostFor(
    editor: monaco.editor.ICodeEditor,
    valuesAt?: (model: monaco.editor.ITextModel, position: monaco.Position) => LSP.AttributeValues | undefined
  ): ValuePopupHost {
    return {
      valueAt: (end) => caretValueOf(editor, end),
      wordsAt: () => {
        const model = editor.getModel()
        const position = editor.getPosition()
        return model && position ? valuesAt?.(model, position)?.values : undefined
      },
      canShowChoices: () => {
        const selections = editor.getSelections() ?? []
        if (selections.length !== 1 || !selections[0]!.isEmpty()) return false
        if (!editor.hasTextFocus() || editor.getRawOptions().readOnly) return false
        return !editor.getDomNode()?.querySelector(SUGGESTIONS_SHOWING)
      },
      focus: () => editor.focus(),
      type: (letter) => {
        editor.focus()
        editor.trigger("keyboard", "type", { text: letter })
      },
      follow: (listener) => {
        const edits = editor.onDidChangeModelContent(() => listener("edit"))
        const scrolls = editor.onDidScrollChange(() => listener("scroll"))
        return () => {
          edits.dispose()
          scrolls.dispose()
        }
      }
    }
  }

  /** ⌥↓ in the code:  the strip's, when it steps in. */
  private keyDown(event: monaco.IKeyboardEvent): void {
    const key = event.browserEvent
    if (key.key !== "ArrowDown" || !key.altKey || key.metaKey || key.ctrlKey || key.shiftKey) return
    // Monaco's words come at once:  never a promise here
    if (this.popups.stepIn() !== true) return
    event.preventDefault()
    event.stopPropagation()
  }
}

////////////////
// ## Types and helpers
////////////////

/** Monaco's list of suggestions, while it shows. */
const SUGGESTIONS_SHOWING = ".suggest-widget.visible"

/** The quoted value at `editor`'s caret, as `ValuePopups` takes it (`LSP.SpellTyping.quotedValueAt()`). */
function caretValueOf(editor: monaco.editor.ICodeEditor, end: LSP.QuotedValueEnd): CaretValue | undefined {
  const model = editor.getModel()
  const position = editor.getPosition()
  if (!model || !position) return undefined
  const { lineNumber } = position
  const found = LSP.SpellTyping.quotedValueAt(model.getLineContent(lineNumber), position.column - 1, end)
  if (!found) return undefined
  const range = new monaco.Range(lineNumber, found.from + 1, lineNumber, found.to + 1)
  return {
    text: model.getValueInRange(range),
    boxOf: (at) => {
      const visible = editor.getScrolledVisiblePosition(at === "start" ? range.getStartPosition() : position)
      const box = editor.getDomNode()?.getBoundingClientRect()
      if (!visible || !box || visible.top < 0 || visible.top > box.height) return undefined
      const top = box.top + visible.top
      return { left: box.left + visible.left, top, bottom: top + visible.height }
    },
    write: (word) => {
      editor.pushUndoStop()
      editor.executeEdits("ValuePopups", [{ range, text: word }])
      editor.pushUndoStop()
      editor.setPosition({ lineNumber, column: range.startColumn + word.length + 1 })
      editor.focus()
    }
  }
}
