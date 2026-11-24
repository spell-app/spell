import { withoutAccents } from "spell/ui/util"
// A leaf, not the barrel:  the one place that knows the Spell UI site's addresses
import { SpellUIGuide } from "spell/ui/util/SpellUIGuide"
import type { SiteDataFile, SiteSearchFile, SiteTag } from "spell/ui/docs-components/docs-components.types"
import { SitePages, type SitePage } from "spell/ui/components/ui-site-nav/SitePages"
// A leaf, not the barrel:  the barrel defines `<ui-toc>`
import { PageOutline } from "spell/ui/components/ui-toc/PageOutline"
import {
  GROUP_LIMIT,
  INSIDE_MIN,
  KIND_WEIGHT,
  SCORES,
  TRAIL,
  type SearchEntry,
  type SearchGroup,
  type SearchHit,
  SearchKinds,
  type SearchKind
} from "./UIDocsSearch.types"

/****************
 * ### `SearchIndex`
 * What `<ui-docs-search>` searches, and how it ranks:  every component tag, every attribute, every page and every
 * page's sections, built once from the site's data (`components.json5` + `search.json5`);  the page shown's sections
 * come live, per search (`here()`, on the table of contents' `PageOutline`).
 * - Or a site's own list of pages (`pages`):  each found by its title and its tags.
 * - The Spell UI site's search file lists its pages by ADDRESS (`/button/api`, `SiteSearchBuilder.spellSite()`):
 *   then every component and attribute links to that site too (`landing()`), not to the old page its data names
 *   (`ui-button.html#ui-or`):  a component to its family's page (or the section of it named for the tag),
 *   an attribute to the Attributes section of its family's API page.
 * - Matching is blind to case and accents.  The WHOLE query is tried against the title (exact, start,
 *   a word's start, inside), then against each term (a tag, another name, a topic ...);  failing those,
 *   every WORD of the query must start a word somewhere (title or terms), so `button circular` finds `circular` on
 *   `<ui-button>`. Inside-a-word matches need `INSIDE_MIN` characters:  `or` finds `Or`, never every `color`.
 * - Ranking:  `SCORES` by how it matched, times `KIND_WEIGHT`, plus the entry's `boost`, minus a little per title
 *   character (the shorter title wins a tie).  Groups show their best `GROUP_LIMIT`;  the group with the best hit
 *   comes first (ties:  `SearchKinds` order).
 * - The page shown:  its own sections come from the DOM, so the search file's copy of that page is skipped;
 *   its attributes get a small boost.
 * - Plain data, no Solid:  the element keeps the query in a signal and asks `search()`.
 ****************/
export class SearchIndex {
  /** Every entry, but the page shown's sections. */
  readonly entries: readonly SearchEntry[]

  /** Entries of each page's sections, by page path:  skipped for the page shown. */
  private readonly pageOf: ReadonlyMap<SearchEntry, string>

  /** Folded (`fold()`) title and terms of each entry, made once. */
  private readonly keys: ReadonlyMap<SearchEntry, Key>

