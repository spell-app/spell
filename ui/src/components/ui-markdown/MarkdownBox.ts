import { MarkdownFormats, type Edit, type Format, type Shape, type WrapMark } from "./MarkdownFormats"
import type { MarkdownPlaceKind } from "./UIMarkdown.types"

/****************
 * ### `MarkdownBox`
 * The box one piece of `<ui-markdown editable>` becomes while it's edited (epic `epic-engine` P60, P61), with the
 * formatting bar above it.
 * - Two VIEWS, a switch at the bar's end flipping between them (Owen's Q67;  the faded marks first, J195):
 *   - `marks`:  its markdown as plain text, each mark (`**`, a link's address) faint, the words bold, italic or struck
 *     as the marks say;  what's seen is exactly what's saved
 *   - `formatted`:  bold, italic, struck and links drawn, no marks, as a word processor;  written back as markdown
 *     as it's kept (`MarkdownFormats.markdownOf()`).  A piece that wouldn't come back exactly (raw HTML, an escaped
 *     mark) stays in `marks`, and the switch's tooltip says why.
 * - The bar:  bold, italic, strikethrough, link, the piece's shape (Paragraph, H2-H4, bulleted, numbered), clear
 *   formatting, then the switch.  Placed by CSS anchor positioning just above the box (below it near the window's
 *   top):  it never moves the page.  Its buttons never take the focus, so the cursor and selection stay.
 * - Keys:  ⌘B, ⌘I, ⌘K, ⌘⇧X (Ctrl elsewhere), stopped so the window's own (VS Code's) never see them;  never ⌘E,
 *   Claude Code's.
 * - Plain DOM, no Solid:  the box lives inside the rendered article, which the element patches by hand.
 *   Its owner, `UIMarkdown`, keeps and saves what it holds.
 ****************/
export class MarkdownBox {
  /** The editable box, in place of the piece's own content. */
  readonly field: HTMLElement

  /** The formatting bar, in the element's shadow root. */
  readonly bar: HTMLElement

  /** The view it shows. */
  view: BoxView

  /** The piece's shape now:  `undefined` for a table cell, which has none. */
  shape: Shape | undefined

  /** Why the formatted view can't show this piece, when it can't. */
  private readonly unformattable: string | undefined

  /** The bar's buttons, by what they do. */
  private readonly buttons = new Map<BarAction, HTMLElement>()

  /** The shape menu:  Spell UI's `<ui-select>`, so it looks as every dropdown on the page does (Owen's C1 on J196). */
  private readonly shapes: HTMLElement

  /** The link's address field, while it's asked for. */
  private readonly address: HTMLInputElement

  /** The selection the link's address is for, while it's asked. */
  private linkFor: Edit | undefined

  constructor(private readonly props: BoxProps) {
    const { document } = props
    this.shape = props.shape
    const isExact = !!props.renderInline && MarkdownBox.comesBack(props.raw, props.renderInline, document)
    this.unformattable = isExact ? undefined : props.texts(props.renderInline ? "formattedOff" : "noFormattedView")
    this.view = props.view === "formatted" && !this.unformattable ? "formatted" : "marks"
    this.field = document.createElement("span")
    this.field.setAttribute("role", "textbox")
    this.field.setAttribute("aria-label", props.label)
    this.field.setAttribute("part", props.parts.box)
    if (props.kind === "paragraph") this.field.setAttribute("aria-multiline", "true")
    this.field.addEventListener("keydown", this.onKey)
    this.field.addEventListener("input", this.onInput)
    this.field.addEventListener("paste", this.onPaste)
    this.field.addEventListener("focusout", props.onLeave)
    this.field.ownerDocument.addEventListener("selectionchange", this.onSelectionChange)
    this.shapes = document.createElement("ui-select")
    this.address = document.createElement("input")
    this.bar = this.drawBar()
    this.draw(props.raw)
  }

  ////////////////
  // ## Its text
  ////////////////

  /** The markdown it holds now. */
  get raw(): string {
    if (this.view === "formatted") return MarkdownFormats.markdownOf(this.field).replace(/\n$/, "")
    return (this.field.textContent ?? "").replace(/\n$/, "")
  }

