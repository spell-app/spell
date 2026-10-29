/**
 * Loose types and constants of the `epic-section` family, and the FOLD pieces `<epic-overview>`, `<epic-section>`
 * and `<epic-phase>` share (`EpicFold`):  their vocabularies spread `FOLD_*`.
 * - Data only:  nothing here runs.  Vocabularies value-import it, so it imports them with `import type` only, and
 *   node imports it through them (`Definitions`):  never a DOM or Solid value here.
 */

import type { epicSectionVocabulary } from "./EpicSection.en"

/** `epicSectionVocabulary`'s type. */
export type EpicSectionVocabulary = typeof epicSectionVocabulary

////////////////
// ## Fold vocabulary (shared)
////////////////

/** The `open` attribute every folding element takes:  page state, never written in a doc. */
export const FOLD_OPEN_ATTRIBUTE = {
  name: "open",
  kind: "boolean",
  description:
    "Unfolded:  PAGE state, never written in a doc (epic pages open folded).  A click on the title, a link to it " +
    "(or into it) and find-in-page set it;  set it from code to open it."
} as const

/** Events of every folding element:  `ui-opening` / `ui-closing` (cancelable), and its `source` body's (`LoadableBody`'s). */
export const FOLD_EVENTS = [
  {
    name: "ui-opening",
    detail: "{ open: true, element: Element, originalEvent?: Event }",
    cancelable: true,
    description: "About to unfold:  its title was clicked.  Cancel to stay folded.  After the fact for a link."
  },
  {
    name: "ui-closing",
    detail: "{ open: false, element: Element, originalEvent?: Event }",
    cancelable: true,
    description: "About to fold:  its title was clicked.  Cancel to stay open."
  },
  {
    name: "ui-loading",
    detail: "{ source: string }",
    description: "The `source` part is on its way:  the first unfold, or a live reload (as `<ui-section source>`'s)."
  },
  {
    name: "ui-loaded",
    detail: "{ source: string, content: string }",
    description: "The `source` part arrived and is in its children (as `<ui-section source>`'s)."
  },
  {
    name: "ui-error",
    detail: "{ kind: 'load' | 'cross-origin' | 'file-protocol' | 'render', source: string, error: unknown }",
    cancelable: true,
    description: "The `source` part couldn't be loaded;  its note says so unless cancelled."
  }
] as const

/** Parts of every folding element. */
export const FOLD_PARTS = [
  { name: "base", description: "The element's box." },
  {
    name: "section",
    description: "The `<ui-section>` drawing the title bar and fold:  its own parts through `::part()` from inside."
  },
  { name: "body", description: "Around its children:  sets `--epic-stack` for them." },
  {
    name: "toggle-all",
    description:
      "Always, before the fold chevron, ONE double chevron (Owen, 2026-10-25):  down, it opens it and everything inside " +
      "it (sections, phases, items, cards and panels, parts loading as they open);  up once it has, it folds " +
      "everything inside again."
  },
  { name: "note", description: "The `Loads from parts/x.html ...` line, when its part can't load." }
] as const

/** States of every folding element. */
export const FOLD_STATES = [
  { name: "open", description: "Unfolded." },
  { name: "loaded", description: "Its `source` part is in." },
  { name: "error", description: "Its `source` part couldn't be loaded." }
] as const

/** Texts of every folding element. */
export const FOLD_TEXTS = [
  {
    key: "partNote",
    text: "Loads from {source} when opened (needs the page server).",
    description: "Its part can't load:  the page was opened from disk."
  },
  { key: "partError", text: "Couldn't load {source}.", description: "Its part couldn't be loaded." },
  {
    key: "expandAll",
    text: "Open everything in {name}",
    description: "The expand-all button's name and tooltip;  `name` its title (`3. Questions`)."
  },
  {
    key: "collapseAll",
    text: "Fold everything in {name}",
    description: "The collapse-all button's name and tooltip;  `name` its title (`3. Questions`)."
  }
] as const

////////////////
// ## Fold (`EpicFold`)
////////////////

