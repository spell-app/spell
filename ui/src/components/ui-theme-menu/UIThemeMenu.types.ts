/**
 * The types and constants of the theme menu's family:  what the component (`UIThemeMenu`),
 * its list (`ThemeMenu`) and the remembered pick (`ThemePreference`) share.
 * - Pure data:  `import type` only (and one key, from a file with no code), so node can load it (`yarn site:data`).
 *   A constant only one class reads sits below that class.
 */

// Import directly:  the scheme's key, with no pref store
import { COLOR_SCHEME_KEY } from "spell/util/persist/persist.types"
import type { UIT } from "spell/ui/core"
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
  /** its tint, one of Spell UI's colours;  none:  the theme as it is */
  tint?: UIT.ThemeHue
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

/** The theme, its tint and the scheme chosen now (`ThemePreference.chosen`). */
export type ThemeAndScheme = {
  /** a `UI.themes` name, one of `UI.themes.own` (`spell`, `fruity` ...) */
  readonly theme: string
  /** the chosen scheme;  `system` follows the OS */
  readonly scheme: SchemeChoice
  /** the theme's tint (epic `debut` P23):  one of Spell UI's colours;  none:  the theme as it is */
  readonly tint?: UIT.ThemeHue
}

/**
 * The tints a theme leaves out of its row, by theme:  each a colour that can't read on it, light or dark, as its
 * primary or its page (`colors.contrast.test.ts` works them out, and fails while this differs).
 */
export const TINTS_LEFT_OUT: Readonly<Record<string, readonly UIT.ThemeHue[]>> = {}

/** The theme a person who never picked one sees, in every place:  Glass (epic `debut` Q39). */
export const DEFAULT_THEME = "glass"

/**
 * Where a page keeps the person's theme and scheme (`ThemePreference.keptIn`):
 * - `space`:  their space, through the page server (`THEME_STORE`), with this browser's copy for first paint
 * - `browser`:  this browser alone (the read-only public build, with no page server)
 */
export type ThemeKeptIn = "space" | "browser"

/**
 * The store the person's theme and scheme are kept in, in their space:  `@spell/owen@/__prefs/spell-site.json5`,
 * keys `theme` and `scheme` (`light`, `dark` or `system`).
 * - The same store the browser's copy names (`THEME_KEYS`):  `spell-site:theme`, `spell-site:scheme`.
 */
export const THEME_STORE = "spell-site"

/**
 * `<html>` class `ThemePreference.applyScheme()` sets for one frame:
 * a theme turns transitions off under it (`spell.css`), so a scheme switch doesn't animate every colour.
 */
export const SCHEME_SWITCHING = "ui-scheme-switching"

/**
 * `localStorage` keys of the browser's copy of the theme and scheme chosen (`ThemePreference`):
 * what the page draws before the person's space answers, and all there is without one.
 * - `scheme`:  the kit's ONE key for every Spell site (`COLOR_SCHEME_KEY`, kept by `ColorScheme`):
 *   `light` / `dark`, absent for `system` (follow the OS).
 *   `<spell-site-header>` on the docs, epic pages and saga pages reads and writes it too.
 * - `theme`:  a `UI.themes` name, absent for `DEFAULT_THEME`;  every place's (epic `debut` P21).
 */
export const THEME_KEYS = { scheme: COLOR_SCHEME_KEY, theme: `${THEME_STORE}:theme` } as const

/**
 * Each place's own theme key before epic `debut` P21:  moved to `THEME_KEYS.theme` once, the first one found,
 * then every one removed (`ThemePreference`).
 * - Spell UI's pages', the epic pages', the editor's
 */
export const OLD_THEME_KEYS = ["spell-ui-site:theme", "spell-epic:theme", "spell-app:theme"] as const
