/**
 * The `ui-docs-theme-bench` family's shared pieces:  the places the bench shows, the messages it sends a framed page,
 * and the shapes of its tuning.
 * - Pure data, at the bottom of the folder's imports (`import type` only):  node loads it (`yarn site:data`),
 *   and `BenchBridge`, which the editor app imports, reads it.
 */

import type { docsThemeBenchVocabulary } from "./UIDocsThemeBench.en"

////////////////
// ## Element
////////////////

/** `docsThemeBenchVocabulary`'s type. */
export type DocsThemeBenchVocabulary = typeof docsThemeBenchVocabulary

/** A text key of `<ui-docs-theme-bench>`. */
export type ThemeBenchTextKey = DocsThemeBenchVocabulary["texts"][number]["key"]

/** Looks up a text by key, with `{param}`s filled in (the component's `translationForKey()`). */
export type ThemeBenchText = (key: ThemeBenchTextKey, params?: Record<string, string | number>) => string

////////////////
// ## The places
////////////////

/** The four places the bench shows, in its grid's order. */
export const BenchPlaceIds = ["epic", "ui", "notebook", "editor"] as const

/** One of them. */
export type BenchPlaceId = (typeof BenchPlaceIds)[number]

/**
 * A place the bench shows, a real page in a frame.
 * - `path`:  the page's address;  on the page server (`/...`), or in the editor app (`editor`)
 * - `width`:  the window width it's drawn at, px:  the frame is scaled down to its cell, so the page lays out as on a
 *   desk, never as on a phone
 * - `themeKey`:  where the place keeps its chosen theme (`ThemePreference.site()`):  the bench writes it, as the
 *   place's own menu would
 */
export type BenchPlace = {
  id: BenchPlaceId
  path: string
  width: number
  reach: BenchReach
  themeKey: string
}

/**
 * How the bench reaches a framed page:
 * - `page server`:  served beside the bench (same origin), so it's changed directly (`BenchBridge`'s functions)
 * - `editor`:  the editor app, on its own port (another origin), so through messages its `BenchBridge.listen()` takes
 */
export type BenchReach = "page server" | "editor"

/** The places, by id. */
export const BenchPlaces: Readonly<Record<BenchPlaceId, BenchPlace>> = {
  epic: {
    id: "epic",
    path: "/epics/debut/debut.plan.html",
    width: 1280,
    reach: "page server",
    themeKey: "spell-epic:theme"
  },
  ui: {
    id: "ui",
    path: "/components/ui/ui-button.html",
    width: 1280,
    reach: "page server",
    themeKey: "spell-ui-site:theme"
  },
  notebook: {
    id: "notebook",
    path: "/edit/@spell/notebooks/Avatar",
    width: 1440,
    reach: "editor",
    themeKey: "spell-app:theme"
  },
  editor: {
    id: "editor",
    path: "/edit/@spell/examples/Solitaire",
    width: 1440,
    reach: "editor",
    themeKey: "spell-app:theme"
  }
}

/**
 * Which schemes each page shows:  `both`, light and dark side by side as a pair of frames;  `one`, the scheme picked.
 */
export type BenchSchemes = "both" | "one"

/**
 * One frame of a page:  its light or dark half of a pair, or (`shown`) its one frame, in the scheme picked.
 */
export type BenchSlot = "light" | "dark" | "shown"

/** A frame's key:  its page and its slot (`editor:dark`). */
export type BenchFrameKey = `${BenchPlaceId}:${BenchSlot}`

/** The page server's address that redirects to the editor app, wherever it runs (spell-app's `appRoutes`). */
export const EDITOR_REDIRECT = "/editor"

////////////////
// ## Messages
////////////////

/** Every message's `type`, both ways:  a page ignores any other. */
export const BENCH_MESSAGE = "spell-theme-bench"

/** Where a framed page scrolls its section titles to:  at rest (the page's top), or stuck under each other. */
export type TitlesAt = "rest" | "stuck"

/** Light, dark, or the OS's. */
export type BenchScheme = "light" | "dark" | "system"

/**
 * The bench to a framed page:  any of these, each applied as it comes.
 * - `theme`, `scheme`:  choose them, as the page's own menu would (remembered there)
 * - `css`:  the tuning, a sheet laid over everything the page has (`""`:  none)
 * - `titles`:  scroll so its section titles are at rest, or stuck
 * - `fullMonty`:  the editor's full view:  Debug, every side bar, the Inspector's cards, a part picked
 * - `ask`:  reply with what the page's sheets read and declare, and the tokens' values now (`BenchReply`)
 */
export type BenchMessage = {
  type: typeof BENCH_MESSAGE
  theme?: string
  scheme?: BenchScheme
  css?: string
  titles?: TitlesAt
  fullMonty?: boolean
  ask?: { id: number; tokens: readonly string[] }
}

/**
 * A framed page to the bench.
 * - `hello`:  it's listening (sent once, as it starts):  the bench answers with everything
 * - `reply`:  the answer to an `ask`, by its id
 */
export type BenchReply = {
  type: typeof BENCH_MESSAGE
  hello?: boolean
  reply?: number
  look?: PageLook
}

/**
 * What a page's sheets say about the tokens, as `BenchBridge.look()` reads it.
 * - `reads`:  every token some rule reads (`var(--x)`), on the page and in every shadow root
 * - `declares`:  every token some rule sets (`--x:`)
 * - `overrides`:  every token some rule sets on an element below `<html>`:
 *   there, a value set on `:root` (a theme's, the bench's tuning) doesn't reach
 * - `values`:  each asked token's value on `<html>` now, as the page computes it (`""`:  not set)
 */
export type PageLook = {
  reads: readonly string[]
  declares: readonly string[]
  overrides: readonly string[]
  values: Readonly<Record<string, string>>
}

////////////////
// ## Tuning
////////////////

/** A token's edit:  one value for both schemes, or one per scheme (a half left out keeps the theme's own). */
export type TokenEdit = { both: string } | { light?: string; dark?: string }

/** Every edit, by theme, then token. */
export type BenchEditSet = Readonly<Record<string, Readonly<Record<string, TokenEdit>>>>

/** What kind of control a token gets, from its value. */
export type TokenKind = "color" | "length" | "text"
