import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject, type SpellSourceFile } from "spell/parser/spell/test"
import "spell/app/spaces"

/**
 * A tag's quoted word on Spell UI's real tags (epic `language` P38):
 * each short form compiles to exactly what its long form does, on every target, in both languages.
 * - Here, not in the parser folder:  only the app knows Spell UI's tags.
 */
describe("a quoted word on Spell UI's tags", () => {
  const TARGETS = ["js/solid", "ts/solid", "py"]
  /** Words in the list that are spell's own, not a component's. */
  const SPELLS_OWN = new Set(["example", "ejemplo"])

  /** A view drawing `markup`, compiled to `target`;  `extra` is a file beside it. */
  function compiled(markup: string, target: string, language: "en" | "es", extra?: SpellSourceFile) {
    const [tag, draw, file] =
      language === "es" ? ["encanto-vista", "dibujar", "Notas.es.spell"] : ["spell-view", "draw", "Notes.spell"]
    const contents = `<${tag} "notes">\n\t<${draw}>\n\t\t${markup}\n\t</${draw}>\n</${tag}>\n`
    const sources = [...(extra ? [extra] : []), { path: `/${file}`, contents }]
    const { scope, files } = parseSpellProject(sources)
    expect(files.flatMap((parsed) => parsed.errors)).toEqual([])
    const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
    const writer = SP.targetFor(target).writer
    const code = scope.parser!.inPlay(() => SP.SpellProject.combineCompiled(parts, writer, "", scope, {}))
    // where it was declared is a place in the file:  the short form is shorter
    return code.replace(/defined: "[^"]*"/g, "")
  }

  const CONTENTS: Array<[string, "en" | "es"]> = [
    ["header", "en"],
    ["button", "en"],
    ["item", "en"],
    ["label", "en"],
    ["title", "en"],
    ["link", "en"],
    ["breadcrumb", "en"],
    ["checkbox", "en"],
    ["radio", "en"],
    ["ui-header", "en"],
    ["encabezado", "es"],
    ["botón", "es"],
    ["boton", "es"],
    ["elemento", "es"],
    ["etiqueta", "es"],
    ["título", "es"],
    ["enlace", "es"],
    ["ruta-sección", "es"],
    ["casilla", "es"],
    ["radio", "es"],
    ["es-encabezado", "es"]
  ]

  test.each(CONTENTS)('<%s "Word"/> is its contents (%s)', (tag, language) => {
    for (const target of TARGETS) {
      const long = compiled(`<${tag}>Word</${tag}>`, target, language)
      expect(compiled(`<${tag} "Word"/>`, target, language)).toBe(long)
      expect(compiled(`<${tag} "Word"></${tag}>`, target, language)).toBe(long)
    }
  })

  test.each([
    ["tab", "label", "en"],
    ["panel", "label", "en"],
    ["solapa", "etiqueta", "es"],
    ["panel", "etiqueta", "es"]
  ] as const)('<%s "Word"> is its %s (%s)', (tag, attribute, language) => {
    for (const target of TARGETS) {
      const long = compiled(`<${tag} ${attribute}="Word"></${tag}>`, target, language)
      expect(compiled(`<${tag} "Word"></${tag}>`, target, language)).toBe(long)
    }
  })

  test("attributes after the word, on every target", () => {
    for (const target of TARGETS) {
      expect(compiled('<header "Hardware" size="large"/>', target, "en")).toBe(
        compiled('<header size="large">Hardware</header>', target, "en")
      )
    }
  })

  test("a hole in the word reads as it does between the tags", () => {
    const holes = (markup: string) => compiled(markup, "js/solid", "en")
    expect(holes('<header "Hi {1 + 2} there"/>')).toBe(holes("<header>Hi {1 + 2} there</header>"))
  })

  test("the word comes before the rest of its contents", () => {
    expect(compiled('<label "Inbox"><detail>3</detail></label>', "js/solid", "en")).toBe(
      compiled("<label>Inbox<detail>3</detail></label>", "js/solid", "en")
    )
  })

  test("a project's own view named like a listed tag takes the word as its contents", () => {
    const own = {
      path: "/Header.spell",
      contents: '<spell-view "header">\n\t<draw>\n\t\t<segment><slot/></segment>\n\t</draw>\n</spell-view>\n'
    }
    expect(compiled('<header "Word"/>', "js/solid", "en", own)).toBe(
      compiled("<header>Word</header>", "js/solid", "en", own)
    )
  })

  test("every listed word is a real tag, in the language that spells it", () => {
    const tags = Object.keys(SP.english.parser.tokenizer.quotedNameTags)
    const isTag = (word: string) => {
      const bare = word.replace(/^(ui|es)-/, "")
      return ["en", "es"].some((language) => SP.ComponentPacks.tagFor(bare, language, ["spell-ui"]))
    }
    expect(tags.filter((word) => !SPELLS_OWN.has(word) && !isTag(word))).toEqual([])
  })
})
