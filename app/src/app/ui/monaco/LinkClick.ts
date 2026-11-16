import { after, type CancelablePromise } from "spell/util/timing"
import { CodeEditorFeatures, type AddressAt as AddressInLine } from "spell/app/app/ui/CodeEditorFeatures"
import { monaco } from "./monaco"

/****************
 * ### `LinkClick`
 * A web address in the code opens in a new tab on ⌘-click (Ctrl-click off a Mac), as in VS Code (epic `editor` I101).
 * - Owen, on the address in Solitaire's description:  "The URL should be clickable".
 *   Monaco opens a link with the key that ISN'T its multi-cursor key, and hover "Only with ⌥ held" makes ⌘ that key
 *   (`codePopups`), so its links wanted ⌥-click, which nobody would guess.
 *   So this opens them itself, with ⌘, in every hover mode:  ⌘-click on anything else still adds a cursor.
 * - Any `http://` or `https://` address, in a comment or anywhere:
 *   a `(` ... `)` inside it is its own (`Klondike_(solitaire)`), one closing it isn't (a Markdown link's).
 * - After each one, a small "open" icon (Font Awesome's `up-right-from-square`):  a plain click on it opens it
 *   (Owen:  "can we put the "up right from square" icon after the url and make that clickable without modifier keys?").
 *   - Drawn as text Monaco adds after the address (`after`, injected text), not in the code:
 *     the caret never lands in it, and copying the line leaves it out.
 *   - Muted, the link's colour when hovered (`MonacoEditor.css`, `.LinkClickIcon`);  in the bubbly look too.
 * - With ⌘ held over one, the pointer shows a hand, and the address is underlined;  a plain hover says how
 *   ("⌘-click to open"), after the hover's delay, as `ErrorHover` shows an error.
 * - Takes the click before Monaco does (a capturing listener), so ⌘-click on an address adds no cursor,
 *   and a click on its icon moves no caret;
 *   the bubbly look's shapes take no clicks, so it works there too.
 * - One per editor, made as each editor is (`SpellMonaco.register()`).
 * - Where the addresses are, which key opens them and the tip's words are `CodeEditorFeatures`':
 *   CodeMirror's twin is `CodeMirrorLinks` (epic `codemirror` P5).
 ****************/
export class LinkClick implements monaco.editor.IContentWidget {
  /** The tip:  "⌘-click to open". */
  private readonly node = document.createElement("div")
  /** The address under the mouse, if any. */
  private under: AddressAt | undefined
  /** The ⌘ (or Ctrl) key, held as the mouse last moved. */
  private isKeyHeld = false
  /** Its underline and hand, while ⌘ is held over it. */
  private readonly marks: monaco.editor.IEditorDecorationsCollection
  /** The icon after each address in the code. */
  private readonly icons: monaco.editor.IEditorDecorationsCollection
  /** Shows the tip, once the hover's delay has passed. */
  private timer: CancelablePromise<void> | undefined
  /** The tip's in the editor's content widgets? */
  private isAdded = false

  constructor(private readonly editor: monaco.editor.ICodeEditor) {
    this.node.className = "monaco-hover LinkClickTip"
    this.marks = editor.createDecorationsCollection()
    this.icons = editor.createDecorationsCollection()
    this.drawIcons()
    editor.onMouseMove((event) => this.moved(event))
    editor.onMouseLeave(() => this.left())
    editor.onKeyDown((event) => this.keyChanged(event.browserEvent))
    editor.onKeyUp((event) => this.keyChanged(event.browserEvent))
    editor.onDidScrollChange(() => this.left())
    editor.onDidChangeModelContent(() => {
      this.left()
      this.drawIcons()
    })
    editor.onDidChangeModel(() => {
      this.left()
      this.drawIcons()
    })
    editor.onDidDispose(() => this.left())
    // before Monaco's own, which would add a cursor:  it listens for the pointer, and the mouse too
    // on its container:  its own node is made only once it has a model
    const container = editor.getContainerDomNode()
    container.addEventListener("pointerdown", this.pressed, { capture: true })
    container.addEventListener("mousedown", this.swallowed, { capture: true })
  }

  ////////////////
  // ## The mouse
  ////////////////

  /** A press on an address's icon, or on the address with ⌘ held:  open it, and nothing else happens. */
  private readonly pressed = (event: PointerEvent) => {
    const address = this.addressPressed(event)
    if (!address) return
    event.preventDefault()
    event.stopPropagation()
    window.open(address.url, "_blank", "noopener")
  }

  /** The same press, as the mouse's:  Monaco hears nothing of it. */
  private readonly swallowed = (event: MouseEvent) => {
    if (!this.addressPressed(event)) return
    event.preventDefault()
    event.stopPropagation()
  }

  /** The address `event` pressed:  its icon, or the address itself with ⌘ held;  else none. */
  private addressPressed(event: MouseEvent): AddressAt | undefined {
    if (event.button !== 0) return undefined
    const onIcon = event.composedPath().some((node) => (node as Element).classList?.contains(ICON_CLASS))
    if (!onIcon && !CodeEditorFeatures.isOpenKey(event)) return undefined
    const target = this.editor.getTargetAtClientPoint(event.clientX, event.clientY)
    if (!target) return undefined
    return onIcon ? this.addressEndingAt(target) : this.addressAt(target)
  }

