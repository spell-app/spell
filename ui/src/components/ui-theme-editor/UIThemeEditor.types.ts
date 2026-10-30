/**
 * The `ui-theme-editor` family's shared pieces:  what its component, `ThemeDraft`, `ThemeTokens`, `PageBridge` and
 * `SavedTheme` share.
 * - Pure data, at the bottom of the folder's imports (`import type` only):  node loads it (`yarn site:data`),
 *   and `PageBridge`, which the editor app imports, reads it.
 * - The choices themselves (`ThemeChoices`, `ThemeHues` ...) are `UIT`'s:  an event's `detail` names them.
 */

import type * as UIT from "spell/ui/components/components.types"
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
 * - Read by the editor (does it offer the Glass choice?) and `ThemeDraft` (does it write the glass tokens?).
 */
export const GLASS_THEMES: readonly string[] = ["glass", "fruity"]

/**
 * The theme with a wallpaper of its own (`--glass-wallpaper`), which the Background choice tints too:  Fruity.
 * - Glass's page is one solid colour:  there the choice tints the page alone.
 */
export const WALLPAPER_THEME = "fruity"

/** The text sizes an editor offers, in px. */
export const TEXT_SIZES = { min: 12, max: 20, step: 1 } as const

////////////////
// ## The pages it previews
////////////////

/**
 * A real page the editor previews in a frame, wearing the theme being made (its `pages`, handed in by the page that
 * shows it:  Spell UI names none).
 * - `url`:  the page's address;  `undefined` while the host finds it, `""` when it can't be reached (`note` says why)
 * - `width`:  the window width it's drawn at, px:  the frame is scaled down to its cell, so the page lays out as on a
 *   desk (Phone:  `PHONE_WIDTH`, every page)
 * - `ownPrefix`:  the start of the page's OWN tokens, which no theme file holds (the Spell editor's `--spell-`):
 *   the editor shows those it declares in a group of their own, and copies them as a rule for the page's sheet
 * - `fullView`:  ask the page for its full view (`PageMessage.fullMonty`):  the Spell editor's Debug, side bars,
 *   a card picked
 */
export type PreviewPage = {
  id: string
  /** its title, over its frames */
  label: string
  url?: string
  /** said in its frame when `url` is `""` */
  note?: string
  width: number
  reach: PageReach
  /** its icon, where the token column says which pages read a token */
  icon: string
  ownPrefix?: string
  fullView?: boolean
}

/**
 * How the editor reaches a framed page:
 * - `same origin`:  served beside the editor, so it's changed directly (`PageBridge`'s functions)
 * - `messages`:  another origin (the Spell editor app, on its own port), so through messages its
 *   `PageBridge.listen()` takes;  a pair's dark half is at this machine's other name (`127.0.0.1` for `localhost`),
 *   another origin again, so the two keep their own schemes
 */
export type PageReach = "same origin" | "messages"

/** The width every page is drawn at in Phone, px:  a phone's. */
export const PHONE_WIDTH = 390

/**
 * Which schemes show, frames and token values alike (Owen:  "Light" "Dark" "Both"):  one, or both side by side
 * (a pair of frames per page).
 */
export type PageSchemes = "light" | "dark" | "both"

/** Where the pages are drawn:  at their desk width, or a phone's. */
export type PageDevice = "desk" | "phone"

/** One frame of a page:  its light or its dark one. */
export type PageSlot = "light" | "dark"

/** A frame's key:  its page's id and its slot (`editor:dark`). */
export type FrameKey = `${string}:${PageSlot}`

////////////////
// ## Messages
////////////////

/** Every message's `type`, both ways:  a page ignores any other (the value is the theme bench's, which began it). */
export const PAGE_MESSAGE = "spell-theme-bench"

/** Light, dark, or the OS's. */
export type PageScheme = "light" | "dark" | "system"

/**
 * The editor to a framed page:  any of these, each applied as it comes.
 * - `theme`, `scheme`:  wear them, as the page's own menu would, but never remembered:  the page's own choice stays
 * - `css`:  the theme being made, a sheet laid over everything the page has (`""`:  none)
 * - `fullMonty`:  the page's full view:  the Spell editor's Debug, every side bar, the Inspector's cards, a part picked
 * - `ask`:  reply with what the page's sheets read and declare, and the tokens' values now (`PageReply`)
 */