  /** Hold `text` instead (Escape's), the cursor at its end. */
  set raw(text: string) {
    this.draw(text)
    this.caret = text.length
  }

  /** The cursor and selection, as offsets into the text it shows;  `undefined` when it's not in the box. */
  get selection(): { start: number; end: number } | undefined {
    const range = MarkdownBox.rangeIn(this.field)
    if (!range) return undefined
    return { start: this.offsetOf(range.startContainer, range.startOffset), end: this.offsetOf(range.endContainer, range.endOffset) }
  }

  /** Put the cursor `offset` characters into the text it shows. */
  set caret(offset: number) {
    this.select(offset, offset)
  }

  /** Focus the box, the cursor `offset` characters in (the end when not given). */
  focus(offset?: number) {
    this.field.focus()
    this.caret = offset ?? (this.field.textContent ?? "").length
    this.showPressed()
  }

  /** Take the box and its bar off the page;  the owner puts the piece back. */
  remove() {
    this.field.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange)
    this.field.removeEventListener("focusout", this.props.onLeave)
    this.bar.remove()
  }

  ////////////////
  // ## Formatting
  ////////////////

  /** Do `action`, from the bar or a key. */
  act(action: BarAction) {
    if (action === "view") return this.switchView()
    if (action === "link") return this.askAddress()
    if (action === "bullet" || action === "numbered") return this.reshape(this.shape === action ? "paragraph" : action)
    if (this.view === "formatted") {
      this.field.ownerDocument.execCommand(FORMATTED_COMMANDS[action])
      if (action === "clear") this.field.ownerDocument.execCommand("unlink")
    } else {
      const edit = this.edit()
      this.apply(action === "clear" ? MarkdownFormats.clear(edit) : MarkdownFormats.toggle(edit, WRAPS[action]))
    }
    this.changed()
  }

  /** Give the piece `shape`:  its line's lead changes as it's kept (`MarkdownFormats.reshape()`). */
  reshape(shape: Shape) {
    if (!this.shape) return
    this.shape = shape
    this.shapes.setAttribute("value", shape.startsWith("h") ? shape : "paragraph")
    this.changed()
  }

  /** Flip between the two views, keeping the text;  the choice is told to the owner, to remember. */
  private switchView() {
    if (this.unformattable) return
    const raw = this.raw
    this.view = this.view === "marks" ? "formatted" : "marks"
    this.draw(raw)
    this.field.focus()
    this.caret = (this.field.textContent ?? "").length
    this.props.onView(this.view)
    this.showPressed()
  }

  /** Ask for the link's address in the bar, for the selection now;  Enter puts it on, Escape goes back. */
  private askAddress() {
    const edit = this.edit()
    this.linkFor = edit
    const link = this.view === "marks" ? MarkdownFormats.linkAt(edit.text, edit.start) : undefined
    const anchor = this.view === "formatted" ? MarkdownBox.rangeIn(this.field)?.startContainer.parentElement?.closest("a") : undefined
    this.address.value = link?.address ?? anchor?.getAttribute("href") ?? ""
    this.address.hidden = false
    this.address.focus()
    this.address.select()
  }

  /** The link's address field's keys:  Enter puts the link on (an empty address takes it off), Escape goes back. */
  private readonly onAddressKey = (event: KeyboardEvent) => {
    event.stopPropagation()
    if (event.key !== "Enter" && event.key !== "Escape") return
    event.preventDefault()
    const edit = this.linkFor
    this.linkFor = undefined
    this.address.hidden = true
    this.field.focus()
    if (!edit) return
    if (event.key === "Escape") return this.select(edit.start, edit.end)
    const address = this.address.value.trim()
    if (this.view === "formatted") {
      this.select(edit.start, edit.end)
      this.field.ownerDocument.execCommand(address ? "createLink" : "unlink", false, address)
    } else this.apply(MarkdownFormats.link(edit, address))
    this.changed()
  }

  ////////////////
  // ## Keys and typing
  ////////////////

  /**
   * The formatting keys:  ⌘B bold, ⌘I italic, ⌘K link, ⌘⇧X strikethrough;  stopped and prevented, so neither the
   * page nor the window acts on them.  The owner's own keys (Enter, Tab, Escape) go on to it.
   */
  private readonly onKey = (event: KeyboardEvent) => {
    const isCommand = event.metaKey || event.ctrlKey
    const action = isCommand && !event.altKey ? KEY_ACTIONS[`${event.shiftKey ? "shift+" : ""}${event.code}`] : undefined
    if (action) {
      event.preventDefault()
      event.stopPropagation()
      return this.act(action)
    }
    // a new line in a paragraph:  a line end in its text, in either view
    if (event.key === "Enter" && event.shiftKey && this.props.kind === "paragraph") {
      event.preventDefault()
      event.stopPropagation()
      this.field.ownerDocument.execCommand("insertText", false, "\n")
      return
    }
    this.props.onKey(event)
  }

  /** Each key:  the marks view drawn again (the cursor kept), and the owner told. */
  private readonly onInput = (event: Event) => {
    if (this.view === "marks" && !(event as InputEvent).isComposing) {
      const at = this.selection
      this.draw(this.field.textContent ?? "")
      if (at) this.select(at.start, at.end)
    }
    this.props.onInput()
    this.showPressed()
  }

  /** Pasting is plain text, in either view. */
  private readonly onPaste = (event: ClipboardEvent) => {
    event.preventDefault()
    const text = event.clipboardData?.getData("text/plain") ?? ""
    this.field.ownerDocument.execCommand("insertText", false, text)
  }

  /** The cursor moved:  the bar's buttons show the formats it's in. */
  private readonly onSelectionChange = () => {
    if (this.field.isConnected) this.showPressed()
  }

  /** What changed by the bar or a key is like a key:  the owner told, the bar redrawn. */
  private changed() {
    this.props.onInput()
    this.showPressed()
  }

  ////////////////
  // ## Drawing
  ////////////////

  /** Draw `raw` as the view says:  marks faint, or formatted. */
  private draw(raw: string) {
    const document = this.field.ownerDocument
    this.field.contentEditable = this.view === "marks" ? "plaintext-only" : "true"
    this.field.dataset.view = this.view
    if (this.view === "formatted") {
      this.field.innerHTML = this.props.renderInline!(raw)
      return
    }
    this.field.replaceChildren(
      ...MarkdownFormats.runsOf(raw).map((run) => {
        if (!run.isMark && !run.formats.length) return document.createTextNode(run.text)
        const span = document.createElement("span")
        span.className = [run.isMark ? "md-mark" : "", ...run.formats.map((format) => `md-${format}`)].join(" ").trim()
        span.textContent = run.text
        return span
      })
    )
  }

  /** The bar:  its buttons, the shape menu, the link's address field, the switch. */
  private drawBar(): HTMLElement {
    const { document, texts, parts } = this.props
    const bar = document.createElement("span")
    bar.setAttribute("part", parts.bar)
    bar.setAttribute("role", "toolbar")
    // a popover the owner shows:  the top layer, so nothing on the page (a stuck title) covers it
    bar.popover = "manual"
    bar.setAttribute("aria-label", texts("formatBar"))
    // a press never takes the focus from the box:  its cursor and selection stay (the menu and field excepted)
    bar.addEventListener("mousedown", (event) => {
      if (!event.composedPath().includes(this.shapes) && event.target !== this.address) event.preventDefault()
    })
    for (const action of BAR_ACTIONS) {
      if (action === "shape") {
        if (this.shape) bar.append(this.drawShapes())
        continue
      }
      if ((action === "bullet" || action === "numbered") && !this.shape) continue
      const button = document.createElement("ui-button")
      button.setAttribute("appearance", "basic")
      button.setAttribute("size", "small")
      button.setAttribute("icon", ICONS[action])
      const tip = action === "view" && this.unformattable ? this.unformattable : texts(action)
      button.setAttribute("title", tip)
      button.setAttribute("aria-label", tip)
      if (action === "view" && this.unformattable) button.setAttribute("disabled", "")
      button.addEventListener("click", () => this.act(action))
      this.buttons.set(action, button)
      bar.append(button)
    }
    this.address.type = "url"
    this.address.hidden = true
    this.address.placeholder = texts("linkAddress")
    this.address.setAttribute("aria-label", texts("linkAddress"))
    this.address.addEventListener("keydown", this.onAddressKey)
    bar.append(this.address)
    return bar
  }

  /** The shape menu:  Paragraph, H2, H3, H4 (a list is the list buttons'). */
  private drawShapes(): HTMLElement {
    const { document, texts } = this.props
    for (const shape of MENU_SHAPES) {
      const item = document.createElement("ui-item")
      item.setAttribute("value", shape)
      item.textContent = texts(SHAPE_TEXTS[shape as MenuShape])
      this.shapes.append(item)
    }
    this.shapes.setAttribute("size", "small")
    // its menu opens on the bar's own ground:  a theme's see-through surface let the page show through.  Set on the
    // element, as a page sets a component's token:  a component's sheet never declares another's (epic `epic-engine` r55)
    this.shapes.style.setProperty("--ui-select-picker-background", "var(--_ui-markdown-bar-background)")
    this.shapes.setAttribute("value", this.shape?.startsWith("h") ? this.shape : "paragraph")
    this.shapes.setAttribute("aria-label", texts("shape"))
    this.shapes.title = texts("shape")
    this.shapes.addEventListener("ui-changed", (event) => {
      const { value } = (event as CustomEvent<{ value: string }>).detail
      if (value === this.shape) return
      this.reshape(value as Shape)
      this.field.focus()
    })
    return this.shapes
  }

  /** The bar's buttons pressed for the formats the cursor is in, the list buttons for the shape, the switch for the view. */
  private showPressed() {
    const formats = this.formatsNow()
    for (const [action, button] of this.buttons) {
      const isOn =
        action === "view"
          ? this.view === "formatted"
          : action === "bullet" || action === "numbered"
            ? this.shape === action
            : formats.has(action as Format)
      button.toggleAttribute("active", isOn)
    }
  }

  /** The formats the cursor is in now, as either view knows them. */
  private formatsNow(): Set<Format> {
    if (this.view === "marks") {
      const at = this.selection
      return at ? MarkdownFormats.formatsAt(this.field.textContent ?? "", at.start) : new Set()
    }
    const document = this.field.ownerDocument
    const formats = new Set<Format>()
    for (const [format, command] of Object.entries(FORMAT_STATES) as [Format, string][]) {
      if (command && document.queryCommandState(command)) formats.add(format)
    }
    const node = MarkdownBox.rangeIn(this.field)?.startContainer
    if ((node?.nodeType === 1 ? (node as Element) : node?.parentElement)?.closest("a")) formats.add("link")
    return formats
  }

  ////////////////
  // ## Selection
  ////////////////

  /** The text the marks view shows and its selection, for a format. */
  private edit(): Edit {
    const text = this.field.textContent ?? ""
    const at = this.selection ?? { start: text.length, end: text.length }
    return { text, ...at }
  }

  /** Show `edit`'s text in the marks view, its selection selected. */
  private apply(edit: Edit) {
    this.draw(edit.text)
    this.select(edit.start, edit.end)
  }

  /** Select from `start` to `end`, offsets into the text it shows. */
  private select(start: number, end: number) {
    const [startNode, startOffset] = this.pointAt(start)
    const [endNode, endOffset] = this.pointAt(end)
    const selection = this.field.ownerDocument.getSelection()
    selection?.setBaseAndExtent(startNode, startOffset, endNode, endOffset)
  }

  /** The DOM point `offset` characters into the box's text. */
  private pointAt(offset: number): [Node, number] {
    const walker = this.field.ownerDocument.createTreeWalker(this.field, NodeFilter.SHOW_TEXT)
    let left = offset
    let last: Text | undefined
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (left <= node.data.length) return [node, left]
      left -= node.data.length
      last = node
    }
    return last ? [last, last.data.length] : [this.field, this.field.childNodes.length]
  }

  /** How many characters of the box's text come before `node` at `offset`. */
  private offsetOf(node: Node, offset: number): number {
    const before = this.field.ownerDocument.createRange()
    before.setStart(this.field, 0)
    before.setEnd(node, offset)
    return before.toString().length
  }

  ////////////////
  // ## Helpers:  static, as they're pure
  ////////////////

  /** The selection's range, when it's inside `field` (its shadow root's own, where the browser has one). */
  private static rangeIn(field: HTMLElement): Range | undefined {
    const root = field.getRootNode() as ShadowRoot & { getSelection?: () => Selection | null }
    const selection = root.getSelection?.() ?? field.ownerDocument.getSelection()
    if (!selection?.rangeCount) return undefined
    const range = selection.getRangeAt(0)
    return field.contains(range.startContainer) ? range : undefined
  }

  /**
   * Does `raw`, shown formatted and written back, come back as the same text?  Not with raw HTML, an escaped mark,
   * or `_x_` (written back `*x*`):  then it stays in the marks view.
   */
  private static comesBack(raw: string, renderInline: (text: string) => string, document: Document): boolean {
    const holder = document.createElement("span")
    holder.innerHTML = renderInline(raw)
    return MarkdownFormats.markdownOf(holder) === raw
  }
}

