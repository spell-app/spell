/**
 * The Epics page's cards (`epics/index.html`), as everything that writes them writes them:
 * ELEMENTS of the epics pack (epic `epic-engine` P3), which draw and sort themselves in the browser.
 * - `<epic-list>` (`epicListHtml()`):  the page's one list, every epic's card inside, flat
 *   - it draws the five GROUPS, in `EPIC_GROUPS`' order, each under a small heading with its count
 *     (epic `airplane` P8, Owen 2026-10-10:  "Divide the epics cards into groups - favorites - active - planning -
 *     urgent stuff to do - done done.  Within those bins, sort alphabetically"):
 *     - Favorites:  the epics Owen starred, whatever their state;  a starred epic shows ONLY here
 *     - Active:  phases left, in progress or paused (a paused one keeps its grey mark)
 *     - Planning:  future epics, and epics still being planned (no phases yet)
 *     - Urgent:  every phase done, items waiting on Owen (the `errors` state)
 *     - Done:  every phase done, nothing waiting
 *     - alphabetical by title within each, or newest first (`<epic-sort>`);  an empty group isn't drawn
 *   - and the SAGA CHIPS above them (epic `epic-workflow` P15):  one per saga with epics, in `sagas`' order
 *     (its `sagas` attribute), then "No saga";  a click shows only that saga's epics
 * - `<epic-card>` (`epicCardHtml()`), one per epic:  its facts as attributes, its title link, description and meta
 *   line as children;  it draws the state's mark, the saga's label, the STAR (click to star / unstar) and the date it
 *   was last worked on
 * - favourites are stored in ONE shared file, `FAVORITES_FILE` (`["airplane", "spell-element"]`):
 *   the page server's route writes it (`src/tool/epicRoutes.ts`), every checkout reads it (JSON5, its
 *   old `favorites.json` while there's no `.json5`:  `DataFile`, which the callers read it through)
 * - the sagas come from the caller (`docs index` reads `sagas/sagas.json5`):  this file imports nothing of them
 *   - each card carries its saga's id, title and purpose (`saga`, `saga-title`, `saga-purpose`),
 *     so the page server, which can't read the sagas, draws a running epic's card from the written ones
 *
 * Who writes them:
 * - `docs index` (`src/tools/index.js`), plain `node`:  it imports this FILE by path
 * - the page server, through epics' route module `runningRoutes.ts` (`RunningEpics`), which adds the running epics'
 *   cards and marks each card `running` and `favorite` as they are now, as it serves the page
 * - the elements (`src/components/epic-list/`) read the same rules from here:  `epicGroupFor()`, `byTitle()`
 *
 * Its position:  browser-safe, and imports ONLY files that load in plain `node`.
 * - each by its file name and relative path:  plain `node` resolves nothing else
 * - those files:  `./EpicState.ts`
 * - NEVER an alias, an `enum` or a parameter property:  plain `node` can't strip those
 */
import { PlanDates } from "spell-epic/dates/PlanDates.ts"
import { epicStateFor, type EpicFacts, type EpicState } from "./EpicState.ts"

/** The Epics page's groups, in the page's order. */
export const EPIC_GROUPS = ["favorites", "active", "planning", "urgent", "done"] as const

/** One of `EPIC_GROUPS`. */
export type EpicGroupName = (typeof EPIC_GROUPS)[number]

/** Where the favourites are kept, from a checkout's root:  a JSON list of epic ids (shared content). */
export const FAVORITES_FILE = "epics/favorites.json5"

/**
 * The Epics page's own markers, inside its `<epic-list>`, around its cards:  the page server adds the running epics'
 * cards before the end one (`RunningEpics`).
 */
export const EPIC_CARDS_START = "<!-- running-epics -->"
export const EPIC_CARDS_END = "<!-- running-epics:end -->"

/** A saga, as a card's label and the chips draw it:  `sagas/sagas.json5`'s fields (`spell-epic/tool/Sagas`). */
export type SagaLook = {
  /** `drawable-spell` */
  id: string
  /** "Drawable Spell" */
  title: string
  /** one line:  what it's for */
  purpose: string
}

