import { beforeAll, describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SX } from "spell/parser/spellx"
import {
  compiledSpellProject,
  incrementalSpellProject,
  parseSpellProject,
  registerTestComponentPack,
  summarize,
  summarizeIncremental
} from "spell/parser/spell/test"

/**
 * A PAGE in spellx that draws its body (epic `elemental-spell` P16;  epic `notebook` P2):
 * any `<spell-page>` with no `<draw>` of its own, flag or not.
 * - Its body is a drawing of markdown, markup and `<example>`s.
 * - `<spell-notebook "...">` is the short spelling of a page with the `notebook` flag, `<spell-page "..." notebook>`
 *   (epic `notebook` P1):  the flag only turns on the editor's in-place page.
 * - It reads as its code-spell twin:
 *   - `counter notebook is a page :`
 *   - its drawing, `- to draw it :`
 *   - each run of prose a `<markdown>` block (a new one at each `##`)
 *   - and its templates before it
 * - It starts by itself, as any app or page does (`SpellProject.startedByItself()`).
 * - Any page holds views of its own, `<view counter>` or `<spell-view "counter">`, lifted out to just before it.
 * - Such a page is only ever a `.spell` file:
 *   its `.spell` twin is made in memory (`SX.CodeSpellWriter`), and must compile to the same program.
 */
