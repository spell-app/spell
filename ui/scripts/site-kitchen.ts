/**
 * `yarn site:kitchen [--check]`:  write the kitchen sink's examples, from every component family's MAIN example file;
 * and each component page's Theming playground, from its family's main example (`PlaygroundWriter`).
 * - The page:  `docs/kitchen-sink.html`, one of the site's pages (`SITE_PAGES`).
 * - A family's main file:  `src/components/ui-<family>/examples/elements/types.html`, else its first `.html`.
 *   - `MAIN_FILES` names it where `types.html` isn't the main one (`ui-parts`:  `header.html`).
 * - Why generated:  the old Astro page read the same files at build time;  a static page would drift from them.
 *   - The markup is the files' own (the families' tests render them),
 *     so it keeps their native bits (`<p>`, a `style=` box around a loader, `<div class="ui-stack">` around radios).
 * - Grouped as Fomantic's kitchen sink is:
 *   - Elements, Collections, Views, Modules (each family's Fomantic topic), then our own families
 *   - A-Z by title inside a group
 *   - Families without an element example are left out (`item`:  `items` shows it).
 * - Example sources (`<ui-include source>` ...) point at the site's copies in `docs/examples/` (`SITE_SOURCES`).
 * - Sections left out:
 *   - those holding `stub-*` stand-ins (the tests' `StubOwner`, not real elements)
 *   - all past `MAX_SECTIONS` (3) per family, so the page stays scannable (the family's page has the rest)
 * - Each file's `<section><h4>Title</h4>...</section>` becomes a `<ui-docs-example>`:
 *   - the family's first one headed with its title and summary,
 *     plus a link to its page, and to its sub-tags' own pages
 *   - the rest a header-less continuation, described by their `<h4>`
 *   - A section's own class (`ui-dark ui-p-m`) becomes a `<div>` around its body.
 *   - A file without sections is one example.
 * - Writes ONLY between the page's `<!-- kitchen:start -->` and `<!-- kitchen:end -->` markers:
 *   the rest of the page is hand-kept.
 *   - Written flat (a header per group, the family's first example headed),
 *     then nested into `<ui-section>`s by `yarn site:sections`' converter (`SiteSections`), as every page is.
 *   - Lines keep the example files' own layout, re-indented, so oxfmt may re-wrap a long one:  rerun.
 * - The playgrounds (epic `debut` J65):  an empty `<ui-docs-tokens family playground>` showed nothing, so editing a
 *   token changed nothing visible.
 *   - Each gets its family's MAIN EXAMPLE:  the first section the kitchen sink shows for it (`mainExample()`).
 *   - Between `<!-- playground:start ... -->` / `<!-- playground:end -->` inside the element;
 *     a playground with children of its own and no markers is hand-kept, and left alone.
 * - Rerun after changing an example (`yarn site:build` runs it).
 * - `--check`:  write nothing;  exit 1 if the kitchen sink or a playground is stale.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"

import { readJSON5File } from "spell/util/node/json5"
import { escapeHTML } from "spell/util/string"

import type { SiteDataFile, SiteFamily, SiteTag } from "spell-ui/docs-components/docs-components.types"
import { Terminal } from "spell/element-tools/Terminal"
import { SITE_DATA, SITE_PAGES } from "spell-ui/tools/tools.types"

import { spliceGenerated, withoutTicks, writeOrCheck, type GeneratedOutput } from "spell-ui/tools/generatedFiles"
import { SiteSections } from "./site-sections.ts"

/** `packages/ui/`. */
const UI = path.resolve(import.meta.dirname, "..")

/****************
 * ### `KitchenSinkWriter`
 * Renders the kitchen sink's generated block from the example files, and splices it between the page's markers.
 * - Its `private static` helpers are STATIC because they're pure:  data in, text out.
 ****************/
class KitchenSinkWriter {
  /** The page. */
  readonly file = path.join(UI, SITE_PAGES, "kitchen-sink.html")

  /** The site's data:  titles, summaries, topics. */
  readonly data: SiteDataFile = readJSON5File<SiteDataFile>(path.join(UI, SITE_DATA, "components.json5"))

  /** `page` with its generated block replaced by a fresh one. */
  render(page: string): string {
    return spliceGenerated(page, { file: this.file, start: START, end: END, block: (indent) => this.block(indent) })
  }

