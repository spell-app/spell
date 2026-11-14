import type { SP } from "spell/parser/spell"
import { monaco } from "./monaco"

import "./ValuePicker.css"

/****************
 * ### `ValuePicker`
 * An attribute's value picked rather than typed, in a popup at the caret (epic `editor` T61):
 * the color palette for `color="|"`, the icon picker for `icon="|"`.
 * - Owen, on I55:  "Is it possible to show a custom menu here?  e.g. for `color`, we could show the color pallete,
 *   `icon` could show the icon picker".
 * - Opened by the words list's first row, "Pick a color…" (`LSP.PICK_VALUE_COMMAND`):  the list opens there anyway,
 *   so a picker opening by itself would fight it for the keys;  a row is one more choice in the list already showing.
 * - Which attribute takes which picker is Spell UI's to say (`SP.ComponentValuePicker`), in the file's language:
 *   no tag is named here.
 * - Picking writes the value between the quotes as ONE undo step, the caret after the closing quote.
 * - Esc, a click outside, or typing closes it and changes nothing;  a letter typed goes on into the code.
 * - In the page's `<body>`, placed at the caret:  so no pane clips it.  ONE at a time.
 * - Plain DOM;  the icon picker is Spell UI's `<ui-icon-picker>`, opened at once.
 ****************/
export class ValuePicker {
  /** The one showing, if any. */
  private static current: ValuePicker | undefined

  /**
   * Open the picker `picker` says at `editor`'s caret, for the quoted value it's in.
   * - `values`:  the attribute's words, as the file's language writes them (a palette's, each `picker.colors`' colour).
   * - NEVER throws:  no quoted value at the caret, nothing opens.
   */
  static open(editor: monaco.editor.ICodeEditor, picker: SP.ComponentValuePicker, values: readonly string[]): void {
    ValuePicker.current?.close()
    const quoted = quotedValueAt(editor)
    if (!quoted) return
    ValuePicker.current = new ValuePicker(editor, quoted, picker, values)
  }

  /** The popup, in `<body>`. */
  private readonly node = document.createElement("div")
  /** What closes it:  the listeners it added. */
  private readonly cleanups: (() => void)[] = []

  private constructor(
    private readonly editor: monaco.editor.ICodeEditor,
    /** The quoted value's text, inside its quotes:  what a pick replaces. */
    private readonly range: monaco.IRange,
    picker: SP.ComponentValuePicker,
    values: readonly string[]
  ) {
    this.node.className = `ValuePicker ValuePicker-${picker.kind}`
    document.body.append(this.node)
    if (picker.kind === "color") this.drawPalette(values, picker.colors)
    else this.drawIconPicker()
    // drawn first:  its size says whether it fits below the caret
    this.place()
    this.listen()
  }

  ////////////////
  // ## Drawing
  ////////////////

  /** Each colour a round chip with its word, in a grid;  the first focused. */
  private drawPalette(values: readonly string[], colors: readonly string[]): void {
    const current = this.currentValue
    const chips = values.map((value, index) => {
      const chip = document.createElement("button")
      chip.type = "button"
      chip.className = "ValuePickerChip"
      chip.title = value
      chip.toggleAttribute("aria-pressed", value === current)
      const swatch = document.createElement("span")
      swatch.className = "ValuePickerSwatch"
      swatch.style.background = colors[index] ?? "transparent"
      const word = document.createElement("span")
      word.textContent = value
      chip.append(swatch, word)
      chip.addEventListener("click", () => this.pick(value))
      return chip
    })
    this.node.setAttribute("role", "listbox")
    this.node.append(...chips)
    ;(chips.find((chip) => chip.hasAttribute("aria-pressed")) ?? chips[0])?.focus()
  }

  /** Spell UI's icon picker, its panel open and searching;  its own keys (arrows, Enter, Esc) work as ever. */
  private drawIconPicker(): void {
    const iconPicker = document.createElement("ui-icon-picker") as HTMLElement & {
      value: string
      ready: Promise<void>
      component?: { open(query?: string): boolean }
    }
    iconPicker.value = this.currentValue
    iconPicker.setAttribute("aria-label", "icon")
    iconPicker.addEventListener("ui-changed", (event) => {
      const { value } = (event as CustomEvent<{ value?: string }>).detail
      if (value) this.pick(value)
    })
    // its panel closing (Esc, a click outside) closes us:  after a pick, `pick()` already has
    iconPicker.addEventListener("ui-closing", () => queueMicrotask(() => this.close()))
    this.node.append(iconPicker)
    void iconPicker.ready
      .then(() => iconPicker.component?.open())
      .catch((error: unknown) => console.error("ValuePicker:  the icon picker didn't open", error))
  }

