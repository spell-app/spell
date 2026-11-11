import { beforeAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A page alone in its file (epic `notebook` P10, Q11):  compiled by itself, the project knowing only its head.
 * - `P.IncrementalProject`'s alone files, and `SP.AlonePage`.
 * - What the editor does with them is `SpellProject.pagesInPlay`'s, tested with a running editor.
 */

const FILM = ['"film page" is a notebook page', "\t# Film", "\t<text>Counted</text>", ""].join("\n")

const OTHER = FILM.replace('"film page"', '"other page"').replace("# Film", "# Other")

const SITE = [
  "guide is a site:",
  '\tit has a film page at "/films" , named "Film"',
  '\tit has an other page at "/other" , named "Other"',
  ""
].join("\n")

/** A project of `files` parsed with each page alone, as the editor and every compile read it. */
function projectOf(files: Record<string, string>, parsesAlone?: (path: string) => boolean) {
  const language = SP.Language.forFile("/x.spell")
  const root = SP.Language.rootScopeFor([language])
  const scope = new P.ProjectScope({
    name: "Guide",
    path: "@test/Guide",
    parser: root.parser!.clone({ module: "Guide" }),
    parentScope: root
  })
  const twin = (scope.parser as SP.SpellParser).twinFor(language, "page")
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
  const head = (text: string) => SP.Language.rootScopeFor([SP.Language.forFile("/x.spell")]).parser as SP.SpellParser
  const alone = (text: string) => !!head(text).twinFor(SP.Language.forFile("/x.spell"), "page").aloneHead(text, "/x")

  test("one page, a comment before it", () => expect(alone(`<!-- notes -->\n${FILM}`)).toBe(true))
  test("read by a plain parser, it is not", () => {
    const parser = head(FILM)
    expect(parser.aloneHead(FILM, "/x")).toBeUndefined()
  })
  test("two pages in a file are not", () => expect(alone(`${FILM}${OTHER}`)).toBe(false))
  test("a thing after the page's end is not", () =>
    expect(alone(`${FILM}a "task" is a thing:\n\tits "title" is text\n`)).toBe(false))
  test("a view of its own above it is not", () =>
    expect(alone(`a "counter" is a view:\n\tto draw it: <text>hi</text>\n${FILM}`)).toBe(false))
})

describe("a project of pages alone", () => {
  beforeAll(registerTestComponentPack)

  const FILES = { "/Film.spell": FILM, "/Other.spell": OTHER, "/Site.spell": SITE }

  test("a site reads their names and parameters with no page parsed", () => {
    const { project } = projectOf(FILES, () => false)
    expect(project.getFile("/Film.spell")).toBeUndefined()
    expect(errorsIn(project.getFile("/Site.spell"))).toEqual([])
  })

  test("a page the site says has a parameter it lacks is refused, by its head", () => {
    const site = SITE.replace('"/other"', '"/other/:nope"')
    const { project } = projectOf({ ...FILES, "/Site.spell": site }, () => false)
    expect(errorsIn(project.getFile("/Site.spell")).join()).toContain("nope")
  })

  test("a page is parsed when it's wanted", () => {
    const { project } = projectOf(FILES, (path) => path === "/Film.spell")
    expect(project.getFile("/Other.spell")).toBeUndefined()
    const parse = project.parseAlone("/Other.spell")
    expect(parse?.match).toBeDefined()
    expect(project.parseAlone("/Other.spell")).toBeUndefined()
  })

  test("typing in a page re-parses it alone, and the site doesn't move", () => {
    const { project } = projectOf(FILES)
    const site = project.getFile("/Site.spell")!.match
    const changed = project.update("/Film.spell", FILM.replace("# Film", "# Films"))
    expect(changed).toEqual([project.getFile("/Film.spell")])
    expect(project.getFile("/Site.spell")!.match).toBe(site)
  })

  test("a change of the page's name re-reads the rest", () => {
    const { project } = projectOf(FILES)
    const changed = project.update("/Other.spell", OTHER.replace('"other page"', '"another page"'))
    expect(changed).toContain(project.getFile("/Site.spell"))
  })

  test("a file that stops being alone starts over", () => {
    const { project } = projectOf(FILES)
    expect(project.update("/Film.spell", `${FILM}${OTHER}`)).toEqual([])
    expect(project.isBroken).toBe(true)
  })
})
