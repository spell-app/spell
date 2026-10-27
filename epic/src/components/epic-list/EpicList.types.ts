/**
 * Loose types, constants and small pure helpers of the `epic-list` family:  the Epics page's list (`<epic-list>`),
 * its cards (`<epic-card>`) and its sort buttons (`<epic-sort>`), epic `epic-engine` P3.
 * - What a card's attributes say, read the same way by the card (to draw itself) and the list (to place it):
 *   `cardFactsOf()`, `listedCardOf()`
 * - Plain DOM reads, no Solid:  the list reads its cards' attributes, never their components,
 *   so a card counts before it has upgraded.
 */

// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"
import { readEpicDate, epicGroupFor, type EpicGroupName } from "spell/epic/list/EpicCards"
import { epicStateFor, type EpicFacts } from "spell/epic/list/EpicState"

/** The page server's route that stars and unstars an epic (`spell/epic/tool/epicRoutes.ts`). */
export const FAVORITE_API = "/api/epics/favorite"

/**
 * `localStorage` key of the sagas the Epics page shows:  a JSON list of their ids (`""` for No saga).
 * - absent:  every one
 * - one for every Epics page
 * - its older names, so a choice carries over:
 *   - `spell-epics-sagas`, before epic `prefs-and-undo` P4 (`OLD_KEYS`)
 *   - the docs runtime's, before epic `epic-engine` P3
 */
export const SAGAS_SHOWN_KEY = "spell-epics:sagas"

/**
 * `localStorage` key of the Epics page's sort:  `title` (the default) or `date`.
 * - `spell-epics-sort` before epic `prefs-and-undo` P4 (`OLD_KEYS`);  the docs runtime's before epic `epic-engine` P3
 */
export const SORT_KEY = "spell-epics:sort"

/**
 * Each key's name before epic `prefs-and-undo` P4, with no store:  moved over on its first read, once.
 * - TODO:  drop once every browser has opened the Epics page since
 */
const OLD_KEYS: Record<string, string> = { [SAGAS_SHOWN_KEY]: "spell-epics-sagas", [SORT_KEY]: "spell-epics-sort" }

/** How the Epics page sorts the cards in each group:  A to Z by title, or by when each was last worked on. */
export const SORTS = ["title", "date"] as const

/** One of `SORTS`. */
export type EpicSortName = (typeof SORTS)[number]

/** `<epic-sort>`'s event when the reader picks a sort:  every `<epic-list>` on the page follows it. */
export const SORT_EVENT = "epic-sorting"

/** `<epic-card>`'s event once the page server has starred or unstarred it:  its list sets every card's star. */
export const FAVORITE_EVENT = "epic-starred"

/** `epic-sort`'s detail. */
export type SortDetail = { sort: EpicSortName }

/** `epic-starred`'s detail:  the epic, starred or not, and every starred epic as the page server answered. */
export type FavoriteDetail = { epic: string; favorite: boolean; favorites: readonly string[] }

/** A card's tag:  the list's children. */
export const CARD_TAG = "epic-card"

/**
 * The attributes a card's place in the list is read from:  the list reads its cards again when one changes.
 * - `data-spell-hidden`:  the docs runtime's state chips hiding it (`spell-doc-runtime.js` `wireItemFilters()`)
 */
export const CARD_ATTRIBUTES = [
  "epic",
  "phases",
  "updated",
  "urgent",
  "future",
  "standing",
  "favorite",
  "worked",
  "saga",
  "saga-title",
  "saga-purpose",
  "data-spell-hidden"
]

/** How each group's heading reads:  its icon (an icon of the docs bundle's `ICONS`) and its title's text key. */
export const GROUP_LOOKS: Record<EpicGroupName, { icon: string; title: GroupTitleKey }> = {
  favorites: { icon: "star", title: "favoritesTitle" },
  active: { icon: "circle half stroke", title: "activeTitle" },
  planning: { icon: "seedling", title: "planningTitle" },
  urgent: { icon: "circle exclamation", title: "urgentTitle" },
  done: { icon: "circle check", title: "doneTitle" }
}

/** A group's title, a text key of `<epic-list>`'s vocabulary. */
export type GroupTitleKey = "favoritesTitle" | "activeTitle" | "planningTitle" | "urgentTitle" | "doneTitle"