  /** The generated lines:  per group a header, then each family's examples, at `indent`. */
  private block(indent: string): string {
    const tags = new Map(this.data.components.map((tag) => [tag.tag, tag]))
    const families = Object.values(this.data.families).filter((family) => !family.docs && this.exampleFile(family))
    const lines: string[] = []
    for (const group of GROUPS) {
      const members = families
        .filter((family) => KitchenSinkWriter.groupOf(tags.get(family.mainTag)) === group.topic)
        .sort((a, b) => a.title.localeCompare(b.title))
      if (!members.length) continue
      lines.push("", `${indent}<ui-header level="2" dividing id="${group.id}">${group.title}</ui-header>`)
      for (const family of members) lines.push("", ...this.family(family, indent))
    }
    return lines.slice(1).join("\n") + "\n"
  }

  /** One family's examples, at `indent`. */
  private family(family: SiteFamily, indent: string): string[] {
    const sections = this.mainSections(family).slice(0, MAX_SECTIONS)
    const lines: string[] = []
    sections.forEach((section, index) => {
      if (index === 0) {
        const page = `${family.mainTag}.html`
        lines.push(
          `${indent}<ui-docs-example header="${escapeHTML(family.title)}">`,
          `${indent}  <p slot="description">`,
          `${indent}    ${escapeHTML(withoutTicks(family.summary))}`,
          `${indent}    <a href="${page}">${escapeHTML(family.title)} page</a>`,
          ...KitchenSinkWriter.ownPages(family).map((line) => `${indent}    ${line}`),
          `${indent}  </p>`
        )
      } else {
        lines.push(`${indent}<ui-docs-example description="${escapeHTML(section.title)}">`)
      }
      lines.push(
        ...KitchenSinkWriter.indented(KitchenSinkWriter.markup(section), `${indent}  `),
        `${indent}</ui-docs-example>`
      )
    })
    return lines
  }

  /**
   * `family`'s MAIN EXAMPLE, the one its kitchen sink entry opens with:
   * its main file's first section (`exampleFile()`, `sections()`), as page markup (`markup()`).
   * - `undefined` for a family without one:  no element example, or only `stub-*` stand-ins.
   * - Also what its page's empty Theming playground shows (`PlaygroundWriter`).
   */
  mainExample(family: SiteFamily): string[] | undefined {
    const [first] = this.mainSections(family)
    return first && KitchenSinkWriter.markup(first)
  }

  /**
   * `family`'s example sections, in its main file's order, without those holding `stub-*` stand-ins
   * (the tests' `StubOwner`, not real elements);  none without a main file.
   */
  private mainSections(family: SiteFamily): Section[] {
    const file = this.exampleFile(family)
    if (!file) return []
    return KitchenSinkWriter.sections(readFileSync(file, "utf8")).filter(
      (section) => !section.body.some((line) => line.includes("<stub-"))
    )
  }

  /**
   * `section`'s body as the site's pages write it, at column 0:
   * its own class (`ui-dark ui-p-m`) a `<div>` around it, its example sources the site's copies (`siteSources()`).
   */
  private static markup(section: Section): string[] {
    const body = section.className
      ? [`<div class="${section.className}">`, ...section.body.map((line) => `  ${line}`), "</div>"]
      : section.body
    return body.map((line) => KitchenSinkWriter.siteSources(line))
  }

  /** `lines` at `indent`, blank lines left empty. */
  static indented(lines: string[], indent: string): string[] {
    return lines.map((line) => (line ? `${indent}${line}` : ""))
  }

  /**
   * Links to `family`'s sub-tags with a page of their own (`SiteFamily.pages`),
   * one line each after the family page's link;  none for a family without them.
   * - The examples stay the family's:  e.g. `ui-checkbox`'s main file shows radios too.
   */
  private static ownPages(family: SiteFamily): string[] {
    return Object.entries(family.pages ?? {}).map(
      ([tag, page]) => `&middot; <a href="${tag}.html">${escapeHTML(page.title)} page</a>`
    )
  }

  /** `family`'s main example file:  `types.html`, else its first `.html`;  `undefined` without one. */
  private exampleFile(family: SiteFamily): string | undefined {
    const folder = path.join(UI, "src/components", family.folder, "examples/elements")
    if (!existsSync(folder)) return undefined
    const files = readdirSync(folder)
      .filter((name) => name.endsWith(".html"))
      .sort()
    const main = MAIN_FILES[family.folder]
    const name = main && files.includes(main) ? main : files.includes("types.html") ? "types.html" : files[0]
    return name ? path.join(folder, name) : undefined
  }

