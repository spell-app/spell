import { beforeAll, describe, test, expect } from "vite-plus/test"

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
