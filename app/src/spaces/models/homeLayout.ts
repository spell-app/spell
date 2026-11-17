import { CARD_LINE_LENGTH } from "./projectGroups"
import { HOME_HIDDEN_KEY, HOME_ORDER, type HomeOrderChange } from "./homeOrder"
import HOME_TEXTS_LIST from "./homeTexts.json"

/**
 * How the editor's home page is laid out:  its order (`HOME_ORDER`), and the words people changed on it
 * (epic `mockup` T51, "Rearrange Home Screen").
 * - Two layers, read in this order:
 *   - the DEFAULTS, everyone's:  `homeOrder.json` and `homeTexts.json` beside this file, changed only by `@spell`'s
 *     people, in Spell's own checkout
 *   - a person's OWN changes, laid over them (`layeredHome()`):  kept in their space's preferences,
 *     else this device's storage
 * - Words are changed in place while rearranging:  a card's title and tagline, a section's header and line.
 *   - NOT in the projects' own files:  a project's name and description stay as its author wrote them,
 *     and the home page alone shows the change.
 * - Browser-safe:  the editor imports it, and the server writes both layers with `withHomeChange()`.
 */
export type HomeLayout = {
  /** Each group's order, the sections' (`HOME_SECTIONS_KEY`), the start cards' (`HOME_START_KEY`):  `HOME_ORDER`'s shape. */
  order: Readonly<Record<string, readonly string[]>>
  /** The words changed, by what they're on (`homeTextKey()`). */
  texts: Readonly<Record<string, HomeText>>
}

/** The words of one card or section, as changed:  a word left out is its own (the project's, the editor's). */
export type HomeText = {
  /** a card's title, a section's header */
  title?: string
  /** a card's tagline, a section's quiet line */
  line?: string
}

/** The words changed on the home page, everyone's:  `homeTexts.json`, by `homeTextKey()`. */
export const HOME_TEXTS: Readonly<Record<string, HomeText>> = HOME_TEXTS_LIST

/** Everyone's layout:  Spell's order and words, as this build has them. */
export const HOME_DEFAULTS: HomeLayout = { order: HOME_ORDER, texts: HOME_TEXTS }

/** A layout with nothing in it:  a person who changed nothing. */
export const NO_HOME_CHANGES: HomeLayout = { order: {}, texts: {} }

/**
 * The key of the start cards' order in `HomeLayout.order`:  `"start"`, their ids (`HOME_START_CARDS`).
 * - Not a group's address, which always has an `@`.
 */
export const HOME_START_KEY = "start"

/** The start cards, by id, in their order when nobody has moved them:  Counter first (epic `mockup` T50). */
export const HOME_START_CARDS = ["counter", "todo", "converter", "blank"] as const

/** One of `HOME_START_CARDS`. */
export type HomeStartCard = (typeof HOME_START_CARDS)[number]

/**
 * What a change of words is kept under, by what it's on:
 * - a project's card:  its address, `@spell/examples/Weather`, in any language:  its words are its own, not the editor's
 * - a section's header and line:  `section:examples:en`, per language, as the editor's own words are
 * - a start card:  `start:counter:en`, likewise
 */
export function homeTextKey(on: { project: string } | { section: string; lang: string } | { start: string; lang: string }) {
  if ("project" in on) return on.project
  if ("section" in on) return `section:${on.section}:${on.lang}`
  return `start:${on.start}:${on.lang}`
}

/**
 * `mine` laid over `defaults`:  what the page shows.
 * - Each list `mine` has replaces the default's;  what's hidden is always the defaults' (`HOME_HIDDEN_KEY`).
 * - Each word `mine` has replaces the default's, word by word.
 */
export function layeredHome(defaults: HomeLayout, mine: HomeLayout = NO_HOME_CHANGES): HomeLayout {
  const order = { ...defaults.order, ...mine.order }
  if (defaults.order[HOME_HIDDEN_KEY]) order[HOME_HIDDEN_KEY] = defaults.order[HOME_HIDDEN_KEY]
  else delete order[HOME_HIDDEN_KEY]
  const texts: Record<string, HomeText> = { ...defaults.texts }
  for (const [key, text] of Object.entries(mine.texts)) texts[key] = { ...defaults.texts[key], ...text }
  return { order, texts }
}

/**
 * `layout` with `change` made:  a new layout, `layout` left as it is.
 * - `order`:  that group's (or the sections', or the start cards') new order
 * - `text`:  those words, each one the same as `under`'s (the page's own, or the defaults') left out;
 *   an empty one too:  it goes back to what it was
 * - `under`:  what `layout` is laid over, the defaults for a person's own:  so a word set back to the default
 *   isn't kept twice.  None:  the page's own words (a project's name, the editor's text).
 */
export function withHomeChange(layout: HomeLayout, change: HomeLayoutChange, under?: HomeLayout): HomeLayout {
  if (change.reset) return NO_HOME_CHANGES
  let { order, texts } = layout
  if (change.order) order = { ...order, [change.order.group]: change.order.names }
  if (change.text) {
    const { key, ...words } = change.text
    const was = { ...texts[key] }
    for (const word of ["title", "line"] as const) {
      if (!(word in words)) continue
      const value = words[word]?.trim()
      if (!value || value === under?.texts[key]?.[word]) delete was[word]
      else was[word] = value
    }
    const rest = { ...texts }
    if (Object.keys(was).length) rest[key] = was
    else delete rest[key]
    texts = rest
  }
  return { order, texts }
}

/** Is `line` too long for a card's two lines (`CARD_LINE_LENGTH`)?  Said while it's typed, never refused. */
export function isTooLongForCard(line: string): boolean {
  return line.trim().length > CARD_LINE_LENGTH
}

/** Where the home page's layout is read and changed:  `GET` / `POST`, a `HomeLayoutAnswer` back. */
export const HOME_LAYOUT_URL = "/api/home/order"

/**
 * `GET` / `POST HOME_LAYOUT_URL`'s answer:  both layers, and whose a change is.
 * - No answer at all (the static build, a site that refuses it):  the page keeps its changes on this device.
 */
export type HomeLayoutAnswer = {
  /** Does a change here change everyone's?  `@spell`'s people, in Spell's own checkout. */
  setsDefaults: boolean
  /** Everyone's layout, as its files have it now. */
  defaults: HomeLayout
  /** The asking person's own changes;  none for `@spell`'s, whose changes are the defaults. */
  mine: HomeLayout
}

/** `POST HOME_LAYOUT_URL`'s body:  ONE change, of the order, of some words, or back to the defaults. */
export type HomeLayoutChange = {
  /** a group's new order, or the sections', or the start cards' */
  order?: HomeOrderChange
  /** a card's or a section's words, by `homeTextKey()` */
  text?: { key: string } & HomeText
  /** forget the person's own changes:  "Reset to default" */
  reset?: boolean
}
