/**
 * Loose types and constants of the `epic-focus` family:  its kinds, its event, its kept place, and its tag in JSX.
 * - Data only, plus the JSX declaration:  `<epic-page>` draws the tag in its shadow root, and the Manual tests section
 *   (`<epic-section kind="tests">`) asks for it by its event, from this file alone (never the family's barrel).
 */

import type { EpicJSXAttributes } from "spell/epic/components/epic-page/EpicPage.types"

import type { epicFocusVocabulary } from "./EpicFocus.en"

/** `epicFocusVocabulary`'s type. */
export type EpicFocusVocabulary = typeof epicFocusVocabulary

////////////////
// ## Kinds:  one tab each
////////////////

/**
 * The kinds Focus mode walks, ONE tab each, in Owen's order (2026-10-30:  "P,Q,T,J,I,M"):  each kind's id letter, its
 * section's `kind`, its tab's icon (the section's own) and its tab's text key.
 */
export const FOCUS_KINDS = [
  { kind: "phases", letter: "p", icon: "layer group", tab: "phasesTab" },
  { kind: "questions", letter: "q", icon: "file circle question", tab: "questionsTab" },
  { kind: "todos", letter: "t", icon: "list check", tab: "todosTab" },
  { kind: "judgements", letter: "j", icon: "gavel", tab: "judgementsTab" },
  { kind: "issues", letter: "i", icon: "bug", tab: "issuesTab" },
  { kind: "tests", letter: "m", icon: "flask", tab: "testsTab" }
] as const

/** One of `FOCUS_KINDS`. */
export type FocusKindLook = (typeof FOCUS_KINDS)[number]

/** A tab's kind:  `phases`, `questions` ... `tests`. */
export type FocusKind = FocusKindLook["kind"]

/**
 * The states Focus mode walks, by the page's own colours (`DrawnState` for items, `PhaseState` for phases):  red,
 * orange, blue and yellow (a phase's dotted blue, scheduled, too).
 * - left out:  green, grey (done, decided, no longer relevant)
 */
export const OPEN_STATES: ReadonlySet<string> = new Set([
  // an item's:  red, orange, blue, yellow
  "attention",
  "replied",
  "progress",
  "open",
  // a phase's own:  orange (its plan changed), dotted blue (scheduled)
  "updated",
  "scheduled"
])

/** The state that has no chip of its own, but counts in the blue badge (`<epic-state-filter>`):  never hidden. */
export const WITH_CLAUDE = "progress"

/** One item (or phase) Focus mode walks. */
export type FocusEntry = {
  /** its id, as on the page:  `q7`, `p-focus-mode` */
  id: string
  /** its tab */
  kind: FocusKind
  /** its state as drawn:  `attention` ... */
  state: string
  /** marked in this pass, not applied yet (the blue badge):  never hidden by the chips */
  marked: boolean
  /** its element on the page:  the overlay copies its title and body, never moves it */
  element: Element
}

////////////////
// ## Asking for it
////////////////

/**
 * The event a block of the page sends to open Focus mode (`FocusAsk` its detail):  the Manual tests section's Start
 * testing (decision Q65, A).  `<epic-page>` hears it.
 */
export const FOCUS_ASKED = "epic-focus-asked"

/** What the overlay is asked to open on:  a tab, an item;  none, its kept place. */
export type FocusAsk = {
  /** its tab */
  tab?: FocusKind
  /** the item to land on, by id (`m3`) */
  item?: string
}

/** The event the overlay sends when it opens or closes (`{ open }`):  `<epic-page>` moves Send into it, and back. */
export const FOCUS_TOGGLED = "epic-focus-toggled"

/** `epic-focus-toggled`'s detail. */
export type FocusToggledDetail = {
  /** it's open now */
  open: boolean
}

////////////////
// ## Its kept place
////////////////

/** The key its place is kept under in this browser, per page:  `spell-focus:/epics/x/x.plan.html` (`PrefStore`). */
export const FOCUS_KEY = "spell-focus:"

/** Where Focus mode was left on a page:  kept across reloads, as the page keeps its folds. */
export type FocusPlaceData = {
  /** it was open */
  open?: boolean
  /** the tab showing */
  tab?: FocusKind
  /** the item showing, by id */
  item?: string
  /** each tab's chips:  the states showing;  none, every one */
  shown?: Partial<Record<FocusKind, string[]>>
}

// the tag its owner draws in its shadow root
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-focus": EpicJSXAttributes
    }
  }
}
