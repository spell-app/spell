/**
 * The types and constants of the docs nav family:  what the component, its index (`NavIndex`)
 * and its stored preferences (`NavPreferences`) share.
 * - Data only:  nothing here runs.
 */

import type { SiteStatus } from "spell/ui/docs-components/docs-components.types"

import type { docsNavVocabulary } from "./UIDocsNav.en"

/** `docsNavVocabulary`'s type. */
export type DocsNavVocabulary = typeof docsNavVocabulary

/** A `docsNavVocabulary` text key. */
export type DocsNavText = DocsNavVocabulary["texts"][number]["key"]

////////////////
// ## Pages
////////////////

/**
 * One hand-written page of the site:  a top link or a Foundation link.
 * - Spell UI's are built in (`TOP_PAGES`, `FOUNDATION_PAGES`), labelled by vocabulary text;  another site's come from
 *   its data (`SiteDataFile.nav`), labelled as written there
 */
export type NavPage = {
  /** what `current` names it by:  its file name without `.html`, e.g. `getting-started` */
  readonly id: string
  /** its file, relative to the site root */
  readonly file: string
  /** the vocabulary text of its label (Spell UI's pages) */
  readonly text?: DocsNavText
  /** its label as written (another site's pages, from its data);  wins over `text` */
  readonly label?: string
  /** its row's icon (the default `fa7-free` pack), as the brand's nav rows have */
  readonly icon: string
}

/** The "Get started" group's links, above the components. */
export const TOP_PAGES: readonly NavPage[] = [
  { id: "index", file: "index.html", text: "overview", icon: "house" },
  { id: "getting-started", file: "getting-started.html", text: "gettingStarted", icon: "rocket" },
  { id: "grammar", file: "grammar.html", text: "grammar", icon: "spell check" },
  { id: "components", file: "components/index.html", text: "allComponents", icon: "cubes" }
]

/** Foundation links, below the components. */
export const FOUNDATION_PAGES: readonly NavPage[] = [
  { id: "theming", file: "theming.html", text: "theming", icon: "palette" },
  { id: "utilities", file: "utilities.html", text: "utilities", icon: "screwdriver wrench" },
  { id: "icons", file: "icons.html", text: "icons", icon: "icons" },
  { id: "kitchen-sink", file: "kitchen-sink.html", text: "kitchenSink", icon: "sink" }
]

////////////////
// ## Groups
////////////////

/**
 * The panel's groups, top to bottom:  each a band that folds its links away.
 * - `start`:  the intro pages
 * - `favorites`:  the starred components
 * - `components`:  every component, A-Z or a band per topic
 * - `foundation`:  the Foundation pages
 */
export const NavGroups = ["start", "favorites", "components", "foundation"] as const
/** One of `NavGroups`, e.g. `"components"`. */
export type NavGroup = (typeof NavGroups)[number]

/** `current` when the page's own file name says nothing (`/components/ui/`):  the overview. */
export const INDEX_PAGE = "index"

/** Extension stripped from the page's file name to get `current`. */
export const PAGE_EXTENSION = ".html"

////////////////
// ## Index
////////////////

/** `view`'s values:  every component A-Z, or grouped by topic. */
export const NavViews = ["az", "topics"] as const
/** One of `NavViews`, e.g. `"topics"`. */
export type NavView = (typeof NavViews)[number]

/** `view` when neither the page nor the viewer chose one. */
export const DEFAULT_VIEW: NavView = "topics"

/** One component tag in the lists. */
export type NavRow = {
  /** e.g. `ui-or` */
  readonly tag: string
  /** display name, e.g. `Or` */
  readonly name: string
  /**
   * docs page, relative to the site root:  `components/<tag>.html` for a tag with its own page,
   * else its family page plus `#<tag>` (`components/ui-button.html#ui-or`)
   */
  readonly href: string
  /**
   * `href` is a page of its own (a family's main tag, or a sub-tag split onto its own page:  `ui-radio`):
   * the row that can be current
   */
  readonly page: boolean
  /** topic ids it's filed under */
  readonly topics: readonly string[]
  /** its page's status (its own page's, else its family's), when not `done`:  shown as a badge */
  readonly status?: Exclude<SiteStatus, "done">
  /** search key (`NavIndex.key()`):  name, tag, topics (ids and titles), other names */
  readonly search: string
}

/** One topic and its tags, A-Z. */
export type NavTopic = {
  /** topic id, e.g. `date & time` */
  readonly id: string
  /** display title, e.g. `Date & time` */
  readonly title: string
  /** its tags' rows, A-Z */
  readonly rows: readonly NavRow[]
}

/** Joins the terms of a search key:  `NavIndex.normalize()` never leaves it in a query, so no match spans two. */
export const SEARCH_SEPARATOR = "|"

////////////////
// ## Preferences
////////////////

/**
 * `localStorage` keys, the SAME as the old Astro site's (`ComponentBrowser`), so a viewer keeps their favourites.
 * - `favorites`:  starred tags, a JSON list
 * - `view`:  `topics`, or absent for A-Z
 * - `openTopics`:  topic ids the viewer opened, a JSON list
 * - `closedGroups`:  `NavGroup`s the viewer folded away, a JSON list (new with the panel:  every group starts open)
 */
export const STORAGE_KEYS = {
  favorites: "spell-ui-site:favorites",
  view: "spell-ui-site:components-view",
  openTopics: "spell-ui-site:open-topics",
  closedGroups: "spell-ui-site:closed-groups"
} as const

////////////////
// ## Element
////////////////

/** Icons of the view switch (the default `fa7-free` pack). */
export const ICONS = {
  az: "arrow down a z",
  topics: "layer group"
} as const

/** `data-*` names the click handler finds its targets by, in the shadow root. */
export const DATA = {
  /** a view switch button:  its `NavView` */
  view: "data-nav-view"
} as const
