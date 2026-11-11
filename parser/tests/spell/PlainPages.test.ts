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

/**
 * A DRAWING IN PLAIN SPELL takes the tag form's shortcuts (epic `language` P45, Q4 A), through the same tables:
 * - a Spell UI element by its bare name, `<text>` for `<ui-text>`;  a name nobody has stays the web's own, `<div>`
 * - `</>` closing any element, at a line's end
 * - a `<for>` with loading and empty parts inside another element
 */
describe("a drawing in plain spell takes the tag form's shortcuts", () => {
  beforeAll(registerTestComponentPack)

  test.each([
    ["English", "/Shelf.spell", SHELF_TAGS, SHELF_PLAIN],
    ["Spanish", "/Estante.es.spell", ESTANTE_TAGS, ESTANTE_PLAIN]
  ])("%s:  compiles the same as its tag file", (_language, path, tags, plain) => {
    const tagged = compiled(tags, path)
    const written = compiled(plain, path)
    expect(tagged.errors).toEqual([])
    expect(written.errors).toEqual([])
    expect(written.code).toBe(tagged.code)
  })

  test("bare names are the pack's, `</>` closes, and a `<for>` in an element draws its items", () => {
    const { code } = compiled(SHELF_PLAIN, "/Shelf.spell")
    expect(code).toContain('h("ui-segment",')
    expect(code).toContain('h("ui-header", "Films")')
    expect(code).toContain("core.drawRead(() => this.films, (film) => h(\"ui-text\", () => film.title), { waiting:")
    expect(code).toContain('none: () => h("ui-text", "None")')
  })

  test("a name nobody has stays the web's own element:  no error", () => {
    const { code, errors } = compiled('a "box" is a view where:\n\t- to draw it:\n\t\t<div><text>hi</></div>\n')
    expect(errors).toEqual([])
    expect(code).toContain('h("div", h("ui-text", "hi"))')
  })
})

const SHELF_DRAWING = [
  "\t\t<segment>",
  "\t\t\t<header>Films</>",
  '\t\t\t<for film in its films loading="Wait">',
  "\t\t\t\t<text>{film's title}</text>",
  "\t\t\t\t<empty>",
  "\t\t\t\t\t<text>None</>",
  "\t\t\t\t</empty>",
  "\t\t\t</for>",
  "\t\t</segment>"
].join("\n")

const SHELF_TAGS = `<thing "film">
	<property "title">text</>
</thing>
<view "shelf">
	<property "films">a list of films</>
	<draw>
${SHELF_DRAWING}
	</draw>
</view>
`

const SHELF_PLAIN = `a "film" is a thing where:
	- its "title" is text
a "shelf" is a view where:
	- its "films" is a list of films
	- to draw it:
${SHELF_DRAWING.replaceAll("\n\t\t", "\n\t\t\t").replace(/^\t\t/, "\t\t\t")}
`

const ESTANTE_DRAWING = [
  "\t\t<tarjetas>",
  "\t\t\t<encabezado>Películas</>",
  "\t\t\t<para película en sus películas>",
  "\t\t\t\t<texto>{el título de la película}</texto>",
  "\t\t\t</para>",
  "\t\t</tarjetas>"
].join("\n")

const ESTANTE_TAGS = `<cosa "película">
	<propiedad "título">texto</>
</cosa>
<vista "estante">
	<propiedad "películas">una lista de películas</>
	<dibujar>
${ESTANTE_DRAWING}
	</dibujar>
</vista>
`

const ESTANTE_PLAIN = `una "película" es una cosa donde:
	- su "título" es texto
un "estante" es una vista donde:
	- sus "películas" son una lista de películas
	- para dibujarla:
${ESTANTE_DRAWING.replaceAll("\n\t\t", "\n\t\t\t").replace(/^\t\t/, "\t\t\t")}
`

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
