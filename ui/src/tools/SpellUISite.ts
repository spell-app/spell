import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { SpellMarkup } from "./SpellMarkup.ts"
import { SPELL_UI_SITE_FOLDER } from "./tools.types.ts"

/****************
 * ### `SpellUISite`
 * The Spell UI site's files, as Spell UI's tools write them:  `@spell/guides/SpellUI`, a folder of notebooks per
 * component (`Tree/Usage.spell` ...), its site file listing every page (`SpellUI.spell`), its project file.
 * - `writeComponent()`:  a component's four pages, from its components page (`docs/ui-tree.html`, or the template
 *   `yarn site:new` fills in), and their lines in the site file, A to Z by title, and in the project file.
 *   So a new component lands in the site by itself (`yarn site:new`;  Owen, 2026-11-21, epic `editor` P42).
 * - `addressFor()`:  a components page's address in the site (`ui-button` => `/button`), for links.
 * - Its own small reading and writing of the site file's lines, not the editor's (`SiteEdits`, the app's):
 *   Spell UI never imports the app, which sits above it.
 *   The site's lines are one shape each, a component's usage page then its other pages under it, A to Z.
 * - Node only;  files in and out, no editor needed.
 ****************/
export class SpellUISite {
  constructor(
    /** The site's project folder. */
    readonly folder: string = SPELL_UI_SITE_FOLDER
  ) {}

  /** The site file. */
  get siteFile(): string {
    return path.join(this.folder, SITE_FILE)
  }

  /** The site file's text. */
  get siteText(): string {
    return readFileSync(this.siteFile, "utf8")
  }

  /** Every page's address in the site, by the title its side navigation shows (`named "Button"`). */
  addressesByTitle(): Map<string, string> {
    const addresses = new Map<string, string>()
    for (const [, address, title] of this.siteText.matchAll(PAGE_LINE)) addresses.set(title!, address!)
    return addresses
  }

  /**
   * The address in the site of the components page `file` (`ui-button`), whose `title` is its family's or its
   * sub-tag's (`Button`):  the page of that title, else `/<its name>`;  `undefined` when the site has neither.
   */
  addressFor(file: string, title: string | undefined, addresses = this.addressesByTitle()): string | undefined {
    const bare = `/${file.replace(/^ui-/, "")}`
    return (title && addresses.get(title)) ?? ([...addresses.values()].includes(bare) ? bare : undefined)
  }

  /** The folder of a component titled `title` (`App menu` => `AppMenu`):  its pages' folder in the project. */
  static folderFor(title: string): string {
    return title
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .map((word) => word[0]!.toUpperCase() + word.slice(1))
      .join("")
  }

  /** A component's name in its pages' heads and the site's lines (`App menu` => `app-menu`), and its address. */
  static nameFor(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
  }

  /** Does the site have component `title`'s folder? */
  hasComponent(title: string): boolean {
    return existsSync(path.join(this.folder, SpellUISite.folderFor(title)))
  }

  /**
   * Write component `facts.title`'s pages from its components page, `html`:  a page per tab it has
   * (`Usage.spell`, `Examples.spell`, `API.spell`, `Theming.spell`), and their lines in the site and project files.
   * - Each page:  its head (`"tree usage" is a notebook page`), the title and summary, then the tab as Spell
   *   (`SpellMarkup`).
   * - Its lines go before the first component whose title comes after it, A to Z;  never twice.
   * - Returns the files written, and what `SpellMarkup` couldn't write as the page has it.
   * - SIDE EFFECT:  writes the folder's files, the site file and the project file
   */
  writeComponent(html: string, facts: ComponentFacts): { files: string[]; warnings: string[] } {
    const name = SpellUISite.nameFor(facts.title)
    const folder = path.join(this.folder, SpellUISite.folderFor(facts.title))
    const document = SpellMarkup.parse(html)
    const addresses = this.addressesByTitle()
    const address = `/${name}`
    const spell = new SpellMarkup({
      document,
      page: facts.page,
      pageAddress: (file) => (file === facts.tag ? address : facts.pageAddress?.(file)),
      addressOf: (tab) => (tab === "usage" ? address : `${address}/${tab}`)
    })
    const summary =
      document.querySelector(".site-title > ui-header")?.textContent?.replace(/\s+/g, " ").trim() || facts.summary
    const tabs = TABS.filter(({ value }) => document.querySelector(`ui-tab[value="${value}"]`))
    mkdirSync(folder, { recursive: true })
    const files: string[] = []
    for (const { value, file } of tabs) {
      const pane = document.querySelector(`ui-tab[value="${value}"]`)!
      const text = [
        `"${name} ${value}" is a notebook page`,
        `\t<header level="1">`,
        `\t\t${facts.title}`,
        `\t\t<header>${summary}</>`,
        `\t</>`,
        "",
        spell.body(pane, 1, { tab: value }).replace(/^\n+/, "")
      ].join("\n")
      const target = path.join(folder, `${file}.spell`)
      writeFileSync(target, text)
      files.push(target)
    }
    if (!addresses.has(facts.title)) {
      writeFileSync(this.siteFile, this.withLines(this.siteText, name, facts, tabs))
      files.push(this.siteFile)
      const projectFile = path.join(this.folder, PROJECT_FILE)
      const imports = tabs.map(({ file }) => `/${SpellUISite.folderFor(facts.title)}/${file}.spell`)
      writeFileSync(projectFile, SpellUISite.withImports(readFileSync(projectFile, "utf8"), imports))
      files.push(projectFile)
    }
    return { files, warnings: spell.warnings }
  }

