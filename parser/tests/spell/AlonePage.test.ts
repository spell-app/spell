import { beforeAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A page alone in its file (epic `notebook` P10, Q11):  compiled by itself, the project knowing only its head.
 * - `P.IncrementalProject`'s alone files, and `SP.AlonePage`.
 * - What the editor does with them is `SpellProject.pagesInPlay`'s, tested with a running editor.
 */

const FILM = [
  '<spell-page "film page">',
  '\t<property "film">text</>',
  "\t<view counter>",
  "\t\t<draw><text>Counted</text></draw>",
  "\t</view>",
  "\t# Film",
  "\t<counter/>",
  "</spell-page>",
  ""
].join("\n")

const OTHER = FILM.replace('"film page"', '"other page"').replace("# Film", "# Other")

const SITE = [
  '<spell-site "guide">',
  '\t<page "film page" address="/films/:film" title="Film"/>',
  '\t<page "other page" address="/other" title="Other"/>',
  "</>",
  ""
].join("\n")

/** A project of `files` parsed with each page alone, as the editor and every compile read it. */
function projectOf(files: Record<string, string>, parsesAlone?: (path: string) => boolean) {
  const language = SP.Language.forFile("/x.spellml")
  const root = SP.Language.rootScopeFor([language])
  const scope = new P.ProjectScope({
    name: "Guide",
    path: "@test/Guide",
    parser: root.parser!.clone({ module: "Guide" }),
    parentScope: root
  })
  const twin = (scope.parser as SP.SpellParser).twinFor(language, "spellx")
  const project = new P.IncrementalProject({
    scope,
    keepLastGood: true,
    headOf: (parser, text, path) => (parser as SP.SpellParser).aloneHead(text, path),
    parsesAlone,
    files: Object.entries(files).map(([path, text]) => ({
      path,
      name: path,
      text,
      parser: twin,
      head: twin.aloneHead(text, path)
    }))
  })
  return { project, scope }
}

/** The file's errors, as text. */
function errorsIn(parse: P.IncrementalParse | undefined): string[] {
  return (parse?.match ? (SP.Block.getParseErrors(parse.match) ?? []) : []).map((error) => String(error.inputText))
}

describe("what counts as alone", () => {
  const head = (text: string) => SP.Language.rootScopeFor([SP.Language.forFile("/x.spellml")]).parser as SP.SpellParser
  const alone = (text: string) =>
    !!head(text).twinFor(SP.Language.forFile("/x.spellml"), "spellx").aloneHead(text, "/x")

  test("one page, a comment before it, its views inside", () => expect(alone(`<!-- notes -->\n${FILM}`)).toBe(true))
  test("a page in `.spell` is not", () => {
    const parser = head(FILM)
    expect(parser.aloneHead(FILM, "/x")).toBeUndefined()
  })
  test("two pages in a file are not", () => expect(alone(`${FILM}${OTHER}`)).toBe(false))
  test("a thing after the page's end is not", () =>
    expect(alone(`${FILM}<spell-thing "task">\n\t<property "title">text</>\n</spell-thing>\n`)).toBe(false))
  test("a view at the top is not", () =>
    expect(alone("<spell-view counter>\n\t<draw>hi</draw>\n</spell-view>\n")).toBe(false))
})

describe("a project of pages alone", () => {
  beforeAll(registerTestComponentPack)

  const FILES = { "/Film.spellml": FILM, "/Other.spellml": OTHER, "/Site.spellml": SITE }

  test("a site reads their names and parameters with no page parsed", () => {
    const { project } = projectOf(FILES, () => false)
    expect(project.getFile("/Film.spellml")).toBeUndefined()
    expect(errorsIn(project.getFile("/Site.spellml"))).toEqual([])
  })

  test("a page the site says has a parameter it lacks is refused, by its head", () => {
    const site = SITE.replace('"/other"', '"/other/:nope"')
    const { project } = projectOf({ ...FILES, "/Site.spellml": site }, () => false)
    expect(errorsIn(project.getFile("/Site.spellml")).join()).toContain("nope")
  })

  test("two pages each have a `counter`, their own, named for the page", () => {
    const { project } = projectOf(FILES)
    const code = (path: string) => String(P.JSWriter.instance.writeMatch(project.getFile(path)!.match))
    expect(code("/Film.spellml")).toContain("class FilmPageCounter extends View")
    expect(code("/Film.spellml")).toContain('h("guide-film-page-counter")')
    expect(code("/Other.spellml")).toContain("class OtherPageCounter extends View")
    expect(errorsIn(project.getFile("/Film.spellml"))).toEqual([])
  })

  test("a page is parsed when it's wanted", () => {
    const { project } = projectOf(FILES, (path) => path === "/Film.spellml")
    expect(project.getFile("/Other.spellml")).toBeUndefined()
    const parse = project.parseAlone("/Other.spellml")
    expect(parse?.match).toBeDefined()
    expect(project.parseAlone("/Other.spellml")).toBeUndefined()
  })

  test("typing in a page re-parses it alone, and the site doesn't move", () => {
    const { project } = projectOf(FILES)
    const site = project.getFile("/Site.spellml")!.match
    const changed = project.update("/Film.spellml", FILM.replace("# Film", "# Films"))
    expect(changed).toEqual([project.getFile("/Film.spellml")])
    expect(project.getFile("/Site.spellml")!.match).toBe(site)
  })

  test("a change of the page's name or a property re-reads the rest", () => {
    const { project } = projectOf(FILES)
    const changed = project.update("/Other.spellml", OTHER.replace('"other page"', '"another page"'))
    expect(changed).toContain(project.getFile("/Site.spellml"))
  })

  test("a page's own view can't take another page's name", () => {
    const clashing = FILM.replace("<view counter>", '<view "other">').replace("\t<counter/>\n", "")
    const name = '<spell-page "film page other">\n\t# Hi\n</spell-page>\n'
    const { project } = projectOf({ ...FILES, "/Film.spellml": clashing, "/Clash.spellml": name })
    expect(errorsIn(project.getFile("/Film.spellml")).join()).toContain("view")
  })

  test("a file that stops being alone starts over", () => {
    const { project } = projectOf(FILES)
    expect(project.update("/Film.spellml", `${FILM}${OTHER}`)).toEqual([])
    expect(project.isBroken).toBe(true)
  })
})
