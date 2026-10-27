import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { readJSON5File } from "spell/util/node/json5"

import { SharedVocabulary } from "spell-ui/vocabulary/SharedVocabulary"
import { ValueSets } from "spell-ui/vocabulary/ValueSets"
import type { IconSearchFile } from "spell-ui/icons"
import {
  SITE_DATA_VERSION,
  type SiteAttribute,
  type SiteDataFile,
  type SiteFamily,
  type SitePageSeed,
  type SitePagesFile,
  type SiteSet,
  type SiteTag,
  type SiteTagPage
} from "spell-ui/docs-components/docs-components.types"
import type { AttributeSpec, ComponentVocabulary, ValueSetName } from "spell/element/vocabulary.types"
import { SITE_DATA, SITE_PAGES, SPELL_UI_ROOT } from "./tools.types.ts"
import { FamilyTokens } from "./FamilyTokens.ts"
import { FoundationTokens } from "./FoundationTokens.ts"
import { SiteSearchBuilder } from "./SiteSearchBuilder.ts"
import { VocabularyFiles } from "spell/element-tools/VocabularyFiles"

/****************
 * ### `SiteDataBuilder`
 * Builds the Spell UI site's data:
 * - `docs/__data/components.json5` (`SiteDataFile`), from every vocabulary and family sheet
 * - and keeps `docs/__data/pages.json5` (`SitePagesFile`, the hand-kept per-family facts) complete
 *
 * - Run by `yarn site:data` (`scripts/site-data.ts`), which writes both.
 *   - `tests/tools/SiteDataBuilder.test.ts` fails while either is stale.
 * - Reads the vocabulary FILES (`import()` each `UI<Name>.en.ts`), as `yarn gen:root` does:
 *   `ComponentDefinitions` needs Vite's `import.meta.glob`.
 *   - Components from `components/`, doc-only elements from `src/docs-components/`.
 * - pages.json5:  a family missing from it is SEEDED, once, from its vocabulary;  after that the file is the source.
 *   - The seed:  title from the tag, summary its description, `done`.
 *   - The first seeds came from the old Astro site's MDX pages (frontmatter + token-table props),
 *     deleted with it (epic `spell-ui-pages`, P7).
 * - Also the FOUNDATION tokens, grouped (`foundation`, `src/tools/FoundationTokens.ts`), for the theming page's tables.
 * - And the search file, `docs/__data/search.json5` (`searchText()`, `src/tools/SiteSearchBuilder.ts`):
 *   every page's sections, read from the pages' markup.
 * - Another component set's data (`set`, `forSet()`):  its own groups as the topics, its own side-column links,
 *   its pages one flat folder;  the brand's, Epic UI's and App UI's are built so.
 * - Deterministic:  sorted, no dates, so a rebuild with nothing changed writes the same bytes.
 * - Node only;  imports `src/` data only (vocabularies, `ValueSets`, the site data's types), never the elements.
 ****************/
export class SiteDataBuilder {
  /** `packages/ui/`, absolute, with a trailing slash. */
  readonly root: string

  /** Other folders to read instead of the site's own (`SiteDataBuilderProps`):  another package's elements. */
  readonly options: Omit<SiteDataBuilderProps, "root">

  constructor({ root = SPELL_UI_ROOT, ...options }: SiteDataBuilderProps = {}) {
    this.root = root
    this.options = options
  }

  /** `docs/__data/` (`SITE_DATA`), or `options.data`. */
  get dataFolder(): string {
    return this.options.data ?? join(this.root, SITE_DATA)
  }

  /** The site's pages:  `docs/` (`SITE_PAGES`), or `options.pages`. */
  get pagesFolder(): string {
    return this.options.pages ?? join(this.root, SITE_PAGES)
  }

  /** Component families:  `components/`, or `options.components`. */
  get componentsFolder(): string {
    return this.options.components ?? join(this.root, "src/components")
  }

