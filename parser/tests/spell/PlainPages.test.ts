import { beforeAll, describe, test, expect } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A PAGE IN PLAIN SPELL (epic `language` P45):  `"counter notebook" is a notebook page`, its body indented under it.
 * - Its body is the tag page's, as written:  markup, `##` headings, prose lines, examples, its own views.
 * - Only its head and its closer change:  the head is a line of plain Spell, and its indentation says where it ends.
 * - So it compiles to exactly the program its tag file did, in English and Spanish.
 */
describe("a page in plain spell", () => {
  beforeAll(registerTestComponentPack)

  test.each([
    ["English", "/Counter.spell", COUNTER, '<notebook "counter notebook">', '"counter notebook" is a notebook page'],
    ["English, no flag", "/Counter.spell", COUNTER, '<page "counter notebook">', '"counter notebook" is a page'],
    ["Spanish", "/Contador.es.spell", CONTADOR, '<cuaderno "cuaderno del contador">', '"cuaderno del contador" es una página cuaderno'],
    ["Spanish, no flag", "/Contador.es.spell", CONTADOR, '<página "cuaderno del contador">', '"cuaderno del contador" es una página']
  ])("%s:  compiles the same as its tag file", (_language, path, body, tag, plain) => {
    const tags = compiled(`${tag}\n${body}</>\n`, path)
    const written = compiled(`${plain}\n${body}`, path)
    expect(tags.errors).toEqual([])
    expect(written.errors).toEqual([])
    expect(written.code).toBe(tags.code)
  })

  test("is read as a page file:  its form is the tag page's", () => {
    expect(SP.formOfText(`"counter notebook" is a notebook page\n${COUNTER}`)).toBe("spellx")
    expect(SP.formOfText(`"cuaderno del contador" es una página cuaderno\n${CONTADOR}`)).toBe("spellx")
    // not a page:  plain Spell
    expect(SP.formOfText('"counter" is a notebook\n')).toBe("spell")
  })

  test("two pages in one file:  the second's head ends the first", () => {
    const text = `"one page" is a page\n\t# One\n\n"two page" is a page\n\t# Two\n`
    const { code, errors } = compiled(text)
    expect(errors).toEqual([])
    expect(code).toContain("export class OnePage extends Page {")
    expect(code).toContain("export class TwoPage extends Page {")
  })

  test("alone in its file:  its name is read from its head", () => {
    const english = SP.Language.forFile("/x.spell")
    const spanish = SP.Language.forFile("/x.es.spell")
    expect(SP.alonePageName(`<!-- a comment -->\n"film page" is a notebook page\n\t# Film\n`, english)).toBe("film page")
    expect(SP.alonePageName(`"película" es una página\n\t# Película\n`, spanish)).toBe("película")
    expect(SP.alonePageName(`"one page" is a page\n\t# One\n"two page" is a page\n`, english)).toBeUndefined()
  })
})

/** A page's body that draws itself:  a counter, prose, a section, an example. */
const COUNTER = [
  "\t# A counter",
  "\tA button that counts its clicks.",
  "",
  '\t<view "counter">',
  '\t\t<property "count">a number</>',
  '\t\t<action "create it">set its count to 0</>',
  '\t\t<action "count up">set its count to its count + 1</>',
  "\t\t<draw><button onClick={count up}>Clicked {its count} times</button></draw>",
  "\t</view>",
  "",
  "\t## Try it",
  '\t<example "one counter">',
  "\t\t<counter/>",
  "\t</example>",
  "",
  "\t## Two of them",
  "\tEach counts on its own:",
  '\t<text color="grey">Click either one.</text>',
  ""
].join("\n")

/** The same, in Spanish. */
const CONTADOR = [
  "\t# Un contador",
  '\t<vista "contador">',
  '\t\t<propiedad "cuenta">un número</>',
  '\t\t<dibujar><botón>{"Clics: " + su cuenta}</botón></dibujar>',
  "\t</vista>",
  "",
  "\t## Pruébalo",
  '\t<ejemplo "un contador">',
  "\t\t<contador/>",
  "\t</ejemplo>",
  ""
].join("\n")

/** `text`'s file compiled, its comments and declarations left out, and its errors. */
function compiled(text: string, path = "/Counter.spell") {
  const [file] = parseSpellProject([{ path, contents: text }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
  return { code, errors: file!.errors }
}
