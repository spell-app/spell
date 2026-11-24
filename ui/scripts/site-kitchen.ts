/**
 * `yarn site:kitchen [--check]`:  write the Spell UI site's Kitchen Sink page,
 * every component family's MAIN example on one page.
 * - The page:  `KitchenSink.spell` in the Spell UI site (`app/spaces/@spell/guides/SpellUI/`, `SPELL_UI_SITE_FOLDER`).
 * - A family's main file:  `src/components/ui-<family>/examples/elements/types.html`, else its first `.html`
 *   (`FamilyExamples.files()`, which the design export reads them by too;  `ui-parts`' is `header.html`).
 * - Why generated:  a hand-kept page would drift from the example files.
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
 * - How it's written:
 *   - first as `ui-*` markup (`KitchenSinkWriter`):  a section per group, one per family inside it,
 *     each file's `<section><h4>Title</h4>...</section>` a `<ui-example>` there (`FamilyExamples.sections()`)
 *     - the family's first example described by its summary, with a link to its page and its sub-tags' own pages
 *     - the rest described by their `<h4>`
 *     - A section's own class (`ui-dark ui-p-m`) becomes a `<div>` around its body.
 *     - A file without sections is one example.
 *   - then as Spell (`KitchenSpellWriter`, `SpellMarkup`'s), only between the page's
 *     `<!-- kitchen:start -->` and `<!-- kitchen:end -->` comments:  the rest of the page is hand-kept
 *     - Each link to a family's page is that page's address in the site, by its title (`SpellUISite.addressFor()`).
 *     - A Semantic `<button class="ui button">` in an example file is drawn with `<ui-button>` there.
 * - Until epic `editor` P43 it wrote Spell UI's HTML kitchen sink page too, and filled each HTML components page's
 *   Theming playground with its family's main example;  the Spell pages' playgrounds are hand-kept.
 * - Rerun after changing an example.
 * - `--check`:  write nothing;  exit 1 if the page is stale.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"

import { readJSON5File } from "spell/util/node/json5"
import { escapeHTML, indented } from "spell/util/string"

import type { SiteDataFile, SiteFamily, SiteTag } from "spell/ui/docs-components/docs-components.types"
import { Terminal } from "spell/element-tools/Terminal"
import { spliceGenerated, writeOrCheck } from "spell/element-tools/generatedFiles"
import { FamilyExamples, type ExampleSection } from "spell/ui/tools/FamilyExamples"
import { SpellMarkup } from "spell/ui/tools/SpellMarkup"
import { SpellUISite } from "spell/ui/tools/SpellUISite"
import { COMPONENTS, SITE_DATA, SPELL_UI_ROOT } from "spell/ui/tools/tools.types"

import { withoutTicks } from "spell/ui/tools/generatedFiles"

/****************
 * ### `KitchenSinkWriter`
 * Renders the kitchen sink's examples, from the example files, as `ui-*` markup:  what `KitchenSpellWriter` writes
 * as Spell.
 * - Its `private static` helpers are STATIC because they're pure:  data in, text out.
 ****************/
class KitchenSinkWriter {
  /** The site's data:  titles, summaries, topics. */
  readonly data: SiteDataFile = readJSON5File<SiteDataFile>(path.join(SPELL_UI_ROOT, SITE_DATA, "components.json5"))

  /** The markup:  per group a section, holding a section per family, each holding its examples. */
  markup(): string {
    const tags = new Map(this.data.components.map((tag) => [tag.tag, tag]))
    const families = Object.values(this.data.families).filter((family) => !family.docs && this.exampleFile(family))
    const lines: string[] = []
    for (const group of GROUPS) {
      const members = families
        .filter((family) => KitchenSinkWriter.groupOf(tags.get(family.mainTag)) === group.topic)
        .sort((a, b) => a.title.localeCompare(b.title))
      if (!members.length) continue
      lines.push(`<ui-section ${SECTION_ATTRIBUTES(group.title)}>`)
      for (const family of members) lines.push(...this.family(family, "  "))
      lines.push("</ui-section>")
    }
    return lines.join("\n") + "\n"
  }

  /** One family's section and its examples, at `indent`. */
  private family(family: SiteFamily, indent: string): string[] {
    const sections = this.mainSections(family).slice(0, MAX_SECTIONS)
    const inner = `${indent}  `
    const lines = [`${indent}<ui-section ${SECTION_ATTRIBUTES(family.title)}>`]
    sections.forEach((section, index) => {
      if (index === 0) {
        lines.push(
          `${inner}<ui-example>`,
          `${inner}  <p slot="description">`,
          `${inner}    ${escapeHTML(withoutTicks(family.summary))}`,
          `${inner}    <a href="${family.mainTag}.html">${escapeHTML(family.title)} page</a>`,
          ...KitchenSinkWriter.ownPages(family).map((line) => `${inner}    ${line}`),
          `${inner}  </p>`
        )
      } else {
        lines.push(`${inner}<ui-example description="${escapeHTML(section.title)}">`)
      }
      lines.push(indented(KitchenSinkWriter.markup(section), `${inner}  `), `${inner}</ui-example>`)
    })
    lines.push(`${indent}</ui-section>`)
    return lines
  }

