import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * A head's description in the bubbly look, on a real CodeMirror editor in the browser (epic `language` I120):
 * at its band's right end when it fits there, else in rows of its own under the head, never over the lines below.
 * - It was drawn over the body's first comment (`a "card"`), and behind a group's first member's band.
 */
describe("a head's description in the bubbly look", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  const CARD = `a "card" is a draggable two sided view -- A playing card, face up or face down, dealt from the deck
\t-- A card says what its rank, suit and color are
\tgroup "Card Rank & Suit" -- Ace is low:  ace = 1 ... king = 13
\tits "rank" is one of ace, 2 ... 10, jack, queen, king
`

  /** An editor `width` wide, holding `text` drawn bubbly. */
  function editorOf(text: string, width: number): EditorView {
    const state = EditorState.create({
      doc: text,
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    const host = document.body.appendChild(document.createElement("div"))
    host.style.width = `${width}px`
    view = new EditorView({ parent: host, state })
    return view
  }

  /** Once the editor has measured its descriptions, and drawn the rows they take. */
  async function measured(): Promise<void> {
    for (let frame = 0; frame < 6; frame++) await new Promise((done) => requestAnimationFrame(done))
  }

  /** Each description's head line:  its text, whether the description is under it, how far it is from the next line. */
  function descriptions(view: EditorView) {
    return [...view.contentDOM.querySelectorAll<HTMLElement>(".cmb-description")].map((description) => {
      const line = description.closest<HTMLElement>(".cm-line")!
      const band = description.closest<HTMLElement>(".cmb-band")!.getBoundingClientRect()
      const box = description.getBoundingClientRect()
      return {
        description: description.textContent,
        isBelow: line.classList.contains("cmb-head-description-below"),
        isOnBand: box.top >= band.top - 0.5 && box.bottom <= band.bottom + 0.5,
        gapToNextLine: line.nextElementSibling!.getBoundingClientRect().top - box.bottom
      }
    })
  }

  test("too wide for its band:  rows of its own under the head, wrapped, the next line under them", async () => {
    const view = editorOf(CARD, 420)
    await measured()
    const drawn = descriptions(view)
    expect(drawn.map((it) => it.description)).toEqual([
      "-- A playing card, face up or face down, dealt from the deck",
      "-- Ace is low:  ace = 1 ... king = 13"
    ])
    for (const it of drawn) {
      expect(it.isBelow).toBe(true)
      expect(it.isOnBand).toBe(false)
      // nothing drawn over it:  the next line starts where it ends
      expect(it.gapToNextLine).toBeGreaterThanOrEqual(-0.5)
    }
    // the card's, wrapped, takes two rows under its head
    const card = view.contentDOM.querySelector<HTMLElement>(".cm-line")!
    expect(getComputedStyle(card).getPropertyValue("--cmb-description-rows").trim()).toBe("2")
  })

  test("room for it at its band's end:  there, no rows under the head;  back there when the editor widens", async () => {
    const view = editorOf(CARD, 420)
    await measured()
    expect(descriptions(view).every((it) => it.isBelow)).toBe(true)
    view.dom.parentElement!.style.width = "1600px"
    view.requestMeasure()
    await measured()
    for (const it of descriptions(view)) {
      expect(it.isBelow).toBe(false)
      expect(it.isOnBand).toBe(true)
    }
  })
})