/** What the box is made with. */
export type BoxProps = {
  /** the page */
  document: Document
  /** the piece's kind */
  kind: MarkdownPlaceKind
  /** its markdown */
  raw: string
  /** its shape:  `undefined` for a table cell */
  shape: Shape | undefined
  /** the box's accessible name */
  label: string
  /** the part names, as the element's vocabulary says them */
  parts: { box: string; bar: string }
  /** the element's texts, by key */
  texts: (key: string) => string
  /** the view last chosen in this browser */
  view: BoxView
  /** the engine's inline render:  the formatted view;  none, only the marks view */
  renderInline?: (text: string) => string
  /** a key the box doesn't take:  the owner's (Enter, Tab, Escape, Home, End) */
  onKey: (event: KeyboardEvent) => void
  /** the text changed */
  onInput: () => void
  /** the focus left the box */
  onLeave: (event: FocusEvent) => void
  /** the view was switched:  to remember */
  onView: (view: BoxView) => void
}

/** The box's two views:  its markdown with the marks faint, or formatted only. */
export type BoxView = "marks" | "formatted"

/** What the bar does, in its order. */
export type BarAction = "bold" | "italic" | "strikethrough" | "link" | "shape" | "bullet" | "numbered" | "clear" | "view"

/** The bar's actions, in its order. */
const BAR_ACTIONS: BarAction[] = ["bold", "italic", "strikethrough", "link", "shape", "bullet", "numbered", "clear", "view"]