  /**
   * An example file's sections:  each `<section>` at the wrapper's top level, its `<h4>` title and its body (dedented).
   * - A file without sections is one untitled section, the whole file minus its comments.
   */
  private static sections(html: string): Section[] {
    const lines = html.replace(/<!--[\s\S]*?-->\n?/g, "").split("\n")
    const sections: Section[] = []
    let current: Section | undefined
    for (const line of lines) {
      const open = /^ {2}<section(?: class="([^"]*)")?>$/.exec(line)
      if (open) {
        current = { title: "", className: open[1], body: [] }
        continue
      }
      if (!current) continue
      if (line === "  </section>") {
        sections.push({ ...current, body: KitchenSinkWriter.trim(current.body) })
        current = undefined
        continue
      }
      const title = /^ {4}<h4>(.*)<\/h4>$/.exec(line)
      if (title && !current.title) current.title = title[1]!
      else current.body.push(line.slice(4))
    }
    if (sections.length) return sections
    return [{ title: "", body: KitchenSinkWriter.trim(lines) }]
  }

  /** `line` with its dev-server example sources pointed at the site's copies (`examples/<file>`). */
  private static siteSources(line: string): string {
    return line.replace(
      /source="\/src\/components\/[^/"]+\/examples\/sources\/([^"]+)"/g,
      (_match, file: string) => `source="examples/${SITE_SOURCES[file] ?? file}"`
    )
  }

  /** `lines` without leading and trailing blank lines. */
  private static trim(lines: string[]): string[] {
    const first = lines.findIndex((line) => line.trim())
    const last = lines.findLastIndex((line) => line.trim())
    return first < 0 ? [] : lines.slice(first, last + 1).map((line) => line.trimEnd())
  }

  /** Which group `tag` files under:  its Fomantic topic, else ours (`undefined`). */
  private static groupOf(tag: SiteTag | undefined): string | undefined {
    return GROUPS.find((group) => group.topic && tag?.topics.includes(group.topic))?.topic
  }
}

/****************
 * ### `PlaygroundWriter`
 * Fills each component page's Theming playground with its family's MAIN EXAMPLE (`KitchenSinkWriter.mainExample()`),
 * so a token changed in its table shows at once on a real example.
 * - Which:  every `<ui-docs-tokens family playground>` that's EMPTY, or that it filled before (between its markers).
 *   A playground with children of its own and no markers (`ui-panel`'s) is hand-kept:  left alone.
 * - Writes the example between `<!-- playground:start ... -->` and `<!-- playground:end -->` inside the element;
 *   idempotent, so a second run changes nothing.
 * - Its ids get a suffix (`ownIds()`):  the page's Examples tab shows the same example, ids and all,
 *   and a playground button's `commandfor` must open the playground's modal, not the one in Examples.
 * - A family with no main example keeps an empty playground, and is reported.
 ****************/
class PlaygroundWriter {
  constructor(private readonly kitchen: KitchenSinkWriter) {}

  /** The families whose page's playground stays empty:  no main example. */
  readonly missing: string[] = []

  /** `page` with every generated (or empty) playground filled afresh. */
  render(page: string): string {
    return page.replace(PLAYGROUND, (whole, indent: string, open: string, folder: string) => {
      const family = this.kitchen.data.families[folder]
      const example = family && this.kitchen.mainExample(family)
      if (!example) {
        this.missing.push(folder)
        return whole
      }
      return [
        `${indent}${open}`,
        `${indent}  ${PLAYGROUND_START}`,
        ...KitchenSinkWriter.indented(PlaygroundWriter.ownIds(example), `${indent}  `),
        `${indent}  ${PLAYGROUND_END}`,
        `${indent}</ui-docs-tokens>`
      ].join("\n")
    })
  }