  /**
   * Just under the caret, or just over it where the window has no room below;  kept inside the window.
   * - `false` once the caret is scrolled out of the editor's view.
   */
  private place(): boolean {
    const position = this.editor.getPosition()
    const at = position && this.editor.getScrolledVisiblePosition(position)
    const box = this.editor.getDomNode()?.getBoundingClientRect()
    if (!at || !box || at.top < 0 || at.top > box.height) return false
    const height = this.node.offsetHeight
    const below = box.top + at.top + at.height + GAP
    const above = box.top + at.top - GAP - height
    this.node.style.left = `${Math.max(GAP, Math.min(box.left + at.left, innerWidth - this.node.offsetWidth - GAP))}px`
    this.node.style.top = `${below + height > innerHeight - GAP && above > GAP ? above : below}px`
    return true
  }

  ////////////////
  // ## Picking
  ////////////////

  /** What's between the quotes now. */
  private get currentValue(): string {
    return this.editor.getModel()?.getValueInRange(this.range) ?? ""
  }

  /** Write `value` between the quotes, ONE undo step, the caret after the closing quote;  then close. */
  private pick(value: string): void {
    const { editor, range } = this
    this.close()
    editor.pushUndoStop()
    editor.executeEdits("ValuePicker", [{ range, text: value }])
    editor.pushUndoStop()
    const after = { lineNumber: range.startLineNumber, column: range.startColumn + value.length + 1 }
    editor.setPosition(after)
    editor.focus()
  }

  /** Close it, writing nothing. */
  private close(): void {
    if (ValuePicker.current === this) ValuePicker.current = undefined
    for (const cleanup of this.cleanups.splice(0)) cleanup()
    this.node.remove()
  }

  /** Esc, a click outside, typing, an edit or the caret scrolled out of view closes it;  a letter typed goes on into the code. */
  private listen(): void {
    const onKey = (event: KeyboardEvent) => {
      if (!this.node.contains(event.target as Node) || this.node.querySelector("ui-icon-picker")) return
      if (event.key === "Escape") {
        event.preventDefault()
        this.close()
        this.editor.focus()
      } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && event.key !== " ") {
        event.preventDefault()
        this.close()
        this.editor.focus()
        this.editor.trigger("keyboard", "type", { text: event.key })
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault()
        this.moveFocus(event.key)
      }
    }
    const onDown = (event: PointerEvent) => {
      if (event.composedPath().includes(this.node)) return
      // the icon picker's panel is in the top layer, outside us:  it closes us itself
      if (event.composedPath().some((at) => at instanceof Element && at.localName === "ui-icon-picker")) return
      this.close()
    }
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("pointerdown", onDown, true)
    const edits = this.editor.onDidChangeModelContent(() => this.close())
    // a scroll moves it with the caret (the icon picker's search box, focused, scrolls the editor);  out of view, it goes
    const scrolls = this.editor.onDidScrollChange(() => this.place() || this.close())
    this.cleanups.push(
      () => document.removeEventListener("keydown", onKey, true),
      () => document.removeEventListener("pointerdown", onDown, true),
      () => edits.dispose(),
      () => scrolls.dispose()
    )
  }

  /** The arrow keys move between the palette's chips, by row and column. */
  private moveFocus(key: string): void {
    const chips = [...this.node.querySelectorAll<HTMLElement>(".ValuePickerChip")]
    const at = chips.indexOf(document.activeElement as HTMLElement)
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -PALETTE_COLUMNS, ArrowDown: PALETTE_COLUMNS }[key] ?? 0
    chips[Math.max(0, Math.min(chips.length - 1, at + step))]?.focus()
  }
}

/** The palette's chips to a row:  `ValuePicker.css`'s grid. */
const PALETTE_COLUMNS = 3

/** Between the popup and the caret's line, and the window's edges, in px. */
const GAP = 4

/**
 * The quoted value the caret is in, inside its quotes:  `color="pri|"` => the range of `pri`.
 * - On the caret's line only, as an attribute's value is.
 */
function quotedValueAt(editor: monaco.editor.ICodeEditor): monaco.IRange | undefined {
  const model = editor.getModel()
  const position = editor.getPosition()
  if (!model || !position) return undefined
  const line = model.getLineContent(position.lineNumber)
  const caret = position.column - 1
  const open = line.lastIndexOf('="', caret - 1)
  if (open < 0 || line.slice(open + 2, caret).includes('"')) return undefined
  const close = line.indexOf('"', caret)
  return new monaco.Range(position.lineNumber, open + 3, position.lineNumber, (close < 0 ? caret : close) + 1)
}
