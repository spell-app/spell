import { readFileSync, readdirSync } from "fs"
import { beforeAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { compiledSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * Source maps (epic `elemental-spell` P14):  each line of compiled javascript back to the spell line it came from.
 * - Marks made as the code is written, then taken out again (`P.SourceMarks`):
 *   the code must be EXACTLY what it is with no map.
 * - Every mapped line points at its statement's line, in `.spell` and `.spellml` files alike.
 */
describe("P.SourceMarks.stamped()", () => {
  const map = (parts: P.SpellPlaceEntry[]) =>
    JSON.stringify({ version: 3, sources: ["Card.spellml"], names: [], mappings: "", x_spellPlaces: parts })

  test("a tag with props:  its place first among them", () => {
    expect(P.SourceMarks.stamped('h("b", { a: 1 })', map([[0, 5, "h", 0, 12, 4]]))).toBe(
      'h("b", { "data-spell-at": "Card.spellml:12:4", a: 1 })'
    )
  })

  test("a tag with none:  props of its own, before its children", () => {
    expect(P.SourceMarks.stamped('h("b", "words")', map([[0, 5, "h", 0, 1, 2]]))).toBe(
      'h("b", { "data-spell-at": "Card.spellml:1:2" }, "words")'
    )
    expect(P.SourceMarks.stamped('h("b")', map([[0, 5, "h", 0, 1, 2]]))).toBe(
      'h("b", { "data-spell-at": "Card.spellml:1:2" })'
    )
  })

  test("a made thing, over several lines:  it reads back, and nothing shows", () => {
    const code = "const a = new Set(\n  []\n)"
    const stamped = P.SourceMarks.stamped(
      code,
      map([
        [0, 10, "new", 0, 3, 1],
        [2, 1, "end", 0, 3, 1]
      ])
    )
    // oxlint-disable-next-line typescript/no-implied-eval -- the stamped code, run:  that is the test
    const made = new Function(`${stamped};  return a`)() as Set<unknown>
    expect(made).toBeInstanceOf(Set)
    expect(Object.keys(made)).toEqual([])
    expect(P.SourceMarks.placeOfThing(made)).toEqual({ path: "Card.spellml", line: 3, column: 1 })
  })

  test("no map, or one with no parts:  the code as it is", () => {
    expect(P.SourceMarks.stamped('h("b")', undefined)).toBe('h("b")')
    expect(P.SourceMarks.stamped('h("b")', map([]))).toBe('h("b")')
  })
})

describe("source maps", () => {
  beforeAll(registerTestComponentPack)

  const pairs = readdirSync(new URL("./spellx/", import.meta.url)).filter((name) => SP.isSpellSourceName(name))

  test.each(pairs)("%s:  the same code with a map as without one", (name) => {
    const files = [fixture(name)]
    expect(compiledSpellProject(files, { sourceMap: true }).code).toBe(compiledSpellProject(files).code)
  })

  test.each(pairs)("%s:  each mapped line points at a statement's line", (name) => {
    const file = fixture(name)
    const { code, map } = compiledSpellProject([file], { sourceMap: true })
    const lines = code.split("\n")
    const spell = file.contents.split("\n")
    const mapped = mappingsOf(map!.mappings)
    expect(mapped.length, "some lines are mapped").toBeGreaterThan(3)
    expect(map!.sources).toEqual([file.path])
    expect(map!.sourcesContent).toEqual([file.contents])
    for (const { line, source, sourceLine } of mapped) {
      expect(source).toBe(0)
      // the generated line is code, and its spell line is a line of the file with words on it
      expect(lines[line]!.trim(), `line ${line + 1}`).not.toBe("")
      expect(spell[sourceLine]?.trim(), `${name}:${sourceLine + 1}`).toBeTruthy()
    }
  })

  test("a program's lines map to the statements that wrote them", () => {
    const contents = ["a card is a thing", "\t- its 'rank' is a number", "", "to deal a card:", "\tset the deck to 3"]
      .join("\n")
      .replaceAll("'", '"')
    const { code, map } = compiledSpellProject([{ path: "/Cards.spell", contents }], { sourceMap: true })
    const lines = code.split("\n")
    const at = (text: string) => lines.findIndex((line) => line.includes(text))
    const sourceOf = (line: number) => mappingsOf(map!.mappings).find((it) => it.line === line)?.sourceLine
    expect(sourceOf(at("class Card"))).toBe(0)
    expect(sourceOf(at('static { this.declareProp("rank"'))).toBe(1)
    // a top-level action on a card, written into its class
    expect(sourceOf(at("deal()"))).toBe(3)
    expect(sourceOf(at("const deck = 3"))).toBe(4)
  })

  test("a map inlined into code replaces the line naming the file beside it", () => {
    const code = "run()\n//# sourceMappingURL=Boom.spell.js.map\n"
    const inlined = P.SourceMarks.inline(code, JSON.stringify({ version: 3, sources: ["Boom.spell"] }))
    expect(inlined).toMatch(/^run\(\)\n\/\/# sourceMappingURL=data:application\/json;base64,[\w+/=]+\n$/)
    const [, base64] = inlined.split("base64,")
    expect(JSON.parse(atob(base64!.trim())).sources).toEqual(["Boom.spell"])
    expect(P.SourceMarks.inline(code, undefined)).toBe("run()\n")
  })

  test("no marks are left when nothing asks for a map", () => {
    const { code } = compiledSpellProject([fixture("Card.spell")])
    expect(code).not.toContain("@@sm")
  })
})

/** A pair fixture as a project's file. */
function fixture(name: string) {
  return { path: `/${name}`, contents: readFileSync(new URL(`./spellx/${name}`, import.meta.url), "utf8") }
}

/** Each generated line's first mapping:  its line, source and source line, all from 0 -- `mappings` decoded. */
function mappingsOf(mappings: string) {
  const out: Array<{ line: number; source: number; sourceLine: number }> = []
  let source = 0
  let sourceLine = 0
  mappings.split(";").forEach((group, line) => {
    if (!group) return
    const [, sourceDelta = 0, lineDelta = 0] = decodeVLQ(group.split(",")[0]!)
    source += sourceDelta
    sourceLine += lineDelta
    out.push({ line, source, sourceLine })
  })
  return out
}

/** A segment's base-64 VLQ fields. */
function decodeVLQ(segment: string): number[] {
  const digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  const values: number[] = []
  let value = 0
  let shift = 0
  for (const char of segment) {
    const digit = digits.indexOf(char)
    value += (digit & 31) << shift
    if (digit & 32) shift += 5
    else {
      values.push(value & 1 ? -(value >> 1) : value >> 1)
      value = 0
      shift = 0
    }
  }
  return values
}
