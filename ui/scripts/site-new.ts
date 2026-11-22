/**
 * `yarn site:new <tag> [--title "Title"] [--summary "One line."] [--force]`:
 * write a new component's four pages in the Spell UI site (`@spell/guides/SpellUI`, epic `editor` P42).
 * - Owen:  "the thing that adds a spell-ui page when we make a new component knows where to put them".
 * - What it writes, for a TAG (`ui-button`, `button`, `ui-or`:  any tag of a family):
 *   - `<Title>/Usage.spell`, `Examples.spell`, `API.spell` and `Theming.spell` (`SpellUISite.writeComponent()`)
 *   - their lines in the site file, A to Z, and in its project file
 *   - title, summary and status from `docs/__data/pages.json5` (`--title` / `--summary` override them)
 * - A sub-tag with a page of its OWN (pages.json5 `pages`, e.g. `ui-radio`) gets its own pages:
 *   - its own title, summary and status
 *   - ONE tag's API tables (`<ui-docs-api tag>`)
 *   - the Theming page only when one of the family's tokens names it
 *     (`--ui-checkbox-radio-size`;  `ui-meta` has none:  its owners style it)
 * - How:  it fills spell-epic's components page template, `templates/spell-ui-docs.html`, in memory,
 *   and writes that as Spell (`SpellMarkup`).  What it does to the template:
 *   - fills its `{{...}}` placeholders
 *   - keeps the `site:component` blocks
 *   - drops the status label for a `done` family, and the Fomantic link when Fomantic has no such page
 *   - rewrites its paths to the site (`../ui/`, `../components/ui/`)
 *   - Until epic `editor` P43 it also wrote the HTML components page, `docs/<tag>.html`, and guide pages;
 *     the template stays for the other component sets' pages.
 * - A guide page (not a tag) is written in the Spell UI site by hand:  it says so, exit 1.
 * - Leaves a component the site has already as it is, without `--force` (exit 1).
 * - Prints what it wrote, what to tidy by hand (a script that drives an example), and the check to run.
 * - The Fomantic link:  by the family name, or `FOMANTIC_PAGES` for the families whose page has another name.
 *   - Fomantic's page, in a git-ignored clone (epic page P1):
 *     `reference/Fomantic-UI-Docs/server/documents/<group>/<name>.html.eco`
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { readJSON5File } from "spell/util/node/json5"
import { escapeHTML } from "spell/util/string"

import { SpellUIGuide } from "spell/ui/util/SpellUIGuide"
import type { SiteTag } from "spell/ui/docs-components/docs-components.types"
import { ApiModel } from "spell/ui/docs-components/ui-docs-api/ApiModel"
import { docsApiVocabulary } from "spell/ui/docs-components/ui-docs-api/UIDocsApi.en"
import { Terminal } from "spell/element-tools/Terminal"
import { SITE_DATA, SPELL_UI_ROOT } from "spell/ui/tools/tools.types"
import { SpellUISite } from "spell/ui/tools/SpellUISite"

import { STATUS_TEXT } from "spell/ui/tools/generatedFiles"

/**
 * The template, in the `epic/` folder's `templates/` (epic `epic-eject` T11:  every template is the engine's), found
 * through the ONE package `spell` (epic `repo-split` P20);  served at `/templates/spell-ui-docs.html`.
 * - Spell UI never imports spell-epic (it's above):  this only reads one of its files.
 */
const TEMPLATE = path.join(
  path.dirname(fileURLToPath(import.meta.resolve("spell/package.json"))),
  "epic/templates/spell-ui-docs.html"
)

/** The template's own path prefix to the site's pages (it's served at `/templates/`, beside `/components/`). */
const TEMPLATE_SITE = /\.\.\/(?:components\/)?ui\//g

/** Fomantic's docs pages, by group folder. */
const FOMANTIC_DOCS = path.join(SPELL_UI_ROOT, "reference/Fomantic-UI-Docs/server/documents")

/** Families whose Fomantic page has another name (epic page 1.3, the page map). */
const FOMANTIC_PAGES: Record<string, string> = {
  "ui-ad": "views/advertisement",
  "ui-parts": "elements/header",
  "ui-select": "modules/dropdown",
  "ui-items": "views/item",
  "ui-visibility": "behaviors/visibility"
}

/**
 * Fomantic pages of the sub-tags with a page of their own, where Fomantic has one;  the rest get no Fomantic link
 * (the content parts are spread over its card, item, feed ... pages).
 */
const FOMANTIC_TAG_PAGES: Record<string, string> = {
  "ui-radio": "modules/checkbox",
  "ui-textarea": "collections/form"
}

/** A family as `components.json5` describes it (the fields used here). */
type Family = {
  folder: string
  mainTag: string
  title: string
  summary: string
  status: string
  tags: string[]
  /** sub-tags with a page of their own:  tag => title, summary, status */
  pages?: Record<string, { title: string; summary: string; status: string }>
  tokens: { name: string }[]
}

