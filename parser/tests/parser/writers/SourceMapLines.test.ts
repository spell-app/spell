import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"

/** A map from `SourceMarks`, as a compile makes one:  `node`s here are only what `placeOf` is asked about. */
function mapOf(lines: Array<{ code: string; at?: number }>, parts: P.SpellPlaceEntry[] = []): P.SourceMapV3 {
  const marks = new P.SourceMarks((node) => node as unknown as P.SourcePlace)
  const code = P.SourceMarks.during(marks, () =>
    lines
      .map(({ code: line, at }) =>
        at === undefined
          ? line
          : P.SourceMarks.mark(line, { path: "Card.spell", line: at, column: 2 } as unknown as P.ASTNode)
      )
      .join("\n")
  )
  return { ...marks.extract(code as string, { sources: new Map([["Card.spell", "..."]]) }).map, x_spellPlaces: parts }
}

describe("P.SourceMapLines", () => {
  const map = mapOf([
    { code: "// the card" },
    { code: "class Card {", at: 3 },
    { code: "  draw() {" },
    { code: "    return 1", at: 7 },
    { code: "  }" },
    { code: "  play() {", at: 7 },
    { code: "    return 2", at: 12 },
    { code: "}" }
  ])
  const lines = new P.SourceMapLines(map)

  test("a compiled line says where it came from", () => {
    expect(lines.placeOfLine(1)).toEqual({ path: "Card.spell", line: 3, column: 2 })
    expect(lines.placeOfLine(6)).toEqual({ path: "Card.spell", line: 12, column: 2 })
  })

  test("a line with no mapping of its own belongs to the last above it, by statement", () => {
    expect(lines.placeOfLine(2)?.line).toBe(3)
    expect(lines.placeOfLine(7)?.line).toBe(12)
  })

  test("nothing above the first mapping", () => {
    expect(lines.placeOfLine(0)).toBeUndefined()
  })

  test("a source line says every compiled line it wrote", () => {
    expect(lines.linesOf("Card.spell", 7)).toEqual([3, 5])
  })

  test("a source line that wrote nothing says the nearest above it that did", () => {
    expect(lines.linesOf("Card.spell", 5)).toEqual([1])
  })

  test("nothing, for a line above the first or a file not in the map", () => {
    expect(lines.linesOf("Card.spell", 1)).toEqual([])
    expect(lines.linesOf("Pile.spell", 7)).toEqual([])
  })

  test("what's drawn and made has lines of its own, but a statement's mapping stands on its line", () => {
    const withParts = new P.SourceMapLines(
      mapOf(
        [{ code: "draw() {", at: 3 }, { code: "  h('a')" }, { code: "  h('b')" }, { code: "}" }],
        [
          [0, 0, "h", 0, 40, 0],
          [2, 2, "h", 0, 5, 4],
          [3, 0, "end", 0, 6, 0]
        ]
      )
    )
    expect(withParts.placeOfLine(0)?.line).toBe(3)
    expect(withParts.placeOfLine(1)?.line).toBe(3)
    expect(withParts.placeOfLine(2)?.line).toBe(5)
    expect(withParts.placeOfLine(3)?.line).toBe(5)
    expect(withParts.linesOf("Card.spell", 5)).toEqual([2])
  })

  test("takes its map as JSON too", () => {
    expect(new P.SourceMapLines(JSON.stringify(map)).placeOfLine(3)?.line).toBe(7)
  })
})
