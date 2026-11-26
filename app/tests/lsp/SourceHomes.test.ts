import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"
import { SourceEdits, type TextSpan } from "spell/app/lsp/SourceEdits"
import { SourceHomes } from "spell/app/lsp/SourceHomes"

/** A type with defaults, and a thing made on a line that says some of its fields. */
const CARD = [
  `a "card" is a view:`,
  `\t- its "count" is one of 1, 2`,
  `\t- its "title" is a text`,
  `\t- its "score" is a number`,
  `\t- to create it:`,
  `\t\tset its count to 2`,
  `\t\tset its score to the count + 1`,
  ``,
  `solo is an app:`,
  `\t- its "first" is a new card with title = "x", count = 1`,
  ``
].join("\n")

/** `CARD`, parsed, as `SourceHomes` reads it. */
function parsed(contents = CARD) {
  const project = parseSpellProject([{ path: "Card.spell", contents }])
  return project.files.map((file) => ({ ...file, path: "Card.spell" }))
}

describe("SourceHomes.fieldHomes()", () => {
  const made = { path: "Card.spell", offset: CARD.indexOf("a new card") }

  test("each field's home on its making and its type's default, with the text each was read at", () => {
    const homes = SourceHomes.fieldHomes(parsed(), made, ["Card"], ["count", "title", "score"])
    expect(homes.behind).toBe(false)
    expect(homes.making.title).toMatchObject({ kind: "written", place: "literal", style: "text" })
    expect(homes.start.count).toMatchObject({ kind: "default", typeName: "Card" })
    expect(homes.start.score).toMatchObject({ kind: "expression" })
    expect(homes.start.title).toBeNull()
    for (const home of [homes.making.title!, homes.start.count!]) {
      expect(home.seen).toBe(CARD.slice(home.anchor.start, home.anchor.end))
      expect(SourceHomes.isStill(home, CARD)).toBe(true)
    }
  })

  test("a thing no line made has no making homes, only its type's", () => {
    const homes = SourceHomes.fieldHomes(parsed(), undefined, ["Card"], ["count"])
    expect(homes.making).toEqual({})
    expect(homes.start.count).toMatchObject({ kind: "default" })
  })

  test("a default said on its type's own line, after `with`, is its home (epic `language` T111)", () => {
    const PILES = [
      `a "pile" is a list of cards`,
      `\tits "layout" is one of stacked or vertical`,
      ``,
      `a "foundation" is a pile with layout "stacked"`,
      `\tits "suit" is a text`,
      ``
    ].join("\n")
    const homes = SourceHomes.fieldHomes(parsed(PILES), undefined, ["Foundation", "Pile"], ["layout"])
    const home = homes.start.layout!
    expect(home).toMatchObject({ kind: "default", typeName: "Foundation", place: "literal", style: "text" })
    expect(PILES.slice(home.span!.start, home.span!.end)).toBe(`"stacked"`)
  })

  test("a home whose text has changed since is no longer still", () => {
    const homes = SourceHomes.fieldHomes(parsed(), made, ["Card"], ["count"])
    const typed = CARD.replace("set its count to 2", "set its count to 27")
    expect(SourceHomes.isStill(homes.start.count!, typed)).toBe(false)
    // text typed after it leaves it where it was
    expect(SourceHomes.isStill(homes.start.count!, `${CARD}-- more\n`)).toBe(true)
  })
})

describe("SourceHomes.moved()", () => {
  const made = { path: "Card.spell", offset: CARD.indexOf("a new card") }

  test("the Inspector's own write moves the home it wrote, so the next write lands in place", () => {
    let text = CARD
    let home = SourceHomes.fieldHomes(parsed(), made, ["Card"], ["count"]).start.count!
    if (home.kind !== "default") throw new TypeError("not a default")
    // a dragged slider:  2, then 10, then 3, each written to the home the last write left
    for (const value of [10, 3]) {
      const span: TextSpan = home.span!
      const after = SourceEdits.applied(text, [SourceEdits.replacing(text, span, String(value))])
      home = SourceHomes.moved(
        home,
        { at: span.start, removed: span.end - span.start, inserted: String(value).length },
        after
      )
      text = after
      expect(SourceHomes.isStill(home, text)).toBe(true)
      expect(text.slice(home.span!.start, home.span!.end)).toBe(String(value))
    }
    expect(text).toBe(CARD.replace("set its count to 2", "set its count to 3"))
  })

  test("a change before a home shifts it;  one after it leaves it", () => {
    const home = SourceHomes.fieldHomes(parsed(), made, ["Card"], ["title"]).making.title!
    const before = `-- a note\n${CARD}`
    const shifted = SourceHomes.moved(home, { at: 0, removed: 0, inserted: 10 }, before)
    expect(shifted.anchor).toEqual({ start: home.anchor.start + 10, end: home.anchor.end + 10 })
    expect(SourceHomes.isStill(shifted, before)).toBe(true)
    const after = `${CARD}-- a note\n`
    expect(SourceHomes.moved(home, { at: CARD.length, removed: 0, inserted: 10 }, after).anchor).toEqual(home.anchor)
  })
})
