import type { Extension, Text } from "@codemirror/state"
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"

/****************
 * ### `CodeMirrorPinned`
 * Pinned lines:  the lines that open the blocks the top of the code is inside, kept at the top of the editor while
 * it's scrolled, so you always see what you're in (Settings… › Pinned lines;  epic `codemirror` T8).
 * - A block is its lines' indent:  the opener of a line is the nearest line above it indented less, then that one's,
 *   up to the file's top level (`openersOf()`), as Spell's bodies are written.
 * - At most `MOST` of them, the outermost first;  none while the top line is at the top level.
 * - Each is drawn as its line is in the editor when it's drawn (a copy of it, bubbly or not), else as plain text;
 *   a click on one scrolls the editor to it.
 * - Over the code, never in its text:  the editor's lines, caret and undo are untouched.
 * - On only while Settings… says (`CodeMirrorPopups`, which adds it):  off by default.
 * - Its position in the import graph:  CodeMirror alone.
 ****************/
export class CodeMirrorPinned {
  /** The pinned lines, for an editor whose settings ask for them. */
  static extension(): Extension {
    return pinnedLines
  }

  /**
   * The lines opening the blocks line `number` (1-based) of `doc` is inside, outermost first, as line numbers:
   * at most `most`.
   * - A blank line counts as inside whatever the next line with words is.
   */
  static openersOf(doc: Text, number: number, most = CodeMirrorPinned.MOST): number[] {
    let line = number
    while (line < doc.lines && !doc.line(line).text.trim()) line++
    let indent = indentOf(doc.line(line).text)
    const openers: number[] = []
    for (let above = line - 1; above >= 1 && indent > 0; above--) {
      const { text } = doc.line(above)
      if (!text.trim()) continue
      const its = indentOf(text)
      if (its >= indent) continue
      openers.unshift(above)
      indent = its
    }
    return openers.slice(-most)
  }

  /** How many lines are pinned at most:  the innermost kept. */
  static MOST = 5
}

/** How far `text` is indented, a tab one level, 4 spaces another. */
function indentOf(text: string): number {
  let indent = 0
  for (const character of text) {
    if (character === "\t") indent += 4
    else if (character === " ") indent += 1
    else break
  }
  return indent
}

/** The editor's pinned lines, over its top:  drawn again as it scrolls or changes. */
const pinnedLines = ViewPlugin.fromClass(
  class {
    /** The box holding the pinned lines, over the code. */
    readonly box: HTMLElement
    /** The lines pinned now, as their numbers:  drawn again only when they change. */
    shown = ""

    constructor(readonly view: EditorView) {
      this.box = document.createElement("div")
      this.box.className = "cmb-pinned"
      this.box.setAttribute("aria-hidden", "true")
      view.dom.append(this.box)
      view.scrollDOM.addEventListener("scroll", this.follow, { passive: true })
      // once the editor's laid out:  never while it's being made
      view.requestMeasure({ read: () => this.follow() })
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.geometryChanged || update.viewportChanged) {
        if (update.docChanged) this.shown = ""
        this.view.requestMeasure({ read: () => this.follow() })
      }
    }

    destroy() {
      this.view.scrollDOM.removeEventListener("scroll", this.follow)
      this.box.remove()
    }

    /** Pin the lines opening the blocks the top line is inside. */
    follow = () => {
      const { view } = this
      const { scrollTop } = view.scrollDOM
      // the line at the top, under what's pinned there already
      const top = view.lineBlockAtHeight(scrollTop + this.box.offsetHeight / 2)
      const { doc } = view.state
      const lines = scrollTop > 0 ? CodeMirrorPinned.openersOf(doc, doc.lineAt(top.from).number) : []
      const shown = lines.join(",")
      if (shown === this.shown) return
      this.shown = shown
      this.box.replaceChildren(...lines.map((number) => this.lineFor(number)))
      this.box.hidden = !lines.length
      // lined up with the code:  past the gutter, its tabs and padding the text's own
      const gutter = view.dom.querySelector<HTMLElement>(".cm-gutters")
      const text = getComputedStyle(view.contentDOM)
      this.box.style.left = `${gutter?.offsetWidth ?? 0}px`
      this.box.style.tabSize = text.tabSize
      this.box.style.paddingLeft = text.paddingLeft
    }

    /** Line `number`, as the editor draws it if it's drawn;  a click scrolls to it. */
    lineFor(number: number): HTMLElement {
      const { view } = this
      const line = view.state.doc.line(number)
      const isDrawn = line.from >= view.viewport.from && line.to <= view.viewport.to
      const drawn = isDrawn ? view.domAtPos(line.from).node : undefined
      const element = drawn instanceof Element ? drawn : drawn?.parentElement
      const copy = (element?.closest(".cm-line")?.cloneNode(true) as HTMLElement | undefined) ?? plainLine(line.text)
      copy.addEventListener("mousedown", (event) => {
        event.preventDefault()
        view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: "start" }) })
      })
      return copy
    }
  }
)

/** A line of plain text, as the editor's lines are made. */
function plainLine(text: string): HTMLElement {
  const line = document.createElement("div")
  line.className = "cm-line"
  line.textContent = text || "​"
  return line
}
