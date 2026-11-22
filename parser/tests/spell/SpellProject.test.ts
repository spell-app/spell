import { afterEach, describe, test, expect } from "vite-plus/test"

import { LoadableFile } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

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

describe("the program's `@spell/core` import names only the spell classes it uses (epic `elemental-spell` I2)", () => {
  /** The spell classes `contents`, a project's one file, imports from `@spell/core` when `writer` writes it. */
  function importedClasses(contents: string, writer: P.ProgramWriter = P.JSWriter.instance): string[] {
    const { scope, files } = parseSpellProject([{ path: "/test.spell", contents }])
    const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
    const header = SP.SpellProject.importHeaderFor(scope, writer)
    const code = SP.SpellProject.combineCompiled(parts, writer, header, scope)
    const imported = /^import \{ ([^}]*) \} from "@spell\/core"$/m.exec(code)?.[1] ?? ""
    const classes = Object.values(P.BUILT_IN_CLASS_NAMES)
    return imported.split(/,\s*/).filter((name) => classes.includes(name))
  }

  const THING = `a "card" is a thing where:\n\t- its "rank" is a number`
  const VIEW = `a "card" is a view where:\n\t- to draw it:\n\t\treturn <ui-text>card</ui-text>`
  const VIEWABLE_LIST = `${VIEW}\na "pile" is a viewable list of cards`

  test("a thing:  Thing alone", () => {
    expect(importedClasses(THING)).toEqual(["Thing"])
  })

  test("a view:  View alone", () => {
    expect(importedClasses(VIEW)).toEqual(["View"])
  })

  test("a list of views:  View and ViewableList, in the header's order", () => {
    expect(importedClasses(VIEWABLE_LIST)).toEqual(["View", "ViewableList"])
  })

  test("TypeScript's the same", () => {
    expect(importedClasses(VIEWABLE_LIST, P.TSWriter.instance)).toEqual(["View", "ViewableList"])
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

/**
 * What a compile saves (epic `solid-2-final` P9):  `save: "later"` sends nothing till `saveUnsavedOutput()`,
 * and a built file is sent only when its text changed since we last sent it.
 */
describe("saving what a compile wrote", () => {
  const realFetch = LoadableFile.fetch
  afterEach(() => {
    LoadableFile.fetch = realFetch
  })

  /** A project with output written as a compile would, and every url saving it sends. */
  function compiledProject(projectName: string) {
    const project = new SP.SpellProject(`@spell/test/${projectName}`)
    project.contents = { manifest: {}, imports: [] }
    project.outputFile.contents = "export const one = 1\n"
    project.declarationsFile.contents = "{}"
    const sent: string[] = []
    LoadableFile.fetch = (async ({ url }: { url: string }) => {
      sent.push(url.split("/").at(-1)!)
      return ""
    }) as unknown as typeof LoadableFile.fetch
    return { project, sent }
  }

  test('`save: "later"`:  nothing sent, till `saveUnsavedOutput()`;  then once', async () => {
    const { project, sent } = compiledProject("LaterSaves")
    project.saveCompiled = "later"
    await project.saveOutput()
    expect(sent).toEqual([])
    expect(project.hasUnsavedOutput).toBe(true)
    await project.saveUnsavedOutput()
    expect(sent.sort()).toEqual(["LaterSaves.declarations.json5", "LaterSaves.en.js", "LaterSaves.spell.js"])
    expect(project.hasUnsavedOutput).toBe(false)
    sent.length = 0
    await project.saveUnsavedOutput()
    expect(sent).toEqual([])
  })

  test("a built file whose text hasn't changed isn't sent again", async () => {
    const { project, sent } = compiledProject("ChangedSaves")
    project.saveCompiled = true
    await project.saveOutput()
    expect(sent.length).toBe(3)
    sent.length = 0
    await project.saveOutput()
    expect(sent).toEqual([])
    project.outputFile.contents = "export const one = 2\n"
    await project.saveOutput()
    expect(sent).toEqual(["ChangedSaves.spell.js"])
  })
})
