import { describe, expect, test } from "vite-plus/test"

import { SpellTyping } from "spell/app/app/ui/monaco/SpellTyping"

/** Solitaire's card, shortened:  a blank line ends `its "symbol" is`'s choices, before the next group. */
const CARD = [
  `a "card" is a draggable two sided view`,
  `\tgroup "Rank"`,
  `\tits "rank" is one of ace, 2 ... 10, jack, queen, king`,
  `\t\tit "is a (rank)"`,
  `\tits "symbol" is`,
  `\t\t"♥" if it is a heart`,
  `\t\t"♠" otherwise`,
  ``,
  `\tgroup "Names"`,
  `\tits "name" is`,
  `\t\tits rank && "of" && its suit`,
  ``,
  `a "deck" is a list of cards`
]

/** `CARD` with `lines[index]` as `text`. */
function cardWith(index: number, text: string): string[] {
  return CARD.map((line, at) => (at === index ? text : line))
}

describe("SpellTyping.indentToAdd()", () => {
  test("a letter typed on a blank line inside a body takes the next line's indent", () => {
    expect(SpellTyping.indentToAdd(cardWith(7, "g"), 7, 0)).toBe("\t")
  })

  test("only what the line's tabs don't have yet", () => {
    expect(SpellTyping.indentToAdd(cardWith(7, "\tg"), 7, 1)).toBe("")
    expect(SpellTyping.indentToAdd(cardWith(9, "\tx"), 9, 1)).toBe("\t")
  })

  test("none before a line at the top level:  the blank line is outside the body", () => {
    expect(SpellTyping.indentToAdd(cardWith(11, "a"), 11, 0)).toBe("")
  })

  test("none for a space, nor for a letter after other words", () => {
    expect(SpellTyping.indentToAdd(cardWith(7, " "), 7, 0)).toBe("")
    expect(SpellTyping.indentToAdd(cardWith(7, "gr"), 7, 1)).toBe("")
  })

  test("none at the end of the file", () => {
    expect(SpellTyping.indentToAdd([`a "card" is a view`, `x`], 1, 0)).toBe("")
  })
})

describe("SpellTyping.indentToSnap()", () => {
  test("a blank line inside a body:  the next line's indent, as the caret lands on it", () => {
    expect(SpellTyping.indentToSnap(CARD, 7)).toBe("\t")
    expect(SpellTyping.indentToSnap(cardWith(5, ""), 5)).toBe("\t\t")
  })

  test("only what the line's tabs don't have yet;  none once it's that far in", () => {
    expect(SpellTyping.indentToSnap(cardWith(5, "\t"), 5)).toBe("\t")
    expect(SpellTyping.indentToSnap(cardWith(5, "\t\t"), 5)).toBe("")
  })

  test("none on a line with words, nor before the top level, nor at the file's end", () => {
    expect(SpellTyping.indentToSnap(CARD, 2)).toBe("")
    expect(SpellTyping.indentToSnap(CARD, 11)).toBe("")
    expect(SpellTyping.indentToSnap([...CARD, ""], 13)).toBe("")
  })
})

describe("SpellTyping.opensQuotes()", () => {
  test("a member's words, one level in under a type", () => {
    expect(SpellTyping.opensQuotes(cardWith(7, "\tgroup "), 7, "en")).toBe(true)
    expect(SpellTyping.opensQuotes(cardWith(7, "\tits "), 7, "en")).toBe(true)
    expect(SpellTyping.opensQuotes(cardWith(7, "\tit "), 7, "en")).toBe(true)
    expect(SpellTyping.opensQuotes(cardWith(7, "\tGroup "), 7, "en")).toBe(true)
  })

  test("a type's words at the top level only", () => {
    expect(SpellTyping.opensQuotes(cardWith(11, "an "), 11, "en")).toBe(true)
    expect(SpellTyping.opensQuotes(cardWith(7, "\ta "), 7, "en")).toBe(false)
    expect(SpellTyping.opensQuotes(cardWith(11, "group "), 11, "en")).toBe(false)
  })

  test("a choice's `it` under a property, but never `its` in a property's value", () => {
    expect(SpellTyping.opensQuotes(cardWith(3, "\t\tit "), 3, "en")).toBe(true)
    expect(SpellTyping.opensQuotes(cardWith(10, "\t\tits "), 10, "en")).toBe(false)
  })

  test("only a word and its space:  not once more is written", () => {
    expect(SpellTyping.opensQuotes(cardWith(7, "\tgroup"), 7, "en")).toBe(false)
    expect(SpellTyping.opensQuotes(cardWith(7, "\tits rank "), 7, "en")).toBe(false)
    expect(SpellTyping.opensQuotes(cardWith(7, "\tset "), 7, "en")).toBe(false)
  })

  test("Spanish's words", () => {
    const carta = [`una "carta" es una vista`, `\tgrupo "Rango"`, ``, `\tsu "rango" es uno de as, rey`, ``]
    expect(SpellTyping.opensQuotes([...carta.slice(0, 2), "\tgrupo "], 2, "es")).toBe(true)
    expect(SpellTyping.opensQuotes([...carta.slice(0, 2), "\tsu "], 2, "es")).toBe(true)
    expect(SpellTyping.opensQuotes(["un "], 0, "es")).toBe(true)
    expect(SpellTyping.opensQuotes([...carta.slice(0, 4), "\t\tes "], 4, "es")).toBe(false)
    expect(SpellTyping.opensQuotes([...carta.slice(0, 2), "\tgroup "], 2, "es")).toBe(false)
  })

  test("a language with no words opens none", () => {
    expect(SpellTyping.opensQuotes(["a "], 0, "xx")).toBe(false)
  })
})