  /** Doc-only families:  `src/docs-components/`, or `options.docs`;  `undefined` when `options.docs` is `false`. */
  get docsFolder(): string | undefined {
    if (this.options.docs === false) return undefined
    return this.options.docs ?? join(this.root, "src", "docs-components")
  }

  /** `docs/__data/components.json5`. */
  get dataFile(): string {
    return join(this.dataFolder, "components.json5")
  }

  /** `docs/__data/pages.json5`. */
  get pagesFile(): string {
    return join(this.dataFolder, "pages.json5")
  }

  /** `docs/__data/icons.json5`. */
  get iconsFile(): string {
    return join(this.dataFolder, "icons.json5")
  }

  /** `docs/__data/search.json5`:  beside the other data, built from the pages. */
  get searchFile(): string {
    return join(this.dataFolder, "search.json5")
  }

  /** The text of `search.json5` (`SiteSearchFile`):  every page's sections, for `<ui-docs-search>`. */
  searchText(): string {
    return new SiteSearchBuilder(this.pagesFolder).text()
  }

  /**
   * The text of `icons.json5` (`SiteIconsFile`):
   * Font Awesome's search terms, from `src/icons/data/search.json` (`IconSearchFile`), for the icon browser's search.
   * - The terms alone:  the icon browser shows no categories.
   * - One icon per line (not `stringify()`'s one term per line):
   *   a third of the size, and a diff still names the icon that changed.
   */
  iconsText(): string {
    const { terms }: IconSearchFile = JSON.parse(
      readFileSync(join(this.root, "src", "icons", "data", "search.json"), "utf8")
    )
    const comment =
      "GENERATED by `yarn site:data` (packages/ui, scripts/site-data.ts) from src/icons/data/search.json -- " +
      "do not edit.  Shape:  `SiteIconsFile` in src/docs-components/docs-components.types.ts."
    const lines = Object.keys(terms)
      .sort()
      .map((file) => `    ${JSON.stringify(file)}: ${JSON.stringify(terms[file])}`)
    return `{\n  "$comment": ${JSON.stringify(comment)},\n  "terms": {\n${lines.join(",\n")}\n  }\n}\n`
  }

  /** Build both files' contents (nothing is written):  the data, and pages.json5 with any new family seeded. */
  async build(): Promise<{ data: SiteDataFile; pages: SitePagesFile }> {
    const components = await this.readTags(this.componentsFolder)
    const docsFolder = this.docsFolder
    const docs = docsFolder ? await this.readTags(docsFolder) : []
    const pages = this.seedPages([...components, ...docs])
    const tokens = new FamilyTokens(join(this.root, "src", "styles"))

    const families: Record<string, SiteFamily> = {}
    for (const folder of [...new Set([...components, ...docs].map((entry) => entry.folder))].sort()) {
      const isDocs = docs.some((entry) => entry.folder === folder)
      const tags = (isDocs ? docs : components).filter((entry) => entry.folder === folder)
      const seed = pages.families[folder]!
      const mainTag = SiteDataBuilder.mainTagFor(folder, tags, seed)
      const ordered = [...tags].sort(
        (a, b) => Number(b.tag === mainTag) - Number(a.tag === mainTag) || a.name.localeCompare(b.name)
      )
      const sheets = join(isDocs ? docsFolder! : this.componentsFolder, folder)
      families[folder] = {
        folder,
        mainTag,
        title: seed.title,
        summary: seed.summary,
        status: seed.status,
        docs: isDocs,
        tags: ordered.map((entry) => entry.tag),
        ...SiteDataBuilder.pagesFor({ folder, tags, mainTag, seed }),
        tokens: tokens.read(sheets, folder, seed.tokens)
      }
    }

    const foundation = new FoundationTokens(join(this.root, "src", "styles")).groups()

    const data: SiteDataFile = {
      $comment:
        "GENERATED by `yarn site:data` (packages/ui, scripts/site-data.ts) -- do not edit.  Shape:  " +
        "`SiteDataFile` in src/docs-components/docs-components.types.ts;  hand-kept facts:  docs/__data/pages.json5.",
      version: SITE_DATA_VERSION,
      topics: ValueSets.topics.map((id) => ({ id, title: SiteDataBuilder.topicTitle(id) })),
      components: SiteDataBuilder.finishTags(components, families),
      docs: SiteDataBuilder.finishTags(docs, families),
      families,
      foundation
    }
    return { data: this.options.set ? SiteDataBuilder.forSet(data, this.options.set) : data, pages }
  }

