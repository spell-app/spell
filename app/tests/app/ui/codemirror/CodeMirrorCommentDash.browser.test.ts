import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { deleteCharBackward, deleteCharForward } from "@codemirror/commands"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * A comment's `--` in the bubbly look, on a real CodeMirror editor (epic `codemirror` I25):
 * drawn as ONE dash, `—`, it's one step for the caret.
 * - Both `-` stay in the file, so a click on the dash's right half put the caret between them,
 *   and a letter typed there split the `--`:  the comment broke.
 * - Now a click on either half puts the caret before or after it, whichever is nearer;
 *   arrows step over it;  Backspace after it, or Delete before it, takes both `-`.
 */
describe("a comment's dash", () => {
  const CARD = [
    'a "card" is a draggable two sided view\t\t\t-- A playing card',
    '\tgroup "Names"\t\t-- identifying a card',
    '\t\tits "name" is its rank && "of" && its suit',
    ""
  ].join("\n")

  /** Where the dash on `group "Names"`'s line starts. */
  const DASH = CARD.indexOf("-- identifying")

  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor of `CARD` in the bubbly look, drawn and measured. */
  async function bubblyEditor(): Promise<EditorView> {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 1000px; height: 400px"
    const state = EditorState.create({
      doc: CARD,
      extensions: [CodeMirrorSetup.extensions(), EditorView.lineWrapping, CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    view.focus()
    for (let frame = 0; frame < 6; frame++) await new Promise((done) => requestAnimationFrame(done))
    return view
  }

  /** The point `fraction` of the way across the drawn dash, at its middle down. */
  function pointOnDash(view: EditorView, fraction: number): { clientX: number; clientY: number } {
    const box = view.contentDOM.querySelectorAll(".bubbly-dash")[1]!.getBoundingClientRect()
    return { clientX: box.left + box.width * fraction, clientY: box.top + box.height / 2 }
  }

  /** A click of the main button at `point`. */
  async function click(view: EditorView, point: { clientX: number; clientY: number }): Promise<void> {
    const target = document.elementFromPoint(point.clientX, point.clientY) ?? view.contentDOM
    const init = { bubbles: true, cancelable: true, button: 0, detail: 1, ...point }
    target.dispatchEvent(new MouseEvent("mousedown", { ...init, buttons: 1 }))
    await new Promise((done) => requestAnimationFrame(done))
    document.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }))
  }

  /** Put the caret at `pos`, as the editor's own moves do. */
  function caretAt(view: EditorView, pos: number) {
    view.dispatch({ selection: EditorSelection.cursor(pos) })
  }

  /** The line of `group "Names"`. */
  function groupLine(view: EditorView): string {
    return view.state.doc.line(2).text
  }

  test("is drawn over both `-`", async () => {
    const view = await bubblyEditor()
    const dash = view.contentDOM.querySelectorAll(".bubbly-dash")[1]!
    expect(dash.textContent).toBe("--")
  })

  test("a click on its left half puts the caret before it;  on its right half, after it", async () => {
    const view = await bubblyEditor()
    for (const fraction of [0.1, 0.3, 0.45]) {
      await click(view, pointOnDash(view, fraction))
      expect(view.state.selection.main.head, `${fraction}`).toBe(DASH)
    }
    for (const fraction of [0.55, 0.7, 0.9]) {
      await click(view, pointOnDash(view, fraction))
      expect(view.state.selection.main.head, `${fraction}`).toBe(DASH + 2)
    }
  })

  test("arrows step over it in one step", async () => {
    const view = await bubblyEditor()
    caretAt(view, DASH)
    view.dispatch({ selection: view.moveByChar(view.state.selection.main, true) })
    expect(view.state.selection.main.head).toBe(DASH + 2)
    view.dispatch({ selection: view.moveByChar(view.state.selection.main, false) })
    expect(view.state.selection.main.head).toBe(DASH)
  })

  test("Backspace after it takes both `-`", async () => {
    const view = await bubblyEditor()
    caretAt(view, DASH + 2)
    deleteCharBackward(view)
    expect(groupLine(view)).toBe('\tgroup "Names"\t\t identifying a card')
  })

  test("Delete before it takes both `-`", async () => {
    const view = await bubblyEditor()
    caretAt(view, DASH)
    deleteCharForward(view)
    expect(groupLine(view)).toBe('\tgroup "Names"\t\t identifying a card')
  })

  test("a drag from its left half selects from before it", async () => {
    const view = await bubblyEditor()
    const start = pointOnDash(view, 0.3)
    const end = view.coordsAtPos(CARD.indexOf("identifying") + 5)!
    const target = document.elementFromPoint(start.clientX, start.clientY) ?? view.contentDOM
    const init = { bubbles: true, cancelable: true, button: 0, detail: 1 }
    target.dispatchEvent(new MouseEvent("mousedown", { ...init, ...start, buttons: 1 }))
    const to = { clientX: end.left, clientY: (end.top + end.bottom) / 2 }
    document.dispatchEvent(new MouseEvent("mousemove", { ...init, ...to, buttons: 1 }))
    await new Promise((done) => requestAnimationFrame(done))
    document.dispatchEvent(new MouseEvent("mouseup", { ...init, ...to, buttons: 0 }))
    const { from, to: selectedTo } = view.state.selection.main
    expect(view.state.sliceDoc(from, selectedTo)).toBe("-- ident")
  })

  test("a letter typed after a click on its right half leaves the comment whole", async () => {
    const view = await bubblyEditor()
    await click(view, pointOnDash(view, 0.8))
    const { from } = view.state.selection.main
    view.dispatch(view.state.replaceSelection("x"))
    expect(from).toBe(DASH + 2)
    expect(groupLine(view)).toBe('\tgroup "Names"\t\t--x identifying a card')
  })
})