describe("a spellx page that draws its body", () => {
  beforeAll(registerTestComponentPack)

  test("compiles:  its templates first, its drawing, then it starts", () => {
    const { code, errors } = compiled(COUNTER)
    expect(errors).toEqual([])
    expect(code).toContain("export class CounterNotebookCounter extends View {")
    expect(code).toContain("export class CounterNotebook extends Page {")
    expect(code).toContain(
      [
        "  draw() {",
        "    return [",
        '      h("ui-markdown", "# A counter\\nA button that counts its clicks."),',
        `      core.drawPart(this, () => h("ui-section", { label: "Try it", ${LOOK} },`,
        '        core.drawPart(this, () => h("spell-example", { name: "one counter" }, h("test-project-counter-notebook-counter")))',
        "      )),",
        `      h("ui-section", { label: "Two of them", ${LOOK} },`,
        '        h("ui-markdown", "Each counts on its own:"),',
        '        h("ui-text", { color: "grey" }, "Click either one.")',
        "      )",
        "    ]",
        "  }"
      ].join("\n")
    )
    // it starts by itself, as the project's page:  no line of its own
    expect(code).not.toContain(".start()")
    expect(projectCode(COUNTER)).toContain("if (!core.isCarryingOver) counterNotebook.start()")
    // a JSX text's spaces on its own line stay:  `Clicked {its count} times`, not `Clicked0times`
    expect(code).toContain('"Clicked ", () => this.count, " times"')
    expect(code.indexOf("class CounterNotebookCounter ")).toBeLessThan(code.indexOf("class CounterNotebook "))
  })

  test("written as code spell, in memory, it compiles to the same program", () => {
    const written = SX.CodeSpellWriter.write(COUNTER, {
      path: "/Counter.spell",
      // the project's own views, as the editor reads them off the parse
      componentTag: (word) =>
        word === "counter" ? "test-project-counter-notebook-counter" : SP.ComponentPacks.tagFor(word, "en")
    })
    expect(written).toContain("counter notebook is a page:\n\t- to draw it:\n\t\t<markdown>\n")
    // each `##` heading's section, written out, what follows it inside
    expect(written).toContain(
      '\t\t<ui-section label="Try it" sticky="stack" collapsible dividing level="2">\n' +
        '\t\t\t<example "one counter">\n\t\t\t\t<test-project-counter-notebook-counter/>\n\t\t\t</example>\n\t\t</ui-section>\n'
    )
    expect(written).not.toContain("start counter notebook")
    const twin = compiled(written, "/Counter.spell")
    expect(twin.errors).toEqual([])
    expect(twin.code).toBe(compiled(COUNTER).code)
  })

  test("its chunk tree keeps every cell where it's written:  prose, its template, its examples", () => {
    const file = SX.SpellxView.read(COUNTER, { path: "/Counter.spell" })
    expect(file.diagnostics).toEqual([])
    const [notebook] = file.nodes
    expect(notebook).toMatchObject({ kind: "template", type: "page", drawsBody: true, name: "counter notebook" })
    const cells = notebook!.kind === "template" ? notebook.children : []
    expect(cells.map((cell) => (cell.kind === "element" ? `<${cell.name}>` : cell.kind))).toEqual([
      "prose",
      "template",
      "prose",
      "<example>",
      "prose",
      "<text>"
    ])
    const example = cells[3]
    expect(example?.kind === "element" && example.attributes[0]).toMatchObject({ name: "name", value: "one counter" })
  })

  test('locked, in Spanish:  `<encanto-cuaderno ... bloqueado>` is `su candado es "bloqueado"`', () => {
    const text = [
      '<encanto-cuaderno "cuaderno del contador" bloqueado>',
      "\t# Un contador",
      '\t<encanto-vista "contador">',
      '\t\t<propiedad "cuenta">un número</>',
      '\t\t<dibujar><botón>{"Clics: " + su cuenta}</botón></dibujar>',
      "\t</encanto-vista>",
      '\t<ejemplo "un contador">',
      "\t\t<contador/>",
      "\t</ejemplo>",
      "</encanto-cuaderno>"
    ].join("\n")
    const { code, errors } = compiled(text, "/Contador.es.spell")
    expect(errors).toEqual([])
    expect(code).toContain("export class CuadernoDelContador extends Page {")
    expect(code).toContain("get lock() {\n")
    expect(code).toContain('return "locked"')
    expect(code).not.toContain("candado")
    expect(code).toContain(
      'h("spell-example", { name: "un contador" }, h("test-project-cuaderno-del-contador-contador"))'
    )
    expect(projectCode(text, "/Contador.es.spell")).toContain("if (!core.isCarryingOver) cuadernoDelContador.start()")
  })

  // epic `notebook` P1:  `<spell-notebook>` is only a spelling of `<spell-page notebook>`
  describe("`<spell-notebook>` and `<spell-page notebook>` read the same", () => {
    test.each([
      ["English", "/Counter.spell", COUNTER, "spell-notebook", "spell-page", "notebook", "locked"],
      ["Spanish", "/Contador.es.spell", CONTADOR, "encanto-cuaderno", "encanto-página", "cuaderno", "bloqueado"]
    ])("in %s", (_language, path, short, word, page, flag, locked) => {
      const long = short
        .replace(`<${word} `, `<${page} `)
        .replace(">\n", ` ${flag}>\n`)
        .replace(`</${word}>`, `</${page}>`)
      const asShort = compiled(short, path)
      expect(asShort.errors).toEqual([])
      expect(compiled(long, path)).toEqual(asShort)
      // the flag, as the tag's own attribute either way:  the chunk view reads it there
      for (const text of [short, long]) {
        const [template] = SX.SpellxView.read(text, { path }).templates
        expect(template).toMatchObject({ type: "page", drawsBody: true })
        expect(template!.attributes.map((attribute) => attribute.name)).toContain("notebook")
      }
      // locked, either way:  the page's `lock`
      const lockedLong = long.replace(` ${flag}>`, ` ${flag} ${locked}>`)
      const lockedShort = short.replace(">\n", ` ${locked}>\n`)
      expect(compiled(lockedLong, path).errors).toEqual([])
      expect(compiled(lockedLong, path).code).toContain(`return "locked"`)
      expect(compiled(lockedShort, path)).toEqual(compiled(lockedLong, path))
    })

    test("a page without the flag still reads as a page:  its loose text a comment, `locked` its lock", () => {
      const text = ['<spell-page "home" locked>', "\tA comment.", "\t<draw><text>Hi</text></draw>", "</spell-page>", ""]
      const { code, errors } = compiled(text.join("\n"), "/Home.spell")
      expect(errors).toEqual([])
      expect(code).toContain("export class Home extends Page {")
      expect(code).toContain('get lock() {\n    return "locked"\n  }')
      expect(code).not.toContain("ui-markdown")
      const [page] = SX.SpellxView.read(text.join("\n"), { path: "/Home.spell" }).templates
      expect(page).toMatchObject({ type: "page", drawsBody: false })
    })

    test("written as code spell and back as spellx, it keeps its flag", () => {
      const written = SX.CodeSpellWriter.write(COUNTER, { path: "/Counter.spell" })
      const [file] = parseSpellProject([{ path: "/Counter.spell", contents: written }]).files
      const back = SX.SpellxWriter.write({ text: written, match: file!.match!, scope: file!.scope! })
      expect(back).toContain('<page "counter notebook" notebook>')
      expect(back).toContain('<view "counter-notebook-counter"')
    })
  })

  // epic `notebook` P6, T2:  the way back writes a page's drawing as its own body
  describe("written as code spell and back, its drawing is its own body again", () => {
    /** `text` as code spell, its own views' tags as the editor reads them, then back as spellx. */
    const thereAndBack = (text: string, counterTag = "test-project-counter-notebook-counter") => {
      const written = SX.CodeSpellWriter.write(text, {
        path: "/Counter.spell",
        componentTag: (word) => (word === "counter" ? counterTag : SP.ComponentPacks.tagFor(word, "en"))
      })
      const [file] = parseSpellProject([{ path: "/Counter.spell", contents: written }]).files
      return SX.SpellxWriter.write({ text: written, match: file!.match!, scope: file!.scope! })
    }

    test("its prose loose, its sections `##` headings, no `<draw>`:  and it compiles to the same program", () => {
      const back = thereAndBack(COUNTER)
      expect(back).not.toContain("<draw>\n")
      expect(back).toContain(
        [
          '<page "counter notebook" notebook>',
          "\t# A counter",
          "\tA button that counts its clicks.",
          "",
          "\t## Try it",
          '\t<example "one counter">',
          "\t\t<test-project-counter-notebook-counter/>",
          "\t</example>",
          "",
          "\t## Two of them",
          "\tEach counts on its own:",
          '\t<ui-text color="grey">Click either one.</ui-text>',
          "</>"
        ].join("\n")
      )
      expect(compiled(back)).toEqual(compiled(COUNTER))
    })

    test("a block that would read as something else loose stays a <markdown> block", () => {
      const text = [
        '<spell-page "home" notebook>',
        "\t## Try it",
        '\t<example "one counter">',
        "\t\t<counter/>",
        "\t</example>",
        // prose that starts as markup would
        "\t<markdown>",
        "\t\t<b>Bold</b>, then text",
        "\t</markdown>",
        // right after another run of prose, it would join it
        "\t<markdown>",
        "\t\tA second block",
        "\t</markdown>",
        "\t<markdown>",
        "\t\tAnd a third",
        "\t</markdown>",
        "</spell-page>",
        ""
      ].join("\n")
      const back = thereAndBack(`${COUNTER.split("\n").slice(4, 10).join("\n")}\n${text}`, "test-project-counter")
      expect(back).toContain("\t<markdown>\n\t\t<b>Bold</b>, then text\n\t</markdown>\n\tA second block\n\t<markdown>")
      expect(compiled(back).code).toBe(compiled(`${COUNTER.split("\n").slice(4, 10).join("\n")}\n${text}`).code)
    })
  })

  // epic `notebook` P2:  a page with no `<draw>` draws its body, flag or not (Q2 B)
  describe("any page with no `<draw>` draws its body", () => {
    test.each([
      [
        "English",
        "/About.spell",
        '<spell-page "about">',
        "\t# About us",
        "\tWe make things.",
        "</spell-page>",
        "About"
      ],
      [
        "Spanish",
        "/Inicio.es.spell",
        '<encanto-página "inicio">',
        "\t# Sobre nosotros",
        "\tHacemos cosas.",
        "</encanto-página>",
        "Inicio"
      ]
    ])(
      "in %s:  its loose text drawn as markdown, no flag needed",
      (_language, path, head, heading, line, closer, name) => {
        const text = [head, heading, line, closer, ""].join("\n")
        const { code, errors } = compiled(text, path)
        expect(errors).toEqual([])
        expect(code).toContain(`export class ${name} extends Page {`)
        // a drawing that's only prose:  its `<markdown>` block, alone, is what it draws
        expect(code).toContain(`return h("ui-markdown", "${heading.trim()}\\n${line.trim()}")`)
        const [page] = SX.SpellxView.read(text, { path }).templates
        expect(page).toMatchObject({ type: "page", drawsBody: true })
        expect(page!.attributes).toEqual([])
      }
    )

    test("a page WITH a `<draw>` keeps its loose text a comment, the docstring of the member below it", () => {
      const text = [
        '<spell-page "home" notebook>',
        "\tThe home page.",
        "\t<draw><text>Hi</text></draw>",
        "</spell-page>",
        ""
      ]
      const { code, errors } = compiled(text.join("\n"), "/Home.spell")
      expect(errors).toEqual([])
      expect(code).toMatch(/\/\*\* The home page\. \*\/\n\s*draw\(\) \{/)
      expect(code).not.toContain("ui-markdown")
      // the flag alone doesn't make it draw its body:  its `<draw>` does what it says
      const [page] = SX.SpellxView.read(text.join("\n"), { path: "/Home.spell" }).templates
      expect(page).toMatchObject({ type: "page", drawsBody: false })
    })

    test('a slot placed, `<draw "front" />`, is no `<draw>` of its own;  a `<draw>` in fenced code or a comment isn\'t either', () => {
      const text = [
        '<spell-page "slots">',
        "\t# Slots",
        "\t```spellml",
        "\t<draw><text>shown, not read</text></draw>",
        "\t```",
        "\t<!--",
        "\t<draw><text>a comment</text></draw>",
        "\t-->",
        "</spell-page>",
        ""
      ].join("\n")
      const [page] = SX.SpellxView.read(text, { path: "/Slots.spell" }).templates
      expect(page).toMatchObject({ drawsBody: true })
    })

    test("read a line at a time (the editor's colouring), the `notebook` flag says:  its block can't be seen", () => {
      const parser = SP.Language.default.parser.clone({ module: "test", form: "spellx" } as P.ParserProps)
      const tokenizer = (parser as SP.SpellParser).tokenizer as SP.SpellxTokenizer
      for (const [head, drawsBody] of [
        ['<spell-page "home">', false],
        ['<spell-page "home" notebook>', true],
        ['<spell-notebook "home">', true]
      ] as const) {
        const { open } = tokenizer.tokenizeLine(head)
        expect(open.at(-1)?.drawsBody ?? false, head).toBe(drawsBody)
      }
    })

    test("it starts by itself:  two pages in one project, the first starts, once", () => {
      const pages = ["one", "two"].map((name) => ({
        path: `/${name}.spell`,
        contents: `<spell-page "${name} page">\n\t# ${name}\n</spell-page>\n`
      }))
      const { code } = compiledSpellProject(pages)
      expect(code.match(/\.start\(\)/g)).toEqual([".start()"])
      expect(code).toContain("if (!core.isCarryingOver) onePage.start()")
    })

    test("`locked` on a plain page, in both languages:  its lock", () => {
      for (const [path, text, locked] of [
        ["/Home.spell", '<spell-page "home" locked>\n\t# Home\n</spell-page>\n', "locked"],
        ["/Inicio.es.spell", '<encanto-página "inicio" bloqueado>\n\t# Inicio\n</encanto-página>\n', "locked"]
      ]) {
        const { code, errors } = compiled(text!, path)
        expect(errors).toEqual([])
        expect(code).toContain(`return "${locked}"`)
        expect(code).toContain("ui-markdown")
      }
    })
  })

  // epic `notebook` I1:  the member's own name, and its values, not the words it's given in
  describe("a default on an inherited member, in Spanish", () => {
    const KIND = "una carta es una vista reversible donde:\n"
    test("a value of a built-in template's:  by its own name, in its own value", () => {
      const { code, errors } = compiled(KIND + "\t- su dirección es abajo\n", "/Carta.es.spell")
      expect(errors).toEqual([])
      expect(code).toContain("get direction()")
      expect(code).toContain('return "down"')
      expect(code).not.toContain("get dirección")
    })

    test('a page\'s lock:  `su candado es "bloqueado"`', () => {
      for (const value of ['"bloqueado"', '"desbloqueado"']) {
        const output = value.includes("des") ? "unlocked" : "locked"
        const { code, errors } = compiled(
          `inicio es una página donde:\n\t- su candado es ${value}\n`,
          "/Inicio.es.spell"
        )
        expect(errors).toEqual([])
        expect(code).toContain(`get lock() {`)
        expect(code).toContain(`return "${output}"`)
      }
    })

    test("a value it doesn't know is refused, naming its values;  a later read goes by the member's name", () => {
      const refused = compiled('inicio es una página donde:\n\t- su candado es "otro"\n', "/Inicio.es.spell")
      expect(refused.errors.join()).toContain("desbloqueado, bloqueado")
      const text = 'inicio es una página donde:\n\t- su candado es "bloqueado"\n\t- su "aviso" es su candado\n'
      const { code, errors } = compiled(text, "/Inicio.es.spell")
      expect(errors).toEqual([])
      expect(code).toContain("this.lock")
    })

    test("the value depending on a condition:  the same name and values", () => {
      const line = "\t- su dirección es arriba si está boca abajo\n"
      const { code, errors } = compiled(KIND + line, "/Carta.es.spell")
      expect(errors).toEqual([])
      expect(code).toContain("get direction()")
      expect(code).toMatch(/"up"/)
    })

    test("in English, the same line keeps its words", () => {
      const { code, errors } = compiled('home is a page where:\n\t- its lock is "locked"\n', "/Home.spell")
      expect(errors).toEqual([])
      expect(code).toContain("get lock() {")
      expect(code).toContain('return "locked"')
    })
  })

  // epic `notebook` I5:  typed half-way, one example's problem;  the rest of the page drawn as it was
  describe("a broken example", () => {
    const page = (broken: string) =>
      [
        '<spell-page "p" notebook>',
        '\t<example "first">',
        "\t\t<button>First</button>",
        "\t</example>",
        '\t<section label="Labeled">',
        '\t\t<example "broken">',
        `\t\t\t${broken}`,
        "\t\t</example>",
        "\t</section>",
        '\t<section label="Later" sticky="stack">',
        '\t\t<example "last">',
        "\t\t\t<button>Last</button>",
        "\t\t</example>",
        "\t</section>",
        "</spell-page>",
        ""
      ].join("\n")
    const syntaxErrors = (errors: string[]) => errors.filter((error) => !/isn't a component/.test(error))

    test.each([
      ["a character no name has", '<button color="blue" ba§dge="1,048" appearance="basic">Forks</button>', "§dge"],
      ["a quote left open", '<button color="bl', 'color="bl'],
      ["a tag with no end", '<button color="blue" ba', "<button"],
      ["half an end tag", "<button>x</button>\n\t\t\t</butto", "</butto"],
      ["a stray >", '<button color="blue" >>Forks</button>', ">Forks"]
    ])("%s:  one error, in the example;  the rest as it was", (_case, broken, said) => {
      const { code, errors } = compiled(page(broken))
      expect(syntaxErrors(errors)).toHaveLength(1)
      expect(syntaxErrors(errors)[0]).toContain(said)
      expect(code.match(/\n\s*return /g)).toHaveLength(1)
      expect(code).toContain('h("spell-example", { name: "first" }, h("ui-button", "First"))')
      expect(code).toContain('h("spell-example", { name: "last" }, h("ui-button", "Last"))')
      expect(code).toContain('label: "Later"')
      expect(code).toMatch(
        /h\("spell-example", \{ name: "broken" \},\s+h\("span", \{ class: "spell-draw-error", role: "alert" \}/
      )
      expect(code).toContain("⚠")
    })

    test("a tag no pack here has:  reported, and still drawn by its name", () => {
      const { code } = compiled(page("<nosuchthing>x</nosuchthing>"))
      expect(code).toContain('h("nosuchthing", "x")')
      expect(code).not.toContain("spell-draw-error")
    })

    test("a value over several lines stays one value", () => {
      const { code, errors } = compiled(page('<button title="two\n\t\t\tlines">Go</button>'))
      expect(syntaxErrors(errors)).toEqual([])
      expect(code).not.toContain("spell-draw-error")
    })

    test("accented attribute names read whole, in Spanish", () => {
      const text = [
        '<encanto-página "p">',
        '\t<ejemplo "a">',
        '\t\t<botón título="hola" acción="y">x</botón>',
        "\t</ejemplo>",
        "</encanto-página>",
        ""
      ].join("\n")
      const { code, errors } = compiled(text, "/P.es.spell")
      expect(syntaxErrors(errors)).toEqual([])
      expect(code).not.toContain("spell-draw-error")
      expect(code).toContain("hola")
    })
  })

  // epic `notebook` P2:  a page's own views, `<view counter>` (Q6), in any page (Q1);  named for the page (P10, Q11, reversing Q7's A)
  describe("a page's own views", () => {
    const HOME = [
      '<spell-page "home">',
      "\t<view counter>",
      '\t\t<property "count">a number</>',
      "\t\t<draw><button>{its count}</button></draw>",
      "\t</view>",
      '\t<view "one counter">',
      "\t\t<draw><counter/></draw>",
      "\t</view>",
      "\t# Home",
      "\t<counter/>",
      "</spell-page>",
      ""
    ].join("\n")

    test('`<view counter>` and `<view "one counter">`:  lifted to just before the page, drawn later in it', () => {
      const { code, errors } = compiled(HOME, "/Home.spell")
      expect(errors).toEqual([])
      expect(code.indexOf("export class HomeCounter extends View {")).toBeGreaterThanOrEqual(0)
      expect(code.indexOf("export class HomeOneCounter extends View {")).toBeGreaterThan(
        code.indexOf("class HomeCounter ")
      )
      expect(code.indexOf("export class Home extends Page {")).toBeGreaterThan(code.indexOf("class HomeOneCounter "))
      expect(code).toContain('h("ui-markdown", "# Home"),\n      h("test-project-home-counter")')
      // where it's written, in the chunk tree:  `<view>` is the templates table's word, read without its prefix
      const [page] = SX.SpellxView.read(HOME, { path: "/Home.spell" }).templates
      expect(page!.children.slice(0, 2)).toMatchObject([
        { kind: "template", type: "view", word: "view", name: "counter" },
        { kind: "template", type: "view", word: "view", name: "one counter" }
      ])
    })

    test("the long word reads inside a page too, and `</view>` or `</spell-view>` closes either", () => {
      const long = HOME.replace("\t<view counter>", '\t<spell-view "counter">').replace("\t</view>", "\t</spell-view>")
      expect(compiled(long, "/Home.spell")).toEqual(compiled(HOME, "/Home.spell"))
      const mixed = HOME.replace("\t</view>", "\t</spell-view>")
      expect(compiled(mixed, "/Home.spell").errors).toEqual([])
    })

    test("in a page WITH a `<draw>`:  its own views too", () => {
      const text = ['<spell-page "home">', "\t<view counter>", "\t\t<draw><text>hi</text></draw>", "\t</view>"]
      text.push("\t<draw><counter/></draw>", "</spell-page>", "")
      const { code, errors } = compiled(text.join("\n"), "/Home.spell")
      expect(errors).toEqual([])
      expect(code).toContain("export class HomeCounter extends View {")
      expect(code).toContain('return h("test-project-home-counter")')
    })

    test("a page's own view, in a file with others:  its short name still reads from another file", () => {
      const other = '<spell-page "other">\n\t<counter/>\n</spell-page>\n'
      const [, second] = parseSpellProject([
        { path: "/Home.spell", contents: HOME },
        { path: "/Other.spell", contents: other }
      ]).files
      expect(second!.errors).toEqual([])
      expect(second!.compiled).toContain('h("test-project-home-counter")')
    })

    test("in Spanish:  `<vista contador>`, the same short word, read off Spanish's templates table", () => {
      const text = [
        '<encanto-página "inicio">',
        "\t# Hola",
        "\t<vista contador>",
        "\t\t<dibujar><texto>hola</texto></dibujar>",
        "\t</vista>",
        "\t<contador/>",
        "</encanto-página>",
        ""
      ].join("\n")
      const { code, errors } = compiled(text, "/Inicio.es.spell")
      expect(errors).toEqual([])
      expect(code).toContain("export class InicioContador extends View {")
      expect(code).toContain('h("ui-markdown", "# Hola"),\n      h("test-project-inicio-contador")')
    })

    test("a bare name names any template:  `<spell-view counter>`;  an attribute word wins, `<view locked>`", () => {
      const bare = "<spell-view counter>\n\t<draw><text>hi</text></draw>\n</spell-view>\n"
      const quoted = bare.replace("counter>", '"counter">')
      expect(compiled(bare, "/Counter.spell")).toEqual(compiled(quoted, "/Counter.spell"))
      const [view] = SX.SpellxView.read(bare, { path: "/Counter.spell" }).templates
      expect(view).toMatchObject({ name: "counter", attributes: [] })
      const locked = '<spell-page "home">\n\t<view locked>\n\t</view>\n</spell-page>\n'
      const [page] = SX.SpellxView.read(locked, { path: "/Home.spell" }).templates
      const [inner] = page!.children
      expect(inner).toMatchObject({ kind: "template", type: "view", name: undefined })
      expect(inner!.kind === "template" && inner.attributes.map((attribute) => attribute.name)).toEqual(["locked"])
    })

    test("at a file's top level every template is short (epic `language` P41);  in a drawing, `<page>` is markup", () => {
      const top = compiled("<view counter>\n\t<draw><text>hi</text></draw>\n</view>\n", "/Counter.spell")
      expect(top.errors).toEqual([])
      expect(top.code).toEqual(
        compiled("<spell-view counter>\n\t<draw><text>hi</text></draw>\n</spell-view>\n", "/Counter.spell").code
      )
      // `<page>` is markup in a page's drawing (Spell UI's `<ui-page>`), never a template
      const page = compiled('<spell-page "home">\n\t<page>Hi</page>\n</spell-page>\n', "/Home.spell")
      expect(page.errors).toEqual([])
      expect(page.code).toMatch(/return h\("[\w-]*page", "Hi"\)/)
    })
  })

  test("an `<html>` block:  its markup drawn as written, `<div>` the web's;  its twin, that markup alone", () => {
    const text = [
      '<spell-notebook "raw notebook">',
      "\t# Raw",
      "\t<html>",
      '\t\t<ui-button color="primary">Go</ui-button>',
      '\t\t<div class="note">hi</div>',
      "\t</html>",
      '\t<example "a button">',
      "\t\t<button>Go</button>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Raw.spell")
    expect(errors).toEqual([])
    expect(code).toContain('h("ui-button", { color: "primary" }, "Go"),')
    expect(code).toContain('h("div", { class: "note" }, "hi"),')
    expect(code).toContain('h("spell-example", { name: "a button" }, h("ui-button", "Go"))')
    const written = SX.CodeSpellWriter.write(text, { path: "/Raw.spell" })
    expect(written).toContain('\t\t<ui-button color="primary">Go</ui-button>\n\t\t<div class="note">hi</div>\n')
    expect(compiled(written, "/Raw.spell").code).toBe(code)
    // a cell of its own in the chunk tree
    const [notebook] = SX.SpellxView.read(text, { path: "/Raw.spell" }).templates
    expect(notebook!.children.map((cell) => (cell.kind === "declaration" ? cell.type : cell.kind))).toEqual([
      "prose",
      "html",
      "element"
    ])
  })

  test("`<html>` and `<markdown>` blocks inside markup:  drawn in place, `<img>` the web's;  the twin compiles the same", () => {
    const text = [
      '<spell-notebook "avatar notebook">',
      '\t<segment label="Image">',
      "\t\t<markdown>",
      "\t\t\tSlot your own `<img>`.",
      "\t\t</markdown>",
      '\t\t<example description="A slotted image.">',
      "\t\t\t<html>",
      '\t\t\t\t<ui-avatar><img src="joe.jpg" alt="Joe" /></ui-avatar>',
      "\t\t\t\t<span>hi</span>",
      "\t\t\t</html>",
      "\t\t</example>",
      "\t</segment>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Avatar.spell")
    expect(errors).toEqual([])
    expect(code).toContain(
      [
        '      core.drawPart(this, () => h("spell-example", { description: "A slotted image." },',
        "        [",
        '          h("ui-avatar", h("img", { src: "joe.jpg", alt: "Joe" })),',
        '          h("span", "hi")',
        "        ]"
      ].join("\n")
    )
    expect(code).not.toContain('h("html"')
    const written = SX.CodeSpellWriter.write(text, { path: "/Avatar.spell" })
    expect(compiled(written, "/Avatar.spell").code).toBe(code)
  })

  test("an attribute starting `on` is a handler only before a capital or a dash:  `only=` is text (P18)", () => {
    const text = [
      '<spell-notebook "api notebook">',
      "\t<html>",
      '\t\t<ui-docs-api tag="ui-avatar" only="attributes"></ui-docs-api>',
      "\t</html>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/API.spell")
    expect(errors).toEqual([])
    expect(code).toContain('h("ui-docs-api", { tag: "ui-avatar", only: "attributes"')
  })

  // epic `elemental-spell` P24:  Spell UI's pages hold JSON, markdown and CSS in `<script>`s
  test("a `<script>`'s or `<style>`'s text is drawn as written:  its `{`, `[` and lines its own", () => {
    const text = [
      '<spell-notebook "script notebook">',
      '\t<example "data">',
      "\t\t<html>",
      '\t\t\t<script type="application/json">',
      '\t\t\t\t{"days": [1, 3, 5]}',
      "\t\t\t\t[x]",
      "\t\t\t</script>",
      "\t\t\t<style>:root { --brand: red; }</style>",
      "\t\t</html>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Script.spell")
    expect(errors).toEqual([])
    expect(code).toContain('h("script", { type: "application/json" }, "{\\"days\\": [1, 3, 5]}\\n[x]")')
    expect(code).toContain('h("style", ":root { --brand: red; }")')
    const written = SX.CodeSpellWriter.write(text, { path: "/Script.spell" })
    expect(compiled(written, "/Script.spell").code).toBe(code)
  })

  test("a text's entities are its characters, as JSX reads them:  `&lt;` is `<`, `&#123;` is `{`", () => {
    const text = [
      '<spell-notebook "entity notebook">',
      '\t<example "code">',
      "\t\t<html>",
      "\t\t\t<code>&lt;ui-button&gt; &amp; &#123;x&#125;</code>",
      "\t\t</html>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Entity.spell")
    expect(errors).toEqual([])
    expect(code).toContain('h("code", "<ui-button> & {x}")')
  })

  // epic `elemental-spell` P24:  `<text>B</text> <text>C</text>` was written `ui-textt>C`
  test("written as code spell, an element after a space on its line keeps its `<`", () => {
    const text = [
      '<spell-notebook "inline notebook">',
      "\t<example>",
      "\t\t<segment><text>B</text> <text>C</text></segment>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const written = SX.CodeSpellWriter.write(text, { path: "/Inline.spell" })
    expect(written).toContain("<ui-segment><ui-text>B</ui-text> <ui-text>C</ui-text></ui-segment>")
    expect(compiled(written, "/Inline.spell").code).toBe(compiled(text, "/Inline.spellml").code)
  })

  test("an edit re-parses as a fresh parse would", () => {
    const project = incrementalSpellProject([{ path: "/Counter.spell", contents: COUNTER }])
    for (const edit of [
      ["Clicked", "Pressed"],
      ["## Try it", "## Try this"],
      ["one counter", "a counter"]
    ]) {
      const contents = COUNTER.replace(edit[0]!, edit[1]!)
      project.update("/Counter.spell", contents)
      expect(summarizeIncremental(project), edit[1]).toEqual(
        summarize(parseSpellProject([{ path: "/Counter.spell", contents }]))
      )
    }
  })

  // epic `notebook` P3, J1:  the program draws the docs look, as the editor's own page did
  describe("its sections:  sticky and foldable, as the docs pages' are", () => {
    const PAGE = [
      '<spell-notebook "button notebook">',
      "\t# Button",
      "\tA button.",
      "",
      "\t## Using it",
      "\tWrite it with its text inside.",
      "\t<!-- a comment, inside -->",
      '\t<example "a button">',
      "\t\t<button>Go</button>",
      "\t</example>",
      '\t<text color="grey">Try it.</text>',
      "",
      '\t<section label="Events">',
      "\t\t<markdown>A click.</markdown>",
      "\t</section>",
      '\t<section label="Keys" sticky level="3">',
      "\t\t<example>",
      '\t\t\t<section label="Inside">a</section>',
      "\t\t</example>",
      "\t</section>",
      "\t<section>",
      "\t\t<text>no title</text>",
      "\t</section>",
      "</spell-notebook>",
      ""
    ].join("\n")

    test("each `##` heading and what follows it, to the next section:  a section, its heading its label", () => {
      const { code, errors } = compiled(PAGE, "/Button.spell")
      expect(errors).toEqual([])
      expect(code).toContain(
        [
          '      h("ui-markdown", "# Button\\nA button."),',
          `      core.drawPart(this, () => h("ui-section", { label: "Using it", ${LOOK} },`,
          '        h("ui-markdown", "Write it with its text inside."),',
          '        core.drawPart(this, () => h("spell-example", { name: "a button" }, h("ui-button", "Go"))),',
          '        h("ui-text", { color: "grey" }, "Try it.")',
          "      )),"
        ].join("\n")
      )
      // its heading only its label:  not drawn again in its markdown
      expect(code).not.toContain("## Using it")
    })

    test("a `<section label>` written at the top gets the same look, but what it says;  no other section does", () => {
      const { code } = compiled(PAGE, "/Button.spell")
      expect(code).toContain(`h("ui-section", { label: "Events", ${LOOK} },\n        h("ui-markdown", "A click.")`)
      // the section before it ends where it starts:  it's one of its own
      expect(code).toMatch(/"Try it\."\)\n {6}\)\),\n {6}h\("ui-section", \{ label: "Events"/)
      // its own `sticky` and `level` kept, the rest added
      expect(code).toContain(
        'h("ui-section", { label: "Keys", sticky: true, level: "3", collapsible: true, dividing: true },'
      )
      // inside an example, or with no title:  as written
      expect(code).toContain('h("ui-section", { label: "Inside" }, "a")')
      expect(code).toContain('h("ui-section", h("ui-text", "no title"))')
    })

    test("each keeps its own place in the file:  the section the heading's, each child its own", () => {
      const parser = SP.Language.default.parser.clone({ module: "test", form: "spellx" } as P.ParserProps)
      const { tokenizer } = parser as SP.SpellParser
      const [root] = tokenizer.breakIntoIndentedBlocks(tokenizer.tokenize(PAGE))
      const twin = SP.SpellxTwin.lineOf(root!.tokens[0] as P.LineToken, root!.tokens[1], parser as SP.SpellParser)
      const drawing = twin!.body!.tokens.at(-1) as P.BlockToken
      const [fragment] = (drawing.tokens[0] as P.LineToken).tokens as P.JSXFragmentToken[]
      const section = fragment!.children![1] as P.JSXElementToken
      expect(section.tagName).toBe("section")
      expect(section.start).toBe(PAGE.indexOf("## Using it"))
      expect(SP.SpellxTwin.isSynthetic(section)).toBe(true)
      const starts = section.children!.slice(0, -1).map((child) => child.start)
      expect(starts).toEqual([
        PAGE.indexOf("Write it"),
        PAGE.indexOf('<example "a button">'),
        PAGE.indexOf('<text color="grey">')
      ])
    })

    test("written as code spell, each section is written out, and compiles to the same program", () => {
      const written = SX.CodeSpellWriter.write(PAGE, { path: "/Button.spell" })
      expect(written).toContain(
        [
          '\t\t<ui-section label="Using it" sticky="stack" collapsible dividing level="2">',
          "\t\t\t<markdown>",
          "\t\t\t\tWrite it with its text inside.",
          "\t\t\t</markdown>",
          '\t\t\t<example "a button">'
        ].join("\n")
      )
      // a written section's look, after what it says
      expect(written).toContain('\t\t<ui-section label="Events" sticky="stack" collapsible dividing level="2">')
      expect(written).toContain('\t\t<ui-section label="Keys" sticky level="3" collapsible dividing>')
      const twin = compiled(written, "/Button.spell")
      expect(twin.errors).toEqual([])
      expect(twin.code).toBe(compiled(PAGE, "/Button.spell").code)
    })

    test("in Spanish:  `<seccion etiqueta>`, Spell UI's Spanish words for the look", () => {
      const text = [
        '<encanto-cuaderno "cuaderno del botón">',
        "\t## Úsalo",
        "\tEscríbelo con su texto dentro.",
        '\t<sección etiqueta="Eventos">',
        "\t\t<markdown>Un clic.</markdown>",
        "\t</sección>",
        "</encanto-cuaderno>",
        ""
      ].join("\n")
      const { code, errors } = compiled(text, "/Boton.es.spell")
      expect(errors).toEqual([])
      const look = 'pegado: "apilado", plegable: true, divisorio: true, nivel: "2"'
      expect(code).toContain(`h("es-seccion", { etiqueta: "Úsalo", ${look} },\n        h("ui-markdown", "Escríbelo`)
      expect(code).toContain(`h("es-seccion", { etiqueta: "Eventos", ${look} },\n        h("ui-markdown", "Un clic.")`)
      const written = SX.CodeSpellWriter.write(text, { path: "/Boton.es.spell" })
      expect(compiled(written, "/Boton.es.spell").code).toBe(code)
    })

    test("a heading's `[` and `]` stay its label's text;  its quotes curly, as markup can't hold them", () => {
      const text = ['<spell-page "odd page">', '\t## The "[x]" bit', "\tHi.", "</spell-page>", ""].join("\n")
      const { code, errors } = compiled(text, "/Odd.spell")
      expect(errors).toEqual([])
      expect(code).toContain("label: () => `The “[x]” bit`")
      const written = SX.CodeSpellWriter.write(text, { path: "/Odd.spell" })
      expect(compiled(written, "/Odd.spell").code).toBe(code)
    })

    test("a page with no flag draws its sections too", () => {
      const text = ['<spell-page "about">', "\t## Us", "\tWe make things.", "</spell-page>", ""].join("\n")
      const { code, errors } = compiled(text, "/About.spell")
      expect(errors).toEqual([])
      expect(code).toContain(
        `return h("ui-section", { label: "Us", ${LOOK} },\n      h("ui-markdown", "We make things.")`
      )
      const written = SX.CodeSpellWriter.write(text, { path: "/About.spell" })
      expect(compiled(written, "/About.spell").code).toBe(code)
    })
  })
})

/** What a page's section draws as, besides its label:  sticky, foldable, as the docs pages' are (J1). */
const LOOK = 'sticky: "stack", collapsible: true, dividing: true, level: "2"'

/** A counter notebook, as P16's plan writes it (its `<section>` left out:  the tests' pack has none). */
const COUNTER = [
  '<spell-notebook "counter notebook">',
  "\t# A counter",
  "\tA button that counts its clicks.",
  "",
  '\t<spell-view "counter">',
  '\t\t<property "count">a number</>',
  '\t\t<action "create it">set its count to 0</>',
  '\t\t<action "count up">set its count to its count + 1</>',
  "\t\t<draw><button onClick={count up}>Clicked {its count} times</button></draw>",
  "\t</spell-view>",
  "",
  "\t## Try it",
  '\t<example "one counter">',
  "\t\t<counter/>",
  "\t</example>",
  "",
  "\t## Two of them",
  "\tEach counts on its own:",
  '\t<text color="grey">Click either one.</text>',
  "</spell-notebook>",
  ""
].join("\n")

/** A Spanish page that draws its body:  a counter, as `COUNTER` is. */
const CONTADOR = [
  '<encanto-cuaderno "cuaderno del contador">',
  "\t# Un contador",
  '\t<encanto-vista "contador">',
  '\t\t<propiedad "cuenta">un número</>',
  '\t\t<dibujar><botón>{"Clics: " + su cuenta}</botón></dibujar>',
  "\t</encanto-vista>",
  '\t<ejemplo "un contador">',
  "\t\t<contador/>",
  "\t</ejemplo>",
  "</encanto-cuaderno>",
  ""
].join("\n")

/** `text`, one file at `path` of its own project, compiled as a project is:  with the line starting its page. */
function projectCode(text: string, path = "/Counter.spell") {
  return compiledSpellProject([{ path, contents: text }]).code
}

/** `text`, one file at `path` of its own project, compiled:  its code without markers or comments, and its errors. */
function compiled(text: string, path = "/Counter.spell") {
  const [file] = parseSpellProject([{ path, contents: text }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
  return { code, errors: file!.errors }
}
