/**
 * Types for `spell/util/persist`:  keeping values for people, across visits -- see `PrefStore`.
 * - Generic, like every file of this folder:  nothing spell-specific, so Spell UI uses it too.
 * - Types only, apart from the place names:  the folder's other files import it, never the reverse.
 * - The page server's side of `ServerPlace`'s protocol (spell-app's spaces) imports its types too.
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

////////////////
// ## The server's protocol
////////////////

/*
 * What `ServerPlace` asks the page server, under its URL (`/api/prefs` by default);  spell-app's spaces answer it.
 * - `GET  <url>/load?store=<store>&key=<key>`:  a `PrefLoadAnswer`
 * - `POST <url>/save`, a `PrefSaveRequest`:  a `PrefLoadAnswer`, the value saved
 * - `GET  <url>/keys?store=<store>&under=<prefix>`:  a `PrefKeysAnswer`
 * - `POST <url>/forget`, a `PrefForgetRequest`:  a `PrefKeysAnswer`, the keys left
 * - A mistake (a store name that can't be one):  400, with the error's message.
 */

/** A store's value under a key:  `value` left out when nothing's kept. */
export type PrefLoadAnswer = {
  /** The value kept, as JSON. */
  value?: unknown
}

/** Save `value` under `key` for `store`;  `value` left out forgets the key. */
export type PrefSaveRequest = {
  /** The store's name, e.g. `spellEditor` or `@owen/solitaire`. */
  store: string
  /** The pref's key, e.g. `mode`. */
  key: string
  /** The value to keep, as JSON. */
  value?: unknown
}

/** A store's keys, without its name. */
export type PrefKeysAnswer = {
  /** The keys, e.g. `["layout/left", "mode"]`. */
  keys: string[]
}

/** Forget every key of `store` that starts with `under`:  every key, for `""`. */
export type PrefForgetRequest = {
  /** The store's name. */
  store: string
  /** The keys' shared start, e.g. `layout/`. */
  under: string
}

////////////////
// ## Undo
////////////////

/**
 * One change `UndoStack` can undo and redo:  what it holds is whoever records it's (Spell's runtime records the
 * properties an action set).
 * - Both run at once, and must NOT wait:  an async action's redo puts its end state back, it doesn't run it again.
 */
export type UndoRecord = {
  /** Put things back as they were before the change. */
  undo(): void
  /** Put the change back. */
  redo(): void
}

/** One step people undo and redo:  a title for the Edit menu, and its records, undone last first. */
export type UndoStep = {
  /** What people see after "Undo":  short, capitalized like a menu item, e.g. `Change Margin`, `Turn Card`. */
  title: string
  /**
   * What it changed, so a run of steps with the same title AND target folds into one (typing into one field);
   * none:  it never folds.
   */
  target?: unknown
  /** Its changes, in the order they were made. */
  records: UndoRecord[]
}

/** The two ways through the history, as `UndoStack.titleFor()` names them. */
export const UndoActions = ["undo", "redo"] as const
/** One of `UndoActions`. */
export type UndoAction = (typeof UndoActions)[number]
