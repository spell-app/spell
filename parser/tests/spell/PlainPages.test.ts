import { beforeAll, describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A PAGE (epic `language` P45, P47):  `"counter notebook" is a notebook page`, its body indented under it.
 * - Its body draws:  prose lines as markdown, `##` headings as sections, markup and examples as written,
 *   and the tags it draws with, `<if>`, `<for>`, `<html>`, `<spell>`.
 * - Its own views are plain Spell, above its head.
 * - The page tokenizer reads it (`SP.PageTokenizer`), and each tag line reads as its code-spell twin (`SP.PageTwin`).
 */
describe("a page", () => {
  beforeAll(registerTestComponentPack)

  test.each([
    ["English", "/Counter.spell", `"counter notebook" is a notebook page\n${COUNTER}`],
    ["English, no flag", "/Counter.spell", `"counter notebook" is a page\n${COUNTER}`],
    ["Spanish", "/Contador.es.spell", `"cuaderno del contador" es una página cuaderno\n${CONTADOR}`],
    ["Spanish, no flag", "/Contador.es.spell", `"cuaderno del contador" es una página\n${CONTADOR}`]
  ])("%s:  its prose, sections and examples draw, its own view above it", (_language, path, text) => {
    const { code, errors } = compiled(`${path.endsWith(".es.spell") ? CONTADOR_VIEW : COUNTER_VIEW}${text}`, path)
    expect(errors).toEqual([])
    expect(code).toMatch(/extends Page \{/)
    expect(code).toContain('h("ui-markdown"')
    expect(code).toContain('h("spell-example"')
  })

  test("its prose is markdown, a `##` heading a sticky, foldable section, its own view its element", () => {
    const { code } = compiled(`${COUNTER_VIEW}"counter notebook" is a notebook page\n${COUNTER}`)
    expect(code).toContain('h("ui-markdown", "# A counter\\nA button that counts its clicks.")')
    expect(code).toMatch(/h\("ui-section", \{\s*label: "Try it",\s*sticky: "stack"/)
    expect(code).toContain('h("test-project-counter")')
  })

  test("is read as a page file:  its form", () => {
    expect(SP.formOfText(`"counter notebook" is a notebook page\n${COUNTER}`)).toBe("page")
    expect(SP.formOfText(`"cuaderno del contador" es una página cuaderno\n${CONTADOR}`)).toBe("page")
    expect(SP.formOfText(`${COUNTER_VIEW}"counter notebook" is a page\n`)).toBe("page")
    // not a page:  plain Spell
    expect(SP.formOfText('"counter" is a notebook\n')).toBe("spell")
    expect(SP.formOfText(COUNTER_VIEW)).toBe("spell")
    // a head inside a comment doesn't count
    expect(SP.formOfText('<!--\n"x" is a page\n-->\n')).toBe("spell")
  })

  test("two pages in one file:  the second's head ends the first", () => {
    const text = `"one page" is a page\n\t# One\n\n"two page" is a page\n\t# Two\n`
    const { code, errors } = compiled(text)
    expect(errors).toEqual([])
    expect(code).toContain("export class OnePage extends Page {")
    expect(code).toContain("export class TwoPage extends Page {")
  })

  test("plain Spell after a page:  a line at the left edge ends it", () => {
    const text = `"one page" is a page\n\t# One\n\na "box" is a view:\n\tto draw it:\n\t\t<text>hi</text>\n`
    const { code, errors } = compiled(text)
    expect(errors).toEqual([])
    expect(code).toContain('h("ui-markdown", "# One")')
    expect(code).toContain("export class Box extends View {")
  })

  test("it starts by itself:  two pages in one project, the first starts, once", () => {
    const pages = ["one", "two"].map((name) => ({
      path: `/${name}.spell`,
      contents: `"${name} page" is a page\n\t# ${name}\n`
    }))
    const { code } = compiledSpellProject(pages)
    expect(code.match(/\.start\(\)/g)).toEqual([".start()"])
    expect(code).toContain("if (!core.isCarryingOver) onePage.start()")
  })

  test("`locked`, in both languages:  its lock", () => {
    for (const [path, text] of [
      ["/Home.spell", '"home" is a locked page\n\t# Home\n'],
      ["/Inicio.es.spell", '"inicio" es una página bloqueada\n\t# Inicio\n'],
      ["/Inicio.es.spell", '"inicio" es una página bloqueado\n\t# Inicio\n']
    ]) {
      const { code, errors } = compiled(text!, path)
      expect(errors).toEqual([])
      expect(code).toContain('return "locked"')
      expect(code).toContain("ui-markdown")
    }
  })

  test("alone in its file:  its name is read from its head", () => {
    const english = SP.Language.forFile("/x.spell")
    const spanish = SP.Language.forFile("/x.es.spell")
    expect(SP.alonePageName(`<!-- a comment -->\n"film page" is a notebook page\n\t# Film\n`, english)).toBe(
      "film page"
    )
    expect(SP.alonePageName(`"película" es una página\n\t# Película\n`, spanish)).toBe("película")
    expect(SP.alonePageName(`"one page" is a page\n\t# One\n"two page" is a page\n`, english)).toBeUndefined()
    expect(SP.alonePageName(`${COUNTER_VIEW}"one page" is a page\n\t# One\n`, english)).toBeUndefined()
  })

  test("its `<if>` and `<for>` draw;  a closer that closes nothing is an error", () => {
    const text = [
      'a "shelf" is a view:',
      '\tits "films" is a list of text',
      "\tto draw it:",
      "\t\t<text>{its films}</text>",
      "",
      '"films page" is a page',
      "\t# Films",
      "\t<if 1 is 1>",
      "\t\t<text>yes</text>",
      "\t<otherwise>",
      "\t\t<text>no</text>",
      "\t</>",
      '\t<for film in ["a", "b"]>',
      "\t\t<text>{film}</text>",
      "\t</for>",
      "\t</>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text)
    expect(errors.map(String)).toEqual([expect.stringMatching(/^16:1 "<\/>" closes nothing/)])
    expect(code).toContain('h("ui-text", "yes")')
    expect(code).toContain('h("ui-text", "no")')
    expect(code).toContain('h("ui-text", () => film)')
  })

  test("its own view's name is its own, as written:  no longer named for the page", () => {
    const { code } = compiled(`${COUNTER_VIEW}"counter notebook" is a page\n${COUNTER}`)
    expect(code).toContain("export class Counter extends View {")
  })
})

/**
 * COMMENTS in a page file, `<!-- ... -->` (epic `elemental-spell`, Owen 2026-10-26):  anywhere, over several lines,
 * never drawn.
 */
describe("a page's comments, `<!-- ... -->`", () => {
  beforeAll(registerTestComponentPack)

  test("between its elements, inside them and in an `<html>` block:  never drawn", () => {
    const { code, errors } = compiled(
      [
        '"notes" is a notebook page',
        "\t# Notes",
        "\t<!-- GAP I21:  before an element -->",
        '\t<text label="One">',
        "\t\t<!-- GAP I22:  inside it -->",
        "\t\t<text>a</text>",
        "\t</text>",
        "\t<!--",
        "\t\tbetween the elements,",
        "\tover several lines",
        "\t-->",
        '\t<text label="Two">',
        "\t\t<html>",
        "\t\t\t<!-- in an html block -->",
        "\t\t\t<div>b</div>",
        "\t\t</html>",
        "\t</text>"
      ].join("\n"),
      "/Notes.spell"
    )
    expect(errors).toEqual([])
    expect(code).not.toMatch(/GAP|between|html block/)
    expect(code).toContain('h("div", "b")')
  })

  test("one never closed is an error on its first line", () => {
    const { errors } = compiled(
      ['"notes" is a page', "\t# Notes", "\t<!-- never closed", "\t<text>hi</text>"].join("\n")
    )
    expect(errors.map(String)).toContainEqual(expect.stringMatching(/"<!--" is never closed/))
  })

  test("coloured a line at a time:  a comment's later lines are still the comment", () => {
    const parser = SP.Language.default.parser.clone({ module: "test", form: "page" } as P.ParserProps)
    const tokenizer = (parser as SP.SpellParser).tokenizer as SP.PageTokenizer
    const head = tokenizer.tokenizeLine('"notes" is a page')
    const first = tokenizer.tokenizeLine("\t<!-- a comment", head.open)
    expect(first.inComment).toBe(true)
    const second = tokenizer.tokenizeLine("\t<if x> not a tag here -->", first.open, first.inComment)
    expect(second.inComment).toBe(false)
    expect(second.tokens.filter((token) => !(token instanceof P.WhitespaceToken))).toEqual([
      expect.any(SP.PageCommentToken)
    ])
  })
})

/**
 * A FENCED CODE BLOCK in a page's prose (epic `language` T80):  ` ``` ` to ` ``` `, as markdown writes one.
 * - Every line inside it is prose, as written:  a tag at a line's start (`<if ...>`) is shown, never read.
 */
describe("a fenced code block in a page's prose", () => {
  beforeAll(registerTestComponentPack)

  test("a tag at a line's start inside a fence is prose:  shown, never read", () => {
    const text = [
      '"bill" is a page',
      "\t# The bill",
      "\tDraw a line of your own:",
      "",
      "\t```spell",
      "\t<if its tip is 0>",
      "\t```",
      "",
      "\t<text>after</text>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Bill.spell")
    expect(errors).toEqual([])
    expect(code).toContain("<if its tip is 0>")
    expect(code).toContain('h("ui-text", "after")')
  })
})

/**
 * A DRAWING IN PLAIN SPELL takes a page's shortcuts (epic `language` P45, Q4 A), through the same tables:
 * - a Spell UI element by its bare name, `<text>` for `<ui-text>`;  a name nobody has stays the web's own, `<div>`
 * - `</>` closing any element, at a line's end
 * - a `<for>` with loading and empty parts inside another element
 */
describe("a drawing in plain spell takes a page's shortcuts", () => {
  beforeAll(registerTestComponentPack)

  test("bare names are the pack's, `</>` closes, and a `<for>` in an element draws its items", () => {
    const { code, errors } = compiled(SHELF_PLAIN, "/Shelf.spell")
    expect(errors).toEqual([])
    expect(code).toContain('h("ui-segment",')
    expect(code).toContain('h("ui-header", "Films")')
    expect(code).toContain('core.drawRead(() => this.films, (film) => h("ui-text", () => film.title), { waiting:')
    expect(code).toContain('none: () => h("ui-text", "None")')
  })

  test("in Spanish:  bare names are the pack's, `<para>` in an element", () => {
    const { errors } = compiled(ESTANTE_PLAIN, "/Estante.es.spell")
    expect(errors).toEqual([])
  })

  test("a name nobody has stays the web's own element:  no error", () => {
    const { code, errors } = compiled('a "box" is a view where:\n\t- to draw it:\n\t\t<div><text>hi</></div>\n')
    expect(errors).toEqual([])
    expect(code).toContain('h("div", h("ui-text", "hi"))')
  })
})

const SHELF_PLAIN = `a "film" is a thing where:
	- its "title" is text
a "shelf" is a view where:
	- its "films" is a list of films
	- to draw it:
			<segment>
				<header>Films</>
				<for film in its films loading="Wait">
					<text>{film's title}</text>
					<empty>
						<text>None</>
					</empty>
				</for>
			</segment>
`

const ESTANTE_PLAIN = `una "película" es una cosa donde:
	- su "título" es texto
un "estante" es una vista donde:
	- sus "películas" son una lista de películas
	- para dibujarla:
			<tarjetas>
				<encabezado>Películas</>
				<para película en sus películas>
					<texto>{el título de la película}</texto>
				</para>
			</tarjetas>
`

/** The counter a page draws:  its own view, plain Spell above the page's head. */
const COUNTER_VIEW = `a "counter" is a view:
	its "count" is a number
	to create it: set its count to 0
	to count up: set its count to its count + 1
	to draw it: <button onClick={count up}>Clicked {its count} times</button>

`

/** A page's body that draws itself:  prose, a section, an example. */
const COUNTER = [
  "\t# A counter",
  "\tA button that counts its clicks.",
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
const CONTADOR_VIEW = `un "contador" es una vista:
	su "cuenta" es un número
	para dibujarlo: <botón>{"Clics: " + su cuenta}</botón>

`

/** A Spanish page's body. */
const CONTADOR = [
  "\t# Un contador",
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
