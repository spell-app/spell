import { afterEach, describe, expect, test } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { UI } from "spell/ui/core"
import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * A head's description in the bubbly look, on a real CodeMirror editor in the browser:
 * at its band's right end when it fits there, else cut short there with a `…`, the head one line tall (epic `codemirror`
 * P7), never over the lines below;  cut short, its whole text in Spell UI's tooltip (T20).
 * - It was drawn over the body's first comment (`a "card"`), and behind a group's first member's band (epic `language`
 *   I120);  then in rows of its own under the head, which made the head line taller than the others.
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

  /** Once the editor has measured its descriptions, and cut those that don't fit. */
  async function measured(): Promise<void> {
    for (let frame = 0; frame < 6; frame++) await new Promise((done) => requestAnimationFrame(done))
  }

  /** Each description's head line:  its text, whether it's cut short, on its band, and the head line's height. */
  function descriptions(view: EditorView) {
    return [...view.contentDOM.querySelectorAll<HTMLElement>(".cmb-description")].map((description) => {
      const line = description.closest<HTMLElement>(".cm-line")!
      const band = description.closest<HTMLElement>(".cmb-band")!.getBoundingClientRect()
      const box = description.getBoundingClientRect()
      return {
        description: description.textContent,
        isCut: line.classList.contains("cmb-description-cut") && description.scrollWidth > description.clientWidth,
        isOnBand: box.top >= band.top - 0.5 && box.bottom <= band.bottom + 0.5 && box.right <= band.right + 0.5,
        lineHeight: line.getBoundingClientRect().height
      }
    })
  }

  test("too wide for its band:  cut short at its band's end with a `…`, the head one line tall", async () => {
    const view = editorOf(CARD, 420)
    await measured()
    const drawn = descriptions(view)
    expect(drawn.map((it) => it.description)).toEqual([
      "-- A playing card, face up or face down, dealt from the deck",
      "-- Ace is low:  ace = 1 ... king = 13"
    ])
    for (const it of drawn) {
      expect(it.isCut).toBe(true)
      expect(it.isOnBand).toBe(true)
      expect(it.lineHeight).toBe(25)
    }
    const description = view.contentDOM.querySelector<HTMLElement>(".cmb-description")!
    expect(getComputedStyle(description).textOverflow).toBe("ellipsis")
  })

  test("room for it at its band's end:  whole there;  whole again when the editor widens", async () => {
    const view = editorOf(CARD, 420)
    await measured()
    expect(descriptions(view).every((it) => it.isCut)).toBe(true)
    view.dom.parentElement!.style.width = "1600px"
    view.requestMeasure()
    await measured()
    for (const it of descriptions(view)) {
      expect(it.isCut).toBe(false)
      expect(it.isOnBand).toBe(true)
      expect(it.lineHeight).toBe(25)
    }
  })

  test("cut short:  its whole text in Spell UI's tooltip, after the page's hover delay;  whole:  no tooltip", async () => {
    await UI.load()
    const view = editorOf(CARD, 420)
    await measured()
    const tips = [...view.contentDOM.querySelectorAll<HTMLElement>("[data-tooltip]")]
    // a description's marks split it in pieces, each with the same tooltip
    expect([...new Set(tips.map((tip) => tip.dataset.tooltip))]).toEqual([
      "A playing card, face up or face down, dealt from the deck",
      "Ace is low:  ace = 1 ... king = 13"
    ])
    // on the description's text alone, not the line
    for (const tip of tips) expect(tip.closest(".cmb-description")).not.toBeNull()

    const description = view.contentDOM.querySelector<HTMLElement>(".cmb-description")!
    const bubble = () => document.querySelector<HTMLElement>(".ui-tooltip-bubble")
    const isShowing = () => Boolean(bubble()?.matches(":popover-open"))
    const hovered = performance.now()
    await userEvent.hover(description)
    await expect.poll(isShowing, { timeout: 3000, interval: 20 }).toBe(true)
    // the standard 800 msec
    expect(performance.now() - hovered).toBeGreaterThanOrEqual(700)
    expect(bubble()!.textContent).toBe("A playing card, face up or face down, dealt from the deck")
    await userEvent.unhover(description)

    view.dom.parentElement!.style.width = "1600px"
    view.requestMeasure()
    await measured()
    expect(view.contentDOM.querySelector("[data-tooltip]")).toBeNull()
  })
})