/** The custom property every folding element sets around its children:  the bottom of the stuck titles, px. */
export const STACK_PROPERTY = "--epic-stack"

/** `SourceFailure.kind` of a page opened from disk. */
export const FILE_PROTOCOL = "file-protocol"

/** What a folding element needs of its inner `<ui-section>`'s component (`UISection`):  its sticky line and stack. */
export type SectionStack = {
  /** where its title sticks, px from the viewport's top */
  readonly stickTop: number
  /** where titles inside it stick:  below its own, px from the viewport's top */
  readonly innerStackTop: number
}

/** `detail` of a folding element's `ui-opening` / `ui-closing`. */
export type FoldToggleDetail = {
  /** state it's ABOUT to enter:  `true` unfolding */
  open: boolean
  /** the folding element */
  element: Element
  /** the click on its title;  none for a link */
  originalEvent?: Event
}

/**
 * What the page's rail shows for a folding element (its DOM element's `contentsEntry`, read by
 * `spell-doc-runtime.js`):  read fresh each time, never tracked.
 */
export type ContentsEntry = {
  /** its title as drawn, number and all:  `3. Questions`, `1.2 Why`, `P3 · Converter` */
  label: string
  /** its icon's name (Spell UI's):  a section's kind icon, a phase's status icon */
  icon?: string
  /**
   * the icon's colour (Spell UI's `color`):  a phase's status.
   * - REFACTOR: drawn by nothing since the contents list went (the rail shows only top-level sections, never a
   *   phase):  drop it, and rename `contentsEntry` to `railEntry`
   */
  color?: string
  /** a section's count of its items or phases;  none for a kind that isn't counted, or with nothing in it */
  count?: SectionCount
}

/**
 * An item section's state filter as the page's toolbar reads it (`DOMEpicSectionElement.stateFilter`):
 * one entry per state its items are in, in the filter's order.
 */
export type StateFilterEntry = {
  /** the state:  `attention` ... */
  state: ItemStateName
  /** its chip's colour:  `red` ... */
  color: FilterState["color"]
  /** how many of its items are in it */
  count: number
  /** its items show */
  on: boolean
}

/** What a folding element's code reads of its attributes, whatever its vocabulary. */
export type FoldAttributes = {
  id?: string
  open?: boolean
  source?: string
  partIds?: string
}

////////////////
// ## Sections
////////////////

/**
 * Each page section kind => its icon (Spell UI's names, from the docs bundle's set) and its title's text key.
 * `overview-part` has neither:  its title is its own.
 */
export const SECTION_LOOKS = {
  epics: { icon: "map", title: "epicsTitle" },
  phases: { icon: "layer group", title: "phasesTitle" },
  questions: { icon: "file circle question", title: "questionsTitle" },
  judgements: { icon: "gavel", title: "judgementsTitle" },
  todos: { icon: "list check", title: "todosTitle" },
  issues: { icon: "bug", title: "issuesTitle" },
  tests: { icon: "flask", title: "testsTitle" },
  log: { icon: "clock rotate left", title: "logTitle" }
} as const

/**
 * The section kinds that stay FOLDED:  every load starts them folded, and the page's expand-all leaves them so
 * (`EpicSection.staysFolded`):  the Log.
 * - Owen, 2026-10-29 (epic `epic-engine` I155):  "epic log:  Should start out collapsed always, doesn't auto expand
 *   with 'expand all'"
 * - a link into it, its own title and its own expand-all still open it
 * - SEE:  the docs runtime's `STAYS_FOLDED` (`spell-doc-helpers.js`), the same kinds as a selector:
 *   it restores the folds before the components are defined
 */
export const STAYS_FOLDED_KINDS: readonly string[] = ["log"]

/** A page section's look:  `SECTION_LOOKS`' values. */
export type SectionLook = (typeof SECTION_LOOKS)[keyof typeof SECTION_LOOKS]

/**
 * A report's kind (an overnight `/bedtime` report, P14):  titled its own, unnumbered.  `spell/epic/definitions`' `REPORT`,
 * restated:  the components never value-import the definitions.
 */
