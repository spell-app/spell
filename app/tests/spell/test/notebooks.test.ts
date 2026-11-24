import { existsSync, readdirSync, readFileSync } from "fs"
import { resolve } from "path"
import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"
import { SPACES } from "spell/app/spaces"
import { fixtureFolder, fixtureImportScope, loadFixtureProject } from "spell/app/spaces/test"

// Spell UI's pack:  a drawing names its components bare (`<button>`)
import "spell/app/spaces"

/**
 * Every page of each guide site compiles cleanly:  the Spell UI site (`@spell/guides/SpellUI`, epic `notebook` P10),
 * Epic UI's and App UI's (`@spell/guides/EpicUI`, `AppUI`, epic `editor` P44).
 * - Each whole project in ONE compile, in its project file's order, as the editor compiles it;  each file its own test.
 * - Each site's own checks, below:  every page listed, every address unique, no tab bar left, every link somewhere real.
 */
const SITES = [
  { project: SPACES.SPELL_UI_SITE_PROJECT, siteFile: "/SpellUI.spell", address: "/components/ui" },
  { project: "@spell/guides/EpicUI", siteFile: "/EpicUI.spell", address: "/components/epics" },
  { project: "@spell/guides/AppUI", siteFile: "/AppUI.spell", address: "/components/app" }
].map((site) => ({ ...site, folder: fixtureFolder(site.project), files: loadFixtureProject(site.project) }))

const SITE = SPACES.SPELL_UI_SITE_PROJECT
const FOLDER = fixtureFolder(SITE)

/** Its page layout's file:  the frame round every page (epic `mockup` T39). */
const LAYOUT_FILE = "/main.page-layout.spell"
/** How long the whole-project compile below may take. */
const COMPILE_MS = 300_000

type ParsedFile = ReturnType<typeof parseSpellProject>["files"][number]

describe.each(SITES)("every page of $project compiles cleanly", ({ project, files }) => {
  let parsed: ParsedFile[]

  beforeAll(() => {
    parsed = parseSpellProject(files, { parentScope: fixtureImportScope(project), projectPath: project }).files
  }, COMPILE_MS)

  test.each(files.map(({ path }, index) => [path, index] as const))("%s", (path, index) => {
    expect({ path, errors: parsed[index]!.errors }).toEqual({ path, errors: [] })
  })
})

// epic `elemental-spell` J159:  the page's `<!-- GAP ... -->` notes were warning messages, drawn on the page
test("the Button's GAP notes are comments:  never drawn", () => {
  const contents = readFileSync(resolve(FOLDER, "Button", "Examples.spell"), "utf8")
  expect(contents).toContain("<!-- GAP I23:")
  const files = [{ path: "/Button/Examples.spell", contents }]
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

/** Each page of a site's project:  its file, its page's name and its contents;  not the site's file, nor its layout's. */
function pagesOf({ files, siteFile }: (typeof SITES)[number]) {
  return files
    .filter(({ path }) => path !== siteFile && path !== LAYOUT_FILE)
    .map(({ path, contents }) => ({
      path,
      contents,
      // its plain head (epic `language` P45):  `"button usage" is a notebook page`, its own views above it (P47)
      name: /^"([^"]+)" is a notebook page\n/m.exec(contents)?.[1]
    }))
}

/** Each line of a site file naming a page:  its name and address, `- it has a button usage page at "/button"`. */
function sitePagesOf({ folder, siteFile }: (typeof SITES)[number]) {
  const text = readFileSync(resolve(folder, siteFile.slice(1)), "utf8")
  return [...text.matchAll(/^\t+(?:- )?it has an? (.+?) page at "([^"]+)"/gm)].map(([, name, address]) => ({
    name: name!,
    address: address!
  }))
}

describe.each(SITES)("the site $project", (site) => {
  const PAGES = pagesOf(site)
  const SITE_PAGES = sitePagesOf(site)

  test("every file is one page:  nothing after its body;  before its head, only its own views (epic `language` P47)", () => {
    for (const { path, contents, name } of PAGES) {
      expect({ path, name: !!name }).toEqual({ path, name: true })
      const lines = contents.split("\n")
      const head = lines.findIndex((line) => /^"[^"]+" is a notebook page$/.test(line))
      const outside = lines.slice(head + 1).filter((line) => line && !/^[ \t]/.test(line))
      expect({ path, outside }).toEqual({ path, outside: [] })
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

  // epic `mockup` T55 (Owen:  "Ditch the secondary tabs (Types|Content|States) -- they are in the sidebar anyway")
  test("no row of section tabs is left:  a page's sections are in its contents, the layout's right side bar", () => {
    for (const { path, contents } of PAGES)
      expect({ path, sectionTabs: /ui-docs-section-tabs/.test(contents) }).toEqual({ path, sectionTabs: false })
  })

  test("every link is a site address, a file the page server serves or a `#`, never one of the old HTML pages", () => {
    const addresses = new Set(SITE_PAGES.map(({ address }) => address))
    const bad: string[] = []
    for (const { path, contents } of PAGES) {
      for (const link of linksIn(contents)) {
        if (link.startsWith("#") || /^(https?|mailto):/.test(link)) continue
        if (OLD_DOCS_PAGE.test(link)) bad.push(`${path}: ${link}`)
        // the other sites link the code and the epic pages, and show links in their examples' prose
        else if (link.startsWith(`${site.address}/`) || site.project !== SITE) continue
        else if (!addresses.has(link.split("#")[0]!)) bad.push(`${path}: ${link}`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe("the Spell UI site", () => {
  test("no tab bar is left:  no file, no line drawing one, no project-named tag", () => {
    for (const { path, contents } of pagesOf(SITES[0]!))
      expect({ path, tab: /tab-bar/.test(contents) }).toEqual({ path, tab: false })
    const folders = readdirSync(FOLDER, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory() && entry.name !== "snapshots"
    )
    expect(folders.length).toBe(112)
    for (const { name } of folders) expect(existsSync(resolve(FOLDER, name, "TabBar.spell"))).toBe(false)
  })
})

/** A page of the old HTML components pages:  straight under its set's address (`/components/ui/ui-button.html`). */
const OLD_DOCS_PAGE = /^\/components\/(ui|epics|app)\/[\w-]+\.html/

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