export type PageMessage = {
  type: typeof PAGE_MESSAGE
  theme?: string
  scheme?: PageScheme
  css?: string
  fullMonty?: boolean
  ask?: { id: number; tokens: readonly string[] }
}

/**
 * A framed page to the editor.
 * - `hello`:  it's listening (sent once, as it starts):  the editor answers with everything
 * - `reply`:  the answer to an `ask`, by its id
 */
export type PageReply = {
  type: typeof PAGE_MESSAGE
  hello?: boolean
  reply?: number
  look?: PageLook
}

/**
 * What a page's sheets say about the tokens, as `PageBridge.look()` reads it.
 * - `reads`:  every token some rule reads (`var(--x)`), on the page and in every shadow root
 * - `declares`:  every token some rule sets (`--x:`)
 * - `overrides`:  every token some rule sets on an element below `<html>`:
 *   there, a value set on `:root` (a theme's, the editor's) doesn't reach
 * - `values`:  each asked token's value on `<html>` now, as the page computes it (`""`:  not set)
 */
export type PageLook = {
  reads: readonly string[]
  declares: readonly string[]
  overrides: readonly string[]
  values: Readonly<Record<string, string>>
}

////////////////
// ## Tokens
////////////////

/** A token set by hand:  one value for both schemes, or one per scheme (a half left out keeps the theme's own). */
export type TokenEdit = UIT.ThemeTokenEdit

/** Every token set by hand, by its CSS name (`--ui-radius-l`). */
export type TokenEdits = Readonly<Record<string, TokenEdit>>

/** What kind of control a token gets, from its value. */
export type TokenKind = "color" | "length" | "text"

////////////////
// ## A token's row
////////////////

/**
 * What `<ui-theme-token>` draws for one token, as the editor works it out:  its name, where its value comes from,
 * its value in each scheme shown, and what its drawer offers.
 * - Data in, events out (`ui-changed`, `ui-command`):  the row decides nothing about the theme.
 */
export type TokenRow = {
  /** its CSS name:  `--ui-highlight` */
  token: string
  /** its short name in the tree:  `highlight` */
  label: string
  /** its name's tooltip:  its CSS name, its place, who points at it */
  nameTip: string
  /** the schemes shown, light first */
  schemes: readonly ("light" | "dark")[]
  /** its value in each scheme */
  values: Readonly<Record<"light" | "dark", TokenValue>>
  /** ● this theme sets it (its file, a Basic, by hand);  else ○, from what it builds on */
  isHere: boolean
  /** set by hand in the editor */
  isTuned: boolean
  /** light and dark apart:  each scheme its own value */
  isSplit: boolean
  /** its drawer is open */
  isOpen: boolean
  /** the mark's tooltip:  "Set here:  ...", "From Glass:  ..." */
  markTip: string
  /** its Reset's label;  `undefined`:  nothing to reset */
  resetLabel?: string
  /** a pointer's target, while it points at another token:  its place, and that token */
  pointer?: { place: string; token?: string }
  /** the pages that read it:  each page's icon, its tip, whether it also sets it on its own elements */
  readers: readonly { id: string; icon: string; tip: string; overrides: boolean }[]
  /** what a mix's colours and a pointer may be:  the theme's colour tokens, by place (the drawer's selects) */
  options?: readonly { place: string; label: string }[]
}

/** A token's value in one scheme, as its row shows it. */
export type TokenValue = {
  /** the value as the page shows it:  a colour for its chip, else its text */
  text: string
  /** what kind of value:  a chip, a length (a slider in the drawer), or text */
  kind: TokenKind
  /** a colour's hex and opacity, for the drawer's picker */
  hex?: string
  opacity?: number
  /** a mix (`color-mix()`):  its base, what's mixed in and how much;  each colour by place, and as shown */
  mix?: {
    base: string
    baseColor: string
    mixin: string
    mixinColor: string
    amount: number
  }
}
