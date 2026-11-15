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

describe("SpellTyping.tagBeforeSpace() (T68)", () => {
  test("a space right after a tag's name, nothing after it:  that tag", () => {
    expect(SpellTyping.tagBeforeSpace([`\t<action `], 0, 8)).toBe("action")
    expect(SpellTyping.tagBeforeSpace([`<acción `], 0, 7)).toBe("acción")
    expect(SpellTyping.tagBeforeSpace([`<action  <divider/>`], 0, 7)).toBe("action")
  })

  test("none when more of the tag is written after it, or the space isn't after a tag's name", () => {
    expect(SpellTyping.tagBeforeSpace([`<action "x"/>`], 0, 7)).toBeUndefined()
    expect(SpellTyping.tagBeforeSpace([`<action foo`], 0, 7)).toBeUndefined()
    expect(SpellTyping.tagBeforeSpace([`<action "x" `], 0, 11)).toBeUndefined()
    expect(SpellTyping.tagBeforeSpace([`x < y`], 0, 3)).toBeUndefined()
    expect(SpellTyping.tagBeforeSpace([`its action `], 0, 10)).toBeUndefined()
  })
})

describe("SpellTyping.pastedLines()", () => {
  const TABS = { insertSpaces: false, tabSize: 4 }
  const SPACES = { insertSpaces: true, tabSize: 2 }

  test("a paste at an indent:  its first line there, the rest kept where they were from it", () => {
    expect(SpellTyping.pastedLines(["its rank", "\tit is high", "its suit"], "\t\t", TABS)).toEqual([
      "its rank",
      "\t\t\tit is high",
      "\t\tits suit"
    ])
  })

  test("the first line's own indent goes, at the caret's", () => {
    expect(SpellTyping.pastedLines(["\t\tits rank", "\t\t\tit is high"], "\t", TABS)).toEqual([
      "its rank",
      "\t\tit is high"
    ])
  })

  test("a paste ending its line leaves what was after the caret at the caret's indent, in its body (I53)", () => {
    // `restart the game\n` pasted before `for each card in the deck`, two tabs in
    expect(SpellTyping.pastedLines(["restart the game", ""], "\t\t", TABS)).toEqual(["restart the game", "\t\t"])
    expect(SpellTyping.pastedLines(["\tits rank", "\t\tit is high", ""], "\t", TABS)).toEqual([
      "its rank",
      "\t\tit is high",
      "\t"
    ])
  })

  test("spaces, in a file of spaces", () => {
    expect(SpellTyping.pastedLines(["its rank", "  it is high"], "    ", SPACES)).toEqual([
      "its rank",
      "      it is high"
    ])
  })

  test("a drawing's markup is laid out as a tree (I53's paste)", () => {
    expect(SpellTyping.pastedLines(["<header>Two</header>", "\t<text>Nested</text>"], "\t\t\t\t", TABS)).toEqual([
      "<header>Two</header>",
      "\t\t\t\t<text>Nested</text>"
    ])
    expect(
      SpellTyping.pastedLines(
        ["<content>", "<button fluid>", "{its label}", "</button>", '<text "hi"/>', "<br />", "</>"],
        "\t\t",
        TABS
      )
    ).toEqual([
      "<content>",
      "\t\t\t<button fluid>",
      "\t\t\t\t{its label}",
      "\t\t\t</button>",
      '\t\t\t<text "hi"/>',
      "\t\t\t<br />",
      "\t\t</>"
    ])
    // as spell reads them, not HTML:  `<br>` holds what's under it till its closer;  Spell UI's `<link>` its text
    expect(SpellTyping.pastedLines(["<text>", "<link>", "docs", "</link>", "</text>"], "\t", TABS)).toEqual([
      "<text>",
      "\t\t<link>",
      "\t\t\tdocs",
      "\t\t</link>",
      "\t</text>"
    ])
    // an if-chain's next branch back at its `<if>`'s level (epic `editor` T71's `LSP.MarkupIndent`)
    expect(SpellTyping.pastedLines(["<if it is done>", "Done", "<otherwise>", "Not yet", "</>"], "\t", TABS)).toEqual([
      "<if it is done>",
      "\t\tDone",
      "\t<otherwise>",
      "\t\tNot yet",
      "\t</>"
    ])
  })

  test("mid-line:  the line's indent, its first line as it was", () => {
    expect(SpellTyping.pastedLines(["rank", "\tit is high"], "\tits ", TABS)).toEqual(["rank", "\t\tit is high"])
  })

  test("at a line's very start, or one line:  as copied", () => {
    expect(SpellTyping.pastedLines(["\tits rank", "\t\tit is high"], "", TABS)).toEqual([
      "\tits rank",
      "\t\tit is high"
    ])
    expect(SpellTyping.pastedLines(["its rank"], "\t\t", TABS)).toEqual(["its rank"])
  })

  test("blank lines stay blank", () => {
    expect(SpellTyping.pastedLines(["a", "  ", "\tb"], "\t", TABS)).toEqual(["a", "", "\t\tb"])
  })
})

