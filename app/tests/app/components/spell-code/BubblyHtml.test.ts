import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"

/** A card, as Solitaire's starts. */
const CARD = `a "card" is a draggable two sided view
\tgroup "Rank"
\tits "rank" is one of ace, jack, queen, king
\tto draw its front
\t\t<text color="blue">{its rank}</text>
`

/** `CARD` drawn, its sections or not. */
const html = (options?: Parameters<typeof BubblyHtml.write>[1]) => BubblyHtml.write(SP.BubblyLayout.of(CARD), options)

describe("BubblyHtml.write()", () => {
  test("draws each declaration as a block on its part of speech's band, its level, its pills", () => {
    const drawn = html()
    expect(drawn).toMatch(/^<div class="bubbly"><div class="bubbly-block bubbly-thing bubbly-level-0">/)
    expect(drawn).toContain('<div class="bubbly-block bubbly-plain bubbly-group bubbly-level-1">')
    expect(drawn).toContain('<p class="bubbly-pill bubbly-property bubbly-level-2 bubbly-ends-input">')
    expect(drawn).toContain('<span class="bubbly-input bubbly-choice">queen</span>')
    expect(drawn).toContain('<span class="bubbly-reference">draggable two sided view</span>')
    expect(drawn).toContain('<span class="bubbly-tag">text</span>')
  })

  test("puts a head's description in the room after its words, for the sheet to keep in view (J147)", () => {
    const drawn = BubblyHtml.write(
      SP.BubblyLayout.of(`a "card" is a view -- A playing card\n\tits "rank" is a number\n`)
    )
    expect(drawn).toContain(
      '<span class="bubbly-description"><span class="bubbly-comment"><span class="bubbly-dash">--</span> A playing card</span></span></p>'
    )
  })

  test("keeps every word of the code, quote marks too, for copying;  escapes the markup", () => {
    const drawn = html()
    expect(drawn).toContain(
      '<span class="bubbly-quoted"><span class="bubbly-input"><span class="bubbly-quote-mark bubbly-quote-open">"</span>card<span class="bubbly-quote-mark bubbly-quote-close">"</span></span></span>'
    )
    expect(drawn).toContain('<span class="bubbly-mark">&lt;</span>')
    const words = drawn
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
    expect(words).toBe(
      CARD.split("\n")
        .map((line) => line.trim())
        .join("")
    )
  })

  test("wraps each declaration in a section a page's comments anchor to, each id once", () => {
    const ids = new Set<string>(["plain-rank"])
    const drawn = html({ sections: { idPrefix: "plain", ids } })
    expect([...drawn.matchAll(/<ui-section class="bubbly-section" id="([^"]+)">/g)].map((match) => match[1])).toEqual([
      "plain-card",
      "plain-rank-2",
      "plain-rank-3",
      "plain-to-draw-its-front"
    ])
  })
})
