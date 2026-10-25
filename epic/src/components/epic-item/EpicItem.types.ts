/**
 * Loose types and constants of the `epic-item` family.
 * - Data only:  nothing here runs.
 */

import type { ReviewButtonSpec, ReviewColor, ReviewFill } from "spell-epic/components/epic-review/EpicReview.types"

import type { epicItemVocabulary } from "./EpicItem.en"

/** `epicItemVocabulary`'s type. */
export type EpicItemVocabulary = typeof epicItemVocabulary

////////////////
// ## States
////////////////

/** An item's id-chip colours, by where it stands (the script's `state`):  see `EpicItem.css`. */
export const ITEM_STATES = ["attention", "replied", "progress", "open", "recent", "handled", "old"] as const

/** One of `ITEM_STATES`. */
export type ItemState = (typeof ITEM_STATES)[number]

/**
 * The states that wait on Owen:
 * `attention` (red), and `replied` (orange:  Claude answered with options, his turn to pick).
 * - what a section's count and its "only what needs you" filter take (`<epic-section>`)
 */
export const NEEDS_OWEN: ReadonlySet<string> = new Set(["attention", "replied"] satisfies ItemState[])

/**
 * The items Owen may call urgent or not (`calm`, its id chip):
 * judgement calls and issues, the kinds red while open and not reviewed.
 * - `PlanReader.itemState()`;  the tool's `CALM_ID`, the same rule
 */
export const CALM_ID = /^[ij]\d+$/

/** Statuses that close an item:  a closed one's Choose pills show only while it's revisited (`<epic-option>`). */
export const CLOSED_STATUSES = ["decided", "done", "canceled"] as const

/**
 * An item's state when it has no `state` (the tool writes one on every edit), by its status:
 * `STATUS_STATES[status] ?? "open"` (`PlanReader.itemState()`, Owen, 2026-10-08).
 * - decided or done:  `recent` (green, however old)
 * - canceled:  `old` (grey:  no longer relevant)
 * - anything else:  `open`
 */
export const STATUS_STATES: Readonly<Record<string, ItemState>> = { decided: "recent", done: "recent", canceled: "old" }

/**
 * An item's state as DRAWN:  `recent` (green) turns grey (`old`) a day after its last change (`changed`)
 * (Owen, 2026-10-25:  "these were decided a very long time ago, they could be grey");  green only while fresh.
 * - the id chip, the section's counts and filters, the To review links:  the same rule
 * - worked out as the page draws, never written:  the tool's `state` stays `recent`
 */
export class ItemAge {
  /**
   * `state` as drawn for an item last changed `changed` (ISO, or any date `Date.parse()` reads), and `reviewed` (a day,
   * `2026-10-24`) when Owen approved it.
   * - reviewed on or after the day it last changed:  grey at once (Owen, 2026-10-25:  "when we check a Q we should be
   *   able to grey it immediately"):  green only says "new since you looked";  a change on a later day, green again
   * - by DAY:  applying his approve stamps `changed` with the time too
   */
  static shown(
    state: ItemState,
    changed: string | null | undefined,
    reviewed?: string | null,
    now = Date.now()
  ): ItemState {
    if (state !== "recent") return state
    if (reviewed && (!changed || reviewed.slice(0, 10) >= changed.slice(0, 10))) return "old"
    if (!changed) return state
    const at = Date.parse(changed)
    return Number.isFinite(at) && now - at > RECENT_DAYS * DAY_MS ? "old" : state
  }
}

/**
 * How long a decided or done item stays green, in days.
 * - Owen, 2026-10-25:  "make it grey after one day.  If I haven't seen it by then, I don't care."
 */
const RECENT_DAYS = 1
const DAY_MS = 24 * 60 * 60 * 1000

/** `state`'s text key, for the id chip's tooltip. */
export const STATE_TIP_KEYS = {
  attention: "stateAttention",
  replied: "stateReplied",
  progress: "stateProgress",
  open: "stateOpen",
  recent: "stateRecent",
  handled: "stateHandled",
  old: "stateOld"
} as const satisfies Record<ItemState, string>

/** The review label's look:  `todo` yellow (open:  work still to do), `deferred` grey, `reviewed` by state. */
export type ReviewLook = "todo" | "deferred" | "recent" | "old"

/** The review label on an item's line:  its words, look and tooltip. */
export type ReviewLabel = {
  /** what it says:  `to do`, `deferred`, `reviewed 10/6/26` */
  words: string
  /** its colour */
  look: ReviewLook
  /** its tooltip:  the queued work, the date it was deferred */
  tip?: string
}

