/**
 * The types and constants of the theme menu's family:  what the component (`UIThemeMenu`),
 * its list (`ThemeMenu`) and the remembered pick (`ThemePreference`) share.
 * - Pure data:  `import type` only (and one key, from a file with no code), so node can load it (`yarn site:data`).
 *   A constant only one class reads sits below that class.
 */

// Import directly:  the scheme's key, with no pref store
import { COLOR_SCHEME_KEY } from "spell/util/persist/persist.types"
import type { themeMenuVocabulary } from "./UIThemeMenu.en"

////////////////
// ## Element
////////////////

/** `themeMenuVocabulary`'s type. */
export type ThemeMenuVocabulary = typeof themeMenuVocabulary

/** A text key of `<ui-theme-menu>` (`themeMenuVocabulary.texts`). */
export type ThemeMenuTextKey = ThemeMenuVocabulary["texts"][number]["key"]

/** Looks up a text by key, with `{param}`s filled in (the component's `translationForKey()`). */
export type ThemeMenuText = (key: ThemeMenuTextKey, params?: Record<string, string | number>) => string

/** `show`:  which controls render. */
export type ThemeMenuShow = "both" | "theme" | "scheme" | "menu"

/** `ui-changed`'s detail. */
export type ThemeMenuChange = {
  /** the theme chosen, a `UI.themes` name */
  theme: string
  /** the chosen scheme;  `system`:  following the OS */
  scheme: SchemeChoice
  /** the scheme the page shows:  `scheme`, or the OS's while following it */
  shown: ShownScheme
  /** what the viewer did */
  originalEvent?: Event
}

////////////////
// ## The theme and scheme chosen
////////////////

/**
 * Every colour scheme the menu offers (`ThemePreference`), in the order it shows them:
 * - `light` / `dark`:  `ui-light` / `ui-dark` on `<html>`, and the same `color-scheme` inline
 * - `system`:  neither, so `color-scheme: light dark` follows the OS
 */
export const SchemeChoices = ["light", "dark", "system"] as const
/** One of `SchemeChoices`, e.g. `"system"`. */
export type SchemeChoice = (typeof SchemeChoices)[number]

/** The scheme the page SHOWS:  `system` resolved through the OS (`prefers-color-scheme`). */
export type ShownScheme = Exclude<SchemeChoice, "system">

/** The theme and scheme chosen now (`ThemePreference.chosen`). */
export type ThemeAndScheme = {
  /** a `UI.themes` name, one of `UI.themes.own` (`spell`, `fruity` ...) */
  readonly theme: string
  /** the chosen scheme;  `system` follows the OS */
  readonly scheme: SchemeChoice
}

/** The theme a viewer who never picked one sees, unless a place sets its own (`ThemePreference.site()`):  Spell. */
export const DEFAULT_THEME = "spell"

/**
 * `<html>` class `ThemePreference.applyScheme()` sets for one frame:
 * a theme turns transitions off under it (`spell.css`), so a scheme switch doesn't animate every colour.
 */
export const SCHEME_SWITCHING = "ui-scheme-switching"

/**
 * `localStorage` keys of the theme and scheme chosen (`ThemePreference`).
 * - `scheme`:  the kit's ONE key for every Spell site (`COLOR_SCHEME_KEY`, kept by `ColorScheme`):
 *   `light` / `dark`, absent for `system` (follow the OS).
 *   `<spell-site-header>` on the docs, epic pages and saga pages reads and writes it too.
 * - `theme`:  a `UI.themes` name, absent for `DEFAULT_THEME`.
 *   Spell UI's pages' own, unless a place sets its own (`ThemePreference.site()`).
 */
export const THEME_KEYS = { scheme: COLOR_SCHEME_KEY, theme: "spell-ui-site:theme" } as const