  /**
   * `lines` with each id they define suffixed (`-playground`), and every attribute naming one of them
   * (`for`, `commandfor`, `aria-labelledby` ...;  `ID_REFERENCES`) following it.
   */
  static ownIds(lines: string[]): string[] {
    const ids = new Set(lines.flatMap((line) => [...line.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]!)))
    if (!ids.size) return lines
    const own = (id: string) => (ids.has(id) ? `${id}${PLAYGROUND_ID_SUFFIX}` : id)
    return lines.map((line) =>
      line.replace(
        ID_REFERENCES,
        (_whole, name: string, value: string) => ` ${name}="${value.split(" ").map(own).join(" ")}"`
      )
    )
  }
}

/** One example section of a file. */
type Section = {
  /** its `<h4>` text, `""` for a file without sections */
  title: string
  /** the `<section>`'s own class, e.g. `ui-dark ui-p-m` */
  className?: string
  /** its markup, dedented to column 0 */
  body: string[]
}

////////////////
// ## Constants
////////////////

/** Start marker (its own line);  its indent is the block's. */
const START = "<!-- kitchen:start -->"

/** End marker (its own line). */
const END = "<!-- kitchen:end -->"

/** The groups, in order:  Fomantic's four, then ours (`topic` absent). */
const GROUPS: readonly { id: string; title: string; topic?: string }[] = [
  { id: "elements", title: "Elements", topic: "elements" },
  { id: "collections", title: "Collections", topic: "collections" },
  { id: "views", title: "Views", topic: "views" },
  { id: "modules", title: "Modules", topic: "modules" },
  { id: "spell-ui", title: "Spell UI's own" }
]

/** A playground's start marker:  what's between it and `PLAYGROUND_END` is generated. */
const PLAYGROUND_START = "<!-- playground:start  (yarn site:kitchen:  the family's main example) -->"

/** Added to each id a playground's example defines:  apart from the same example's ids in the Examples tab. */
const PLAYGROUND_ID_SUFFIX = "-playground"

/** An attribute holding an id, or a list of them:  its name and its value. */
const ID_REFERENCES =
  / (id|for|commandfor|popovertarget|aria-labelledby|aria-describedby|aria-controls|aria-owns|list|form)="([^"]*)"/g

/** A playground's end marker. */
const PLAYGROUND_END = "<!-- playground:end -->"

/**
 * A family's playground that `PlaygroundWriter` writes:  empty, or holding its markers.
 * - Groups:  its line's indent, its opening tag, its family's folder.
 */
const PLAYGROUND =
  /^( *)(<ui-docs-tokens [^>]*\bfamily="([^"]+)"[^>]*\bplayground\b[^>]*>)(?:<\/ui-docs-tokens>|\n *<!-- playground:start[^>]*-->\n[\s\S]*?\n *<!-- playground:end -->\n *<\/ui-docs-tokens>)/gm

/** Sections shown per family:  enough to judge a theme, short enough to scroll through every family. */
const MAX_SECTIONS = 3

/** A family's main example file where it isn't `types.html` (or the first file):  folder => file name. */
const MAIN_FILES: Readonly<Record<string, string>> = { "ui-parts": "header.html" }

/**
 * The site's copies of the example source files (`docs/examples/`), by the source's file name, where the name differs.
 * - A `source="/src/components/.../examples/sources/<file>"` (a dev-server path) points at the copy.
 */
const SITE_SOURCES: Readonly<Record<string, string>> = { "notes.html": "release-notes.html" }

const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } })
const writer = new KitchenSinkWriter()
// the block is written flat (headers, headed examples), then nested into sections as every page is
const kitchenPage = SiteSections.convert(writer.render(readFileSync(writer.file, "utf8")))
// every other page's Theming playground:  its family's main example
const playgrounds = new PlaygroundWriter(writer)
const pagesFolder = path.join(UI, SITE_PAGES)
const pages = readdirSync(pagesFolder)
  .filter((name) => name.endsWith(".html") && path.join(pagesFolder, name) !== writer.file)
  .sort()
  .map((name): GeneratedOutput => {
    const file = path.join(pagesFolder, name)
    return [file, playgrounds.render(readFileSync(file, "utf8"))]
  })
const stale = writeOrCheck([[writer.file, kitchenPage], ...pages], { command: "site:kitchen", isCheck: values.check })
for (const folder of new Set(playgrounds.missing))
  Terminal.err(`playground:  ${folder} has no main example;  left empty`)
if (!values.check) Terminal.out(stale.length ? `wrote ${stale.join(", ")}` : "kitchen sink and playgrounds:  unchanged")
