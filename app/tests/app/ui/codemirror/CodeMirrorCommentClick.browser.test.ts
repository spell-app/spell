import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * Clicking in a comment in the bubbly look, on a real CodeMirror editor (epic `codemirror` I19):
 * the caret lands on the letter clicked, wherever the comment is drawn.
 * - A head's description, `-- e.g. "the card is a face card"`, too wide for the band's right end, is cut short there
 *   (epic `codemirror` P7):  a click on a letter still shown puts the caret there.
 *   Drawn in rows under the head before, out of the band's box, CodeMirror put the caret in the head's words above.
 * - A long comment in a body wraps as any line does:  checked here too.
 */
describe("clicking in a comment", () => {
  const CARD = [
    'a "card" is a draggable two sided view\t\t\t-- A playing card',
    '\tgroup "Aliases"',
    "\t\t-- Spell for identifying cards, a long comment in a body that goes on and on, so it wraps onto rows of its own",
    '\tit "is a face card" if its rank is jack, queen or king  -- e.g. "the card is a face card"',
    '\tit "is a number card" if it is not a face card',
    ""
  ].join("\n")

  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor of `CARD` in the bubbly look, `width` wide, wrapping as the code pane does, drawn and measured. */
  async function bubblyEditor(width: number): Promise<EditorView> {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = `width: ${width}px; height: 400px`
    const state = EditorState.create({
      doc: CARD,
      extensions: [CodeMirrorSetup.extensions(), EditorView.lineWrapping, CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    view.focus()
    // drawn, the descriptions measured, those too wide cut short, drawn again
    for (let frame = 0; frame < 6; frame++) await new Promise((done) => requestAnimationFrame(done))
    return view
  }

  /** Where `text` starts last in `CARD`, plus `offset`:  a description's `face card`, not its head's. */
  function at(text: string, offset = 0): number {
    return CARD.lastIndexOf(text) + offset
  }

  /** The middle of the character at `pos`, as drawn. */
  function middleOf(view: EditorView, pos: number): { clientX: number; clientY: number } {
    const coords = view.coordsAtPos(pos, 1)!
    const after = view.coordsAtPos(pos + 1, -1)!
    return { clientX: (coords.left + after.left) / 2, clientY: (coords.top + coords.bottom) / 2 }
  }

  /** A press of the main button at `start`, moved to `end`, and released there;  `detail` clicks. */
  async function press(
    view: EditorView,
    start: { clientX: number; clientY: number },
    end = start,
    detail = 1
  ): Promise<void> {
    const target = document.elementFromPoint(start.clientX, start.clientY) ?? view.contentDOM
    const init = { bubbles: true, cancelable: true, button: 0, detail }
    target.dispatchEvent(new MouseEvent("mousedown", { ...init, ...start, buttons: 1 }))
    document.dispatchEvent(new MouseEvent("mousemove", { ...init, ...end, buttons: 1 }))
    await new Promise((done) => requestAnimationFrame(done))
    document.dispatchEvent(new MouseEvent("mouseup", { ...init, ...end, buttons: 0 }))
  }

  /** The selected text. */
  function selected(view: EditorView): string {
    const { from, to } = view.state.selection.main
    return view.state.sliceDoc(from, to)
  }

  test("a description too wide for its band is cut short on it, its head one line tall", async () => {
    const view = await bubblyEditor(500)
    const head = view.contentDOM.querySelectorAll<HTMLElement>(".cm-line")[3]!
    expect(head.classList.contains("cmb-description-cut")).toBe(true)
    expect(head.getBoundingClientRect().height).toBe(25)
    expect(view.coordsAtPos(at("e.g."))!.top).toBe(view.coordsAtPos(at("if its rank"))!.top)
  })

  test("a click on each letter shown of a description cut short puts the caret there", async () => {
    // room for a few of its letters
    const view = await bubblyEditor(580)
    expect(view.contentDOM.querySelectorAll(".cm-line")[3]!.classList.contains("cmb-description-cut")).toBe(true)
    const shown = view.contentDOM.querySelectorAll(".cmb-description")[1]!.getBoundingClientRect()
    let clicked = 0
    for (let pos = at("e.g."); pos < at('face card"', 10); pos++) {
      const middle = middleOf(view, pos)
      // past the `…`:  not drawn
      if (middle.clientX > shown.right - 16) break
      await press(view, middle)
      const { head } = view.state.selection.main
      // the middle of a letter is its start or its end
      expect([pos, pos + 1], `${pos}: ${CARD.slice(pos, pos + 1)}`).toContain(head)
      clicked++
    }
    expect(clicked).toBeGreaterThan(3)
  })

  test("a click past a description's end puts the caret at its line's end", async () => {
    const view = await bubblyEditor(500)
    const end = view.state.doc.line(4).to
    const last = view.coordsAtPos(end, -1)!
    await press(view, { clientX: last.right + 40, clientY: (last.top + last.bottom) / 2 })
    expect(view.state.selection.main.head).toBe(end)
  })

  test("a drag in a description selects its words", async () => {
    const view = await bubblyEditor(500)
    await press(view, middleOf(view, at("the card", 1)), middleOf(view, at('face card"', 2)))
    expect(selected(view)).toBe("he card is a fa")
  })

  test("two clicks in a description pick its word", async () => {
    const view = await bubblyEditor(500)
    await press(view, middleOf(view, at('face card"', 2)), undefined, 2)
    expect(selected(view)).toBe("face")
  })

  test("a click in a description at its band's end, or in a wrapped comment, puts the caret there", async () => {
    for (const width of [1400, 500]) {
      const view = await bubblyEditor(width)
      for (const text of ["playing card", "wraps onto rows", "own"]) {
        await press(view, middleOf(view, at(text, 1)))
        expect([at(text, 1), at(text, 2)], `${width}: ${text}`).toContain(view.state.selection.main.head)
      }
      view.dom.parentElement?.remove()
      view.destroy()
    }
    view = undefined
  })
})
