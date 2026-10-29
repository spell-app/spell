/**
 * Loose types and constants of the `epic-page` family;
 * and the JSX types of the tags every `<epic-*>` element draws in its shadow root.
 * - Spell UI's `<ui-*>` tags:  its exact types, generated (`spell/ui/jsx`), imported here.
 * - The pack's own `<epic-*>` tags:  loose (`EpicJSXAttributes`), each family declaring the ones it draws.
 * - Data only:  nothing here runs.
 */

import type { JSX } from "@solidjs/web"

import type { E } from "spell/element"
import type {} from "spell/ui/jsx"

import type { epicPageVocabulary } from "./EpicPage.en"

/** `epicPageVocabulary`'s type. */
export type EpicPageVocabulary = typeof epicPageVocabulary

/**
 * The page-wide values its blocks read, per `<epic-page>` DOM element (`EpicPage.signalsOf()`).
 * - Kept by DOM element, not on the component:  a section may connect before the page's component exists
 *   (the pack defines its families in any order), and reads the same signals either way.
 */
export type PageSignals = {
  /** Where top-level titles stick:  below the site header and the page header, px from the viewport top. */
  top: E.Cell<number>
  /** Bumped when blocks come or go, or a phase's status or title changes:  numbers and the step label follow. */
  layout: E.Cell<number>
}

/** One phase, as the step label reads it. */
export type PhaseLine = {
  /** its stable id, `p-epic-migrate`:  where its step label links */
  id: string
  /** its number as drawn, by its place:  `P3` */
  label: string
  /** `todo`, `active`, `done` */
  status: string
  /** its title's text */
  title: string
}

/** The step label:  its look, its words, where it links. */
export type StepLabel = {
  /**
   * its colour:
   * - `blue`:  the active phase (outlined:  Claude is on it)
   * - `green`:  DONE (solid)
   * - `grey`:  the next one, or FUTURE
   * - else the epic state's colour (`red` errors)
   */
  color: "blue" | "green" | "grey" | "red"
  icon: string
  /** what it says:  `P4`, `DONE`, `FUTURE` */
  words: string
  /** its tooltip */
  tip?: string
  /** where it links (`#p-epic-migrate`) */
  href?: string
}

/** The header's stage button (epic `epic-engine` P29):  Accept Overview or Accept Phases, in place of Send's plane. */
export type StageButton = {
  /** its words:  `Accept Overview` */
  label: string
  /** its tooltip:  what a press does, what's still open, what it sends with it;  or that it's accepted */
  tip: string
  /** pressed:  its mark is in the inbox, waiting for the session to move the page on */
  accepted: boolean
}

/** The phase statuses:  under way, done, still to do. */
export const ACTIVE = "active"
export const DONE = "done"
export const TODO = "todo"

/**
 * The attributes a step label or a number depends on:  a change bumps the page's layout.
 * - `stage`, the page's own (epic `epic-engine` P29):  which sections show, and a phase's review pills
 * - `plan`, a phase's:  whether Send is ringed, waiting on Owen's Accept (`plansWaiting()`)
 */
export const LAYOUT_ATTRIBUTES = [
  "status",
  "state",
  "title",
  "kind",
  "commits",
  "stage",
  "to-accept",
  "accepted",
  "plan"
]

/** The custom property of the sticky stack's bottom, px from the viewport top (`EpicFold` sets it too). */
export const STACK_PROPERTY = "--epic-stack"

/** The sticky header's height (the h1's row), px:  the toolbar's bar sticks right below it. */
export const HEAD_PROPERTY = "--epic-head-h"

/** Classes of the shadow markup. */
export const HEAD = "head"
export const HEADING = "heading"
export const HEADING_COPY = "heading-copy"
export const META = "meta"
export const SEE_ALSO = "see-also"

/** One page in the See Also box, as the page server lists it (`GET /api/epics/pages`:  the tool's `SeeAlso`). */
export type SeeAlsoLink = {
  /** a root path:  `/epics/seo/details/analysis.html`, `/guides/python-target.html` (epic `epic-engine` P46) */
  href: string
  title: string
  /** its guide, a guide it links, one of its details pages or choice pages */
  kind: SeeAlsoKind
  /** when it last changed, ISO */
  updated: string
}

/**
 * The saga an epic serves, as the page server answers it beside the See Also pages (`GET /api/epics/pages`'s `saga`;
 * epic `epic-workflow` P15).
 */
export type SagaLink = {
  /** its id:  `drawable-spell` */
  id: string
  /** "Drawable Spell" */
  title: string
  /** one line:  what it's for */
  purpose: string
  /** its saga page, a root path:  `/sagas/<id>/<id>.saga.html` */
  href: string
}

/** A saga's page, a root path (epic `epic-engine` P46), until the page server says:  `SagaLink.href`'s. */
export function sagaHref(id: string): string {
  return `/sagas/${id}/${id}.saga.html`
}

