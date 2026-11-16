import { describe, expect, test } from "vite-plus/test"

import { LSP } from "spell/app/lsp"

const { SpellTyping } = LSP

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
    expect(SpellTyping.indentToSnap(cardWith(8, `\tits "suit" is one of clubs, hearts`), 7)).toBe("\t")
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
    expect(SpellTyping.tagOpenAt(TAG, 0, 25)).toEqual({ line: 0, start: 2, nameEnd: 12, firstAttribute: 13 })
    // a line of its attributes under its first
    expect(SpellTyping.tagOpenAt(TAG, 1, 0)).toMatchObject({ line: 0, firstAttribute: 13 })
    expect(SpellTyping.tagOpenAt(TAG, 1, 6)).toMatchObject({ line: 0, firstAttribute: 13 })
  })

  test("not inside quotes, nor after the tag's `>`, nor on a line after it", () => {
    expect(SpellTyping.tagOpenAt(TAG, 0, 22)).toBeUndefined()
    expect(SpellTyping.tagOpenAt(TAG, 1, 16)).toBeUndefined()
    expect(SpellTyping.tagOpenAt(TAG, 1, 19)).toBeUndefined()
    expect(SpellTyping.tagOpenAt(TAG, 2, 0)).toBeUndefined()
    expect(SpellTyping.tagOpenAt(TAG, 2, 10)).toBeUndefined()
  })

  test("a tag whose name ends its line has no first attribute there", () => {
    expect(SpellTyping.tagOpenAt([`<container`, `\tcolumns="7">`], 1, 0)).toMatchObject({
      line: 0,
      firstAttribute: undefined
    })
  })

  test("a closing tag, or no tag, is none", () => {
    expect(SpellTyping.tagOpenAt([`\t</container>`], 0, 5)).toBeUndefined()
    expect(SpellTyping.tagOpenAt([`its rank is 3`], 0, 5)).toBeUndefined()
  })
})

describe("SpellTyping.tagLaidOut():  Enter between a tag's attributes, as Prettier lays out a long tag (I133)", () => {
  const TABS = { insertSpaces: false, tabSize: 2 }
  /** Solitaire's toolbar, a drawing's tag three levels in, then its first child. */
  const TOOLBAR = [
    `\t\t\t<toolbar class="GameBar" appearance="pills" inverted size="small" shrinkable>`,
    `\t\t\t\t<text slot="title">Spell Solitaire</>`
  ]
  const LAID_OUT = [
    `\t\t\t<toolbar`,
    `\t\t\t\tclass="GameBar"`,
    `\t\t\t\tappearance="pills"`,
    `\t\t\t\tinverted`,
    `\t\t\t\tsize="small"`,
    `\t\t\t\tshrinkable`,
    `\t\t\t>`
  ]

  test("each attribute on its own line a level in from the tag, its `>` back at the tag's level;  the caret before the next", () => {
    const column = TOOLBAR[0]!.indexOf("appearance") - 1
    expect(SpellTyping.tagLaidOut(TOOLBAR, 0, column, TABS)).toEqual({
      from: 0,
      to: 0,
      lines: LAID_OUT,
      caret: { line: 2, column: 4 }
    })
  })

  test("a tag laid out already, or partly (Owen's draft:  the rest lined up 11 tabs in), is laid out the same", () => {
    const partly = [
      `\t\t\t<toolbar class="GameBar"`,
      `\t\t\t\t\t\t\t\t\t\t\tappearance="pills" inverted size="small" shrinkable>`
    ]
    const layout = SpellTyping.tagLaidOut(partly, 1, 33, TABS)!
    expect(layout).toMatchObject({ from: 0, to: 1, lines: LAID_OUT })
    // in `inverted`, where it was:  `inv|erted`
    expect(layout.caret).toEqual({ line: 3, column: 7 })
    expect(SpellTyping.tagLaidOut(LAID_OUT, 3, 4, TABS)).toMatchObject({ from: 0, to: 6, lines: LAID_OUT })
  })

  test("a `/>`, a `{…}` and a quoted value with spaces kept whole;  what follows the tag stays after its `>`", () => {
    expect(
      SpellTyping.tagLaidOut([`\t<card-image rank=ace suit={its suit} title="a b" />`], 0, 13, TABS)!.lines
    ).toEqual([`\t<card-image`, `\t\trank=ace`, `\t\tsuit={its suit}`, `\t\ttitle="a b"`, `\t/>`])
    expect(SpellTyping.tagLaidOut([`<text slot="title" heavy>Spell</>`], 0, 19, TABS)!.lines).toEqual([
      `<text`,
      `\tslot="title"`,
      `\theavy`,
      `>Spell</>`
    ])
  })

  test("after the last attribute:  a line of its own for the next, the caret on it", () => {
    expect(SpellTyping.tagLaidOut([`<action "cheat" />`], 0, 16, TABS)).toEqual({
      from: 0,
      to: 0,
      lines: [`<action`, `\t"cheat"`, `\t`, `/>`],
      caret: { line: 2, column: 1 }
    })
  })

  test("in a file indented with spaces, a level of spaces;  in Spanish's tags too", () => {
    expect(
      SpellTyping.tagLaidOut([`  <barra clase="x" pequeña>`], 0, 18, { insertSpaces: true, tabSize: 2 })!.lines
    ).toEqual([`  <barra`, `    clase="x"`, `    pequeña`, `  >`])
  })

  test("not between a tag's attributes, or a tag with none:  none", () => {
    expect(SpellTyping.tagLaidOut([`its rank is 3`], 0, 5, TABS)).toBeUndefined()
    expect(SpellTyping.tagLaidOut([`<divider />`], 0, 8, TABS)).toBeUndefined()
    expect(SpellTyping.tagLaidOut(TOOLBAR, 0, TOOLBAR[0]!.length, TABS)).toBeUndefined()
  })
})

