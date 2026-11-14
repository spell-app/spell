import type { LSP } from "spell/app/lsp"
import { monaco } from "./monaco"

import "./ValueChoices.css"

/****************
 * ### `ValueChoices`
 * An attribute's words, shown quietly under its value once the caret has rested in it (epic `editor` T70):
 * `spacing="x|s"` shows `none  xs  s  m  l  xl`, `xs` ticked.
 * - Owen:  "would be cool if there was a way to invoke the menu of options for this attribute when cursor is here ...
 *   It can't get in the way of typing.  Also, can wait 1s before showing, so it doesn't flicker too much."
 * - After 1 second with the caret in a quoted value and nothing typed (`REST_MS`);  typing, moving the caret,
 *   a scroll or the suggestion list showing hides it at once.
 * - It never takes the keys:  they go on to the code.  To step in:
 *   - ⌥↓ shows it at once if it isn't yet, and moves the keys into it:  ←/→ (or ↑/↓) between words, Enter to choose,
 *     Esc back to the code
 *   - a click on a word chooses it
 *   - Ctrl+Space is Monaco's own suggestion list, which lists the same words
 * - Choosing writes the word between the quotes as ONE undo step, the caret after the closing quote.
 * - The words are the language service's (`attributeValuesAt()`), as the suggestion list's are;
 *   only an attribute that lists its words, and not more than `MOST_WORDS` of them.
 * - In the page's `<body>`, placed under the value, as `ValuePicker` is:  so no pane clips it.
 * - Plain DOM, one per editor, made as each editor is (`SpellMonaco.register()`).
 ****************/
