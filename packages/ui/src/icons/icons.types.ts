/**
 * Shared types for `$/icons`.
 * - Runtime-light:  no imports beyond what TS needs for the shapes below, so this file is safe to import
 *   from anywhere without pulling in `Icons.ts`'s dynamic-import machinery.
 */

////////////////
// ## Page setting
////////////////

/**
 * Attribute on `<html>` choosing which vocabulary wins when a word means DIFFERENT icons in each
 * (`x`, `warning`, `sign in` ...) -- see `docs/icons.md`.
 * - absent / `"fontawesome"` ~== Font Awesome's meaning (default)
 * - `"fomantic"` ~== Fomantic's meaning, for pages ported from Fomantic markup
 */
export const ICON_NAMES_ATTRIBUTE = "ui-icon-names"

/** Allowed values of `ICON_NAMES_ATTRIBUTE`. */
export type IconNames = "fontawesome" | "fomantic"

////////////////
// ## Requests
////////////////

/**
 * The three Font Awesome 7 Free styles this package ships.
 * - Fomantic's `outline` class word maps to `regular` (see `Icons.resolve()`) -- there's no separate
 *   "outline" style here, unlike Fomantic's own font-per-style setup.
 * - `thin` and `duotone` exist in Font Awesome but aren't part of the free tier -- `gen-icons.ts` never
 *   writes data for them, so they're not listed here either.
 */
export type IconStyle = "solid" | "regular" | "brands"

/**
 * One icon's compact runtime shape, as written by `gen-icons.ts`:  `[width, height, path]`.
 * - A tuple rather than `{ width, height, path }` -- shipped ~2000 times across the data files,
 *   so the saved object-key bytes add up.
 */
export type IconData = readonly [width: number, height: number, path: string]

/** What `Icons.resolve()` takes:  a possibly-aliased, possibly-multi-word name, and an optional forced style. */
export type IconRequest = {
  /**
   * Icon name as typed by a caller -- Fomantic vocabulary (`"sign in"`), FA7 name (`"gear"`), or an alias.
   * - spaces ~== dashes:  `"circle check"` ~== `"circle-check"`
   */
  name: string
  /** Forces the style rather than letting `resolve()` infer it from `name` / the `outline` word. */
  style?: IconStyle
}

/** What `Icons.resolve()` returns:  the canonical FA7 name plus the style it (or the caller) settled on. */
export type IconResolved = {
  name: string
  style: IconStyle
}

////////////////
// ## Data shapes
////////////////

/** Shape of `solid-*.json` / `regular.json` / `brands.json`:  icon name -> its compact tuple. */
export type IconChunk = Readonly<Record<string, IconData>>

/** Shape of `solid.json`:  icon name -> the chunk file (without extension) that holds its data. */
export type IconChunkIndex = Readonly<Record<string, string>>

/** Shape of `aliases.json`, `fomantic-aliases.json` and `fomantic-clashes.json`:  alias -> canonical FA7 name. */
export type IconAliasMap = Readonly<Record<string, string>>

////////////////
// ## Loader
////////////////

/**
 * `Icons`' internal load state for one dynamically-imported chunk (a `solid-*` file, `regular`, or `brands`).
 * - `promise` is created once per chunk name and reused, so concurrent `get()` calls for the same chunk
 *   share one `import()` rather than racing separate fetches.
 * - `data` is filled in once `promise` resolves, so `peek()` can answer synchronously afterwards.
 */
export type IconLoader = {
  promise: Promise<IconChunk>
  data?: IconChunk
}
