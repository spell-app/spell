/**
 * `yarn site:new <tag|page> [--title "Title"] [--summary "One line."] [--force]`:
 * write a component's pages:  its four pages in the Spell UI site, and its components page from the template,
 * `templates/spell-ui-docs.html` (spell-epic's);  or a components guide page.
 * - The Spell UI site (`@spell/guides/SpellUI`, epic `editor` P42;  Owen:  "the thing that adds a spell-ui page when
 *   we make a new component knows where to put them"):  for a TAG, `<Title>/Usage.spell`, `Examples.spell`,
 *   `API.spell` and `Theming.spell` (`SpellUISite.writeComponent()`), their lines in its site file A to Z, and in its
 *   project file.
 *   - Written from the components page:  the one in `docs/` when it's there, else the template's, as Spell
 *     (`SpellMarkup`).
 *   - A component the site has already is left alone, without `--force`.
 *   - A guide page (not a tag) is the components page alone:  write the site's own by hand.
 * - Components pages land in their one folder, `docs/` (`SITE_PAGES`), until epic `editor` P43 retires them.
 * - A TAG (`ui-button`, `button`, `ui-or`:  any tag of a family) writes `docs/<main tag>.html`, the component layout:
 *   - a masthead with the family's theme picker
 *   - Examples / Usage / API / Theming tabs
 *   - title, summary and status from `docs/__data/pages.json5` (`--title` / `--summary` override them)
 * - A sub-tag with a page of its OWN (pages.json5 `pages`, e.g. `ui-radio`) writes `docs/<tag>.html`:
 *   - its own title, summary and status
 *   - ONE tag's API tables (`<ui-docs-api tag>`)
 *   - the Theming tab only when one of the family's tokens names it
 *     (`--ui-checkbox-radio-size`;  `ui-meta` has none:  its owners style it)
 * - Anything else is a PAGE:  `docs/<page>.html`, one content column, no tabs.
 *   - `--title` (default:  the name in Title Case) and `--summary`
 * - What it does to the template:
 *   - fills its `{{...}}` placeholders
 *   - keeps the `site:component` OR `site:page` blocks
 *   - drops the status label for a `done` family, and the Fomantic link when Fomantic has no such page
 *   - rewrites its paths to the site for the page's place
 *     (`../ui/`, `../components/ui/` once the template follows the move)
 * - The page is its `<head>` and `main` alone:  the chrome is `docs/__parts/layout.html`.
 * - Leaves an existing components page as it is without `--force`;  refuses, exit 1, when there's nothing left to write.
 * - Prints the path and the page server URL hint.
 * - The Fomantic link:  by the family name, or `FOMANTIC_PAGES` for the families whose page has another name.
 *   - Fomantic's page, in a git-ignored clone (epic page P1):
 *     `reference/Fomantic-UI-Docs/server/documents/<group>/<name>.html.eco`
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { readJSON5File } from "spell/util/node/json5"
import { escapeHTML } from "spell/util/string"

import { Terminal } from "spell/element-tools/Terminal"
import { SITE_DATA, SITE_PAGES, SPELL_UI_ROOT } from "spell/ui/tools/tools.types"
import { SpellUISite } from "spell/ui/tools/SpellUISite"

import { STATUS_TEXT } from "spell/ui/tools/generatedFiles"
import { SiteSections } from "./site-sections.ts"

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

/** A tag as `components.json5` describes it (the fields used here). */
type Tag = { tag: string; topics: string[] }

/** A topic as `components.json5` lists it, in the site's order. */
type Topic = { id: string; title: string }

/** What fills a template. */
type PageFacts = {
  /** output path in the site's folder, e.g. `ui-button.html` */
  file: string
  title: string
  summary: string
  /** `done` drops the status label */
  status: string
  /** the tag the page documents, e.g. `ui-button` (a main tag) or `ui-radio`;  empty for a page */
  tag: string
  /** a sub-tag's own page:  ONE tag's API tables (`site:tag`), not the family's (`site:family`) */
  own: boolean
  /** keep the Theming tab */
  theming: boolean
  /** family folder, e.g. `ui-button`;  empty for a page */
  family: string
  /** fomantic-ui.com URL, or empty */
  fomantic: string
}

