import { afterAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { parseSpellProject } from "spell-lang/spell/test"

/**
 * A project's language (epic `spanish` P4):  its parser, its root scope, its inflector, its words file.
 * - A made-up language, `xx`, stands in for Spanish until P5:  English's rules, but an inflector that never makes a
 *   word singular, so a type named `widgets` stays `Widgets`, where English makes it `Widget`.
 */
describe("a project's language", () => {
  const testLanguage = SP.Language.register(
    new SP.Language({
      lang: "xx",
      name: "Test",
      parser: SP.spellParser.clone({ module: "xx", inflector: undefined }),
      inflector: new P.Inflector({ lang: "xx", singular: (word) => word, plural: (word) => `${word}s` }),
      typeWords: SP.TYPE_WORDS,
      words: SP.english.words
    })
  )
  afterAll(() => SP.Language.all.delete("xx"))

  test("English is the default, and an unknown language names the ones spell reads", () => {
    expect(SP.Language.for(undefined)).toBe(SP.english)
    expect(SP.Language.for("en")).toBe(SP.english)
    expect(() => SP.Language.for("zz")).toThrow(/no language pack for "zz";  spell reads en/)
  })

  test("a project's scope descends from its language's root, and parses by its rules", () => {
    const lines = ["a widgets is a thing", "a widgets has a size as a number"]
    const english = parseSpellProject([{ path: "/test.spell", contents: lines.join("\n") }])
    const test = parseSpellProject([{ path: "/test.spell", contents: lines.join("\n") }], {
      parentScope: testLanguage.rootScope
    })
    expect((english.scope.parser as SP.SpellParser).language).toBe(SP.english)
    expect((test.scope.parser as SP.SpellParser).language).toBe(testLanguage)
    expect(english.files[0]!.compiled).toMatch(/export class Widget extends Thing/)
    expect(test.files[0]!.compiled).toMatch(/export class Widgets extends Thing/)
  })

  test("its words file is named for it, and says its language", () => {
    expect(SP.wordsSuffixFor()).toBe(".en.js")
    expect(SP.wordsSuffixFor("es")).toBe(".es.js")
    const declarations = { spellVersion: SP.SPELL_VERSION, provides: [], statements: [], language: "es" }
    expect(SP.SpellWords.of(declarations).lang).toBe("es")
    expect(SP.SpellWords.of({ ...declarations, language: undefined }).lang).toBe("en")
  })
})
