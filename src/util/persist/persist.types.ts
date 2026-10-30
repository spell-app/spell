/**
 * Types for `spell/util/persist`:  what an app keeps for people --
 * their preferences across visits (`PrefStore`), and the history they undo and redo (`UndoStack`).
 * - Generic, like every file of this folder:  nothing spell-specific, so Spell UI uses it too.
 * - Types only, apart from the place names and the colour scheme's constants:
 *   the folder's other files import it, never the reverse.
 *   - Spell UI's runtime reads `DARK_QUERY` from it by file:  small, no pref store.
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
 * What a `StoragePlace` needs of a web `Storage`.
 * - e.g. `localStorage`, `sessionStorage`, a `MemoryStorage`, or a test's stand-in
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
   * Its type, as Spell's runtime names it:  `number`, `text`, `choice` (true or false).
   * - Any other name (a class's) isn't checked.
   */
  type?: string
  /** Its legal values, e.g. `["light", "dark", "auto"]`, or a function returning them;  the first is the default. */
  oneOf?: readonly unknown[] | (() => readonly unknown[])
  /** Its value while nothing's kept:  wins over the first choice and the type's default. */
  default?: unknown
}

////////////////
// ## Colour scheme
////////////////

/** The colour schemes a page shows:  `ColorScheme`'s. */
export const ColorSchemeNames = ["light", "dark"] as const
/** One of `ColorSchemeNames`. */
export type ColorSchemeName = (typeof ColorSchemeNames)[number]

/**
 * The key of the chosen colour scheme, in the browser's storage:  `light`, `dark`, or absent for the OS's.
 * - ONE key for every Spell site, so a switch on one holds on the others:
 *   the site header on the docs, epic pages and saga pages, Spell UI's docs site, the editor app
 * - Plain text, so a page's inline `<head>` script reads it before first paint (Spell UI's `ThemePreference`).
 */
export const COLOR_SCHEME_KEY = "spell-site:scheme"

/**
 * Keys the scheme lived under before `COLOR_SCHEME_KEY` (2026-10-04):
 * read once while it's absent, the first valid one copied to it, then every one removed (`ColorScheme.chosen()`).
 * - `spell-ui-site:scheme`:  Spell UI's docs site (and the Astro site before it)
 * - NOT `spell-site:theme`, the site header's before then:
 *   it's the THEME's key since epic `debut` P21 (Spell UI's `ThemePreference`), and a scheme left there is read as no theme
 */
export const OLD_COLOR_SCHEME_KEYS = ["spell-ui-site:scheme"] as const

/** Media query of the OS's dark scheme:  what a page follows while no scheme is chosen. */
export const DARK_QUERY = "(prefers-color-scheme: dark)"

/**
 * Classes on `<html>` that force a scheme:  Spell UI's tokens and `--ui-scheme` follow them.
 * - `ColorScheme.apply()` sets them;  so does a page with its own light / dark switch (the editor app's)
 */
export const COLOR_SCHEME_CLASSES = { light: "ui-light", dark: "ui-dark" } as const satisfies Record<
  ColorSchemeName,
  string
>

/**
 * What `ColorScheme.watch()` heard:
 * - `os`:  the OS switched scheme, so a page following it shows the other one
 * - `chosen`:  another tab chose a scheme (already applied here)
 */
export type ColorSchemeChange = "os" | "chosen"

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

/**
 * A pref the server saved, as it tells every open page (epic `debut` P21):  `PREF_SAVED_EVENT`'s data.
 * - The page server sends it over its live channel (the kit's `LiveReload`);
 *   a served page's live client hands it on as a `PREF_SAVED_PAGE_EVENT` on `window`.
 * - So a page showing a pref follows it at once when another page, or another app, changes it.
 */
export type PrefSaved = {
  /** The store's name, e.g. `spell-site`. */
  store: string
  /** Its key, e.g. `theme`. */
  key: string
  /** The value saved;  left out:  forgotten. */
  value?: unknown
}

/** The live channel's event for a saved pref (`{ event: "pref-saved", data: PrefSaved }`). */
export const PREF_SAVED_EVENT = "pref-saved"

/** The `window` event a served page's live client turns `PREF_SAVED_EVENT` into:  a `CustomEvent<PrefSaved>`. */
export const PREF_SAVED_PAGE_EVENT = "spell-server:pref-saved"

////////////////
// ## Undo
////////////////

/**
 * One change `UndoStack` can undo and redo.
 * - What it holds is up to whoever records it:  Spell's runtime records the properties an action set.
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
   * What it changed, so a run of steps with the same title AND target folds into one (typing into one field).
   * - None:  it never folds.
   */
  target?: unknown
  /** Its changes, in the order they were made. */
  records: UndoRecord[]
}

/** The two ways through the history, as `UndoStack.titleFor()` names them. */
export const UndoActions = ["undo", "redo"] as const
/** One of `UndoActions`. */
export type UndoAction = (typeof UndoActions)[number]
