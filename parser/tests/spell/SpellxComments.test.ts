import { beforeAll, describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"
import { SX } from "spell/parser/spellx"

/**
 * COMMENTS in spellx, `<!-- ... -->` (epic `elemental-spell`, Owen 2026-10-26:  "`<!-- ... -->` (Recommended)").
 * - Anywhere in a file:  among a template's members, in a body, in a drawing's markup, in an `<html>` block, over
 *   several lines;  never drawn.
 * - Its code-spell twin is a `//` line per line, so a `.spellml` file and its `.spell` twin compile the same,
 *   comments too:  a comment above a member is its docstring either way.
 * - The writers turn one into the other:  `SX.CodeSpellWriter` writes `//` lines, `SX.SpellxWriter` writes a drawing's
 *   `//` lines back as `<!-- -->`.
 */
describe("spellx comments, `<!-- ... -->`", () => {
  beforeAll(registerTestComponentPack)

  const SPELLX = [
    '<spell-view "card">',
    "\t<!-- its suit, for now a number -->",
    '\t<property "suit">1</>',
    "\t<!--",
    "\t\tover several lines,",
    "\tindented any way",
    "\t-->",
    "\t<draw>",
    "\t\t<!-- above the markup -->",
    "\t\t<text>",
    "\t\t\t<!-- inside it -->",
    "\t\t\thi <!-- on its line --> there",
    "\t\t\t<!--",
    "\t\t\t\tGAP I23:  inside it, over lines",
    "\t\t\t-->",
    "\t\t</text>",
    "\t</draw>",
    "</spell-view>"
  ]

  const SPELL = [
    'a "card" is a view:',
    "\t// its suit, for now a number",
    '\t- its "suit" is 1',
    "\t//",
    "\t// over several lines,",
    "\t// indented any way",
    "\t//",
    "\t- to draw it:",
    "\t\t// above the markup",
    "\t\t<ui-text>",
    "\t\t\t// inside it",
    "\t\t\thi <!-- on its line --> there",
    "\t\t\t//",
    "\t\t\t// GAP I23:  inside it, over lines",
    "\t\t\t//",
    "\t\t</ui-text>"
  ]

  test("compiles as its code-spell twin does, its comments too:  none drawn", () => {
    const spellx = compiled(SPELLX, "/Card.spellml")
    const spell = compiled(SPELL, "/Card.spell")
    expect(spellx.errors).toEqual([])
    expect(spell.errors).toEqual([])
    expect(spellx.code).toBe(spell.code)
    expect(spellx.code).toContain("/** its suit, for now a number */")
    expect(spellx.code).toContain('return h("ui-text", "hi ", " there")')
    expect(spellx.code).not.toMatch(/inside it|GAP/)
  })

  test("written as code spell:  a `//` line for each of its lines", () => {
    expect(SX.CodeSpellWriter.write(SPELLX.join("\n"), { path: "/Card.spellml" })).toBe(`${SPELL.join("\n")}\n`)
  })

  test("and back:  a drawing's `//` lines as `<!-- -->`, a member's as its description", () => {
    const [file] = parseSpellProject([{ path: "/Card.spell", contents: SPELL.join("\n") }]).files
    const written = SX.SpellxWriter.write({ text: SPELL.join("\n"), match: file!.match!, scope: file!.scope! })
    expect(written).toContain('\t<property "suit" description="its suit, for now a number">1</>')
    expect(written).toContain("\t\t<!-- above the markup -->")
    expect(written).toContain("\t\t\t<!-- inside it -->")
    expect(written).toContain("\t\t\t<!-- GAP I23:  inside it, over lines -->")
    expect(compiled(written.split("\n"), "/Again.spellml")).toEqual(compiled(SPELL, "/Card.spell"))
  })

  test("in an `<html>` block, and between a notebook's elements:  never drawn", () => {
    const { code, errors } = compiled(
      [
        '<spell-notebook "notes">',
        "\t# Notes",
        "\t<!-- GAP I21:  before an element -->",
        '\t<text label="One">',
        "\t\t<!-- GAP I22:  inside it -->",
        "\t\t<text>a</text>",
        "\t</text>",
        "\t<!-- between the elements -->",
        '\t<text label="Two">',
        "\t\t<html>",
        "\t\t\t<!-- in an html block -->",
        "\t\t\t<div>b</div>",
        "\t\t</html>",
        "\t</text>",
        "</spell-notebook>"
      ],
      "/Notes.spellml"
    )
    expect(errors).toEqual([])
    expect(code).not.toMatch(/GAP|between|html block/)
    expect(code).toContain('h("div", "b")')
  })

  test("one never closed is an error on its first line", () => {
    const { errors } = compiled(['<spell-view "card">', "\t<!-- never closed", '\t<property "suit">1</>'], "/C.spellml")
    expect(errors.map(String)).toContainEqual(expect.stringMatching(/^2:1 "<!--" is never closed/))
  })

  test("a template's chunk tree:  a comment line is prose;  in markup, it's no node", () => {
    const file = SX.SpellxView.read(SPELLX.join("\n"), { path: "/Card.spellml" })
    expect(file.diagnostics).toEqual([])
    const outline = file.toOutline()
    expect(outline).toContain('prose 2:2-2:37 "<!-- its suit, for now a number -->"')
    expect(outline).not.toContain("inside it")
  })

  test("coloured a line at a time:  a comment's later lines are still the comment", () => {
    const parser = SP.Language.default.parser.clone({ module: "test", form: "spellx" } as P.ParserProps)
    const tokenizer = (parser as SP.SpellParser).tokenizer as SP.SpellxTokenizer
    const first = tokenizer.tokenizeLine("\t<!-- a comment")
    expect(first.inComment).toBe(true)
    const second = tokenizer.tokenizeLine("\t<property> not a tag here -->", first.open, first.inComment)
    expect(second.inComment).toBe(false)
    expect(second.tokens.filter((token) => !(token instanceof P.WhitespaceToken))).toEqual([
      expect.any(SP.SpellxCommentToken)
    ])
  })
})

/** `lines`, one file of its own project at `path`, compiled:  its code without `DECLARES` headers, and its errors. */
/**
 * A template's own PROPERTY EDITOR, `<property-editor>` (epic `debut` I86):  a note, its lines markup as written,
 * which the editor's Inspector draws for the template's things;  compiled as comments, as any note is.
 */
describe("a `<property-editor>`", () => {
  const SPELLX = [
    '<spell-view "card">',
    '\t<property "suit">1</>',
    "\t<property-editor>",
    '\t\t<ui-property-group label="Card" columns="2">',
    '\t\t\t<ui-property name="suit" />',
    "\t\t</ui-property-group>",
    "\t</property-editor>",
    "</spell-view>"
  ]

  test("its markup is its own:  `</ui-property-group>` closes nothing of spellx's", () => {
    const { code, errors } = compiled(SPELLX, "/Card.spellml")
    expect(errors).toEqual([])
    expect(code).toContain('// <ui-property name="suit" />')
    expect(code).toContain("// </ui-property-group>")
  })

  // epic `debut` I96:  its lines colour as markup (the editor's and the language server's colouring ask the tokens)
  test("its lines are markup, its head a note's head;  a `<description>`'s lines are neither", () => {
    const lines = [...SPELLX.slice(0, -1), "\t<description>", "\t\tA card.", "\t</description>", "</spell-view>"]
    const text = lines.join("\n")
    const [file] = parseSpellProject([{ path: "/Card.spellml", contents: text }]).files
    const prose: string[] = []
    P.Tokenizer.forEachToken(file!.match!.tokens, (token) => {
      if (!(token instanceof SP.SpellxProseToken)) return
      const line = text.slice(token.start, text.indexOf("\n", token.start))
      prose.push(`${line} ${token.isNoteHead ? "head" : token.isMarkup ? "markup" : "prose"}`)
    })
    expect(prose).toEqual([
      "<property-editor> head",
      '<ui-property-group label="Card" columns="2"> markup',
      '<ui-property name="suit" /> markup',
      "</ui-property-group> markup",
      "<description> head",
      "A card. prose"
    ])
  })

  test("in Spanish, `<editor-de-propiedades>`", () => {
    const lines = SPELLX.map((line) => line.replace(/property-editor>/, "editor-de-propiedades>"))
    const parentScope = SP.Language.rootScopeFor([SP.Language.forFile("/Carta.es.spellml")])
    const [file] = parseSpellProject([{ path: "/Carta.es.spellml", contents: lines.join("\n") }], { parentScope }).files
    expect(file!.errors.filter((error) => /editor-de-propiedades|ui-property/.test(String(error)))).toEqual([])
  })
})

function compiled(lines: string[], path: string) {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  const code = file!.compiled.replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
  return { code, errors: file!.errors }
}
