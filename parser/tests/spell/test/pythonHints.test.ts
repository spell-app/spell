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
