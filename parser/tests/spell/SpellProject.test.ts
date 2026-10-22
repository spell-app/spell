import { describe, test, expect } from "vite-plus/test"

import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { parseSpellProject } from "spell-lang/spell/test"

/**
 * `SpellProject` over projects written here, inline.
 * - A whole frozen project's parse (Solitaire's) is spell-app's test, beside the projects:
 *   its `tests/spell/SpellProject.test.ts`.
 */
describe("a program's own tests", () => {
  /** `files` combined as a project compiles them, then the lines that run the first time it loads. */
  function startLines(files: Array<{ path: string; contents: string }>): string[] {
    const parsed = parseSpellProject(files).files
    const parts = parsed.map(({ match, compiled }) =>
      match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled
    )
    return SP.SpellProject.combineCompiled(parts)
      .split("\n")
      .filter((line) => line.startsWith("if (!core.isCarryingOver)"))
  }

  test("each `to test ...` runs at the end, in file order, the first time the program loads (P17)", () => {
    const lines = startLines([
      { path: "/A.spell", contents: "to test adding:\n\t1 + 1 should be 2" },
      { path: "/B.spell", contents: "to test subtracting:\n\t2 - 1 should be 1" }
    ])
    expect(lines).toEqual(["if (!core.isCarryingOver) testAdding()", "if (!core.isCarryingOver) testSubtracting()"])
  })

  test("not one the program already runs at its start:  `test adding`", () => {
    const lines = startLines([{ path: "/A.spell", contents: "to test adding:\n\t1 + 1 should be 2\ntest adding" }])
    expect(lines).toEqual(["if (!core.isCarryingOver) testAdding()"])
  })
})
