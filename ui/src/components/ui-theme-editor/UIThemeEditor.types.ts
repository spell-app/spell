/**
 * The `ui-theme-editor` family's shared pieces:  what its component, `ThemeSheet` and `SavedTheme` share.
 * - Pure data, at the bottom of the folder's imports (`import type` only):  node loads it (`yarn site:data`).
 * - The choices themselves (`ThemeChoices`, `ThemeHues` ...) are `UIT`'s:  an event's `detail` names them.
 */

import type { themeEditorVocabulary } from "./UIThemeEditor.en"

////////////////
// ## Element
////////////////

/** `themeEditorVocabulary`'s type. */
export type ThemeEditorVocabulary = typeof themeEditorVocabulary

/** A text key of `<ui-theme-editor>` (`themeEditorVocabulary.texts`). */
export type ThemeEditorTextKey = ThemeEditorVocabulary["texts"][number]["key"]

/** Looks up a text by key, with `{param}`s filled in (the component's `translationForKey()`). */
export type ThemeEditorText = (key: ThemeEditorTextKey, params?: Record<string, string | number>) => string

////////////////
// ## The page
////////////////

/**
 * `UI.styles` name of the edited theme's sheet:  on the page, after the theme it changes (`UI.themes`' slots).
 * - ONE per page:  the live editor's, else the theme kept in the browser (`SavedTheme.restore()`).
 */
export const EDITS_SHEET = "theme-edits"

/** The theme an editor starts from when the page has none applied (Owen, 2026-10-23:  "fruity by default"). */
export const DEFAULT_BASE = "fruity"

/**
 * The GLASS themes:  the bases with glass of their own (`--glass-surface*`, `--glass-blur`), which the Glass choice
 * changes.
 * - Glass the base, Fruity on it (`fruity.css` imports `glass.css`;  epic `debut` P17, J88).
 * - Read by the editor (does it offer the Glass choice?) and `ThemeSheet` (does it write the glass tokens?).
 */
export const GLASS_THEMES: readonly string[] = ["glass", "fruity"]

/**
 * The theme with a wallpaper of its own (`--glass-wallpaper`), which the Background choice tints too:  Fruity.
 * - Glass's page is one solid colour:  there the choice tints the page alone.
 */
export const WALLPAPER_THEME = "fruity"

/** The text sizes an editor offers, in px. */
export const TEXT_SIZES = { min: 12, max: 20, step: 1 } as const