  /**
   * `data` made a component set's (`set`, its hand-kept `pages.json5`):
   * - its topics:  the set's groups, in order, then Other when a tag is in none
   * - each tag's topic:  the group listing it, else a group listing no tags that its own `topics` name, else Other
   * - each tag's page in the set's ONE flat folder (`components/ui-x.html` => `ui-x.html`)
   * - its side column's own links, `nav`
   * - Static:  pure;  Epic UI's and App UI's data, built from their own sources, go through it too.
   */
  static forSet(data: SiteDataFile, { groups, nav }: SiteSet): SiteDataFile {
    const tags = [...data.components, ...data.docs]
    const listing = new Map(groups.flatMap((group) => (group.tags ?? []).map((tag) => [tag, group.id] as const)))
    const groupOf = (tag: SiteTag) =>
      listing.get(tag.tag) ?? groups.find((group) => !group.tags && tag.topics.includes(group.id))?.id ?? OTHER.id
    const hasOthers = tags.some((tag) => groupOf(tag) === OTHER.id)
    const forTag = (tag: SiteTag): SiteTag => ({
      ...tag,
      topics: [groupOf(tag)],
      ...(tag.href && { href: tag.href.replace(/^components\//, "") })
    })
    return {
      ...data,
      topics: [...groups, ...(hasOthers ? [OTHER] : [])].map(({ id, title }) => ({ id, title })),
      components: data.components.map(forTag),
      docs: data.docs.map(forTag),
      nav
    }
  }

  /** `value` as the files are written:  2-space JSON, a final newline. */
  static stringify(value: unknown): string {
    return `${JSON.stringify(value, null, 2)}\n`
  }

  /** `"date & time"` => `"Date & time"`. */
  static topicTitle(topic: string): string {
    return topic.charAt(0).toUpperCase() + topic.slice(1)
  }

  /** `ui-breadcrumb` => `Breadcrumb section`;  `ui-example` => `Docs example`. */
  static nameFor(tag: string): string {
    const words = tag.replace(/^ui-/, "").replace(/-/g, " ")
    return words.charAt(0).toUpperCase() + words.slice(1)
  }

  ////////////////
  // ## Tags
  ////////////////

  /** Every tag of every family under `folder`, from its `UI<Name>.en.ts` files (`VocabularyFiles`). */
  private async readTags(folder: string): Promise<RawTag[]> {
    const vocabularies = await VocabularyFiles.read(folder)
    return vocabularies.map(({ folder: family, vocabulary }) => SiteDataBuilder.tagFor(vocabulary, family))
  }

  /** One vocabulary as a tag entry (before its family's page is known). */
  private static tagFor(vocabulary: ComponentVocabulary, folder: string): RawTag {
    return {
      tag: vocabulary.tag,
      name: SiteDataBuilder.nameFor(vocabulary.tag),
      folder,
      topics: [...(vocabulary.topics ?? [])],
      aka: [...(vocabulary.aka ?? [])],
      ...(vocabulary.description && { description: vocabulary.description }),
      noun: vocabulary.noun,
      // its own, then the shared ones it doesn't declare (`disabled`, `loading`, `visible`), marked `shared`
      attributes: SharedVocabulary.attributesFor(vocabulary).map((spec) =>
        SiteDataBuilder.attributeFor(spec, SharedVocabulary.takesShared(vocabulary, spec.name))
      ),
      slots: vocabulary.slots.map(({ name, description }) => ({ name, description })),
      events: vocabulary.events.map(({ name, detail, cancelable, description }) => ({
        name,
        detail,
        ...(cancelable && { cancelable }),
        description
      })),
      parts: vocabulary.parts.map(({ name, description }) => ({ name, description })),
      states: SharedVocabulary.statesFor(vocabulary).map(({ name, description }) => ({ name, description })),
      texts: vocabulary.texts.map(({ key, text, description }) => ({ key, text, ...(description && { description }) }))
    }
  }

  /**
   * One attribute, its values resolved (`valueSetFor()`):  a shared set's name kept as `valueSet`.
   * - `isShared`:  one of the attributes every element takes, not the vocabulary's own (`shared: true`).
   */
  private static attributeFor(spec: AttributeSpec, isShared: boolean): SiteAttribute {
    const set = SiteDataBuilder.valueSetFor(spec)
    const shared = typeof set === "string" ? set : undefined
    const values = set === undefined ? undefined : [...ValueSets.get(set)]
    return {
      name: spec.name,
      kind: spec.kind,
      ...(values && { values }),
      ...(shared && { valueSet: shared }),
      ...(spec.default !== undefined && { default: spec.default }),
      ...(spec.aliases?.length && { aliases: [...spec.aliases] }),
      ...(spec.property && { property: spec.property }),
      ...(spec.reflect === false && { reflect: false }),
      ...(isShared && { shared: true }),
      description: spec.description
    }
  }

  /**
   * The values the site lists for an attribute:  `ValueSets.setFor()`'s (its own `values`, else its kind's default
   * set), with two differences, on purpose:
   * - `width` => `widths` (columns 1..16):  free-form to `ValueSets` (it also takes `1/4`, `25%`), but the docs and
   *   the editors list the column words
   * - `boolean` => none:  its kind already says it all;  listing `booleans` would add `yes` / `no` ... to 70+ rows
   */
  private static valueSetFor(spec: AttributeSpec): ValueSetName | readonly string[] | undefined {
    if (spec.values) return spec.values
    if (spec.kind === "width") return "widths"
    if (spec.kind === "boolean") return undefined
    return ValueSets.setFor(spec)
  }

  /**
   * `tags` A-Z by name, each with what its family says:  main tag, and the docs page:
   * `<tag>.html` for the main tag and a sub-tag with its own page (`SiteFamily.pages`),
   * else `<main>.html#<tag>`;  none for a doc-only tag.
   * - against the site's root:  every page sits in its one folder (epic `people-and-orgs` P18)
   */
  private static finishTags(tags: RawTag[], families: Record<string, SiteFamily>): SiteTag[] {
    return [...tags]
      .sort((a, b) => a.name.localeCompare(b.name) || a.tag.localeCompare(b.tag))
      .map((entry) => {
        const family = families[entry.folder]!
        const main = entry.tag === family.mainTag
        const page = !family.docs && (main || Object.hasOwn(family.pages ?? {}, entry.tag))
        return {
          ...entry,
          mainTag: family.mainTag,
          main,
          page,
          ...(!family.docs && {
            href: page ? `${entry.tag}.html` : `${family.mainTag}.html#${entry.tag}`
          })
        }
      })
  }

  /**
   * A family's `pages` (sub-tags with a page of their own), from its seed:  A-Z, as `{ pages }` to spread, or nothing
   * when it has none.
   * - Throws a `TypeError` on a tag the family doesn't have, or its main tag:
   *   a typo in pages.json5 would else drop a page silently.
   */
  private static pagesFor({ folder, tags, mainTag, seed }: PagesForParams): { pages?: Record<string, SiteTagPage> } {
    const names = Object.keys(seed.pages ?? {}).sort()
    for (const tag of names) {
      if (tag === mainTag || !tags.some((entry) => entry.tag === tag)) {
        throw new TypeError(
          `SiteDataBuilder.build():  pages.json5's ${folder}.pages names ${tag}, not a sub-tag of the family;  ` +
            "fix docs/__data/pages.json5"
        )
      }
    }
    if (!names.length) return {}
    return { pages: Object.fromEntries(names.map((tag) => [tag, { ...seed.pages![tag]! }])) }
  }

  /**
   * A family's main tag:  the seed's `mainTag`, else the tag named like the folder, else the first by name.
   * - `ui-parts` has no `<ui-parts>`:  its seed says `ui-header`.
   */
  private static mainTagFor(folder: string, tags: RawTag[], seed: SitePageSeed): string {
    if (seed.mainTag && tags.some((entry) => entry.tag === seed.mainTag)) return seed.mainTag
    if (tags.some((entry) => entry.tag === folder)) return folder
    return [...tags].sort((a, b) => a.name.localeCompare(b.name))[0]!.tag
  }

  ////////////////
  // ## pages.json5
  ////////////////

  /** pages.json5 as it is, plus a seed for every family it lacks;  families sorted, unknown ones kept. */
  private seedPages(tags: RawTag[]): SitePagesFile {
    const existing = existsSync(this.pagesFile) ? readJSON5File<SitePagesFile>(this.pagesFile) : undefined
    const families: Record<string, SitePageSeed> = { ...existing?.families }
    for (const folder of new Set(tags.map((entry) => entry.folder))) {
      families[folder] ??= this.seedFamily(
        folder,
        tags.filter((entry) => entry.folder === folder)
      )
    }
    return {
      $comment:
        "Hand-kept facts per family (title, summary, status, mainTag, `pages`:  sub-tags with a page of their own, " +
        "token-table overrides) read by `yarn site:data`.  Shape:  `SitePagesFile` in src/docs-components/docs-components.types.ts.  Edit by hand;  a new " +
        "family is added (seeded) by `yarn site:data`.",
      families: Object.fromEntries(Object.entries(families).sort(([a], [b]) => a.localeCompare(b)))
    }
  }

  /** A new family's facts, from its vocabulary. */
  private seedFamily(folder: string, tags: RawTag[]): SitePageSeed {
    const main = tags.find((entry) => entry.tag === folder) ?? tags[0]!
    return {
      title: SiteDataBuilder.nameFor(main.tag),
      summary: main.description ?? "",
      status: "done",
      ...(folder === "ui-parts" && { mainTag: "ui-header" })
    }
  }
}

/**
 * Where a `SiteDataBuilder` reads and writes;  each absolute, each defaulting to the Spell UI site's own.
 * Another package's elements (`packages/brand`'s `scripts/site-data.ts`) pass their own folders.
 * - NOTE: foundation tokens and theme sheets always come from Spell UI (`root`'s `src/styles/`)
 */
export type SiteDataBuilderProps = {
  /** `packages/ui/`, with a trailing slash;  default:  this checkout's */
  root?: string
  /** a folder of families laid out as `components/` (`<family>/UI<Name>.en.ts` + sheet) */
  components?: string
  /** doc-only families, as `src/docs-components/`;  `false`:  none */
  docs?: string | false
  /** the folder of `components.json5`, `pages.json5` and `search.json5`, as `docs/__data/` */
  data?: string
  /** the site's pages, as `docs/` (`SITE_PAGES`):  what `search.json5` is read from */
  pages?: string
  /** another component set's own facts:  `build()` makes the data the set's (`forSet()`) */
  set?: SiteSet
}

/** The group of a set's tag no group files. */
const OTHER = { id: "other", title: "Other" } as const

/** A tag before its family is known. */
type RawTag = Omit<SiteTag, "mainTag" | "main" | "page" | "href">

/** `SiteDataBuilder.pagesFor()`'s inputs:  one family's tags and seed. */
type PagesForParams = {
  /** the family's folder, e.g. `ui-checkbox` */
  folder: string
  /** its tags */
  tags: RawTag[]
  /** its main tag */
  mainTag: string
  /** its pages.json5 entry */
  seed: SitePageSeed
}
