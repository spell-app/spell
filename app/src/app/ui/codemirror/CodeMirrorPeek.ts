import { EditorState, type Extension, Prec, StateEffect, StateField } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, keymap, WidgetType } from "@codemirror/view"

import type { SP } from "spell/parser/spell"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { CodeMirrorSetup } from "./CodeMirrorSetup"
import type { FileStates } from "./FileStates"
import { LspToCodeMirror, type CodeMirrorLocation } from "./LspToCodeMirror"

import "./CodeMirrorPeek.css"

/****************
 * ### `CodeMirrorPeek`
 * Peek Definition (⌥F12) and Peek References (⇧⌥F12):  a box under the caret's line, showing where a thing is declared,
 * or each place it's used, without leaving the code (epic `codemirror` I5;  Monaco's peek view).
 * - The box shows the place's file, scrolled to it, its words marked:
 *   a slice of that file's state (`FileStates.showSlice()`), so it's drawn as the code pane draws it, bubbly when the
 *   look is on, and follows its edits.  Read only:  it's for looking.
 * - Peek References lists every use on the box's right, one row each, `Card.spell:12  its value is 12`:
 *   a click on a row shows it, ↑ ↓ move through them.
 * - Enter, a double-click on the code, or a double-click on a row:  goes there, as Go to Definition does;
 *   Esc, or ✕:  closes the box, the caret back in the code.
 * - One box per editor at a time;  showing another file closes it, as it's part of what the editor adds to its file's
 *   state (`SpellCodeMirror`'s host).
 * - Its position in the import graph:  CodeMirror, the app's texts, the folder's setup and converter;
 *   never the editor page (`<spell-editor>`'s chunk has it), never Solid:  plain DOM in a CodeMirror widget.
 ****************/
export class CodeMirrorPeek {
  /** The box, and the keys that close it, for an editor's view. */
  static extension(): Extension {
    return [
      peekShown,
      // Esc in the code closes the box first, before the page's own Esc (stop inspecting)
      Prec.highest(keymap.of([{ key: "Escape", run: (view) => CodeMirrorPeek.close(view) }]))
    ]
  }

  /**
   * Peek at `locations` under the caret's line of `peek.view`:  the first one shown, the rest listed when `kind` is
   * `"references"`.
   * - Shows in place of a box already open there.
   */
  static open(peek: PeekProps): void {
    const { view } = peek
    const line = view.state.doc.lineAt(view.state.selection.main.head)
    const box = new PeekBox(peek)
    view.dispatch({ effects: SHOW.of({ box, pos: line.to }) })
  }

  /** Close the box open in `view`:  `false` if none was. */
  static close(view: EditorView): boolean {
    if (!view.state.field(peekShown, false)) return false
    view.dispatch({ effects: SHOW.of(null) })
    return true
  }

  /** Is a box open in `view`? */
  static isOpen(view: EditorView): boolean {
    return !!view.state.field(peekShown, false)
  }

  /**
   * A place, as a row of a list of uses says it:  its file's name and line, then the line's words,
   * `Card.spell:12  its value is 12`.
   * - `project`:  where its file is, for the line's words;  a file it doesn't have is named alone.
   */
  static placeWords(project: SP.SpellProject, { path, range }: CodeMirrorLocation): string {
    const file = project.files.find((each) => each.path === path)
    const where = appTexts.text("cmReferenceAt", { file: fileNameOf(path), line: range.start.line + 1 })
    const lines = (file?.contents ?? "").split("\n")
    const words = lines[range.start.line]?.trim() ?? ""
    return words ? `${where}  ${words}` : where
  }
}

/** What `CodeMirrorPeek.open()` is handed. */
export type PeekProps = {
  /** the editor peeked from:  the box goes under its caret's line */
  view: EditorView
  /** the page's file states, whose slices the box shows */
  states: FileStates
  /** the project the places are in */
  project: SP.SpellProject
  /** the places to show:  where a thing's declared, or its uses */
  locations: CodeMirrorLocation[]
  /** a definition's box shows its one place;  a references box lists them all */
  kind: "definition" | "references"
  /** go to `location`, as Go to Definition does:  the box is closed by then */
  go: (location: CodeMirrorLocation) => void
}

/****************
 * ### `PeekBox`
 * One peek's box:  what it shows and which place is picked, kept while CodeMirror draws its widget, takes it away as
 * it scrolls out of sight, and draws it again.
 * - Its DOM and its slice's view are made by `draw()`, and let go of by `undraw()`.
 ****************/
class PeekBox {
  constructor(readonly peek: PeekProps) {}

  /** Which of the places is shown. */
  picked = 0

  /**
   * Has it shown in the page yet?  Only its first showing takes the keys and scrolls the box into sight:
   * not a box CodeMirror drew and took away again before it showed, nor one drawn again as it scrolls back into sight.
   */
  private hasShown = false

  /** The slice's view, while it's drawn. */
  private codeView: EditorView | undefined

  /** The list's rows, while it's drawn. */
  private rows: HTMLElement[] = []