////////////////
// ## Shadow markup
////////////////

/** Class names inside the shadow root. */
export const LINE = "line"
export const FOLD = "fold"
export const TOGGLE = "toggle"
export const CHIP = "chip"
export const TITLE = "title"
export const EXTRAS = "extras"
export const GIT = "git"
export const OVERNIGHT = "overnight"
/** Class of a failed test's mark on its line (`failed`, epic `epic-engine` P4). */
export const FAILED = "failed"
export const HANDLED = "handled"
export const LIMIT = "limit"
export const REVIEW = "review"
export const DETAILS = "details"
export const LABEL = "label"
export const NOTE = "note"
export const CELL = "cell"
/** Under the line, over the details:  a marked note, and the note box of an item without details. */
export const UNDER_LINE = "under-line"

/** Class words on the item box:  it has details;  it's unfolded. */
export const HAS_DETAILS = "has-details"
export const UNFOLDED = "unfolded"
export const UNDER_TITLE = "under-title"

/** Class word on the item box:  no details, its note box open under the line (its chevron folds it away). */
export const NOTE_OPEN = "note-open"

/** The struck-through status, and its class word. */
export const CANCELED = "canceled"

/** `id` of the details box, which the toggle controls. */
export const DETAILS_ID = "details"

/**
 * The slot of Claude's status cards (`<epic-status slot="status">`, P13):
 * drawn under Owen's marked note, above the note box (an Overview sub-section's too).
 */
export const STATUS_SLOT = "status"

/** Children that aren't prose:  the item's parts, drawn by their own elements. */
export const EPIC_TAG = /^epic-/

/** `<epic-*>` tags that are prose (`flow`), not parts:  the UPDATE marker, a Net effect list. */
export const FLOW_TAGS: readonly string[] = ["epic-update", "epic-net-effect"]

/** The More Details card's tag:  an item with one labels its own text "Original reply". */
export const MORE_TAG = "epic-more"

/** The icon of an item made overnight (`overnight`):  `<epic-page bedtime>`'s too (J28). */
export const BED_ICON = "bed"

/** A commit's tag:  an item with one among its children gets the git icon (T17). */
export const COMMIT_TAG = "epic-commit"

/** A card set with an option chosen, anywhere in an item:  a pick that has landed in the doc. */
export const CHOSEN_SET = "epic-choices[chosen]"

/**
 * The custom property `<epic-commit>` shows by (`block`):
 * the page's git toggle sets it for every commit, an item's git icon for its own
 * (`EpicPage.types.ts` `COMMITS_PROPERTY`, the same name).
 */
export const COMMITS_PROPERTY = "--epic-commits-display"

////////////////
// ## Review (the controls themselves are `<epic-review>`'s:  `EpicReview.types.ts`)
////////////////

/**
 * Where Owen's answer on an item stands, as its id chip wears it (`EpicItem.chipMark`):
 * a colour and a fill, dashed or outlined;  none, and the chip is solid in its state's colour.
 * - his live mark:  NO colour, so the chip keeps its state's (Owen, 2026-10-11, J3 of `epic-workflow`:  the counts must
 *   match the chips;  2026-10-08 it wore the chosen button's colour), and the mark's fill
 * - answered, work still due (Owen, 2026-10-10):  outlined, green queued, blue Claude on it
 */
export type ChipMark = {
  /** work Claude still owes:  green queued or a taken pick, blue on it;  none for Owen's own mark (its state's colour) */
  color?: ReviewColor
  fill: Exclude<ReviewFill, "none">
  /**
   * the chosen button's name (`approve`;  the note box's x, `boxSkip`), or a pick's letter, for the tooltip;
   * none when work is still due
   */
  label?: ReviewButtonSpec["label"] | "boxSkip" | { pick: string }
}

/**
 * A caveat's id:  `c3` (epic `epic-engine` P32).  One without `limit` is work still to do, a TODO:  the todo's
 * buttons (`isTodo()`).
 */
export const CAVEAT_ID = /^c\d+$/i

/** Is item `id` (`limit`:  its `limit`) work still to do:  a caveat that's no limit (epic `epic-engine` P32)? */
export function isTodo(id: string | undefined, limit: boolean | undefined): boolean {
  return CAVEAT_ID.test(id ?? "") && !limit
}

/** The light DOM's attributes an item's thread reads (`EpicItem.threadChange`, `AnswerThread`). */
export const THREAD_ATTRIBUTES = ["chosen", "at", "done-at", "state", "from", "slot"]