describe("SpellTyping.linesUnder()", () => {
  const DRAWING = [
    `\tto draw it`,
    `\t\t<column>`,
    `\t\t\t<button fluid>`,
    `\t\t\t\t{its label}`,
    ``,
    `\t\t\t</button>`,
    `\t\t\t<text>Two</text>`,
    `\t\t</column>`,
    `\tgroup "Names"`
  ]

  test("a tag's children and its closing tag", () => {
    expect(SpellTyping.linesUnder(DRAWING, 1)).toBe(6)
    expect(SpellTyping.linesUnder(DRAWING, 2)).toBe(3)
  })

  test("a tag closed on its own line has none", () => {
    expect(SpellTyping.linesUnder(DRAWING, 6)).toBe(0)
  })

  test("a body:  the lines indented under it", () => {
    expect(SpellTyping.linesUnder(DRAWING, 0)).toBe(7)
    expect(SpellTyping.linesUnder(CARD, 4)).toBe(2)
    expect(SpellTyping.linesUnder(CARD, 1)).toBe(0)
  })
})

describe("SpellTyping.tagOpenAt() (I142)", () => {
  const TAG = [`\t\t<container columns="7" padding="small"`, `\t\t\t\t\t spacing="xs">`, `\t\t\t<text "hi" />`]

  test("between a tag's attributes:  the line it starts on, its first attribute's column", () => {
    expect(SpellTyping.tagOpenAt(TAG, 0, 25)).toEqual({ line: 0, firstAttribute: 13 })
    // a line of its attributes under its first
    expect(SpellTyping.tagOpenAt(TAG, 1, 0)).toEqual({ line: 0, firstAttribute: 13 })
    expect(SpellTyping.tagOpenAt(TAG, 1, 6)).toEqual({ line: 0, firstAttribute: 13 })
  })

  test("not inside quotes, nor after the tag's `>`, nor on a line after it", () => {
    expect(SpellTyping.tagOpenAt(TAG, 0, 22)).toBeUndefined()
    expect(SpellTyping.tagOpenAt(TAG, 1, 16)).toBeUndefined()
    expect(SpellTyping.tagOpenAt(TAG, 1, 19)).toBeUndefined()
    expect(SpellTyping.tagOpenAt(TAG, 2, 0)).toBeUndefined()
    expect(SpellTyping.tagOpenAt(TAG, 2, 10)).toBeUndefined()
  })

  test("a tag whose name ends its line has no first attribute there", () => {
    expect(SpellTyping.tagOpenAt([`<container`, `\tcolumns="7">`], 1, 0)).toEqual({
      line: 0,
      firstAttribute: undefined
    })
  })

  test("a closing tag, or no tag, is none", () => {
    expect(SpellTyping.tagOpenAt([`\t</container>`], 0, 5)).toBeUndefined()
    expect(SpellTyping.tagOpenAt([`its rank is 3`], 0, 5)).toBeUndefined()
  })
})

describe("SpellTyping.commentIndent() (I161)", () => {
  const TABS = { insertSpaces: false, tabSize: 4 }
  /** Solitaire's card's `face`, its comment after its head. */
  const FACE = [
    `\tits "face" is\t\t\t-- the card it draws:  its card, else one of its rank and suit`,
    `\t\tits card if its card exists`,
    `\t\ta new card whose rank is its rank and suit is its suit otherwise`,
    `\tits "color" is`
  ]

  test("the level of the body under the line:  its first line's", () => {
    expect(SpellTyping.commentIndent(FACE, 0, TABS)).toBe("\t\t")
    const deeper = FACE.map((line, at) => (at === 1 || at === 2 ? `\t${line}` : line))
    expect(SpellTyping.commentIndent(deeper, 0, TABS)).toBe("\t\t\t")
  })

  test("no body under it:  a level in, in the file's tabs or spaces", () => {
    expect(SpellTyping.commentIndent([`a "pile" is a list -- of cards`, `a "deck" is a pile`], 0, TABS)).toBe("\t")
    expect(
      SpellTyping.commentIndent([`  its "x" is 1 -- one`, `  its "y" is 2`], 0, { insertSpaces: true, tabSize: 2 })
    ).toBe("    ")
    expect(SpellTyping.commentIndent([`\tits "x" is 1 -- one`], 0, TABS)).toBe("\t\t")
  })
})

describe("SpellTyping.spaceAtEnd() (I160)", () => {
  test("the tabs and spaces at a line's end, and only those", () => {
    expect(SpellTyping.spaceAtEnd(`\tits "face" is\t\t\t`)).toBe(3)
    expect(SpellTyping.spaceAtEnd(`\tits "face" is \t`)).toBe(2)
    expect(SpellTyping.spaceAtEnd(`\tits "face" is`)).toBe(0)
    expect(SpellTyping.spaceAtEnd(`\t\t`)).toBe(2)
  })
})
