import { describe, expect, it } from "vite-plus/test"

import { SP } from "spell/parser/spell"

/** Pieces of `text` coloured `kind`, by `parser` (English's by default). */
function coloured(text: string, kind: string, parser?: SP.SpellParser): string[] {
  return SP.SpellHighlighter.spans(text, parser)
    .filter((span) => span.kind === kind)
    .map((span) => text.slice(span.start, span.end))
}

/** A pile file's opening, in the sentence style:  as the old card library's `Pile.spell` was. */
const PILE = `## Pile of playing cards
a pile is a list of cards

the value of a pile is:
\tif it is empty return 0
\treturn the value of its last card

// "move" a card
to move (a card) to (a pile)
\tset the pile of the card to the pile
`

describe("SpellHighlighter", () => {
  it("colours tokens:  heading comments, comments, numbers, text", () => {
    expect(coloured(PILE, "section")).toEqual(["## Pile of playing cards"])
    expect(coloured(PILE, "comment")).toEqual(['// "move" a card'])
    expect(coloured(PILE, "number")).toEqual(["0"])
    expect(coloured(`set x to "hi"`, "string")).toEqual(['"hi"'])
  })

  it("colours what the parse found:  keywords and more", () => {
    const kinds = new Set(SP.SpellHighlighter.spans(PILE).map((span) => span.kind))
    expect(kinds.has("keyword")).toBe(true)
    expect(coloured(PILE, "keyword")).toEqual(expect.arrayContaining(["return"]))
  })

  it("colours another language with its own parser:  Spanish's keywords are Spanish's", () => {
    const PILA = `una pila es una lista de cartas

el valor de una pila es:
\tsi la pila está vacía devolver 0
\tdevolver el valor de su última carta
`
    expect(coloured(PILA, "keyword", SP.spanish.parser)).toEqual(expect.arrayContaining(["si", "devolver"]))
    expect(coloured(PILA, "keyword")).not.toContain("devolver")
  })

  it("returns spans in order, never overlapping, inside the text", () => {
    const spans = SP.SpellHighlighter.spans(PILE)
    for (let i = 1; i < spans.length; i++) expect(spans[i]!.start).toBeGreaterThanOrEqual(spans[i - 1]!.end)
    for (const span of spans) {
      expect(span.start).toBeGreaterThanOrEqual(0)
      expect(span.end).toBeLessThanOrEqual(PILE.length)
    }
  })

  it("never throws, whatever it's given", () => {
    for (const text of ["", "))) ((( '", "to to to\n\t\t\tis is", "<div>{</div>"]) {
      expect(() => SP.SpellHighlighter.spans(text)).not.toThrow()
    }
  })
})