/** A topic as `components.json5` lists it, in the site's order. */
type Topic = { id: string; title: string }

/** What fills a template. */
type PageFacts = {
  /** its components page's name, e.g. `ui-button.html`:  how the template's links name it */
  file: string
  title: string
  summary: string
  /** `done` drops the status label */
  status: string
  /** the tag the page documents, e.g. `ui-button` (a main tag) or `ui-radio` */
  tag: string
  /** a sub-tag's own page:  ONE tag's API tables (`site:tag`), not the family's (`site:family`) */
  own: boolean
  /** keep the Theming tab */
  theming: boolean
  /** family folder, e.g. `ui-button` */
  family: string
  /** fomantic-ui.com URL, or empty */
  fomantic: string
}

/****************
 * ### `SitePageWriter`
 * Turns the template into one component's page:  facts from the site data, blocks kept or dropped, paths fixed.
 ****************/
class SitePageWriter {
  /** The site's data:  every family by folder, every tag, the topics in order. */
  private readonly data = readJSON5File<{ families: Record<string, Family>; components: SiteTag[]; topics: Topic[] }>(
    path.join(SPELL_UI_ROOT, SITE_DATA, "components.json5")
  )

  /** Every family of `components.json5`, by folder. */
  private readonly families: Record<string, Family> = this.data.families

  /** The titles of `tag`'s topics, in the site's order (`Navigation, Lists`). */
  topicsOf(tag: string): string[] {
    const own = this.data.components.find((each) => each.tag === tag)?.topics ?? []
    return this.data.topics.filter((topic) => own.includes(topic.id)).map((topic) => topic.title)
  }

  /** A components page's title, by its file name without `.html`:  its family's, or its sub-tag's own page's. */
  titleOf(file: string): string | undefined {
    const families = Object.values(this.families)
    return (
      families.find((family) => family.mainTag === file)?.title ??
      families.map((family) => family.pages?.[file]?.title).find(Boolean)
    )
  }

  /**
   * The facts for `name` (a tag or a family folder), with `--title` / `--summary` applied;
   * `undefined` when it names no family's tag.
   */
  facts(name: string, options: { title?: string; summary?: string }): PageFacts | undefined {
    const family = this.family(name)
    if (!family) return undefined
    const tag = SitePageWriter.tagOf(name)
    const own = family.pages && Object.hasOwn(family.pages, tag) ? family.pages[tag]! : undefined
    if (own) {
      const noun = tag.replace(/^ui-/, "")
      return {
        file: `${tag}.html`,
        title: options.title ?? own.title,
        summary: options.summary ?? own.summary,
        status: own.status,
        tag,
        own: true,
        theming: family.tokens.some((token) => token.name.includes(`-${noun}-`)),
        family: family.folder,
        fomantic: FOMANTIC_TAG_PAGES[tag] ? `https://fomantic-ui.com/${FOMANTIC_TAG_PAGES[tag]}.html` : ""
      }
    }
    return {
      file: `${family.mainTag}.html`,
      title: options.title ?? family.title,
      summary: options.summary ?? family.summary,
      status: family.status,
      tag: family.mainTag,
      own: false,
      theming: true,
      family: family.folder,
      fomantic: SitePageWriter.fomantic(family)
    }
  }

