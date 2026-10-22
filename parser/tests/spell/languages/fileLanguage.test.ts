import { afterAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import {
  compiledSpellProject,
  incrementalSpellProject,
  parseSpellProject,
  summarize,
  summarizeIncremental
} from "spell-lang/spell/test"

/**
 * A file's language (epic `spanish` P19):  its name says it, `Carta.es.spell`;  a plain `Card.spell` is English.
 * - Each file parses by its own language's rules, so one project may mix them.
 * - Before P19 a project named ONE language in its project file (P4):  the made-up language `xx` below,
 *   English's rules with an inflector that never makes a word singular, still checks a project's scope
 *   descends from its language's root.
 */
describe("a file's language", () => {
  const testLanguage = SP.Language.register(
    new SP.Language({
      lang: "xx",
      name: "Test",
      parser: SP.spellParser.clone({ module: "xx", inflector: undefined }),
      inflector: new P.Inflector({ lang: "xx", singular: (word) => word, plural: (word) => `${word}s` }),
      typeWords: SP.TYPE_WORDS,
      words: SP.english.words,
      messages: SP.english.messages
    })
  )
  afterAll(() => SP.Language.all.delete("xx"))

  test("English is the default, and an unknown language names the ones spell reads", () => {
    expect(SP.Language.for(undefined)).toBe(SP.english)
    expect(SP.Language.for("en")).toBe(SP.english)
    expect(() => SP.Language.for("zz")).toThrow(/no language pack for "zz";  spell reads en/)
  })

  test("a file's name says its language;  a plain .spell is English", () => {
    expect(SP.Language.forFile("Card.spell")).toBe(SP.english)
    expect(SP.Language.forFile("Card.en.spell")).toBe(SP.english)
    expect(SP.Language.forFile("Carta.es.spell")).toBe(SP.spanish)
    expect(SP.Language.forFile("@spell/test/cartas/Carta.es.spell")).toBe(SP.spanish)
    // as declarations say where a statement is
    expect(SP.Language.langOfFile("/Carta.es.spell:71-92")).toBe("es")
    expect(SP.Language.langOfFile("/Card.spell:0-17")).toBeUndefined()
    // not a language:  `.spell-es` isn't `.spell`, and a dotted name's part isn't one unless it's a code
    expect(SP.Language.langOfFile("Card.spell-es")).toBeUndefined()
    expect(SP.Language.langOfFile("my.cards.spell")).toBeUndefined()
    expect(() => SP.Language.forFile("Carte.zz.spell")).toThrow(/no language pack for "zz"/)
  })

  test("a project's scope descends from its language's root, and parses by its rules", () => {
    const lines = ["a widgets is a thing", "a widgets has a size as a number"]
    const english = parseSpellProject([{ path: "/test.spell", contents: lines.join("\n") }])
    const test = parseSpellProject([{ path: "/test.xx.spell", contents: lines.join("\n") }])
    expect((english.scope.parser as SP.SpellParser).language).toBe(SP.english)
    expect((test.scope.parser as SP.SpellParser).language).toBe(testLanguage)
    expect(test.scope.parentScope).toBe(testLanguage.rootScope)
    expect(english.files[0]!.compiled).toMatch(/export class Widget extends Thing/)
    expect(test.files[0]!.compiled).toMatch(/export class Widgets extends Thing/)
  })

  test("its words file is named for it, and says its language", () => {
    expect(SP.wordsSuffixFor()).toBe(".en.js")
    expect(SP.wordsSuffixFor("es")).toBe(".es.js")
    const declarations = { spellVersion: SP.SPELL_VERSION, provides: [], statements: [], languages: ["es"] }
    expect(SP.SpellWords.of(declarations).lang).toBe("es")
    expect(SP.SpellWords.of({ ...declarations, languages: undefined }).lang).toBe("en")
  })

  test("declarations from before P19 say one language, and still read", () => {
    const old = { spellVersion: SP.SPELL_VERSION, provides: [], statements: [], language: "es" }
    expect(SP.SpellDeclarations.languagesOf(old)).toEqual(["es"])
    expect(SP.SpellWords.of(old).lang).toBe("es")
    expect(SP.SpellWords.of(old).messages).toBeDefined()
  })
})

/**
 * One project, two languages:  an English `Player.spell`, used by a Spanish `Equipo.es.spell`.
 * - Each parses by its own rules;  the Spanish file names the English type, property and method by their English words.
 * - A built-in member reads in both:  `el largo del equipo` and `the length of the team`.
 * - NOTE: a plural goes singular by the file's language's rules:  Spanish makes `players` `player`,
 *   but leaves `cards` as it is (one syllable, so it reads as singular).
 */
describe("a project mixing languages", () => {
  const player = [
    "a player is a thing",
    "a player has a score as a number",
    "to reset a player:",
    "\tset the score of the player to 0"
  ].join("\n")
  const team = [
    "un equipo es una lista de players",
    "para preparar un equipo:",
    "\tel p es un nuevo player",
    "\treset el p",
    "\tagregar el p al equipo",
    "\teco el score del p",
    "\teco el largo del equipo"
  ].join("\n")
  const files = [
    { path: "/Player.spell", contents: player },
    { path: "/Equipo.es.spell", contents: team }
  ]

  test("each file parses by its own language's rules, with the other's types and methods", () => {
    const project = parseSpellProject(files)
    expect(project.files.map((file) => file.errors)).toEqual([[], []])
    const [english, spanish] = project.files
    expect(english!.scope.parser).toBe(project.scope.parser)
    expect((spanish!.scope.parser as SP.SpellParser).language).toBe(SP.spanish)
    expect(project.files.map((file) => file.warnings)).toEqual([[], []])
    expect(spanish!.compiled).toMatch(/class Equipo extends List \{\n\s*static instanceType = Player\n/)
    expect(spanish!.compiled).toMatch(/const p = new Player\(\)\n\s*p\.reset\(\)\n\s*this\.append\(p\)/)
    expect(spanish!.compiled).toMatch(/core\.echo\(p\.score\)\n\s*core\.echo\(this\.length\)/)
  })

  test("an edit re-parses as a full parse would, each file by its own rules", () => {
    const project = incrementalSpellProject(files)
    expect(summarizeIncremental(project)).toEqual(summarize(parseSpellProject(files)))
    // the English file's method renamed:  the Spanish file's call no longer reads, then does again
    const renamed = player.replace("to reset a player", "to clear a player")
    const edited = [{ ...files[0]!, contents: renamed }, files[1]!]
    project.update("/Player.spell", renamed)
    expect(summarizeIncremental(project)).toEqual(summarize(parseSpellProject(edited)))
    expect(summarizeIncremental(project)[1]!.errors).not.toEqual([])
    project.update("/Player.spell", player)
    expect(summarizeIncremental(project)).toEqual(summarize(parseSpellProject(files)))
  })

  test("its root reads the built-in members in both languages", () => {
    const root = SP.Language.rootScopeFor([SP.english, SP.spanish])
    expect(root).not.toBe(SP.english.rootScope)
    expect(SP.Language.rootScopeFor([SP.english, SP.spanish])).toBe(root)
    const list = root.types.get("list", "LOCAL_ONLY")!
    expect(list.variables.get("length", "LOCAL_ONLY")).toBeDefined()
    expect(list.variables.get("largo", "LOCAL_ONLY")).toBeDefined()
    expect(SP.isBuiltInTypeScope(list)).toBe(true)
  })

  test("its declarations name both languages, and a words file each holds its own files' members", () => {
    const { declarations } = compiledSpellProject(files)
    // no app:  it speaks the language of its first file
    expect(declarations.languages).toEqual(["en", "es"])
    const english = SP.SpellWords.of(declarations, P.JSWriter.instance, "en")
    const spanish = SP.SpellWords.of(declarations, P.JSWriter.instance, "es")
    expect(english.types).toEqual({ Player: { score: "score", reset: "reset a player" } })
    expect(spanish.types).toEqual({ Equipo: { preparar: "preparar un equipo" } })
    expect(spanish.messages).toBeDefined()
  })

  test("it speaks the language of the file that declares its app", () => {
    const app = { path: "/Juego.es.spell", contents: "juego es una app" }
    const { declarations } = compiledSpellProject([...files, app])
    expect(declarations.languages).toEqual(["es", "en"])
    expect(SP.SpellDeclarations.speakingFirst(["en"], [])).toEqual(["en"])
    expect(SP.SpellDeclarations.speakingFirst([], [])).toEqual(["en"])
  })

  test("a type used above its declaration still compiles Spanish's `nombre` to `name` (epic `spanish` P11)", () => {
    const contents = [
      "juego es una aplicación donde:",
      '\t- su "reserva" es una nueva pila con nombre = "reserva"',
      "una carta es una cosa",
      "una pila es una lista de cartas"
    ].join("\n")
    const { code } = compiledSpellProject([{ path: "/Juego.es.spell", contents }])
    expect(code).toContain('new Pila({ name: "reserva" })')
  })
})