/**
 * One epic's card, as `epicCardHtml()` writes it.
 * - `name`:  the epic (its folder);  `title`:  its epic page's title, without `Epic: `
 * - `href` / `target`:  the link to its epic page
 * - `description`:  its `<meta name="description">`, if any
 * - `meta`:  the meta line, as text:  `P8 · Review Polish · epics/airplane/airplane.plan.html`
 * - `facts`:  what its state is read from (`EpicState`)
 * - `worked`:  when it was last worked on (`lastWorked()`), if known
 * - `favorite`:  Owen starred it
 * - `saga`:  the saga it serves, if any (epic `epic-workflow` P15)
 */
export type EpicCard = {
  name: string
  title: string
  href: string
  target?: string
  description?: string
  meta: string
  facts: EpicFacts
  worked?: Date
  favorite?: boolean
  saga?: SagaLook
}

/**
 * A card's markup, with where it shows:  its group (a favourite's is `favorites`) and its title.
 * - the home page's Epics count is by `group` (`docs index`)
 */
export type PlacedCard = { group: EpicGroupName; title: string; html: string }

/**
 * The group an epic shows in when it isn't a favourite, from its state:
 * errors are Urgent, done is Done, future is Planning;
 * in progress or paused is Active with phases, Planning without (`state.count` is `""` with no phases).
 * - `<epic-list>` places its cards by it too
 */
export function epicGroupFor(state: EpicState): Exclude<EpicGroupName, "favorites"> {
  if (state.name === "errors") return "urgent"
  if (state.name === "done") return "done"
  if (state.name === "future" || !state.count) return "planning"
  return "active"
}

/**
 * Epic `card`'s `<epic-card>` on the Epics page, as of `now`, with where it shows.
 * - `id="epic-<name>"`:  a live update of the page matches the card by it;  `epic`:  its name
 * - its facts, which its state is read from (`EpicState`), so the card marks itself as it's drawn:
 *   `phases`, `updated`, `urgent`, `future`, `standing`, `active`
 *   - `running`, a session running for it, is the page server's to add (`RunningEpics`)
 * - `data-status`:  `done` or `open`, so the docs runtime counts it on the section's title and its state chips
 *   filter it, as they do a saga page's items
 * - `worked`:  its last-worked moment, local ISO
 * - `saga`, `saga-title`, `saga-purpose`:  its saga, for its label, the list's chips and the page server
 * - `favorite`:  starred
 * - children:  the title linking its epic page, then its description and meta line in their slots
 */
export function epicCardHtml(card: EpicCard, now: Date = new Date()): PlacedCard {
  const { name, title, facts, worked, favorite = false, saga } = card
  const state = epicStateFor(facts, now)
  const attributes =
    `id="epic-${attr(name)}" epic="${attr(name)}" data-status="${state.name === "done" ? "done" : "open"}"` +
    ` phases="${attr(facts.phases.join(" "))}"` +
    (facts.updated ? ` updated="${attr(facts.updated)}"` : "") +
    (facts.urgent?.length ? ` urgent="${attr(facts.urgent.join(" "))}"` : "") +
    (facts.future ? " future" : "") +
    (facts.standing ? " standing" : "") +
    (facts.active ? ` active="${attr(facts.active)}"` : "") +
    (worked ? ` worked="${isoLocal(worked)}"` : "") +
    (saga ? ` saga="${attr(saga.id)}" saga-title="${attr(saga.title)}" saga-purpose="${attr(saga.purpose)}"` : "") +
    (favorite ? " favorite" : "")
  const target = card.target ? ` target="${attr(card.target)}"` : ""
  const html =
    `<epic-card ${attributes}>\n` +
    `<a href="${attr(card.href)}"${target}>${text(title)}</a>\n` +
    (card.description ? `<span slot="description">${text(card.description)}</span>\n` : "") +
    `<span slot="meta">${text(card.meta)}</span>\n` +
    `</epic-card>`
  return { group: favorite ? "favorites" : epicGroupFor(state), title, html }
}