export const REPORT = "report"

/** The page's NUMBERED blocks, as siblings:  the Overview and the sections, but a report. */
export const NUMBERED_BLOCKS = `:scope > epic-overview, :scope > epic-section:not([kind="${REPORT}"])`

/** The kinds that hold items:  an empty one says "none yet". */
export const ITEM_KINDS = ["questions", "judgements", "todos", "issues", "tests"] as const

/** The Phases section's toggles:  which fields each shows, its icon, its texts, the custom property it sets. */
export const PHASE_TOGGLES = [
  { field: "files", icon: "folder", show: "showFiles", hide: "hideFiles", property: "--epic-files-display" },
  { field: "verify", icon: "flask", show: "showVerify", hide: "hideVerify", property: "--epic-verify-display" }
] as const

/** One of `PHASE_TOGGLES`. */
export type PhaseToggle = (typeof PHASE_TOGGLES)[number]

/** `localStorage` key prefix of the Phases toggles, per page path. */
export const PHASE_TOGGLES_KEY = "epic-phase-fields:"

/** Class of the toggles' group, the toggles, an empty section's line, the body wrapper. */
export const TOOLS = "tools"
export const TOGGLE = "toggle"
export const EMPTY = "empty"
export const BODY = "body"
export const NOTE = "note"

////////////////
// ## Counts and the state filter (P10)
////////////////

/**
 * Statuses that DON'T count as open:  finished (`done`), made moot (`canceled`), answered (`decided`);  a phase's
 * `done`.  The old runtime's `CLOSED`, and the tool's.
 * - an item's too:  a closed one's Choose pills show only while it's revisited (`<epic-option>`)
 */
export const CLOSED_STATUSES = ["done", "decided", "canceled"] as const

/** The children a section counts:  its items, or its phases (`<epic-phase status>`). */
export const COUNTED = ":scope > epic-item, :scope > epic-phase"

/**
 * The attributes of a counted child that change its count or its state:  a change re-counts.
 * - an item's drawn state reads them all (`DrawnState.fieldsOf()`, `STATE_ATTRIBUTES`)
 * - a phase's chip state reads `status`, `plan` and `changes` (`PhaseState.of()`)
 */
export const COUNT_ATTRIBUTES = ["status", "state", "changed", "reviewed", "queued", "working", "plan", "changes"]

/*
 * Its runs (the item lines and phase title rows drawn as rounded cards) are the page sheet's since epic `epic-engine`
 * P45, by position (`EpicSection.runs.css`):  no list of items, no attributes to watch.
 */

/**
 * Where an item stands, in the filter's order:  its state, its chip's colour, its texts' keys (the tooltip's words).
 * - the same seven as `<epic-item state>` (`EpicItem.types.ts` `ITEM_STATES`), in the old runtime's filter order,
 *   `replied` (Owen's turn to pick, 2026-10-09) beside `attention`:  both wait on Owen
 */
export const FILTER_STATES = [
  { state: "progress", color: "blue", words: "stateProgress" },
  { state: "attention", color: "red", words: "stateAttention" },
  { state: "replied", color: "orange", words: "stateReplied" },
  { state: "open", color: "yellow", words: "stateOpen" },
  { state: "recent", color: "green", words: "stateRecent" },
  // handled in a phase (epic `epic-engine` P31):  grey, as quiet as canceled, counted apart
  { state: "handled", color: "grey", words: "stateHandled" },
  { state: "old", color: "grey", words: "stateOld" }
] as const

/**
 * Where a PHASE stands, for the Phases section's chips (epic `epic-engine` I157), in the filter's order:
 * its state, its chip's colour (the epic page's, `plan-doc.md` "Colours"), its texts' keys.
 * - Owen, 2026-10-29:  "In phases header, would be cool to have badges for 'undone|updated|complete' -- e.g. 49
 *   phases in this plan are a lot to scroll past"
 * - ONE state per phase (`PhaseState.of()`):  news wins, so an updated phase still to do counts as `updated` only
 * - `undone` yellow, as an open todo's chip ("to do");  `updated` orange, a changed phase's pen;  `complete`
 *   green, a done phase's icon
 */
