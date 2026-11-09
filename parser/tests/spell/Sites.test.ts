import { beforeAll, describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A SITE (epic `mockup` P1):  `galaxy guide is a site:`, spell's built-in `site` template, its pages at their
 * addresses, and the dialogs and sidebars any of them opens.
 * - The site holds each page's address and name;  a page holds only what it shows and does.
 * - Written three ways, compiling to the same class:  code spell, spellx's `<spell-site>`, and in Spanish.
 */
describe("a site", () => {
  beforeAll(registerTestComponentPack)

  test("lists its pages, nested as written, and its dialogs and sidebars, in its class", () => {
    const { code, errors } = compiled(CODE, "/Galaxy.spell")
    expect(errors).toEqual([])
    expect(code).toContain("export class GalaxyGuide extends Site {")
    expect(code).toContain(SITE_CLASS)
    expect(code).toContain("export const galaxyGuide = new GalaxyGuide()")
  })

  test("written as spellx, `<spell-site>` with `<page>`, `<dialog>` and `<sidebar>`, it compiles the same", () => {
    const { code, errors } = compiled(TAGS, "/Galaxy.spellml")
    expect(errors).toEqual([])
    expect(code).toContain(SITE_CLASS)
  })

  test("a page says how far along it is, and where its picture is (T14)", () => {
    const { code, errors } = compiled(
      [
        'a "films page" is a page where:',
        "\t- to draw it:",
        "\t\t<header>Films</header>",
        '\t\t<image src="/spaces/owen@spell/x/a.png"/>',
        'a "film page" is a page',
        'a "add film dialog" is a view where:',
        "\t- to draw it:",
        "\t\t<header>Add</header>",
        "galaxy guide is a site:",
        '\t- it has a "films page" at "/films", named "Films", old, pictured in "snapshots/a.png"',
        '\t\t- it has a "film page" at "/films/one", new',
        '\t- it has a "add film dialog"'
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('state: "old",')
    expect(code).toContain('picture: "snapshots/a.png"')
    expect(code).toContain('state: "new"')
  })

  test("in spellx, `state=` and `picture=` say the same (T14)", () => {
    const { code, errors } = compiled(
      [
        '<spell-page "films page"/>',
        '<spell-site "galaxy guide">',
        '\t<page "films page" address="/films" title="Films" state="old" picture="snapshots/a.png"/>',
        "</spell-site>"
      ],
      "/Galaxy.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain('state: "old",')
    expect(code).toContain('picture: "snapshots/a.png"')
  })

  test("a card says its place in its section, and its colour;  a dialog under a page too (T31)", () => {
    const { code, errors } = compiled(
      [
        'a "films page" is a page',
        'a "film page" is a page',
        'a "add film dialog" is a view',
        "galaxy guide is a site:",
        '\t- it has a "films page" at "/films", named "Films", colored blue',
        '\t\t- it has a "film page" at "/films/one", in row 2 column 3',
        '\t\t- it has a "add film dialog", in row 1 column 2, colored teal'
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('color: "blue"')
    expect(code).toContain("row: 2,")
    expect(code).toContain("column: 3")
    expect(code).toContain('name: "add film dialog"')
    expect(code).toContain('color: "teal"')
  })

  test("in spellx, `row=`, `column=` and `color=` say the same, on a `<dialog>` under a `<page>` too (T31)", () => {
    const { code, errors } = compiled(
      [
        '<spell-page "films page"/>',
        '<spell-view "settings dialog"/>',
        '<spell-site "galaxy guide">',
        '\t<page "films page" address="/films" row="1" column="2" color="blue">',
        '\t\t<dialog "settings dialog" row="1" column="3" color="teal"/>',
        "\t</>",
        "</spell-site>"
      ],
      "/Galaxy.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain('color: "blue"')
    expect(code).toContain("row: 1,")
    expect(code).toContain('color: "teal"')
    expect(code).toContain("static dialogs")
  })

  test("in Spanish:  `en la fila 2 columna 3`, `de color azul` (T31)", () => {
    const { code, errors } = compiled(
      [
        'una "página de películas" es una página',
        "galaxia es un sitio:",
        '\t- tiene una "página de películas" en "/peliculas", en la fila 2 columna 3, de color azul'
      ],
      "/Galaxia.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('color: "blue"')
    expect(code).toContain("column: 3")
  })

  test("a row counted from 0 is refused, saying why (T31)", () => {
    const { errors } = compiled(
      [
        'a "films page" is a page',
        "galaxy guide is a site:",
        '\t- it has a "films page" at "/films", in row 0 column 2'
      ],
      "/Galaxy.spell"
    )
    expect(errors.join("\n")).toContain("count from 1")
  })

  test("in the cloud:  where it lives", () => {
    const { code, errors } = compiled(
      ['a "home page" is a page', "galaxy guide is a site in the cloud:", '\t- it has a home page at "/"'],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static livesAt = "cloud"')
  })

  test('in Spanish:  `es un sitio`, a name with `de` quoted, `tiene un "diálogo de ajustes"`', () => {
    const { code, errors } = compiled(SPANISH, "/Galaxia.es.spell")
    expect(errors).toEqual([])
    expect(code).toContain("extends Site {")
    expect(code).toContain('address: "/peliculas/:película"')
    expect(code).toContain('params: ["película"]')
    expect(code).toContain('static dialogs = [{ name: "diálogo de ajustes" }]')
    expect(code).toContain('static sidebars = [{ name: "panel de películas" }]')
  })

  test("in Spanish, a name with `de` needs no quotes (T5)", () => {
    const { code, errors } = compiled(
      SPANISH.map((line) => line.replace(/"(página de película|diálogo de ajustes|panel de películas)"/, "$1")),
      "/Galaxia.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('name: "página de película",')
    expect(code).toContain('static dialogs = [{ name: "diálogo de ajustes" }]')
    expect(code).toContain('static sidebars = [{ name: "panel de películas" }]')
  })

  test("says what's wrong with a page's line", () => {
    const { errors } = compiled(
      [
        ...CODE.slice(0, 5),
        "galaxy guide is a site:",
        '\t- it has a films page at "/films"',
        '\t- it has a flim page at "/x"',
        '\t- it has a film page at "films"',
        '\t- it has a film page at "/f/:person"',
        '\t- it has a film page at "/films"'
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([
      `8:3 "flim page" isn't one of this program's pages:  name a page it declares, e.g. a "film page" is a page`,
      `9:3 A page's address starts with "/", from the site's root:  "/films", not "films"`,
      `10:3 The film page has nothing called person for ":person" to fill:  say what it is on the page, e.g. - it has a person`,
      `11:3 The films page is already at "/films":  each page needs an address of its own`
    ])
  })

  test("`it has a ...` outside a site is a property, as before", () => {
    const { code, errors } = compiled(['a "card" is a thing where:', "\t- it has a settings dialog"], "/Card.spell")
    expect(errors).toEqual([])
    expect(code).toContain('get settingsDialog() { return this.getProp("settingsDialog") }')
  })

  test("`<sidebar>`, `<page>` and `<dialog>` outside a `<spell-site>` are markup:  Spell UI's", () => {
    const { errors } = compiled(
      ['<spell-notebook "side notes">', "\t<sidebar>", "\t\tNotes", "\t</>", "</>"],
      "/Notes.spellml"
    )
    // read as markup, a component the test's pack doesn't have:  not a site's part
    expect(errors).toEqual([expect.stringContaining("<sidebar> isn't a component")])
  })
})

/**
 * Going between a site's pages (epic `mockup` P2):  a line names the PAGE, never its address, and the running site
 * makes the address.
 */
describe("going to a site's pages", () => {
  beforeAll(registerTestComponentPack)

  test("`go to` and `show` name a page, its parameter after `for` or `with`", () => {
    const { code, errors } = compiled(
      [
        ...CODE,
        'a "film button" is a view where:',
        "\t- it has a film",
        "\t- to go:",
        "\t\tgo to the films page",
        "\t\tgo to the film page for its film",
        "\t\tshow the film page with its film",
        "\t\tshow the settings dialog",
        "\t\tshow the film sidebar for its film"
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.showSitePart("films page")')
    expect(code).toContain('core.showSitePart("film page", this.film)')
    expect(code).toContain('core.showSitePart("settings dialog")')
    expect(code).toContain('core.showSitePart("film sidebar", this.film)')
  })

  test("`the address of the ...` is a page's address, as text, for a link", () => {
    const { code, errors } = compiled(
      [
        ...CODE,
        'a "film link" is a view where:',
        "\t- it has a film",
        '\t- its "link" is the address of the film page for its film'
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.siteAddressOf("film page", this.film)')
  })

  test("`close the ...` closes a dialog or a sidebar (P8)", () => {
    const { code, errors } = compiled(
      [...CODE, 'a "film button" is a view where:', "\t- to finish:", "\t\tclose the settings dialog"],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.closeSitePart("settings dialog")')
  })

  test("`the address of the ...` names a page declared further down the file (P8)", () => {
    const { code, errors } = compiled(
      [
        'a "film link" is a view where:',
        '\t- its "link" is the address of the about page',
        ...CODE,
        'an "about page" is a page',
        "galaxy extras is a site:",
        '\t- it has an about page at "/about"'
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.siteAddressOf("about page")')
  })

  test("`go to the ...` naming no page, dialog or sidebar isn't ours", () => {
    const { errors } = compiled([...CODE, "to wander:", "\tgo to the kitchen"], "/Galaxy.spell")
    expect(errors).not.toEqual([])
  })

  test("a page declared further down the file is checked against the site's own lines (T6)", () => {
    const { errors } = compiled(
      [
        'a "film button" is a view where:',
        "\t- to go:",
        "\t\tgo to the about page",
        "\t\tshow the settings dialog",
        ...CODE,
        'an "about page" is a page',
        "galaxy extras is a site:",
        '\t- it has an about page at "/about"'
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
  })

  test("a page or dialog no site lists is an error at its line, naming what the site has (T6)", () => {
    const { errors } = compiled(
      [
        'a "film button" is a view where:',
        "\t- to go:",
        "\t\tgo to the flim page",
        "\t\tshow the setings dialog",
        ...CODE,
        'a "flim page" is a page'
      ],
      "/Galaxy.spell"
    )
    const parts = "films page, film page, settings dialog, film sidebar"
    expect(errors).toEqual([
      `3:2 The site has no "flim page":  its pages, dialogs and sidebars are ${parts}`,
      `4:2 The site has no "setings dialog":  its pages, dialogs and sidebars are ${parts}`
    ])
  })

  test("its not found and error pages:  the program's own when it declares one", () => {
    const { code, errors } = compiled(
      [
        'a "home page" is a page',
        'a "not found page" is a page',
        "galaxy guide is a site:",
        '\t- it has a home page at "/"',
        "\t- it has a not found page",
        "\t- it has an error page"
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static notFoundPage = { name: "not found page", view: "NotFoundPage" }')
    expect(code).toContain('static errorPage = { name: "error page" }')
  })

  test("as spellx, `<page>` with no address is its not found or error page", () => {
    const { code, errors } = compiled(
      [
        '<spell-page "home page"/>',
        '<spell-site "galaxy guide">',
        '\t<page "home page" address="/"/>',
        '\t<page "not found page"/>',
        '\t<page "error page"/>',
        "</>"
      ],
      "/Galaxy.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static notFoundPage = { name: "not found page" }')
    expect(code).toContain('static errorPage = { name: "error page" }')
  })

  test("in Spanish:  `ir a la ...`, `mostrar el ...`, `tiene una página no encontrada`", () => {
    const { code, errors } = compiled(
      [
        ...SPANISH,
        "\t- tiene una página no encontrada",
        "\t- tiene una página de error",
        'una "lista" es una vista donde:',
        "\t- para ir:",
        '\t\tir a la "página de película"',
        '\t\tmostrar el "diálogo de ajustes"'
      ],
      "/Galaxia.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static notFoundPage = { name: "página no encontrada" }')
    expect(code).toContain('core.showSitePart("página de película")')
    expect(code).toContain('core.showSitePart("diálogo de ajustes")')
  })

  test("a program with a site starts its site, not its first page", () => {
    const parts = parseSpellProject([{ path: "/Galaxy.spell", contents: CODE.join("\n") }]).files.map(
      ({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled)
    )
    const starts = SP.SpellProject.combineCompiled(parts)
      .split("\n")
      .filter((line) => line.startsWith("if (!core.isCarryingOver)"))
    expect(starts).toEqual(["if (!core.isCarryingOver) galaxyGuide.start()"])
  })
})

/** The types a site names, then the site, in code spell. */
const CODE = [
  'a "film" is a thing where:',
  '\t- its "title" is text',
  'a "films page" is a page',
  'a "film page" is a page where:',
  "\t- it has a film",
  'galaxy guide is a site at "owen@spell/galaxy":',
  '\t- it has a films page at "/films", named "Films"',
  '\t\t- it has a film page at "/films/:film"',
  "\t- it has a settings dialog",
  "\t- it has a film sidebar"
]

/** The same, as spellx. */
const TAGS = [
  '<spell-thing "film">',
  '\t<property "title" type="text"/>',
  "</>",
  '<spell-page "films page"/>',
  '<spell-page "film page">',
  '\t<property "film" type="film"/>',
  "</>",
  '<spell-site "galaxy guide" at="owen@spell/galaxy">',
  '\t<page "films page" address="/films" title="Films">',
  '\t\t<page "film page" address="/films/:film"/>',
  "\t</>",
  '\t<dialog "settings dialog"/>',
  '\t<sidebar "film sidebar"/>',
  "</>"
]

/** A site in Spanish. */
const SPANISH = [
  'una "película" es una cosa donde:',
  '\t- su "título" es texto',
  'una "página de película" es una página donde:',
  "\t- tiene una película",
  "guía galáctica es un sitio:",
  '\t- tiene una "página de película" en "/peliculas/:película", llamada "Película"',
  '\t- tiene un "diálogo de ajustes"',
  '\t- tiene un "panel de películas"'
]

/** What every form compiles its site's class to. */
const SITE_CLASS = [
  "  static pages = [{",
  '    name: "films page",',
  '    page: "FilmsPage",',
  '    address: "/films",',
  '    title: "Films",',
  "    pages: [{",
  '      name: "film page",',
  '      page: "FilmPage",',
  '      address: "/films/:film",',
  '      params: ["film"]',
  "    }]",
  "  }]",
  '  static dialogs = [{ name: "settings dialog" }]',
  '  static sidebars = [{ name: "film sidebar" }]',
  '  static livesAt = "owen@spell/galaxy"',
  "}"
].join("\n")

/** `lines` compiled as a file at `path`:  its code, without comments, and its errors. */
function compiled(lines: string[], path: string) {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
  return { code, errors: file!.errors.map((error) => `${(error as { message?: string }).message ?? error}`) }
}
