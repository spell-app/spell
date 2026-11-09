import { existsSync, readdirSync, readFileSync } from "fs"
import { resolve } from "path"
import { beforeAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"
import { SX } from "spell/parser/spellx"
import { SPACES } from "spell/app/spaces"
import { fixtureFolder, fixtureImportScope, loadFixtureProject } from "spell/app/spaces/test"

// Spell UI's pack:  a spellx drawing names its components bare (`<button>`)
import "spell/app/spaces"

/**
 * Every page of the Spell UI site (`@spell/guides/SpellUI`, epic `notebook` P10) compiles cleanly, and means the same
 * in code spell:  written as code spell in memory (`SX.CodeSpellWriter`), it compiles to the same javascript.
 * - A notebook is only ever a `.spellml` file (Owen, 2026-10-25:  "one file.  notebooks are only `.spellml`"):
 *   its code spell is made here, never written beside it.
 * - Its bare names are written as the tags its own compile chose, as the editor's "Show as Code Spell" writes them:
 *   `<counter/>` is `<counter-counter/>`.
 * - The whole project in ONE compile, in its project file's order, as the editor compiles it;  each file its own test.
 *   - Slow:  about 11 s to parse all 351 pages, until a page alone in its file compiles alone.
 * - Compared without comments and the `DECLARES` header, which carry line numbers.
 * - The site's own checks, below:  every page listed, every address unique, no tab bar left, every link somewhere real.
 */
const SITE = SPACES.SPELL_UI_SITE_PROJECT
const FOLDER = fixtureFolder(SITE)
const SITE_FILE = "/SpellUI.spellml"
/** How long the whole-project compile below may take. */
const COMPILE_MS = 300_000

const FILES = loadFixtureProject(SITE)

/** Each file parsed, and its code spell twin parsed, with the whole project. */
type Compiled = { parsed: ParsedFile[]; twins: ParsedFile[] }
type ParsedFile = ReturnType<typeof parseSpellProject>["files"][number]

describe("every page of the Spell UI site means the same in code spell", () => {
  let compiled: Compiled

  beforeAll(() => {
    const parentScope = fixtureImportScope(SITE)
    const parsed = parseSpellProject(FILES, { parentScope, projectPath: SITE }).files
    // each element's tag, as the parse chose it, by where it starts in its file
    const written = FILES.map(({ path, contents }, index) => {
      const tags = new Map<number, string>()
      const visit = (match: P.Match) => {
        const [element] = match.matched
        const data = match.data as { tagName?: string; children?: unknown[] }
        if (element instanceof P.JSXElementToken && data.tagName) tags.set(element.start, data.tagName)
        for (const inner of [...match.matched, ...(data.children ?? [])]) if (inner instanceof P.Match) visit(inner)
      }
      visit(parsed[index]!.match!)
      const code = SX.CodeSpellWriter.write(contents, {
        path,
        componentTag: (word, start) => tags.get(start) ?? SP.ComponentPacks.tagFor(word, "en")
      })
      return { path: path.replace(/\.spellml$/, ".spell"), contents: code }
    })
    compiled = { parsed, twins: parseSpellProject(written, { parentScope, projectPath: SITE }).files }
  }, COMPILE_MS)

  test.each(FILES.map(({ path }, index) => [path, index] as const))("%s", (path, index) => {
    const parsed = compiled.parsed[index]!
    expect({ path, errors: parsed.errors }).toEqual({ path, errors: [] })
    const twin = compiled.twins[index]!
    expect({ path: twin.path, errors: twin.errors }).toEqual({ path: twin.path, errors: [] })
    expect(codeOf(twin.compiled)).toBe(codeOf(parsed.compiled))
  })
})

// epic `elemental-spell` J159:  the page's `<!-- GAP ... -->` notes were warning messages, drawn on the page
test("the Button's GAP notes are comments:  never drawn", () => {
  const contents = readFileSync(resolve(FOLDER, "Button", "Examples.spellml"), "utf8")
  expect(contents).toContain("<!-- GAP I23:")
  const files = [{ path: "/Button/Examples.spellml", contents }]
  const [file] = parseSpellProject(files, { parentScope: fixtureImportScope(SITE) }).files
  expect(codeOf(file!.compiled)).not.toContain("GAP")
})

/** `compiled` without its comments and `DECLARES` headers. */
function codeOf(compiled: string): string {
  return compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
}

////////////////
// ## The site itself
////////////////

/** Each page of the project:  its file, its page's name and its contents. */
const PAGES = FILES.filter(({ path }) => path !== SITE_FILE).map(({ path, contents }) => ({
  path,
  contents,
  name: /^<spell-page "([^"]+)" notebook>/.exec(contents)?.[1]
}))

/** Each line of the site file naming a page:  its name and address. */
const SITE_TEXT = readFileSync(resolve(FOLDER, SITE_FILE.slice(1)), "utf8")
const SITE_PAGES = [...SITE_TEXT.matchAll(/<page "([^"]+) page"\s+address="([^"]+)"/g)].map(([, name, address]) => ({
  name: name!,
  address: address!
}))

describe("the Spell UI site", () => {
  test("every file is one page alone:  nothing before its tag, or after its end tag", () => {
    for (const { path, contents, name } of PAGES) {
      expect({ path, name: !!name }).toEqual({ path, name: true })
      expect({ path, ends: contents.trimEnd().endsWith("</spell-page>") }).toEqual({ path, ends: true })
    }
  })

  test("every page is in the site, once, and every site line is a page", () => {
    expect(new Set(SITE_PAGES.map(({ name }) => name))).toEqual(new Set(PAGES.map(({ name }) => name)))
    expect(SITE_PAGES.length).toBe(PAGES.length)
  })

  test("every address is unique", () => {
    const addresses = SITE_PAGES.map(({ address }) => address)
    expect(new Set(addresses).size).toBe(addresses.length)
  })

  test("no tab bar is left:  no file, no line drawing one, no project-named tag", () => {
    for (const { path, contents } of PAGES)
      expect({ path, tab: /tab-bar/.test(contents) }).toEqual({ path, tab: false })
    const folders = readdirSync(FOLDER, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory() && entry.name !== "snapshots"
    )
    expect(folders.length).toBe(100)
    for (const { name } of folders) expect(existsSync(resolve(FOLDER, name, "TabBar.spellml"))).toBe(false)
  })

  test("every link is a site address, a docs page or a `#`", () => {
    const addresses = new Set(SITE_PAGES.map(({ address }) => address))
    const bad: string[] = []
    for (const { path, contents } of PAGES) {
      for (const link of linksIn(contents)) {
        if (link.startsWith("#") || /^(https?|mailto):/.test(link) || link.startsWith("/components/ui/")) continue
        if (addresses.has(link.split("#")[0]!)) continue
        bad.push(`${path}: ${link}`)
      }
    }
    expect(bad).toEqual([])
  })
})

/** The links of `text`, a page:  its `link=`, `href=` and markdown links, outside its code listings and inline code. */
function linksIn(text: string): string[] {
  const links: string[] = []
  let isListing = false
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      isListing = !isListing
      continue
    }
    if (isListing) continue
    const prose = line.replace(/`[^`]*`/g, "")
    links.push(
      ...[...prose.matchAll(/\b(?:link|href)="([^"{]*)"/g), ...prose.matchAll(/\]\(([^)\s]*)\)/g)].map(
        ([, link]) => link!
      )
    )
  }
  return links
}