export const PHASE_FILTER_STATES = [
  { state: "undone", color: "yellow", words: "phaseUndone" },
  { state: "updated", color: "orange", words: "phaseUpdated" },
  { state: "complete", color: "green", words: "phaseComplete" }
] as const

/** Every state a chip can stand for:  an item's (`FILTER_STATES`), then a phase's (`PHASE_FILTER_STATES`). */
export const CHIP_STATES = [...FILTER_STATES, ...PHASE_FILTER_STATES] as const

/**
 * The state filter's texts:  `<epic-state-filter>`'s vocabulary, the one element that draws its chips (for
 * `<epic-section>`, `<epic-page>`'s toolbar and the docs runtime;  epic `epic-engine` P3).
 */
export const FILTER_TEXTS = [
  { key: "filterLabel", text: "Show items by state", description: "The state filter's group, for a screen reader." },
  {
    key: "chipWords",
    text: "{count} {words}:  {does}",
    description: "A state chip's name and tooltip:  how many, its state, what a click does (`showAll`, `chipOnly` ...)."
  },
  {
    key: "markedWords",
    text: "{count} with Claude:  marked in this pass, or being worked on",
    description:
      "The ONE blue badge's name and tooltip:  how many items are with Claude, whatever their kind -- marked in this pass, or being worked on (epic `epic-engine` P43)."
  },
  { key: "showAll", text: "show everything", description: "A state chip's click:  every state shows again." },
  { key: "chipOnly", text: "show only these", description: "A state chip's click:  only its state shows." },
  { key: "chipAlso", text: "show these too", description: "A state chip's click, hidden:  its state shows too." },
  { key: "chipHide", text: "hide these", description: "A state chip's click, showing:  its state hides." },
  {
    key: "stateProgress",
    text: "Claude is working on it",
    description: "A state chip's words:  `progress` (blue)."
  },
  { key: "stateAttention", text: "needs attention", description: "A state chip's words:  `attention` (red)." },
  {
    key: "stateReplied",
    text: "Claude answered:  your turn to pick",
    description: "A state chip's words:  `replied` (orange)."
  },
  { key: "stateOpen", text: "open, still undecided", description: "A state chip's words:  `open` (yellow)." },
  { key: "stateRecent", text: "decided or done", description: "A state chip's words:  `recent` (green)." },
  {
    key: "stateHandled",
    text: "handled in a phase",
    description: "A state chip's words:  `handled` (grey:  its answer is in a phase's text now)."
  },
  { key: "stateOld", text: "no longer relevant", description: "A state chip's words:  `old` (grey)." },
  {
    key: "phaseUndone",
    text: "still to do",
    description: "A Phases chip's words:  `undone` (yellow:  to do or under way, nothing new for Owen)."
  },
  {
    key: "phaseUpdated",
    text: "with news for you (a plan to accept, or changed)",
    description:
      "A Phases chip's words:  `updated` (orange:  not done, and its build plan waits for Owen's Accept, or its " +
      "plan changed, the orange pen)."
  },
  { key: "phaseComplete", text: "done", description: "A Phases chip's words:  `complete` (green)." }
] as const

/** Each chip click (`StateFilter.clickDoes()`) => its words' text key. */
export const CHIP_CLICK_KEYS = { all: "showAll", only: "chipOnly", also: "chipAlso", hide: "chipHide" } as const

/** One of `FILTER_STATES`. */
export type FilterState = (typeof FILTER_STATES)[number]

/** One of `FILTER_STATES`' state names. */
export type ItemStateName = FilterState["state"]

/** One of `CHIP_STATES`:  an item's state, or a phase's. */
export type ChipState = (typeof CHIP_STATES)[number]

/** One of `CHIP_STATES`' state names. */
export type ChipStateName = ChipState["state"]