/** The shape menu's shapes. */
const MENU_SHAPES = ["paragraph", "h2", "h3", "h4"] as const

/** One of `MENU_SHAPES`. */
type MenuShape = (typeof MENU_SHAPES)[number]

/** Each menu shape's text key. */
const SHAPE_TEXTS: Record<MenuShape, string> = {
  paragraph: "shapeParagraph",
  h2: "shapeH2",
  h3: "shapeH3",
  h4: "shapeH4"
}

/** Each button's icon. */
const ICONS: Record<Exclude<BarAction, "shape">, string> = {
  bold: "bold",
  italic: "italic",
  strikethrough: "strikethrough",
  link: "link",
  bullet: "list ul",
  numbered: "list ol",
  clear: "eraser",
  view: "eye"
}

/** The mark each wrapping format puts on, in the marks view. */
const WRAPS: Record<string, WrapMark> = { bold: "**", italic: "*", strikethrough: "~~" }

/** The editing command each format is in the formatted view. */
const FORMATTED_COMMANDS: Record<string, string> = {
  bold: "bold",
  italic: "italic",
  strikethrough: "strikeThrough",
  clear: "removeFormat"
}

/** The command whose state says the cursor is in each format, in the formatted view;  a link is its `<a>`. */
const FORMAT_STATES: Record<Format, string> = { bold: "bold", italic: "italic", strikethrough: "strikeThrough", link: "" }

/** The formatting keys, by `KeyboardEvent.code` (Shift first):  never `KeyE`, Claude Code's. */
const KEY_ACTIONS: Record<string, BarAction> = {
  KeyB: "bold",
  KeyI: "italic",
  KeyK: "link",
  "shift+KeyX": "strikethrough"
}
