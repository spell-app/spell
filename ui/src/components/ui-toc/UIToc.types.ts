/**
 * The types and constants of the table of contents family:
 * what the component, its heading scan (`TocIndex`) and the page reader (`PageOutline`) share.
 * - Data only:  nothing here runs.
 */

import type { tocVocabulary } from "./UIToc.en"

/** `tocVocabulary`'s type. */
export type TocVocabulary = typeof tocVocabulary

////////////////
// ## Entries
////////////////

/** One link of the list:  a section (level 2 heading, top-level `<ui-section>`) or an entry under it. */
export type TocEntry = {
  /** id of its target, set by `TocIndex` when the target had none */
  readonly id: string
  /** link text */
  readonly text: string
  /** the heading, section or example it links to */
  readonly target: Element
  /**
   * entries under it, in page order:  a section's examples and level 3 headings (up to the next level 2 heading),
   * a `<ui-section>`'s nested sections, examples and headings;  `[]` for none
   */
  readonly entries: readonly TocEntry[]
}

/** A top-level entry:  a level 2 heading or a `<ui-section>` inside no other, with the entries under it. */
export type TocSection = TocEntry

/** What a toc follows (`TocIndex.followed()`):  the element `for` names (else the page's `main`), and its tabs. */
export type FollowedContent = {
  /** the element whose headings are listed */
  readonly root: Element
  /** `root` itself, when it's a `<ui-tabs>`:  then only its shown pane is listed */
  readonly tabs?: Element
}

/**
 * One section of a page, as `PageOutline.sections()` reads it:  where a link to it lands.
 * - The docs site's search file holds every page's (`SiteSearchPage.sections`).
 */
export type OutlineSection = {
  /** its id, the hash that lands on it, e.g. `examples-types-vertical-divider` */
  readonly id: string
  /** its title, e.g. `Vertical Divider` */
  readonly title: string
  /** index in the page's sections of the section around it */
  readonly parent?: number
  /** value of the tab it's in (the page's tabs), on a top-level section only */
  readonly tab?: string
}

/**
 * What becomes a SECTION:  a level 2 page header, or a `<ui-section>` inside no other (inside one:
 * an entry of it, at any depth).
 * - Light DOM only:  a widget's shadow headers are listed only when it marks them (`UIT.TocMarks.entry`).
 */
export const SECTION_SELECTOR = 'ui-header[level="2"], h2, ui-section'

/**
 * What becomes an ENTRY under the current section:  an example with a header, or a level 3 page header.
 * Inside a `<ui-section>`, under that section.
 */
export const ENTRY_SELECTOR = 'ui-example[heading], ui-header[level="3"], h3'

/** Both, for one ordered query. */
export const HEADING_SELECTOR = `${SECTION_SELECTOR}, ${ENTRY_SELECTOR}`

/** A tag whose shadow root a heading must not be inside:  an example's own title is its `heading` attribute. */
export const EXAMPLE_TAG = "ui-example"

/** A section that nests:  its title is its `label` attribute or its `slot="label"` child (`UIT.SectionTitle`). */
export const SECTION_TAG = "ui-section"

/** The tab set a `for` may name:  then the toc follows its shown pane. */
export const TABS_TAG = "ui-tabs"

/** Share of the viewport, below the scroll padding, a heading must pass to be the one in view. */
export const READING_LINE = 0.2

/** Default `size`. */
export const DEFAULT_SIZE = "small"

////////////////
// ## Folds
////////////////

/** What the header's toggle last did, on any page:  every section open, or every section folded. */
export type TocAllFolds = (typeof TOC_ALL_FOLDS)[number]

/** `TocAllFolds`' values. */
export const TOC_ALL_FOLDS = ["expanded", "collapsed"] as const

/** The viewer's own folds on one page, by section id:  `true` opened, `false` folded. */
export type TocFolds = Readonly<Record<string, boolean>>

/**
 * Where a toc keeps its folds (`TocPreferences`):  the `PrefStore` name, and its keys.
 * - Its name followed the tag (epic `ui-gaps` P14):  folds kept under the docs widget's old name are read no more.
 * - `all`:  the toggle's `TocAllFolds`, ONE for every page in this browser
 * - `folds`:  + the page's path, its `TocFolds`
 */
export const TOC_PREFS = { store: "spell-ui-toc", all: "all", folds: "folds:" } as const