/****************
 * ### `SitePageWriter`
 * Turns the template into one page:  facts from the site data, blocks kept or dropped, paths fixed for depth.
 ****************/
class SitePageWriter {
  /** the site's pages, `docs/` */
  readonly site = path.join(SPELL_UI_ROOT, SITE_PAGES)

  /** The site's data:  every family by folder, every tag, the topics in order. */
  private readonly data = readJSON5File<{ families: Record<string, Family>; components: Tag[]; topics: Topic[] }>(
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

  /** The facts for `name` (a tag, a family folder or a page name), with `--title` / `--summary` applied. */
  facts(name: string, options: { title?: string; summary?: string }): PageFacts {
    const family = this.family(name)
    if (!family) {
      const page = name.replace(/\.html$/, "")
      return {
        file: `${page}.html`,
        title: options.title ?? SitePageWriter.titleCase(page),
        summary: options.summary ?? "",
        status: "done",
        tag: "",
        own: false,
        theming: false,
        family: "",
        fomantic: ""
      }
    }
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

  /** The page's HTML for `facts`. */
  render(facts: PageFacts): string {
    const depth = facts.file.split("/").length - 1
    const rel = "../".repeat(depth)
    const component = !!facts.tag
    let html = readFileSync(TEMPLATE, "utf8")
    html = SitePageWriter.dropComment(html)
    html = SitePageWriter.block(html, "component", component)
    html = SitePageWriter.block(html, "page", !component)
    html = SitePageWriter.block(html, "status", facts.status !== "done")
    html = SitePageWriter.block(html, "fomantic", !!facts.fomantic)
    html = SitePageWriter.block(html, "family", !facts.own)
    html = SitePageWriter.block(html, "tag", facts.own)
    html = SitePageWriter.block(html, "theming", facts.theming)
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHTML(`${facts.title} | Spell UI`)}</title>`)
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapeHTML(facts.summary)}$2`)
      .replaceAll(TEMPLATE_SITE, rel)
    const values: Record<string, string> = {
      title: facts.title,
      summary: facts.summary,
      status: STATUS_TEXT[facts.status] ?? facts.status,
      tag: facts.tag,
      family: facts.family,
      fomantic: facts.fomantic,
      bugTitle: encodeURIComponent(`${facts.tag || facts.title}:  `)
    }
    return html.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in values ? escapeHTML(values[key]!) : match))
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

  /** `getting-started` => `Getting Started`. */
  private static titleCase(name: string): string {
    return name
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }
}

/** Printed when the name is missing. */
const USAGE = 'usage:  yarn site:new <tag|page> [--title "Title"] [--summary "One line."] [--force]'

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
const file = path.join(writer.site, facts.file)
const site = new SpellUISite()
const hasPage = existsSync(file)
const hasSpell = !facts.tag || site.hasComponent(facts.title)
if (hasPage && hasSpell && !flags.force) {
  Terminal.err(
    `${path.relative(process.cwd(), file)} exists, and so do its Spell UI site pages:  pass --force to overwrite them`
  )
  process.exit(1)
}
const kind = facts.own ? `own page of ${facts.tag}` : facts.tag ? `component ${facts.tag}` : "page"
// the template's section ids are written for its placeholder title:  fixed for the page's own (`#examples-types-card`)
const html = hasPage && !flags.force ? readFileSync(file, "utf8") : SiteSections.convert(writer.render(facts))
if (!hasPage || flags.force) {
  writeFileSync(file, html)
  Terminal.out(
    `wrote ${path.relative(process.cwd(), file)}  (${kind}${facts.own && !facts.theming ? ", no Theming tab" : ""})`
  )
}
if (facts.tag && (!hasSpell || flags.force)) {
  const written = site.writeComponent(html, {
    tag: facts.tag,
    title: facts.title,
    summary: facts.summary,
    topics: writer.topicsOf(facts.tag),
    fomantic: facts.fomantic,
    page: `/components/ui/${facts.file}`,
    pageAddress: (other) => site.addressFor(other, writer.titleOf(other))
  })
  for (const each of written.files) Terminal.out(`wrote ${path.relative(process.cwd(), each)}`)
  for (const warning of written.warnings) Terminal.err(`  to tidy by hand:  ${warning}`)
}
Terminal.out(`  check:  yarn site:check ${facts.tag || facts.file}`)