  /**
   * `family`'s example sections, in its main file's order (`FamilyExamples`), without those holding `stub-*`
   * stand-ins (the tests' `StubOwner`, not real elements);  none without a main file.
   */
  private mainSections(family: SiteFamily): ExampleSection[] {
    const file = this.exampleFile(family)
    if (!file) return []
    return FamilyExamples.sections(readFileSync(file, "utf8")).filter(
      (section) => !section.body.some((line) => line.includes("<stub-"))
    )
  }

  /**
   * `section`'s body as the site writes it, at column 0:
   * its own class (`ui-dark ui-p-m`) a `<div>` around it, its example sources the site's copies (`siteSources()`).
   */
  private static markup(section: ExampleSection): string {
    const body = section.body.join("\n")
    const markup = section.className ? `<div class="${section.className}">\n${indented(body, 2)}\n</div>` : body
    return KitchenSinkWriter.siteSources(markup)
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

  /** `family`'s main example file (`FamilyExamples.files()`'s first);  `undefined` without one. */
  private exampleFile(family: SiteFamily): string | undefined {
    return FamilyExamples.files(path.join(SPELL_UI_ROOT, COMPONENTS), family.folder)[0]
  }

  /** `markup` with its dev-server example sources pointed at the site's copies (`examples/<file>`). */
  private static siteSources(markup: string): string {
    return markup.replace(
      /source="\/src\/components\/[^/"]+\/examples\/sources\/([^"]+)"/g,
      (_match, file: string) => `source="examples/${SITE_SOURCES[file] ?? file}"`
    )
  }

  /** Which group `tag` files under:  its Fomantic topic, else ours (`undefined`). */
  private static groupOf(tag: SiteTag | undefined): string | undefined {
    return GROUPS.find((group) => group.topic && tag?.topics.includes(group.topic))?.topic
  }
}

/****************
 * ### `KitchenSpellWriter`
 * The Spell UI site's Kitchen Sink page (`KitchenSink.spell`):  the kitchen sink's markup as Spell
 * (`SpellMarkup`), spliced between the page's `<!-- kitchen:start -->` / `<!-- kitchen:end -->` comments.
 * - The rest of the page is hand-kept.
 * - A link in the markup names an old components page (`ui-button.html`):  written as its page's address in the site.
 ****************/
class KitchenSpellWriter {
  /** The site's files. */
  private readonly site = new SpellUISite()

  /** The page. */
  readonly file = path.join(this.site.folder, "KitchenSink.spell")

  /** What `SpellMarkup` couldn't write as the markup has it. */
  readonly warnings: string[] = []

  constructor(private readonly kitchen: KitchenSinkWriter) {}

  /** `page`, the Spell page, with its block written from the kitchen sink's markup. */
  render(page: string): string {
    const document = SpellMarkup.parse(this.kitchen.markup())
    const addresses = this.site.addressesByTitle()
    const spell = new SpellMarkup({ document, pageAddress: (file) => this.addressFor(file, addresses) })
    return spliceGenerated(page, {
      file: this.file,
      start: START,
      end: END,
      block: (indent) => {
        const text = spell.body(document.body, indent.length).replace(/^\n+/, "")
        this.warnings.push(...spell.warnings)
        return text
      }
    })
  }

  /**
   * The address in the site of the components page `file` (`ui-button`), by its family's or its sub-tag's title
   * (`SpellUISite.addressFor()`).
   */
  private addressFor(file: string, addresses: Map<string, string>): string | undefined {
    const { families } = this.kitchen.data
    const family = Object.values(families).find((each) => each.mainTag === file)
    const page = Object.values(families)
      .map((each) => each.pages?.[file])
      .find(Boolean)
    return this.site.addressFor(file, family?.title ?? page?.title, addresses)
  }
}

////////////////
// ## Constants
////////////////

/** Start marker (its own line);  its indent is the block's. */
const START = "<!-- kitchen:start -->"

/** End marker (its own line). */
const END = "<!-- kitchen:end -->"

/** The groups, in order:  Fomantic's four, then ours (`topic` absent). */
const GROUPS: readonly { title: string; topic?: string }[] = [
  { title: "Elements", topic: "elements" },
  { title: "Collections", topic: "collections" },
  { title: "Views", topic: "views" },
  { title: "Modules", topic: "modules" },
  { title: "Spell UI's own" }
]

/** A section's attributes, as every page's sections have them:  its title, stuck while it's read, folding. */
const SECTION_ATTRIBUTES = (title: string) => `label="${escapeHTML(title)}" sticky="stack" collapsible dividing`

/** Sections shown per family:  enough to judge a theme, short enough to scroll through every family. */
const MAX_SECTIONS = 3

/**
 * The site's copies of the example source files (`docs/examples/`), by the source's file name, where the name differs.
 * - A `source="/src/components/.../examples/sources/<file>"` (a dev-server path) points at the copy.
 */
const SITE_SOURCES: Readonly<Record<string, string>> = { "notes.html": "release-notes.html" }

const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } })
const spellWriter = new KitchenSpellWriter(new KitchenSinkWriter())
const spellPage = spellWriter.render(readFileSync(spellWriter.file, "utf8"))
const stale = writeOrCheck([[spellWriter.file, spellPage]], { command: "site:kitchen", isCheck: values.check })
for (const warning of new Set(spellWriter.warnings)) Terminal.err(`KitchenSink.spell:  ${warning}`)
if (!values.check) Terminal.out(stale.length ? `wrote ${stale.join(", ")}` : "kitchen sink:  unchanged")
