/**
 * Constants and types the `epic-choices` family's components share (`EpicChoices`, `EpicOption`).
 * - Data only:  nothing here runs.
 * - A constant only one of them uses lives below that component's class.
 */

////////////////
// ## The question around them
////////////////

/** The tags and attributes the options read their question's state from. */
export const ITEM_TAG = "epic-item"
export const CHOICES_TAG = "epic-choices"
export const ANSWERED = "answered"
export const CHOSEN = "chosen"
export const STATUS = "status"

/** A phase:  a set in its body (its Choices field, epic `epic-engine` P50) is keyed by the phase's id. */
export const PHASE_TAG = "epic-phase"

/** The set's settings (P50):  pick any, no added options, done, a standing set. */
export const MULTIPLE = "multiple"
export const CLOSED = "closed"
export const STANDING = "standing"

/** An item's Original Discussion:  history, not a choice:  its options never take a pill, nor count as a set. */
export const ORIGINAL_TAG = "epic-original"

/**
 * Which card set an `<epic-choices>` is (`EpicChoices.setOf()`), and what holds it (epic `epic-engine` P50):
 * - `holder`:  the id its mark is kept under, lower-case:  its item's (`q52`), its phase's (`p-choices-questions`), or
 *   a standing set's own (`s-upgrades`)
 * - `index`:  its position among the holder's sets
 * - `own`:  it's the holder's own set (an item's first child set, else its first);  what a pick from before I8 meant
 */
export type CardSet = { holder: string; index: number; own: boolean }

////////////////
// ## Shadow markup
////////////////

/** Class of the `<button>` that folds:  Choices' heading, an answered option's header. */
export const TOGGLE = "toggle"
