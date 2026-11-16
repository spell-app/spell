import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { CodeMirrorHeadings } from "spell/app/app/ui/codemirror/CodeMirrorHeadings"
import { CodeMirrorLinks } from "spell/app/app/ui/codemirror/CodeMirrorLinks"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

/**
 * `CodeMirrorLinks` and `CodeMirrorHeadings` on a real CodeMirror editor, in the browser (epic `codemirror` P5):
 * the icon after each address, opening one, heading marks.
 * - Clicks are the mouse's events, dispatched where the address or its icon is drawn.
 */
describe("web addresses in a real CodeMirror editor", () => {
  const KLONDIKE = "https://en.wikipedia.org/wiki/Klondike_(solitaire)"
  let view: EditorView | undefined

  afterEach(() => {
    // its box too:  the next editor's at the page's top, where the mouse's points are
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
    vi.restoreAllMocks()
  })

  /** An editor holding `lines`, with the links and the headings. */
  function editorOf(lines: string[]): EditorView {
    const state = EditorState.create({
      doc: lines.join("\n"),
      extensions: [CodeMirrorLinks.extension(), CodeMirrorHeadings.extension(), CodeMirrorSetup.extensions()]
    })
    view = new EditorView({ parent: hostOf(), state })
    return view
  }

  /** A press of the mouse's main button on `target` at `x`, `y`, `modifiers` held. */
  function press(target: Element, x: number, y: number, modifiers: MouseEventInit = {}): MouseEvent {
    const init = { bubbles: true, cancelable: true, composed: true, button: 0, clientX: x, clientY: y, ...modifiers }
    const down = new MouseEvent("mousedown", init)
    target.dispatchEvent(down)
    return down
  }

  /** ⌘ on a Mac, Ctrl elsewhere:  the key that opens an address. */
  const OPEN_KEY: MouseEventInit = CodeEditorFeatures.IS_MAC ? { metaKey: true } : { ctrlKey: true }

  test("an icon after each address, outside the text", () => {
    const view = editorOf([`# Klondike:  ${KLONDIKE}.`, "no address here", "see http://x.org and https://y.org"])
    const icons = view.contentDOM.querySelectorAll(".cmb-link-icon")
    expect(icons).toHaveLength(3)
    // the text is as it was:  the icons are widgets
    expect(view.state.doc.line(1).text).toBe(`# Klondike:  ${KLONDIKE}.`)
    // right after the address, before its full stop
    expect(icons[0]!.nextSibling?.textContent ?? icons[0]!.parentElement!.nextSibling?.textContent).toMatch(/^\./)
  })

  test("a plain press on the icon opens the address in a new tab, and moves no caret", () => {
    const view = editorOf([`see ${KLONDIKE}`])
    const open = vi.spyOn(window, "open").mockReturnValue(null)
    const icon = view.contentDOM.querySelector(".cmb-link-icon")!
    const box = icon.getBoundingClientRect()
    const down = press(icon, box.left + box.width / 2, box.top + box.height / 2)
    expect(open).toHaveBeenCalledWith(KLONDIKE, "_blank", "noopener")
    expect(down.defaultPrevented).toBe(true)
    expect(view.state.selection.main.head).toBe(0)
  })

  test("⌘-click on the address opens it;  a plain click doesn't", () => {
    const view = editorOf([`see ${KLONDIKE} now`])
    const open = vi.spyOn(window, "open").mockReturnValue(null)
    const middle = view.coordsAtPos(4 + 10)!
    const x = middle.left + 1
    const y = (middle.top + middle.bottom) / 2
    const target = document.elementFromPoint(x, y)!
    press(target, x, y)
    expect(open).not.toHaveBeenCalled()
    press(target, x, y, OPEN_KEY)
    expect(open).toHaveBeenCalledWith(KLONDIKE, "_blank", "noopener")
  })

  test("⌘-click past the address's end opens nothing", () => {
    const view = editorOf([`see ${KLONDIKE}`, "plain words"])
    const open = vi.spyOn(window, "open").mockReturnValue(null)
    const word = view.coordsAtPos(view.state.doc.line(2).from + 2)!
    const x = word.left + 1
    const y = (word.top + word.bottom) / 2
    press(document.elementFromPoint(x, y)!, x, y, OPEN_KEY)
    expect(open).not.toHaveBeenCalled()
  })

  test("⌘ held over an address underlines it", () => {
    const view = editorOf([`see ${KLONDIKE}`])
    const middle = view.coordsAtPos(4 + 10)!
    const x = middle.left + 1
    const y = (middle.top + middle.bottom) / 2
    const init = { bubbles: true, clientX: x, clientY: y }
    document.elementFromPoint(x, y)!.dispatchEvent(new MouseEvent("mousemove", init))
    expect(view.contentDOM.querySelector(".cmb-link-ready")).toBeNull()
    document.elementFromPoint(x, y)!.dispatchEvent(new MouseEvent("mousemove", { ...init, ...OPEN_KEY }))
    expect(view.contentDOM.querySelector(".cmb-link-ready")?.textContent).toBe(KLONDIKE)
  })

  test("an icon follows its address as the text changes", () => {
    const view = editorOf(["see "])
    expect(view.contentDOM.querySelectorAll(".cmb-link-icon")).toHaveLength(0)
    view.dispatch({ changes: { from: 4, insert: KLONDIKE } })
    expect(view.contentDOM.querySelectorAll(".cmb-link-icon")).toHaveLength(1)
  })

  test("heading comments marked by level, from their first `#` to the line's end", () => {
    const view = editorOf(["# Solitaire", "a card is a view", "\t## Game Play", "##### deep"])
    const headings = [...view.contentDOM.querySelectorAll(".spell-heading")].map((mark) => [
      mark.className,
      mark.textContent
    ])
    expect(headings).toEqual([
      ["spell-heading spell-heading-1", "# Solitaire"],
      ["spell-heading spell-heading-2", "## Game Play"],
      ["spell-heading spell-heading-4", "##### deep"]
    ])
  })
})

/** A box on the page for an editor. */
function hostOf(): HTMLElement {
  const host = document.createElement("div")
  host.style.cssText = "width: 800px; height: 300px"
  document.body.append(host)
  return host
}