  /** Index what loaded:  `data`'s tags and attributes, `search`'s pages and sections, `pages`;  none:  an empty index. */
  constructor({ data, search, pages }: SearchIndexProps = {}) {
    const entries: SearchEntry[] = (pages ? SitePages.allOf(pages) : []).flatMap((page) => SearchIndex.sitePage(page))
    const pageOf = new Map<SearchEntry, string>()
    const families = data?.families ?? {}
    const topics = data?.topics ?? []
    const site = SearchIndex.siteOf(search)
    for (const tag of data?.components ?? []) {
      const link = tag.href ?? `${tag.mainTag}.html#${tag.tag}`
      const family = Object.hasOwn(families, tag.folder) ? families[tag.folder]!.title : tag.name
      const href = site ? SearchIndex.landing(site, link, [link.split("#")[1] ?? "", tag.tag]) : link
      const component = SearchIndex.component(tag, family, topics, href)
      entries.push(component)
      pageOf.set(component, href.replace(/#.*$/, ""))
      const api = site
        ? SearchIndex.landing(site, link, [tag.tag, ATTRIBUTES])
        : `${link.replace(/#.*$/, "")}#${tag.tag}`
      for (const attribute of SearchIndex.attributes(tag, api, family)) {
        entries.push(attribute)
        pageOf.set(attribute, api.replace(/#.*$/, ""))
      }
    }
    for (const page of search?.pages ?? []) {
      if (!page.tag) {
        const entry: SearchEntry = {
          kind: "page",
          title: page.title,
          ...(page.summary && { context: page.summary }),
          href: page.path,
          terms: [page.path.replace(/\.html$/, "").replace(/\/index$/, "")]
        }
        entries.push(entry)
        pageOf.set(entry, page.path)
      }
      page.sections.forEach((section, at) => {
        const entry: SearchEntry = {
          kind: "section",
          title: section.title,
          context: [page.title, ...PageOutline.trail(page.sections, at, page.tabs)].join(TRAIL),
          href: `${page.path}#${section.id}`,
          terms: [page.title, section.id]
        }
        entries.push(entry)
        pageOf.set(entry, `${page.path}#`)
      })
    }
    this.entries = entries
    this.pageOf = pageOf
    this.keys = new Map(entries.map((entry) => [entry, SearchIndex.key(entry)]))
  }

  /**
   * The groups `query` finds, best first.
   * - `here`:  the page shown's sections (`SearchIndex.here()`), searched like the rest
   * - `current`:  the page shown's path from the site root (`components/ui-divider.html`):
   *   its search-file sections are skipped (`here` has them, live), its attributes boosted
   */
  search(query: string, here: readonly SearchEntry[] = [], current?: string): SearchGroup[] {
    const words = SearchIndex.words(query)
    if (!words.length) return []
    const folded = words.join(" ")
    const hits = new Map<SearchKind, SearchHit[]>()
    for (const entry of here) consider(entry, SearchIndex.key(entry), 0)
    for (const entry of this.entries) {
      const page = this.pageOf.get(entry)
      if (current && page === `${current}#`) continue
      consider(entry, this.keys.get(entry)!, current && page === current ? HERE_BOOST : 0)
    }
    const groups = [...hits].map(([kind, list]) => ({
      kind,
      hits: list.sort(SearchIndex.compare).slice(0, GROUP_LIMIT[kind])
    }))
    return groups.sort(
      (a, b) => b.hits[0]!.score - a.hits[0]!.score || SearchKinds.indexOf(a.kind) - SearchKinds.indexOf(b.kind)
    )

    /** Score `entry` (its `key`, plus `bonus`), filing a hit under its kind. */
    function consider(entry: SearchEntry, key: Key, bonus: number) {
      const hit = SearchIndex.match({ entry, key, query: folded, words, bonus })
      if (!hit) return
      const list = hits.get(entry.kind)
      if (list) list.push(hit)
      else hits.set(entry.kind, [hit])
    }
  }

  ////////////////
  // ## The Spell UI site's links
  ////////////////

  /** The Spell UI site's pages, with their sections' ids:  `search`'s, when it lists pages by address;  else none. */
  private static siteOf(search: SiteSearchFile | undefined): SitePageIds[] | undefined {
    const pages = search?.pages ?? []
    if (!pages.length || !pages.every((page) => page.path.startsWith("/"))) return undefined
    return pages.map((page) => ({ path: page.path, ids: new Set(page.sections.map((section) => section.id)) }))
  }

  /**
   * Where `link`, an old components page (`ui-button.html#ui-or`), lands on the Spell UI site:
   * the first of `ids` that a page of its family has (the family's page or one under it:  `/button/api#attributes`),
   * else the family's page (`/button`).
   */
  private static landing(site: readonly SitePageIds[], link: string, ids: readonly string[]): string {
    const address = SpellUIGuide.siteAddressOf(link.replace(/[?#].*$/, ""))
    const pages = site.filter((page) => page.path === address || page.path.startsWith(`${address}/`))
    for (const id of ids) {
      const page = id ? pages.find((each) => each.ids.has(id)) : undefined
      if (page) return `${page.path}#${id}`
    }
    return address
  }

  ////////////////
  // ## Matching
  ////////////////

  /** `root`'s sections as search entries of the page shown, in document order (`PageOutline`);  none without a root. */
  static here(root: Element | undefined): SearchEntry[] {
    if (!root) return []
    const { sections, tabs } = PageOutline.sections(root)
    return sections.map((section, at) => {
      const trail = PageOutline.trail(sections, at, tabs)
      return {
        kind: "here" as const,
        title: section.title,
        ...(trail.length && { context: trail.join(TRAIL) }),
        href: `#${section.id}`,
        terms: [section.id, ...trail]
      }
    })
  }

  /** `text` folded for matching:  lower case, no accents, single spaces. */
  static fold(text: string): string {
    return withoutAccents(text.normalize("NFKD")).toLowerCase().replace(/\s+/g, " ").trim()
  }

  /** `text` without anything but letters and digits:  `ui-or` ~== `uior` ~== `UI Or`. */
  static compact(text: string): string {
    return SearchIndex.fold(text).replace(/[^\p{L}\p{N}]+/gu, "")
  }

  /** The words of a query, folded;  `›` and `>` separate words too (`ui-button › circular`). */
  static words(query: string): string[] {
    return SearchIndex.fold(query)
      .split(/[\s›>]+/)
      .filter(Boolean)
  }

  /**
   * Where `needle` starts a word in `haystack` (both folded):  at the start, or after anything that isn't a letter
   * or digit;  -1 when it never does.
   */
  static wordStart(haystack: string, needle: string): number {
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
      if (at === 0 || !/[\p{L}\p{N}]/u.test(haystack[at - 1]!)) return at
    }
    return -1
  }

  /** `entry`'s hit for the folded `query` (and its `words`), `bonus` added;  `undefined` when it doesn't match. */
  private static match({ entry, key, query, words, bonus }: MatchInput): SearchHit | undefined {
    const title = SearchIndex.titleScore(key, query)
    const term = SearchIndex.termScore(key, query)
    const spread = words.length > 1 ? SearchIndex.wordsScore(key, words) : 0
    const best = Math.max(title, term, spread)
    if (!best) return undefined
    const score = best * KIND_WEIGHT[entry.kind] + (entry.boost ?? 0) + bonus - key.title.length * LENGTH_COST
    const marks = title ? SearchIndex.marks(key.title, [query]) : SearchIndex.marks(key.title, words)
    return { entry, score, marks }
  }

  /** How the whole query matches the title (0:  it doesn't). */
  private static titleScore(key: Key, query: string): number {
    if (key.title === query || key.titleCompact === SearchIndex.compact(query)) return SCORES.titleExact
    if (key.title.startsWith(query)) return SCORES.titleStart
    if (SearchIndex.wordStart(key.title, query) !== -1) return SCORES.titleWord
    if (query.length >= INSIDE_MIN && key.title.includes(query)) return SCORES.titleInside
    return 0
  }

  /** How the whole query matches the best term (0:  none does). */
  private static termScore(key: Key, query: string): number {
    const compact = SearchIndex.compact(query)
    let best = 0
    for (const [index, term] of key.terms.entries()) {
      const termCompact = key.termsCompact[index]!
      if (term === query || (compact && termCompact === compact)) return SCORES.termExact
      if (term.startsWith(query) || (compact.length >= INSIDE_MIN && termCompact.startsWith(compact)))
        best = Math.max(best, SCORES.termStart)
      else if (SearchIndex.wordStart(term, query) !== -1) best = Math.max(best, SCORES.termWord)
      else if (query.length >= INSIDE_MIN && term.includes(query)) best = Math.max(best, SCORES.termInside)
    }
    return best
  }

  /** Every word starts a word of the title or a term (0:  one doesn't);  more for each found in the title. */
  private static wordsScore(key: Key, words: readonly string[]): number {
    let inTitle = 0
    for (const word of words) {
      if (SearchIndex.wordStart(key.title, word) !== -1) inTitle++
      else if (!key.terms.some((term) => SearchIndex.wordStart(term, word) !== -1)) return 0
    }
    return SCORES.words + SCORES.wordInTitle * inTitle
  }

  /**
   * Ranges of `title` (folded:  same length as shown, `fold()` keeps every character's place) to highlight:
   * each needle at its first word start, else its first place inside a word.
   */
  static marks(title: string, needles: readonly string[]): [number, number][] {
    const ranges: [number, number][] = []
    for (const needle of needles) {
      let at = SearchIndex.wordStart(title, needle)
      if (at === -1 && needle.length >= INSIDE_MIN) at = title.indexOf(needle)
      if (at !== -1) ranges.push([at, at + needle.length])
    }
    ranges.sort((a, b) => a[0] - b[0])
    const merged: [number, number][] = []
    for (const range of ranges) {
      const last = merged.at(-1)
      if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
      else merged.push(range)
    }
    return merged
  }

  /** Best first;  then A-Z by title. */
  private static compare(a: SearchHit, b: SearchHit): number {
    return b.score - a.score || a.entry.title.localeCompare(b.entry.title)
  }

  /**
   * `entry`'s folded title and terms.
   * - The title keeps its LENGTH (lower case only, `toLowerCase()` of the shown text):  `marks()` index the shown
   *   title.  Accents fold through `fold()` only where that keeps the length.
   */
  private static key(entry: SearchEntry): Key {
    const lower = entry.title.toLowerCase()
    const folded = SearchIndex.fold(entry.title)
    const title = folded.length === lower.length ? folded : lower
    const terms = entry.terms.map((term) => SearchIndex.fold(term)).filter(Boolean)
    return {
      title,
      titleCompact: SearchIndex.compact(entry.title),
      terms,
      termsCompact: terms.map((term) => SearchIndex.compact(term))
    }
  }

  ////////////////
  // ## Entries
  ////////////////

  /** A page of a site's own list:  found by its title and tags, its first tag shown under it;  none with no address. */
  private static sitePage({ title, href, tags = [] }: SitePage): SearchEntry[] {
    return href ? [{ kind: "page", title, ...(tags[0] && { context: tags.join(", ") }), href, terms: [...tags] }] : []
  }

  /** A component tag, linking to `href`:  its name, its tag in mono, found by its tag, other names and topics. */
  private static component(tag: SiteTag, family: string, topics: SiteDataFile["topics"], href: string): SearchEntry {
    const titles = tag.topics.map((id) => topics.find((topic) => topic.id === id)?.title ?? id)
    return {
      kind: "component",
      title: tag.name,
      code: `<${tag.tag}>`,
      ...(!tag.main && { context: family }),
      href,
      terms: [tag.tag, ...tag.aka, ...(tag.main ? [] : [family]), ...titles],
      ...(tag.page && { boost: PAGE_BOOST })
    }
  }

  /**
   * `tag`'s attributes:  each lands on its tag's API tables, `href`:
   * - the Spell UI site's:  its family's API page, its Attributes section (`/button/api#attributes`)
   * - an old components page's:  `#<tag>`, a family `<ui-docs-api>`'s header for that tag, or a page's own
   *   `<ui-docs-api tag>` (`ui-radio.html#ui-radio`;  `SiteSections` lands both)
   */
  private static attributes(tag: SiteTag, href: string, family: string): SearchEntry[] {
    return tag.attributes.map((attribute) => ({
      kind: "attribute",
      title: attribute.name,
      code: `<${tag.tag}>`,
      context: family,
      href,
      terms: [tag.tag, tag.name, ...(attribute.aliases ?? [])]
    }))
  }
}

/** What a `SearchIndex` is built from:  the site's files that loaded. */
export type SearchIndexProps = {
  /** `components.json5`:  tags and their attributes */
  data?: SiteDataFile
  /** `search.json5`:  pages and their sections */
  search?: SiteSearchFile
  /** a site's own pages, each found by its title and tags */
  pages?: readonly SitePage[]
}

/** What `SearchIndex.match()` scores:  an entry, its key, the folded query and its words, and a bonus. */
type MatchInput = {
  /** the entry tried */
  entry: SearchEntry
  /** its folded text (`SearchIndex.key()`) */
  key: Key
  /** the whole query, folded */
  query: string
  /** the query's words, folded */
  words: readonly string[]
  /** added to the score:  the page shown's own attributes */
  bonus: number
}

/** An entry's text, folded once for matching. */
type Key = {
  /** the title, lower case, the shown title's length */
  readonly title: string
  /** the title, letters and digits only (`SearchIndex.compact()`) */
  readonly titleCompact: string
  /** the terms, folded */
  readonly terms: readonly string[]
  /** the terms, letters and digits only */
  readonly termsCompact: readonly string[]
}

/** A page of the Spell UI site, and its sections' ids:  where a component or attribute lands (`landing()`). */
type SitePageIds = {
  /** its address, `/button/api` */
  readonly path: string
  /** its sections' ids */
  readonly ids: ReadonlySet<string>
}

/** The section of a family's API page that lists every tag's attributes (`API.spell`'s `Attributes`). */
const ATTRIBUTES = "attributes"

/** Boost of a tag with a page of its own (a family's main tag, `ui-radio`) over a sub-tag on its family's page. */
const PAGE_BOOST = 20

/** Boost of an entry on the page shown (its attributes). */
const HERE_BOOST = 40

/** Score taken off per title character:  shorter titles win ties. */
const LENGTH_COST = 0.5
