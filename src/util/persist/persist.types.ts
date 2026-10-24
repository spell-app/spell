/**
 * Types for `spell/util/persist`:  keeping values for people, across visits -- see `PrefStore`.
 * - Generic, like every file of this folder:  nothing spell-specific, so Spell UI uses it too.
 * - Types only, apart from the place names:  the folder's other files import it, never the reverse.
 */

////////////////
// ## Places
////////////////

/**
 * The places a `PrefStore` keeps its values, by name -- see `PrefStoreOptions.place`:
 * - `local`:  the browser's lasting storage (`localStorage`), per site:  it survives a reload and a restart
 * - `session`:  the browser's per-tab storage (`sessionStorage`):  gone when the tab closes
 * - `memory`:  this page only, for this store only:  servers, tests
 */
export const PrefPlaceNames = ["local", "session", "memory"] as const
/** One of `PrefPlaceNames`. */
export type PrefPlaceName = (typeof PrefPlaceNames)[number]

/**
 * What a `StoragePlace` needs of a web `Storage`:  `localStorage`, `sessionStorage`, a `MemoryStorage`, or a test's
 * stand-in.
 */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">

////////////////
// ## Values
////////////////

/**
 * What a value's declaration says:  its type, its choices, its default -- read by `defaultFor()` and `isAllowed()`.
 * - A pref's (`PrefStore.declare()`), and the same shape a spell property declares (`PropInfo`).
 */
export type ValueInfo = {
  /**
   * Its type, as Spell's runtime names it:  `number`, `text`, `choice` (true or false);  any other name (a class's)
   * isn't checked.
   */
  type?: string
  /** Its legal values, e.g. `["light", "dark", "auto"]`, or a function returning them;  the first is the default. */
  oneOf?: readonly unknown[] | (() => readonly unknown[])
  /** Its value while nothing's kept:  wins over the first choice and the type's default. */
  default?: unknown
}