/** One card as its list places it, read from its attributes and its title link (`listedCardOf()`). */
export type ListedCard = {
  /** the `<epic-card>` */
  element: Element
  /** its epic's name:  `airplane` */
  epic: string
  /** its title, its link's text:  what A to Z sorts by */
  title: string
  /** its group:  `favorites` when starred, else by its state (`epicGroupFor()`) */
  group: EpicGroupName
  /** when it was last worked on, local ISO (`2026-10-09T14:34-04:00`):  newest first sorts by it;  `""` unknown */
  worked: string
  /** its saga's id, title and purpose;  `""` for none */
  saga: string
  sagaTitle: string
  sagaPurpose: string
  /** hidden by the docs runtime's state chips (`data-spell-hidden`) */
  isFiltered: boolean
}

/**
 * A card's attributes its state is read from, as its attribute getters give them (`EpicCard`) or the DOM does
 * (`cardAttributesOf()`):  `phases` and `urgent` space-separated.
 */
export type CardAttributes = {
  phases?: string | null
  updated?: string | null
  urgent?: string | null
  future?: boolean
  standing?: boolean
  running?: boolean
  active?: string | null
}

/** The facts a card's state is read from (`EpicState`), from its attributes. */
export function cardFactsOf(card: CardAttributes): EpicFacts {
  const list = (value: string | null | undefined) => (value ?? "").split(/\s+/).filter(Boolean)
  return {
    phases: list(card.phases),
    updated: card.updated || undefined,
    urgent: list(card.urgent),
    future: !!card.future,
    standing: !!card.standing,
    running: !!card.running,
    active: card.active || undefined
  }
}

/** Card `element`'s attributes its state is read from, from the DOM. */
export function cardAttributesOf(element: Element): CardAttributes {
  const read = (name: string) => element.getAttribute(name)
  return {
    phases: read("phases"),
    updated: read("updated"),
    urgent: read("urgent"),
    future: element.hasAttribute("future"),
    standing: element.hasAttribute("standing"),
    running: element.hasAttribute("running"),
    active: read("active")
  }
}

/**
 * Card `element` as its list places it (`ListedCard`).
 * - `favorites`:  a starred card goes under Favorites;  `false`, in its own group (`<epic-list no-favorites>`)
 */
export function listedCardOf(element: Element, favorites = true): ListedCard {
  const read = (name: string) => element.getAttribute(name)
  const epic = read("epic") ?? ""
  const state = epicStateFor(cardFactsOf(cardAttributesOf(element)))
  const group = favorites && element.hasAttribute("favorite") ? "favorites" : epicGroupFor(state)
  return {
    element,
    epic,
    title: (element.querySelector(":scope > a")?.textContent ?? epic).replace(/\s+/g, " ").trim() || epic,
    group,
    worked: read("worked") ?? "",
    saga: read("saga") ?? "",
    sagaTitle: read("saga-title") ?? "",
    sagaPurpose: read("saga-purpose") ?? "",
    isFiltered: element.hasAttribute("data-spell-hidden")
  }
}

/** Last-worked `value` (`worked`, local ISO) as a card's date:  `10/9`;  `undefined` when it won't read. */
export function shortDay(value: string | null | undefined): string | undefined {
  const date = readEpicDate(value)
  return date ? `${date.getMonth() + 1}/${date.getDate()}` : undefined
}

/** The JSON list kept under `key`, or `undefined`:  none, not a list, or no storage.  NEVER throws. */
export function savedList(key: string): string[] | undefined {
  const value = kept(key)
  return Array.isArray(value) ? value.filter((each): each is string => typeof each === "string") : undefined
}

/** The sort kept under `SORT_KEY`:  `title` unless it says `date`.  NEVER throws. */
export function savedSort(): EpicSortName {
  return kept(SORT_KEY) === "date" ? "date" : "title"
}

/** Keep `value` under `key`, as text or JSON;  a browser that blocks storage keeps it for the visit.  NEVER throws. */
export function save(key: string, value: unknown) {
  PrefStore.setAt(key, value)
}

/** The value kept under `key`, its old name's moved over first (`OLD_KEYS`). */
function kept(key: string): unknown {
  const old = OLD_KEYS[key]
  if (old) PrefStore.moveOldKey(old, key)
  return PrefStore.getAt(key)
}