export class ValueChoices {
  /** The strip of words, while it shows. */
  private node: HTMLElement | undefined
  /** The value it's for:  its text inside its quotes. */
  private range: monaco.IRange | undefined
  /** The wait before it shows. */
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly editor: monaco.editor.ICodeEditor,
    private readonly valuesAt: (
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ) => LSP.AttributeValues | undefined
  ) {
    editor.onDidChangeCursorPosition(() => this.restart())
    editor.onDidChangeModelContent(() => this.restart())
    editor.onDidScrollChange(() => this.hide())
    editor.onDidBlurEditorText(() => queueMicrotask(() => this.isFocused || this.hide()))
    editor.onDidDispose(() => this.hide())
    editor.onKeyDown((event) => this.keyDown(event))
  }

  ////////////////
  // ## Showing
  ////////////////

  /** Hide it, and wait again for the caret to rest in a value. */
  private restart(): void {
    this.hide()
    if (quotedValueAt(this.editor)) this.timer = setTimeout(() => this.show(), REST_MS)
  }

  /**
   * Show the words of the value the caret is in, under it.
   * - Returns whether it showed:  not with a selection or several carets, the suggestion list or another popup up,
   *   nor for a value whose attribute lists no words.
   */
  private show(): boolean {
    const { editor } = this
    clearTimeout(this.timer)
    const model = editor.getModel()
    const position = editor.getPosition()
    const range = quotedValueAt(editor)
    const selections = editor.getSelections() ?? []
    if (!model || !position || !range || selections.length !== 1 || !selections[0]!.isEmpty()) return false
    if (!editor.hasTextFocus() || editor.getRawOptions().readOnly) return false
    if (editor.getDomNode()?.querySelector(SUGGESTIONS_SHOWING) || document.querySelector(".ValuePicker")) return false
    const values = this.valuesAt(model, position)?.values
    if (!values?.length || values.length > MOST_WORDS) return false
    this.hide()
    this.range = range
    const current = model.getValueInRange(range)
    const node = document.createElement("div")
    node.className = "ValueChoices"
    node.setAttribute("role", "listbox")
    node.setAttribute("aria-orientation", "horizontal")
    for (const value of values) {
      const word = document.createElement("button")
      word.type = "button"
      word.className = "ValueChoicesWord"
      word.tabIndex = -1
      word.textContent = value
      word.setAttribute("role", "option")
      word.setAttribute("aria-selected", String(value === current))
      // a click chooses, the keys staying with the code
      word.addEventListener("mousedown", (event) => event.preventDefault())
      word.addEventListener("click", () => this.choose(value))
      node.append(word)
    }
    node.addEventListener("keydown", (event) => this.listKeyDown(event))
    document.body.append(node)
    this.node = node
    this.place()
    return true
  }

  /** Under the value's start, or over it where the window has no room below. */
  private place(): void {
    const { editor, node, range } = this
    const at =
      node &&
      range &&
      editor.getScrolledVisiblePosition({ lineNumber: range.startLineNumber, column: range.startColumn })
    const box = editor.getDomNode()?.getBoundingClientRect()
    if (!node || !at || !box) return
    const height = node.offsetHeight
    const below = box.top + at.top + at.height + GAP
    const above = box.top + at.top - GAP - height
    node.style.left = `${Math.max(GAP, Math.min(box.left + at.left, innerWidth - node.offsetWidth - GAP))}px`
    node.style.top = `${below + height > innerHeight - GAP && above > GAP ? above : below}px`
  }

  /** Hide it, and stop waiting to show it. */
  private hide(): void {
    clearTimeout(this.timer)
    this.timer = undefined
    this.node?.remove()
    this.node = undefined
    this.range = undefined
  }

  /** Are the keys in the list, by ⌥↓? */
  private get isFocused(): boolean {
    return !!this.node?.contains(document.activeElement)
  }

  ////////////////
  // ## Choosing
  ////////////////

  /** ⌥↓ in the code:  show it now if it isn't, and move the keys into it, on the current word. */
  private keyDown(event: monaco.IKeyboardEvent): void {
    const key = event.browserEvent
    if (key.key !== "ArrowDown" || !key.altKey || key.metaKey || key.ctrlKey || key.shiftKey) return
    if (!this.node && !(quotedValueAt(this.editor) && this.show())) return
    event.preventDefault()
    event.stopPropagation()
    const words = this.words
    const current = words.find((word) => word.getAttribute("aria-selected") === "true") ?? words[0]
    current?.focus()
  }

  /** The keys while the list has them:  arrows between words, Enter chooses, Esc goes back to the code. */
  private listKeyDown(event: KeyboardEvent): void {
    const words = this.words
    const at = words.indexOf(document.activeElement as HTMLButtonElement)
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key]
    if (step) words[Math.max(0, Math.min(words.length - 1, at + step))]?.focus()
    else if (event.key === "Enter" && at >= 0) this.choose(words[at]!.textContent ?? "")
    else if (event.key === "Escape" || event.key === "Tab") {
      this.hide()
      this.editor.focus()
    } else return
    event.preventDefault()
    event.stopPropagation()
  }

  /** The list's words. */
  private get words(): HTMLButtonElement[] {
    return [...(this.node?.querySelectorAll<HTMLButtonElement>(".ValueChoicesWord") ?? [])]
  }

  /** Write `value` between the quotes, ONE undo step, the caret after the closing quote. */
  private choose(value: string): void {
    const { editor, range } = this
    this.hide()
    if (!range) return
    editor.pushUndoStop()
    editor.executeEdits("ValueChoices", [{ range, text: value }])
    editor.pushUndoStop()
    editor.setPosition({ lineNumber: range.startLineNumber, column: range.startColumn + value.length + 1 })
    editor.focus()
    // the caret moved:  it's left, not resting in the value again
    this.hide()
  }
}

////////////////
// ## Types and helpers
////////////////

/** How long the caret rests in a value, nothing typed, before its words show:  Owen's "can wait 1s". */
const REST_MS = 1000

/** The most words it shows:  a longer list (icons ...) is the suggestion list's, Ctrl+Space. */
const MOST_WORDS = 40

/** Between the strip and the value's line, and the window's edges, in px. */
const GAP = 4

/** Monaco's list of suggestions, while it shows. */
const SUGGESTIONS_SHOWING = ".suggest-widget.visible"

/**
 * The attribute value the caret is in, inside its quotes:  `spacing="x|s"` => the range of `xs`.
 * - On the caret's line only, as an attribute's value is;  `name="` right before it, so a quoted name isn't one.
 */
function quotedValueAt(editor: monaco.editor.ICodeEditor): monaco.IRange | undefined {
  const model = editor.getModel()
  const position = editor.getPosition()
  if (!model || !position) return undefined
  const line = model.getLineContent(position.lineNumber)
  const caret = position.column - 1
  const open = /[\p{L}\p{M}\d-]="[^"]*$/u.exec(line.slice(0, caret))
  if (!open) return undefined
  const start = line.indexOf('"', open.index) + 1
  const close = line.indexOf('"', caret)
  if (close < 0) return undefined
  return new monaco.Range(position.lineNumber, start + 1, position.lineNumber, close + 1)
}