  /** The components page's HTML for `facts`:  what the Spell pages are written from. */
  render(facts: PageFacts): string {
    let html = readFileSync(TEMPLATE, "utf8")
    html = SitePageWriter.dropComment(html)
    html = SitePageWriter.block(html, "component", true)
    html = SitePageWriter.block(html, "page", false)
    html = SitePageWriter.block(html, "status", facts.status !== "done")
    html = SitePageWriter.block(html, "fomantic", !!facts.fomantic)
    html = SitePageWriter.block(html, "family", !facts.own)
    html = SitePageWriter.block(html, "tag", facts.own)
    html = SitePageWriter.block(html, "theming", facts.theming)
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHTML(`${facts.title} | Spell UI`)}</title>`)
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapeHTML(facts.summary)}$2`)
      .replaceAll(TEMPLATE_SITE, "")
    const values: Record<string, string> = {
      title: facts.title,
      summary: facts.summary,
      status: STATUS_TEXT[facts.status] ?? facts.status,
      tag: facts.tag,
      family: facts.family,
      fomantic: facts.fomantic,
      bugTitle: encodeURIComponent(`${facts.tag}:  `)
    }
    html = html.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in values ? escapeHTML(values[key]!) : match))
    return html.replace(API_TABLE, (_match, indent: string, kind: string, name: string) =>
      this.apiSections(indent, kind, name)
    )
  }

  /**
   * The API tab's sections:  one per kind of table `name`'s tags have (a family:  any of its tags), in order,
   * each holding that kind's `<ui-docs-api only>`, at `indent`.
   * - A family of 2+ tags gets a Tags section first (`ApiModel.sectionIdsFor()`).
   * - A tag the data doesn't know yet (before `yarn site:data`):  the lone table, left as it is.
   */
  private apiSections(indent: string, kind: string, name: string): string {
    const tagOf = (tag: string): SiteTag | undefined => this.data.components.find((entry) => entry.tag === tag)
    const names = kind === "family" ? (this.families[name]?.tags ?? []) : [name]
    const ids = ApiModel.sectionIdsFor(names.map(tagOf).filter((tag): tag is SiteTag => !!tag))
    if (!ids.length) return `${indent}<ui-docs-api ${kind}="${name}"></ui-docs-api>`
    return ids
      .map((id) => {
        const label = docsApiVocabulary.texts.find((text) => text.key === id)?.text ?? id
        return [
          `${indent}<ui-section label="${label}" sticky="stack" collapsible dividing>`,
          `${indent}  <ui-docs-api ${kind}="${name}" only="${ApiModel.onlyFor(id)}"></ui-docs-api>`,
          `${indent}</ui-section>`
        ].join("\n")
      })
      .join("\n\n")
  }

  /** `name` as a tag:  `button` => `ui-button`. */
  private static tagOf(name: string): string {
    return name.startsWith("ui-") ? name : `ui-${name}`
  }

  /** The family `name` names:  a folder, a main tag, any tag of a family, or a bare name (`button`). */
  private family(name: string): Family | undefined {
    const tag = SitePageWriter.tagOf(name)
    const families = Object.values(this.families)
    return (
      this.families[tag] ??
      families.find((family) => family.mainTag === tag) ??
      families.find((family) => family.tags.includes(tag))
    )
  }

  /** fomantic-ui.com's page for `family`, if its docs have one. */
  private static fomantic(family: Family): string {
    const known = FOMANTIC_PAGES[family.folder]
    if (known) return `https://fomantic-ui.com/${known}.html`
    const name = family.folder.replace(/^ui-/, "")
    if (!existsSync(FOMANTIC_DOCS)) return ""
    for (const group of readdirSync(FOMANTIC_DOCS)) {
      if (existsSync(path.join(FOMANTIC_DOCS, group, `${name}.html.eco`))) {
        return `https://fomantic-ui.com/${group}/${name}.html`
      }
    }
    return ""
  }

  /** `html` with the `<!-- site:<name>:start -->` ... `end` blocks kept (markers dropped) or removed. */
  private static block(html: string, name: string, keep: boolean): string {
    const pattern = new RegExp(
      `[ \\t]*<!-- site:${name}:start -->\\n([\\s\\S]*?)[ \\t]*<!-- site:${name}:end -->\\n`,
      "g"
    )
    return html.replace(pattern, (_match, inner: string) => (keep ? inner : ""))
  }

  /** `html` without the template's leading `TEMPLATE:` comment (a page doesn't need it). */
  private static dropComment(html: string): string {
    return html.replace(/<!--\s*\n\s*TEMPLATE:[\s\S]*?-->\n/, "")
  }
}

/** The template's API table, after its placeholders are filled:  its indent, `family` or `tag`, and its name. */
const API_TABLE = /^( *)<ui-docs-api (family|tag)="([^"]+)"><\/ui-docs-api>$/m

/** Printed when the name is missing. */
const USAGE = 'usage:  yarn site:new <tag> [--title "Title"] [--summary "One line."] [--force]'

const { values: flags, positionals } = parseArgs({
  options: { title: { type: "string" }, summary: { type: "string" }, force: { type: "boolean", default: false } },
  allowPositionals: true
})
const [name] = positionals
if (!name) {
  Terminal.err(USAGE)
  process.exit(2)
}
const writer = new SitePageWriter()
const facts = writer.facts(name, { title: flags.title, summary: flags.summary })
if (!facts) {
  Terminal.err(`${name} is no Spell UI tag:  write a guide page in the Spell UI site by hand (${SpellUIGuide.project})`)
  process.exit(1)
}
const site = new SpellUISite()
if (site.hasComponent(facts.title) && !flags.force) {
  Terminal.err(`${facts.title}'s Spell UI site pages exist:  pass --force to overwrite them`)
  process.exit(1)
}
const written = site.writeComponent(writer.render(facts), {
  tag: facts.tag,
  title: facts.title,
  summary: facts.summary,
  topics: writer.topicsOf(facts.tag),
  fomantic: facts.fomantic,
  page: `${SpellUIGuide.address}/${facts.file}`,
  pageAddress: (other) => site.addressFor(other, writer.titleOf(other))
})
const kind = facts.own ? `own page of ${facts.tag}` : `component ${facts.tag}`
for (const each of written.files) Terminal.out(`wrote ${path.relative(process.cwd(), each)}  (${kind})`)
for (const warning of written.warnings) Terminal.err(`  to tidy by hand:  ${warning}`)
Terminal.out(`  check:  yarn site:check ${facts.tag}`)