  /** The head's words, while it's drawn. */
  private title: HTMLElement | undefined

  /** The box's DOM:  its head, the slice, and the list for references.  Takes the keyboard's focus once drawn. */
  draw(): HTMLElement {
    const { peek } = this
    const box = element("div", "cm-peek")
    box.tabIndex = 0
    box.setAttribute("role", "dialog")
    box.setAttribute("aria-label", appTexts.text(peek.kind === "definition" ? "cmPeekDefinition" : "cmPeekReferences"))
    box.addEventListener("keydown", (event) => this.keydown(event))

    const head = element("div", "cm-peek-head")
    this.title = element("span", "cm-peek-title")
    const kind = element("span", "cm-peek-kind")
    kind.textContent =
      peek.kind === "definition"
        ? appTexts.text("cmPeekDefinitionHead")
        : appTexts.text("cmPeekUses", { count: peek.locations.length })
    const close = element("button", "cm-peek-close")
    close.type = "button"
    close.textContent = "✕"
    close.title = appTexts.text("cmPeekClose")
    close.setAttribute("aria-label", close.title)
    close.addEventListener("click", () => this.close())
    head.append(this.title, kind, close)

    const body = element("div", "cm-peek-body")
    const code = element("div", "cm-peek-code")
    body.append(code)
    if (!peek.locations.length) {
      box.classList.add("cm-peek-empty")
      code.classList.add("cm-peek-none")
      code.textContent = appTexts.text("cmNoReferences")
    } else this.codeView = new EditorView({ parent: code, root: peek.view.root as Document | ShadowRoot })
    if (peek.kind === "references" && peek.locations.length) body.append(this.list())
    box.append(head, body)

    this.show()
    // once it's in the page:  the slice measured, so its scroll lands
    requestAnimationFrame(() => {
      if (!box.isConnected) return
      this.fitWidth(box)
      this.scrollToPicked()
      if (this.hasShown) return
      this.hasShown = true
      box.scrollIntoView({ block: "nearest" })
      box.focus({ preventScroll: true })
    })
    return box
  }

  /**
   * As wide as the code pane shows, not as its longest line:  a block's as wide as the text, which scrolls sideways,
   * so the uses on the right stayed out of sight past a long line.  Kept at the pane's left as it does (`sticky`).
   */
  private fitWidth(box: HTMLElement): void {
    const { scrollDOM, contentDOM } = this.peek.view
    const shown =
      scrollDOM.clientWidth - (contentDOM.getBoundingClientRect().left - scrollDOM.getBoundingClientRect().left)
    box.style.width = `${Math.max(PEEK_MIN_WIDTH, shown - PEEK_RIGHT_ROOM)}px`
  }

  /** Let go of the slice's view in `dom`, as CodeMirror takes that box away. */
  undraw(dom: HTMLElement): void {
    // CodeMirror may draw it again before taking the old one away:  only the one drawn last is let go of here
    const codeIn = dom.querySelector<HTMLElement>(".cm-peek-code > .cm-editor")
    const codeView = codeIn && EditorView.findFromDOM(codeIn)
    if (codeView && codeView !== this.codeView) {
      this.peek.states.releaseSlice(codeView)
      codeView.destroy()
      return
    }
    if (this.codeView) {
      this.peek.states.releaseSlice(this.codeView)
      this.codeView.destroy()
    }
    this.codeView = undefined
    this.rows = []
    this.title = undefined
  }

  /** The list of uses:  a row each, picked by a click, gone to by a double-click. */
  private list(): HTMLElement {
    const list = element("div", "cm-peek-list")
    list.setAttribute("role", "listbox")
    this.rows = this.peek.locations.map((location, index) => {
      const row = element("div", "cm-peek-row")
      row.setAttribute("role", "option")
      row.textContent = CodeMirrorPeek.placeWords(this.peek.project, location)
      row.addEventListener("click", () => this.pick(index))
      row.addEventListener("dblclick", () => this.go())
      list.append(row)
      return row
    })
    return list
  }

  /** Show place `index`:  its file in the slice, its row picked. */
  private pick(index: number): void {
    const count = this.peek.locations.length
    if (!count) return
    this.picked = (index + count) % count
    this.show()
    this.scrollToPicked()
    this.rows[this.picked]?.scrollIntoView({ block: "nearest" })
  }

  /** The picked place in the slice and the head, its row marked. */
  private show(): void {
    const location = this.peek.locations[this.picked]
    this.rows.forEach((row, index) => row.setAttribute("aria-selected", String(index === this.picked)))
    if (!location) return
    if (this.title)
      this.title.textContent = appTexts.text("cmReferenceAt", {
        file: fileNameOf(location.path),
        line: location.range.start.line + 1
      })
    const file = this.peek.project.files.find((each) => each.path === location.path)
    if (!file || !this.codeView) return
    // the whole file, so there's more to scroll to round the place:  Monaco's peek showed the whole file too
    this.peek.states.showSlice(this.codeView, file, { first: 1, last: Number.MAX_SAFE_INTEGER }, this.sliceHost())
    const { from, to } = LspToCodeMirror.range(this.codeView.state.doc, location.range)
    this.codeView.dispatch({ effects: MARK.of({ from, to }) })
  }