/**
 * The Epics page's list:  `<epic-list>`, holding every card (`cards`), which it groups, sorts and filters itself.
 * - `sagas`:  the sagas' ids, in their order, for its chips (`sagas`:  the list, `docs index`'s `readSagas()`)
 * - the cards between the page server's markers (`EPIC_CARDS_START` / `_END`)
 * - written by group, then title:  the order the list draws them in by default, so the page reads the same before the
 *   pack has drawn it, and a re-run with nothing new changes nothing
 */
export function epicListHtml(cards: readonly PlacedCard[], sagas: readonly SagaLook[]): string {
  // a copy, sorted in place:  no `toSorted()`, which every package that type-checks this file must know
  const ordered = [...cards].sort(
    (a, b) => EPIC_GROUPS.indexOf(a.group) - EPIC_GROUPS.indexOf(b.group) || byTitle(a.title, b.title)
  )
  return (
    `<epic-list class="spell-epics"${sagas.length ? ` sagas="${attr(sagas.map((saga) => saga.id).join(" "))}"` : ""}>\n` +
    `${EPIC_CARDS_START}\n${ordered.map((card) => card.html).join("\n")}\n${EPIC_CARDS_END}\n` +
    `</epic-list>`
  )
}

/** How the groups sort their cards:  by title, ignoring case, numbers as numbers. */
export function byTitle(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base", numeric: true })
}

/**
 * The latest of `values`, each a date as epic pages and git write them (`readEpicDate()`);
 * `undefined` when none reads.
 * - "last worked on":  the epic page's `updated` day, its last log line's time, its branch's last commit
 */
export function lastWorked(values: readonly (string | null | undefined)[]): Date | undefined {
  let latest: Date | undefined
  for (const value of values) {
    const date = readEpicDate(value)
    if (date && (!latest || date > latest)) latest = date
  }
  return latest
}

/** Every log line's time in epic-page markup `html` (`<epic-event at="...">`), in the order written. */
export function eventTimesIn(html: string): string[] {
  return Array.from(html.matchAll(EVENT_TIME), (match) => match[1]!)
}

/**
 * `value` as a moment:  `2026-10-08` (local midnight), `2026-10-08 14:34` (local), or ISO with an offset
 * (`2026-10-08T14:34-04:00`, git's `%cI`);  `undefined` when it won't read.
 * - the epic pages' own reading (`PlanDates.read()`), for a value that may be missing
 */
export function readEpicDate(value: string | null | undefined): Date | undefined {
  return value ? PlanDates.read(value)?.date : undefined
}

/**
 * The favourites file's data (`FAVORITES_FILE`, read as JSON5 by the caller:  `DataFile`) as a set of epic ids;
 * empty when it isn't a list.  NEVER throws.
 */
export function favoritesIn(list: unknown): Set<string> {
  return new Set(Array.isArray(list) ? list.filter((name): name is string => typeof name === "string") : [])
}

/** A log line's time:  `<epic-event at="2026-10-09T00:26-04:00">`, `$1`. */
const EVENT_TIME = /<epic-event\b[^>]*?\sat="([^"]+)"/g

/**
 * `date` as local ISO with its offset, to the minute:  `2026-10-09T14:34-04:00`:  a card's `worked`, which the newest-first
 * sort compares as text.
 */
export function isoLocal(date: Date): string {
  const two = (value: number) => String(Math.floor(Math.abs(value))).padStart(2, "0")
  const offset = -date.getTimezoneOffset()
  return (
    `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}` +
    `T${two(date.getHours())}:${two(date.getMinutes())}` +
    `${offset < 0 ? "-" : "+"}${two(offset / 60)}:${two(offset % 60)}`
  )
}

/** `value` as HTML text. */
function text(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** `value` as a double-quoted attribute. */
function attr(value: string): string {
  return text(value).replace(/"/g, "&quot;")
}
