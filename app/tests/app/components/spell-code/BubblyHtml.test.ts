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

  test("draws an action's head as ONE pill, its blanks underlined in it, their kind words bold;  quoted, its marks at its ends (I109)", () => {
    const text = [
      'a "card" is a thing',
      'a "pile" is a list of cards',
      "solitaire is an app",
      "\tto play a card",
      "\t\tprint 1",
      '\tto "count the points for (a card) on (a pile)"',
      "\t\tprint 1"
    ].join("\n")
    const drawn = BubblyHtml.write(SP.BubblyLayout.of(text))
    expect(drawn).toContain(
      '<p class="bubbly-head-pill bubbly-ends-input">to <span class="bubbly-input bubbly-with-blanks">play <span class="bubbly-underline">a <span class="bubbly-reference">card</span></span></span></p>'
    )
    expect(drawn).toContain(
      '<span class="bubbly-quoted"><span class="bubbly-input bubbly-with-blanks"><span class="bubbly-quote-mark bubbly-quote-open">"</span>' +
        'count the points for (<span class="bubbly-underline">a <span class="bubbly-reference">card</span></span>) on (<span class="bubbly-underline">a <span class="bubbly-reference">pile</span></span>)' +
        '<span class="bubbly-quote-mark bubbly-quote-close">"</span></span></span>'
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