/** One of `PHASE_FILTER_STATES`' state names. */
export type PhaseStateName = (typeof PHASE_FILTER_STATES)[number]["state"]

/**
 * A phase's title that never asks for a plan's Accept:  the doc pass (Owen, 2026-10-25:  "I shouldn't have to accept
 * `doc review` phase").
 */
export const DOC_REVIEW = /^doc review$/i

/**
 * Where a phase stands, as its Phases chip counts it (epic `epic-engine` I157):  ONE state, the first that holds.
 * - `complete`:  done
 * - `updated`:  news for Owen, as the phase itself draws it:
 *   - its build plan waits for his Accept (`plan="waiting"`, but the doc pass:  `EpicPhase.isPlanWaiting`)
 *   - or its plan changed (`changes`, the orange pen:  `EpicPhase.changedCount`)
 * - `undone`:  any other, to do or under way
 * - NEVER reads the page:  the caller hands it the fields (`fieldsOf()`)
 */
export class PhaseState {
  /** `fields`' state. */
  static of({ status, plan, changes, title }: PhaseFields): PhaseStateName {
    if (status === "done") return "complete"
    const isPlanWaiting = plan === "waiting" && !DOC_REVIEW.test(title)
    return isPlanWaiting || Number(changes) > 0 ? "updated" : "undone"
  }

  /**
   * The fields of `phase`, an `<epic-phase>`, off its attributes as they are now, and its title as `title` (the
   * attribute, else `slot="title"`'s text).
   * - a section re-counts when any of them changes (`COUNT_ATTRIBUTES`)
   */
  static fieldsOf(phase: Element): PhaseFields {
    const slotted = phase.querySelector(':scope > [slot="title"]')?.textContent
    return {
      status: phase.getAttribute("status"),
      plan: phase.getAttribute("plan"),
      changes: phase.getAttribute("changes"),
      title: (slotted ?? phase.getAttribute("title") ?? "").replace(/\s+/g, " ").trim()
    }
  }
}

/** What `PhaseState.of()` reads of a phase. */
export type PhaseFields = {
  /** `todo`, `active`, `done` */
  status: string | null
  /** its build plan:  `waiting` for Owen, `accepted` */
  plan: string | null
  /** how many plan changes it holds (the orange pen) */
  changes: string | null
  /** its title, as text */
  title: string
}

/**
 * `localStorage` key prefix of the state filters, per page path:  `{ [section id]: [states shown] }`.
 * - the old runtime's (`spell-doc-runtime.js` `ITEM_FILTER_KEY_PREFIX`), same shape:  a filter left on an old page
 *   holds on its converted copy
 */
export const FILTER_KEY = "spell-item-state:"

/** A section's count:  its counted children, how many of them are open, and how many need Owen. */
export type SectionCount = {
  /** not closed (`CLOSED_STATUSES`) */
  open: number
  /** every one */
  total: number
  /**
   * the items that need Owen (`NEEDS_OWEN`:  `state="attention"`, red, or `replied`, orange:  his turn to pick):
   * what the rail counts (decision Q20:  red, only what needs him;  no pill for none)
   */
  attention: number
  /** of those, the ones waiting on Owen's pick (`replied`, orange):  the toolbar's orange badge */
  replied?: number
  /**
   * the phases at work now:  under way (`status="active"`), or being worked on (the inbox's `working`, epic
   * `epic-engine` I147):  the toolbar's blue badge on the Phases button (P43)
   */
  running?: number
}

/**
 * Fired by a counted section when its live count changes without its markup changing (an item being worked on, a
 * phase's plan being written:  the review inbox), so the docs runtime counts the toolbar's badges again.
 * - bubbles out of its shadow root;  no detail
 */
export const COUNT_CHANGED = "epic-count-changed"

/** Classes of the filter's box and its chips (`<epic-state-filter>`'s, and the box its owners put it in). */
export const FILTER = "filter"
export const CHIP = "chip"

/** Class of an item section's new button, on its title (`newButton()`). */
export const NEW_HERE = "new-here"