  /** The picked place's block at the slice's top:  `revealBlock()`, as a Go to … jump shows it. */
  private scrollToPicked(): void {
    const view = this.codeView
    const marked = view?.state.field(peekMarked, false)
    if (!view || !marked) return
    view.dispatch({ effects: CodeMirrorSetup.revealBlock(view.state, marked.from) })
  }

  /** What the box's slice adds:  read only, the place marked, a double-click goes there. */
  private sliceHost(): Extension {
    return [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      peekMarked,
      EditorView.domEventHandlers({
        dblclick: () => {
          this.go()
          return true
        }
      })
    ]
  }

  /** The box's keys:  Esc closes it, Enter goes, ↑ ↓ move through the uses. */
  private keydown(event: KeyboardEvent): void {
    if (event.key === "Escape") this.close()
    else if (event.key === "Enter") this.go()
    else if (event.key === "ArrowDown" && this.rows.length) this.pick(this.picked + 1)
    else if (event.key === "ArrowUp" && this.rows.length) this.pick(this.picked - 1)
    else return
    event.preventDefault()
    event.stopPropagation()
  }

  /** Close the box, the caret back in the code. */
  private close(): void {
    const { view } = this.peek
    CodeMirrorPeek.close(view)
    view.focus()
  }

  /** Go to the picked place:  the box closed first. */
  private go(): void {
    const location = this.peek.locations[this.picked]
    this.close()
    if (location) this.peek.go(location)
  }
}

/** The box as CodeMirror draws it:  a block under its line. */
class PeekWidget extends WidgetType {
  constructor(readonly box: PeekBox) {
    super()
  }

  override eq(other: PeekWidget): boolean {
    return other.box === this.box
  }

  override toDOM(): HTMLElement {
    return this.box.draw()
  }

  override destroy(dom: HTMLElement): void {
    this.box.undraw(dom)
  }

  // its own clicks and keys:  the editor around it leaves them alone
  override ignoreEvent(): boolean {
    return true
  }

  override get estimatedHeight(): number {
    return this.box.peek.locations.length ? PEEK_HEIGHT : PEEK_EMPTY_HEIGHT
  }
}

/** How tall the box is drawn, its head and slice, in px:  `CodeMirrorPeek.css` says the same. */
const PEEK_HEIGHT = 268

/** How tall the box is drawn with nothing to show, its head and one row of message, in px. */
const PEEK_EMPTY_HEIGHT = 72

/** The narrowest the box is drawn, in px:  room for some code and the uses. */
const PEEK_MIN_WIDTH = 480

/** Room between the box and the pane's right edge, in px. */
const PEEK_RIGHT_ROOM = 12

/** The box open, and the end of the line it's under;  none. */
type Shown = { box: PeekBox; pos: number } | null

/** Open a box, or close it. */
const SHOW = StateEffect.define<Shown>()

/** The box open in an editor, moved with its edits. */
const peekShown = StateField.define<Shown>({
  create: () => null,
  update: (shown, transaction) => {
    for (const effect of transaction.effects) if (effect.is(SHOW)) return effect.value
    if (!shown || !transaction.docChanged) return shown
    return { ...shown, pos: transaction.state.doc.lineAt(transaction.changes.mapPos(shown.pos)).to }
  },
  provide: (field) =>
    EditorView.decorations.from(field, (shown): DecorationSet =>
      shown
        ? Decoration.set(
            Decoration.widget({ widget: new PeekWidget(shown.box), block: true, side: 1 }).range(shown.pos)
          )
        : Decoration.none
    )
})

/** Mark a place in a box's slice. */
const MARK = StateEffect.define<{ from: number; to: number }>()

/** The place marked in a box's slice, moved with its edits. */
const peekMarked = StateField.define<{ from: number; to: number } | null>({
  create: () => null,
  update: (marked, transaction) => {
    for (const effect of transaction.effects) if (effect.is(MARK)) return effect.value
    if (!marked || !transaction.docChanged) return marked
    return { from: transaction.changes.mapPos(marked.from, 1), to: transaction.changes.mapPos(marked.to, -1) }
  },
  provide: (field) =>
    EditorView.decorations.from(field, (marked): DecorationSet => {
      if (!marked) return Decoration.none
      // a place with no width marks its whole line
      return marked.to > marked.from
        ? Decoration.set(MARKED.range(marked.from, marked.to))
        : Decoration.set(MARKED_LINE.range(marked.from))
    })
})

/** How the place shows in a box's slice. */
const MARKED = Decoration.mark({ class: "cm-peek-marked" })
const MARKED_LINE = Decoration.line({ class: "cm-peek-marked-line" })

/** A new element, `tag`, of `className`. */
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag)
  made.className = className
  return made
}

/** The name of the file at `path`, without its folders. */
function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}
