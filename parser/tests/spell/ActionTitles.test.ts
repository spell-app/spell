import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { LoadableFile } from "spell/util"
import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

// spell's project groups are spaces':  a test double of them, so a project id names a group
import "./projectGroups.double"

/**
 * An action's own title, apart from its name (epic `language` P18, the editor's r4):
 * `- titled "Compile and Run"`, a fill-in that follows the program,
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
    expect(file!.compiled).toContain(
      'core.describeAction(Editor, "compileAndRun", { title: "Compile and Run", undoneAs: "Compile and Run" })'
    )
    expect(file!.compiled).toContain("get duplicateTitle() {")
    expect(file!.compiled).toContain('{ title: "Duplicate It", titleFrom: "duplicateTitle", undoneAs: "Duplicate It" }')
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
    expect(file!.compiled).toContain('{ title: "Código", undoneAs: "Código" }')
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

/**
 * Which names dictionaries a compile asks for:  only those the project's index lists, `namesLanguages`
 * (epic `editor` I68:  asking for every language's showed the browser a 404 for each one a project lacks).
 */
describe("an action's title in another language:  the names dictionaries asked for", () => {
  beforeAll(registerTestComponentPack)
  const realFetch = LoadableFile.fetch
  afterEach(() => {
    LoadableFile.fetch = realFetch
  })

  const CONTENTS = ["an editor is an app:", "\t- to compile and run:", '\t\t- titled "Compile and Run"', "\t\tprint 1"]
  const NAMES = '{ texts: { "Compile and Run": "Compilar y ejecutar" } }'

  /** Project `projectName` of `@spell/test`, its declarations compiled, its index saying `namesLanguages`;  and every url its titles ask for. */
  async function titlesOf(projectName: string, namesLanguages?: string[]) {
    const { declarations } = compiledSpellProject([{ path: `/${projectName}.spell`, contents: CONTENTS.join("\n") }])
    const project = new SP.SpellProject(`@spell/test/${projectName}`)
    project.contents = { manifest: {}, imports: [], ...(namesLanguages && { namesLanguages }) }
    project.declarationsFile.contents = JSON.stringify(declarations)
    const asked: string[] = []
    LoadableFile.fetch = (async ({ url }: { url: string }) => {
      asked.push(url)
      return NAMES
    }) as unknown as typeof LoadableFile.fetch
    await (project as unknown as { writeTitleWords(): Promise<void> }).writeTitleWords()
    return { project, asked }
  }

  test("a project with a Spanish dictionary:  asks for it alone, and gets its titles' Spanish words", async () => {
    const { project, asked } = await titlesOf("TitledEditor", ["es"])
    expect(asked).toEqual([SP.SpellUrls.fileUrl("@spell/test/TitledEditor/TitledEditor.es.names.json5")])
    expect(project.titleLanguages).toEqual(["es"])
    expect(SP.SpellWords.read(project.wordsFileFor("es").contents ?? "")?.titles).toEqual({
      "Compile and Run": "Compilar y ejecutar"
    })
  })

  test("a project with none:  asks for no names file", async () => {
    const { project, asked } = await titlesOf("PlainEditor")
    expect(asked).toEqual([])
    expect(project.titleLanguages).toEqual([])
  })
})

/**
 * An action's title said nowhere:  its words in title case, each blank by the kind it takes (epic `language` J156, J179).
 * - `to put (a card) on (a pile)` is `Put Card on Pile`, as its undo step:  `Undo Put Card on Pile`.
 */
describe("an action's default title", () => {
  /** The `title` / `undoneAs` lines `lines` compiles to, in file `path`. */
  function titlesOf(lines: string[], path = "/Titles.spell") {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    expect(file!.errors).toEqual([])
    return file!.compiled.split("\n").filter((line) => /title:|undoneAs:/.test(line))
  }

  test("each blank by its kind, with no article;  the little words in lower case, unless first", () => {
    const titles = titlesOf([
      "a card is a thing",
      "a pile is a list of cards",
      "to put (a card) on (a pile):",
      "\tprint 1",
      "to play a card:",
      "\tprint 2",
      "to turn the top card over:",
      "\tprint 3",
      'to "compile and run" with icon "play"',
      "\tprint 4"
    ])
    expect(titles).toContain(
      'core.describeAction(Card, "putOnPile", { title: "Put Card on Pile", undoneAs: "Put Card on Pile" })'
    )
    expect(titles).toContain('core.describeAction(Card, "play", { title: "Play Card", undoneAs: "Play Card" })')
    expect(titles).toContain('  return core.asAction({ undoneAs: "Turn the Top Card Over" }, () => {')
    expect(titles).toContain('  return core.asAction({ undoneAs: "Compile and Run" }, () => {')
  })

  test("a blank of a built-in kind, or with a default, says its own name (J179)", () => {
    const titles = titlesOf([
      "a calculator is a thing",
      "to append (digit as text) to (a calculator):",
      "\tprint 1",
      'to notify (message = "Really?"):',
      "\tprint 2",
      "to double (n as a number):",
      "\tprint 3"
    ])
    expect(titles.join("\n")).toContain('title: "Append Digit to Calculator"')
    expect(titles).toContain('  return core.asAction({ undoneAs: "Notify Message" }, () => {')
    expect(titles).toContain('  return core.asAction({ undoneAs: "Double N" }, () => {')
  })

  test("Spanish:  its own little words", () => {
    const titles = titlesOf(
      [
        "una carta es una cosa",
        "una pila es una lista de cartas",
        "para poner (una carta) en (una pila):",
        "\timprimir 1"
      ],
      "/Titulos.es.spell"
    )
    expect(titles.join("\n")).toContain('title: "Poner Carta en Pila"')
  })
})