describe("SpellTyping.tagLineJoined():  Backspace at an attribute line's start (I133)", () => {
  test("the line joins the one above, a space between", () => {
    const lines = [`\t\t\t<toolbar class="GameBar"`, `\t\t\t\tappearance="pills" inverted>`, `\t\t\t\t<text />`]
    expect(SpellTyping.tagLineJoined(lines, 1, 4)).toEqual({
      from: 0,
      to: 1,
      lines: [`\t\t\t<toolbar class="GameBar" appearance="pills" inverted>`],
      caret: { line: 0, column: 28 }
    })
  })

  test("its attributes all back on the tag's line, a `>` alone under it comes up too, no space before it", () => {
    const lines = [`<toolbar class="GameBar"`, `\tshrinkable`, `>`]
    expect(SpellTyping.tagLineJoined(lines, 1, 1)).toMatchObject({
      from: 0,
      to: 2,
      lines: [`<toolbar class="GameBar" shrinkable>`]
    })
    expect(SpellTyping.tagLineJoined([`<action "x"`, `/>`], 1, 0)).toMatchObject({ lines: [`<action "x" />`] })
  })

  test("only at the start of an attribute line, after its indent", () => {
    const lines = [`<toolbar class="GameBar"`, `\tshrinkable>`]
    expect(SpellTyping.tagLineJoined(lines, 1, 2)).toBeUndefined()
    expect(SpellTyping.tagLineJoined([`<toolbar>`, `\t<text />`], 1, 1)).toBeUndefined()
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

describe("SpellTyping.enterRuleFor() (epic `codemirror` P1)", () => {
  test("between `<x>` and `</x>`, the caret a level in and the closing tag on its own line", () => {
    expect(SpellTyping.enterRuleFor(`\t<content>`, `</content>`)?.indent).toBe("indentOutdent")
    expect(SpellTyping.enterRuleFor(`\t<content>`, ``)?.indent).toBe("indent")
  })

  test("a level in after a `:`, a line going on, or before a comment after code", () => {
    expect(SpellTyping.enterRuleFor(`to draw it:`, ``)?.indent).toBe("indent")
    expect(SpellTyping.enterRuleFor(`\tif it is empty and`, ``)?.indent).toBe("indent")
    expect(SpellTyping.enterRuleFor(`\tits "face" is`, `-- the card it draws`)?.indent).toBe("indent")
  })

  test("none on a plain line, after a tag that closes itself, or inside a comment", () => {
    expect(SpellTyping.enterRuleFor(`\tset the band to 3`, ``)).toBeUndefined()
    expect(SpellTyping.enterRuleFor(`\t<divider />`, ``)).toBeUndefined()
    expect(SpellTyping.enterRuleFor(`\t-- a note`, `-- more`)).toBeUndefined()
  })
})

describe("SpellTyping.indentToSnap() before a group (epic `language` I121)", () => {
  test("none on the blank line before a group's line:  it's drawn outside the group above", () => {
    expect(SpellTyping.indentToSnap(CARD, 7)).toBe("")
    expect(SpellTyping.indentToSnap([...CARD.slice(0, 7), ``, ``, ...CARD.slice(8)], 8)).toBe("")
  })

  test("in Spanish too, its group's word", () => {
    const tarjeta = [`una "carta" es una vista`, `\tsu "palo" es uno de oros, copas`, ``, `\tgrupo "Nombres"`]
    expect(SpellTyping.indentToSnap(tarjeta, 2, "es")).toBe("")
    expect(SpellTyping.indentToSnap(tarjeta, 2)).toBe("\t")
  })

  test("a letter typed there still takes the group's indent", () => {
    expect(SpellTyping.indentToAdd(cardWith(7, "g"), 7, 0)).toBe("\t")
  })
})

describe("`|>` closes a tag (epic `codemirror` T16)", () => {
  /** Does the `>` at the end of `line` close a tag with a bar? */
  const closes = (line: string, before: string[] = []) =>
    SpellTyping.closesWithBar([...before, line], before.length, line.length - 1)

  test("a `|>` between a tag's attributes, or right after its name", () => {
    expect(closes(`\t<divider |>`)).toBe(true)
    expect(closes(`<divider|>`)).toBe(true)
    expect(closes(`<card-image card={it} |>`)).toBe(true)
    expect(closes(`<icon name="star"|>`)).toBe(true)
    expect(closes(`\t\tspacing="xs" |>`, [`\t<container columns="7"`])).toBe(true)
  })

  test("left alone:  in a value, in text, in Spell code, no `|` before it", () => {
    expect(closes(`<text value="a |>`)).toBe(false)
    expect(closes(`<x a={b |>`)).toBe(false)
    expect(closes(`<x a=b|>`)).toBe(false)
    expect(closes(`<text>a |>`)).toBe(false)
    expect(closes(`its "x" is 1 |>`)).toBe(false)
    expect(closes(`<divider >`)).toBe(false)
    expect(closes(`</text|>`)).toBe(false)
  })
})
