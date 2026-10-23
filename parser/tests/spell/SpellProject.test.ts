import { describe, test, expect } from "vite-plus/test"

import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { parseSpellProject } from "spell-parser/spell/test"

// spell's project groups are spaces' (spell-app's):  a test double of them, registered as it loads (epic `repo-split` C11)
import "./projectGroups.double"

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

// the bug of 2026-10-22:  a project copied to a folder of another name parsed its old words file as spell
describe("getFileForPath():  a file's kind is the END of its name", () => {
  /** The file `name` is, in a project. */
  function fileNamed(name: string): SP.AnySpellFile {
    return SP.SpellProject.getFileForPath(`@spell/test/calc2/${name}`)
  }

  test("spell source is `.spell`", () => {
    expect(fileNamed("Calculator.spell")).toBeInstanceOf(SP.SpellFile)
  })

  test("javascript, whatever comes before its `.js`:  an old name's words file, a minified helper", () => {
    expect(fileNamed("calculator.en.js")).toBeInstanceOf(SP.SpellJSFile)
    expect(fileNamed("Solitario.pt-BR.js")).toBeInstanceOf(SP.SpellJSFile)
    expect(fileNamed("helpers.min.js")).toBeInstanceOf(SP.SpellJSFile)
    expect(fileNamed("helpers.js")).toBeInstanceOf(SP.SpellJSFile)
  })

  test("CSS, and property editor pages", () => {
    expect(fileNamed("theme.dark.css")).toBeInstanceOf(SP.SpellCSSFile)
    expect(fileNamed(`Card${SP.EDITOR_PAGE_SUFFIX}`)).toBeInstanceOf(SP.SpellJSFile)
  })
})
