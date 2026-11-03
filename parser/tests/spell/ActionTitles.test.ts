import { beforeAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * An action's own title, apart from its name (epic `language` P18, the editor's r4):
 * `- titled "Compile and Run"`, spellx's `title=`, a fill-in that follows the program,
 * and its words in another language, from the program's names dictionary there (Q20).
 */
describe("an action's title", () => {
  beforeAll(registerTestComponentPack)

  test("code spell:  written, and with a fill-in", () => {
    const contents = [
      "an editor is an app:",
      '\t- its "project name" is text',
      "\t- to compile and run:",
      '\t\t- titled "Compile and Run"',
      "\t\tprint 1",
      "\t- to duplicate it:",
      '\t\t- titled "Duplicate [its project name]…"',
      "\t\tprint 2"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Editor.spell", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('core.describeAction(Editor, "compileAndRun", { title: "Compile and Run" })')
    expect(file!.compiled).toContain("get duplicateTitle() {")
    expect(file!.compiled).toContain('{ title: "duplicate it", titleFrom: "duplicateTitle" }')
  })

  test("Spanish:  `- titulada`", () => {
    const contents = [
      "un editor es una aplicación:",
      "\t- para compilar:",
      '\t\t- titulada "Código"',
      "\t\timprimir 1"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Editor.es.spell", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('{ title: "Código" }')
  })

  test("spellx:  `title=`, in both languages", () => {
    const english = [
      '<spell-app "editor">',
      '\t<action "compile and run" title="Compile and Run">print 1</action>',
      "</spell-app>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Editor.spellml", contents: english }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('{ title: "Compile and Run" }')
    const spanish = [
      '<encanto-aplicación "editor">',
      '\t<acción "compilar" título="Código">imprimir 1</acción>',
      "</encanto-aplicación>"
    ].join("\n")
    const [file2] = parseSpellProject([{ path: "/Editor.es.spellml", contents: spanish }]).files
    expect(file2!.errors).toEqual([])
    expect(file2!.compiled).toContain('{ title: "Código" }')
  })

  test("another language's words file:  each title's words there, from the names dictionary's texts", () => {
    const contents = [
      "an editor is an app:",
      "\t- to compile and run:",
      '\t\t- titled "Compile and Run"',
      "\t\tprint 1",
      "\t- to stop:",
      '\t\t- titled "Stop"',
      "\t\tprint 2"
    ].join("\n")
    const { declarations } = compiledSpellProject([{ path: "/Editor.spell", contents }])
    expect(declarations.statements.find((it) => it.title)?.title).toBe("Compile and Run")
    const names = '{ texts: { "Compile and Run": "Compilar y ejecutar", "Other": "Otro" } }'
    const titles = SP.SpellWords.titlesFrom(declarations, SP.SpellWords.textsOfNames(names))
    expect(titles).toEqual({ "Compile and Run": "Compilar y ejecutar" })
    const script = SP.SpellWords.script({ lang: "es", types: {}, titles }, "Editor")
    expect(SP.SpellWords.read(script)?.titles).toEqual(titles)
    expect(SP.SpellWords.titlesFrom(declarations, SP.SpellWords.textsOfNames("not json"))).toBeUndefined()
  })
})