  /** `text`, the site file, with component `name`'s lines added A to Z by title, among the other components'. */
  private withLines(text: string, name: string, facts: ComponentFacts, tabs: readonly Tab[]): string {
    const article = /^[aeiou]/i.test(name) ? "an" : "a"
    const usage = [
      `\tit has ${article} ${name} usage page at "/${name}", named "${facts.title}", tab "Usage"`,
      facts.topics.length ? `, tagged "${facts.topics.join(", ")}"` : "",
      `, thumbnail "snapshots/${name}.jpg"`,
      facts.fomantic ? `, live "${facts.fomantic}"` : ""
    ].join("")
    const others = tabs
      .filter(({ value }) => value !== "usage")
      .map(
        ({ value, label }) =>
          `\t\tit has ${article} ${name} ${value} page at "/${name}/${value}", named "${label}", ` +
          `thumbnail "snapshots/${name}-${value}.jpg"`
      )
    const lines = text.split("\n")
    const next = lines.findIndex((line) => {
      const match = COMPONENT_LINE.exec(line)
      return match && match[1]!.localeCompare(facts.title, "en", { sensitivity: "base" }) > 0
    })
    // past the last component:  after its pages, before what closes the site
    const at = next >= 0 ? next : SpellUISite.afterLastComponent(lines)
    lines.splice(at, 0, usage, ...others)
    return lines.join("\n")
  }

  /** The line after the last component's pages. */
  private static afterLastComponent(lines: readonly string[]): number {
    let at = lines.length
    for (let index = lines.length - 1; index >= 0; index--) {
      if (/^\t+it has /.test(lines[index]!)) {
        at = index + 1
        break
      }
    }
    return at
  }

  /**
   * `text`, the project file, with `paths` imported, each `active`:  before the first component file after them,
   * A to Z, and always before the site file, which stays last.
   */
  private static withImports(text: string, paths: readonly string[]): string {
    const project = JSON.parse(text) as { imports: { path: string; active: boolean }[] }
    const added = paths.filter((each) => !project.imports.some((entry) => entry.path === each))
    if (!added.length) return text
    const folderOf = (each: string) => each.split("/")[1]!
    const folder = folderOf(added[0]!)
    let at = project.imports.findIndex(
      (entry) => entry.path.split("/").length > 2 && folderOf(entry.path).localeCompare(folder, "en") > 0
    )
    if (at < 0) at = project.imports.findIndex((entry) => entry.path === `/${SITE_FILE}`)
    if (at < 0) at = project.imports.length
    project.imports.splice(at, 0, ...added.map((each) => ({ path: each, active: true })))
    return JSON.stringify(project, null, 2) + "\n"
  }
}

/** What `SpellUISite.writeComponent()` needs to know of a component. */
export type ComponentFacts = {
  /** its main tag, `ui-tree` */
  tag: string
  /** its title, `Tree`:  its folder, its name and its address follow from it */
  title: string
  /** one line saying what it is, when its page has none */
  summary: string
  /** its topics' titles, in the site's order (`Navigation, Lists`) */
  topics: string[]
  /** Fomantic's page of it, the usage page's `live` link;  empty for none */
  fomantic: string
  /** its components page's served address, for its relative URLs (`/components/ui/ui-tree.html`) */
  page: string
  /** another components page's address in the site, by its file name (`ui-card` => `/card`) */
  pageAddress?: (file: string) => string | undefined
}

/** One of a component's tabs:  its value on the components page, its page's file and its title in the site. */
type Tab = { value: string; file: string; label: string }

/** A component's tabs, in the site's order. */
const TABS: readonly Tab[] = [
  { value: "usage", file: "Usage", label: "Usage" },
  { value: "examples", file: "Examples", label: "Examples" },
  { value: "api", file: "API", label: "API" },
  { value: "theming", file: "Theming", label: "Theming" }
]

/** The site file, in the project's folder. */
const SITE_FILE = "SpellUI.spell"

/** The project file. */
const PROJECT_FILE = "__project.json5"

/** A page's line in the site file:  its address and its title. */
const PAGE_LINE = /^\s*it has an? [^\n]*? page at "([^"]+)", named "([^"]+)"/gm

/** A component's usage page's line:  its title. */
const COMPONENT_LINE = /^\tit has an? [^\n]*? usage page at "[^"]+", named "([^"]+)", tab "Usage"/
