import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * What compiled Python says a value is (epic `rust` P1), where the fixtures' snapshots don't reach:
 * a list of values `Literal` can't say keeps `Any`, said out loud.
 */

/** `lines`, one file of its own project, compiled to Python. */
function python(lines: string[]): string {
  const { scope, files } = parseSpellProject([{ path: "/Hints.spell", contents: lines.join("\n") }])
  const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  const writer = PY.PyWriter.instance
  return SP.SpellProject.combineCompiled(parts, writer, SP.SpellProject.importHeaderFor(scope, writer), scope)
}

describe("a list of values, as a Python hint", () => {
  test("texts and whole numbers:  a name above the class, for a parameter named for the property", () => {
    const code = python(["a card is a thing where:", '  - its "rank" is one of ace, 2, 3', '    - it "is a (rank)"'])
    expect(code).toContain('Rank = Literal["ace", 2, 3]')
    expect(code).toContain("rank: Rank")
    expect(code).toContain("from typing import Literal")
  })

  test("a number with a fraction:  `Literal` can't say it, so `Any`", () => {
    const code = python(["a card is a thing where:", '  - its "size" is one of 1.5, 2', '    - it "is a (size)"'])
    expect(code).not.toContain("Literal")
    expect(code).toContain("size: Any")
  })
})

/** `lines`, one file of its own project, compiled to TypeScript. */
function typescript(lines: string[]): string {
  const { scope, files } = parseSpellProject([{ path: "/Events.spell", contents: lines.join("\n") }])
  const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  const writer = P.TSWriter.instance
  return SP.SpellProject.combineCompiled(parts, writer, SP.SpellProject.importHeaderFor(scope, writer), scope)
}

describe("one type per event name (epic `rust` P2)", () => {
  const CARD = [
    "a card is a thing where:",
    '  - its "direction" is one of up or down',
    '  - it sends "flipped" with side as a direction',
    "  - on key down with a key:",
    "    print key",
    "  - on flipped with a side:",
    "    print side",
    "  - on click:",
    "    send flipped with side = 1",
    "  - on mystery:",
    '    print "mystery"'
  ]

  test("what the table of events says:  `key down` holds `key`, a click only what every event does", () => {
    expect(typescript(CARD)).toContain("export type KeyDownEvent = SentEvent & { key: string }")
    expect(python(CARD)).toMatch(/class KeyDownEvent\(SpellEvent\):\n {4}key: str/)
  })

  test("what a template declares:  `flipped` holds `side`", () => {
    expect(typescript(CARD)).toContain("export type FlippedEvent = SentEvent & { side: Direction }")
    expect(python(CARD)).toMatch(/class FlippedEvent\(SpellEvent\):\n {4}side: Direction/)
  })

  test("an event nothing says the shape of stays unknown, said out loud", () => {
    expect(typescript(CARD)).toContain("onMystery(event: any /* spell: type unknown */)")
    expect(typescript(CARD)).not.toContain("MysteryEvent")
    expect(python(CARD)).toContain("event: Any")
  })

  test("a type never hides the browser's own", () => {
    const code = typescript(["a card is a view where:", "  - when dragged:", '    print "dragged"'])
    expect(code).not.toContain("DragEvent")
  })
})