/** What a See Also page is to its epic. */
export type SeeAlsoKind = "durable" | "guide" | "details" | "choices"

/** Each See Also kind's icon, and the key of its word in the vocabulary. */
export const SEE_ALSO_KINDS: Record<SeeAlsoKind, { icon: string; key: E.TextKey<EpicPageVocabulary> }> = {
  durable: { icon: "book", key: "seeAlsoDurable" },
  guide: { icon: "book open", key: "seeAlsoGuide" },
  details: { icon: "circle question", key: "seeAlsoDetails" },
  choices: { icon: "table columns", key: "seeAlsoChoices" }
}
export const STATUS = "status"
/** The header's middle (Send, the spinner) and its gear:  the button, its menu, the rows, a sub-menu, a row's value. */
export const CENTRE = "centre"
export const GEAR = "gear"
export const GEAR_MENU = "gear-menu"
export const GEAR_ROWS = "gear-rows"
export const GEAR_ROW = "gear-row"
export const GEAR_SUB = "gear-sub"
export const GEAR_VALUE = "value"
export const NOTICE = "notice"
export const HUNG = "hung"

export const SEND = "send"
export const REVIEW_LINE = "review-line"

/**
 * Classes of the toolbar's sticky bar (the new item form, then the toolbar), the toolbar row, its tools at the right
 * (epic `airplane` P8), and the nobody-listening pill under the review line.
 */
export const BAR = "bar"
export const TOOLBAR = "toolbar"
export const TOOLBAR_TOOLS = "toolbar-tools"
export const PILL = "pill"

/** The crumbs' class. */
export const CRUMBS = "crumbs"

/**
 * The crumbs' links:  root paths (epic `epic-engine` P46), the same from an epic page and a saga page.
 * - `target`s name the VS Code side bar's tab, as the old crumbs did
 */
export const CRUMB_LINKS = {
  docs: { href: "/pages/index.html", target: "src-packages-docs-index-html" },
  epics: { href: "/epics/index.html", target: "src-epics-index-html" },
  sagas: { href: "/sagas/index.html", target: "src-sagas-index-html" }
} as const

/** `<epic-page kind>` of a saga page (epic `epic-workflow` P15). */
export const SAGA_KIND = "saga"

/**
 * The crumbs a doc may still hold before the page, from before P14 (`ui-breadcrumbs.spell-crumbs` in `<main>`):
 * while they're there, the page draws none of its own, so they never show twice.
 * - REFACTOR:  goes once every doc is migrated (P14's second pass).
 */
export const OLD_CRUMBS = ":scope > .spell-crumbs"

/**
 * The toast saying something was copied (the heading's name, a meta line's code, the review line).
 * - `COPIED_TOAST_MS`:  how long it shows, ms
 * - `COPIED_TOAST_ID`:  its id, so a second copy replaces it
 */
export const COPIED_TOAST_MS = 2500
export const COPIED_TOAST_ID = "epic-copied"

/** How long the review line flashes once copied, ms:  as the old runtime's (`FLASH_MS`). */
export const FLASH_MS = 900

/** The Send button's look:  no marks, some marks or comments not sent, all sent. */
export type SendState = "idle" | "unsent" | "sent"

/** What the header's Send and the pill show:  from the review inbox, while the page is reviewed. */
export type HeaderMarks = {
  /** Send's look */
  send: SendState
  /** marks (and urgencies) not sent yet */
  unsent: number
  /** comments waiting for Claude, not sent yet:  Owen's new words on a thread (`ReviewClient.unsentCommentCount`) */
  comments: number
  /** marks a countdown's send would have Claude work through (as Review Now did):  all but the requests on their way */
  waiting: number
  /** requests for now queued, not taken yet */
  asked: number
  /** a session is listening (Claude's, Codex's ...) */
  listening: boolean
  /** who listens, in words, when it's an agent other than Claude:  "Your Codex is listening";  `""` otherwise */
  listener: string
  /**
   * nobody listens, and the last to listen was an agent other than Claude (epic `epic-friend` P11, Q14):  how to wake
   * it, in words before its command, "Your Codex isn't listening:  ask it to run";  `""` otherwise
   */
  idle: string
  /** what the page server's wake did, while nobody listens (epic `epic-workflow` P16);  `""` for none */
  woken: string
}

/** The kickoff prompt, which the `Plan hung?` aside offers to copy. */
export const PROMPT = 'epic-overview > [slot="prompt"]'
export const ICON = "icon"

/**
 * Loose attributes of an `<epic-*>` tag drawn in JSX:  HTML attributes, plus any attribute.
 * - Loose until the pack generates exact types, as Spell UI does (`spell/ui/jsx`).
 */
export type EpicJSXAttributes = JSX.HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }

declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      // the pack's own families it draws in its shadow root (Spell UI's:  `spell/ui/jsx`)
      "epic-new-item": EpicJSXAttributes
      "epic-agents": EpicJSXAttributes
    }
  }
}