  /** The mouse moved:  mark the address under it, if ⌘ is held;  else, after the hover's delay, say how to open it. */
  private moved(event: monaco.editor.IEditorMouseEvent): void {
    // over its icon:  that opens with a plain click, so no tip, and no underline
    const isOnIcon = !!event.target.element?.classList.contains(ICON_CLASS)
    const address = isOnIcon ? undefined : this.addressAt(event.target)
    this.isKeyHeld = CodeEditorFeatures.isOpenKey(event.event.browserEvent)
    if (address?.url !== this.under?.url || !sameRange(address?.range, this.under?.range)) {
      this.hideTip()
      this.under = address
      if (address)
        this.timer = after(this.editor.getOption(monaco.editor.EditorOption.hover).delay / 1000, () => this.showTip())
    }
    this.mark()
  }

  /** ⌘ pressed or let go with the mouse still:  mark it, or not. */
  private keyChanged(event: KeyboardEvent): void {
    this.isKeyHeld = CodeEditorFeatures.isOpenKey(event)
    this.mark()
  }

  /** The mouse left, or the code moved under it:  nothing's under it. */
  private left(): void {
    this.under = undefined
    this.hideTip()
    this.mark()
  }

  /** The underline and hand on the address under the mouse, while ⌘ is held. */
  private mark(): void {
    const { under } = this
    this.marks.set(
      under && this.isKeyHeld ? [{ range: under.range, options: { inlineClassName: "LinkClickReady" } }] : []
    )
  }

  /** The address at `target`, if it's over one. */
  private addressAt(target: monaco.editor.IMouseTarget): AddressAt | undefined {
    const model = this.editor.getModel()
    if (!model || !target.position || target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) return undefined
    const { lineNumber, column } = target.position
    const address = CodeEditorFeatures.addressAt(model.getLineContent(lineNumber), column - 1)
    return address && rangeOf(address, lineNumber)
  }

  /** The address whose icon is at `target`:  the one on its line ending nearest it. */
  private addressEndingAt(target: monaco.editor.IMouseTarget): AddressAt | undefined {
    const model = this.editor.getModel()
    const { position } = target
    if (!model || !position) return undefined
    const distance = (address: AddressAt) => Math.abs(address.range.endColumn - position.column)
    const onLine = addressesIn(model.getLineContent(position.lineNumber), position.lineNumber)
    return onLine.sort((a, b) => distance(a) - distance(b))[0]
  }

  ////////////////
  // ## The icons
  ////////////////

  /** An icon after each address in the code, drawn again as the code changes. */
  private drawIcons(): void {
    const model = this.editor.getModel()
    const icons: monaco.editor.IModelDeltaDecoration[] = []
    const pattern = CodeEditorFeatures.ADDRESS.source
    for (const match of model?.findMatches(pattern, false, true, false, null, false) ?? []) {
      const { startLineNumber: line } = match.range
      for (const address of addressesIn(model!.getLineContent(line), line)) {
        if (address.range.startColumn !== match.range.startColumn) continue
        // on the address itself:  Monaco draws `after` text on an empty range only with `showIfCollapsed`
        icons.push({ range: address.range, options: ICON })
      }
    }
    this.icons.set(icons)
  }

  ////////////////
  // ## The tip
  ////////////////

  /** Show "⌘-click to open" over the address. */
  private showTip(): void {
    if (!this.under) return
    // its words now, in the app's language now
    this.node.textContent = CodeEditorFeatures.linkTip()
    if (this.isAdded) this.editor.layoutContentWidget(this)
    else this.editor.addContentWidget(this)
    this.isAdded = true
  }

  /** Hide the tip, and forget it was about to show. */
  private hideTip(): void {
    this.timer?.cancel()
    this.timer = undefined
    if (!this.isAdded) return
    this.editor.removeContentWidget(this)
    this.isAdded = false
  }

  ////////////////
  // ## Monaco's content widget
  ////////////////

  /** Draws outside the editor's box, as Monaco's hover does. */
  readonly allowEditorOverflow = true

  getId(): string {
    return "spell.linkClick"
  }

  getDomNode(): HTMLElement {
    return this.node
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    const { ABOVE, BELOW } = monaco.editor.ContentWidgetPositionPreference
    const start = this.under?.range.getStartPosition()
    return start ? { position: start, preference: [ABOVE, BELOW] } : null
  }
}

/** An address in a line of code, and where it is. */
type AddressAt = {
  /** the address:  `https://en.wikipedia.org/wiki/Klondike_(solitaire)` */
  url: string
  /** where it is in the code */
  range: monaco.Range
}

/** The class of the icon after each address:  a click on it opens the address. */
const ICON_CLASS = "LinkClickIcon"

/** The icon's decoration:  a space of text Monaco adds after the address, the icon drawn on it by CSS. */
const ICON: monaco.editor.IModelDecorationOptions = {
  after: {
    content: "\u00a0",
    inlineClassName: ICON_CLASS,
    cursorStops: monaco.editor.InjectedTextCursorStops.None
  }
}

/** Every address in `line`, line `lineNumber` of the code. */
function addressesIn(line: string, lineNumber: number): AddressAt[] {
  return CodeEditorFeatures.addressesIn(line).map((address) => rangeOf(address, lineNumber))
}

/** `address`, found in line `lineNumber`, with its range in the code. */
function rangeOf({ url, start, end }: AddressInLine, lineNumber: number): AddressAt {
  return { url, range: new monaco.Range(lineNumber, start + 1, lineNumber, end + 1) }
}

/** Are `a` and `b` the same range, or both none? */
function sameRange(a: monaco.Range | undefined, b: monaco.Range | undefined): boolean {
  return a === b || (!!a && !!b && a.equalsRange(b))
}
