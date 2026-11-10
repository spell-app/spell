/****************
 * ### `PageStages`
 * An epic page's STAGE (epic `epic-engine` P29):  how far planning has got, and the ONE rule for which sections hide.
 * - `overview`:  the Overview is being agreed;  its phases, if any, are titled `P1. DRAFT: ...`
 * - `phases`:  the phases are being agreed
 * - `building`:  it's being built
 * - The stage no longer decides what shows (epic `epic-engine` P70):  a section hides when it's empty, at every
 *   stage (`hides()`).
 * - Written as `<epic-page stage="overview">`;  a page with none (every page made before P29) reads as `building`,
 *   so it looks as it always did:  an optional attribute, no migration.
 * - Hiding a section is only a VIEW:  the file still holds every section, and the tool reads them all.
 * - Its STAGE BUTTON ends a stage (`<epic-stage-button>`):  "Accept Overview" on the Overview's title row, "Accept
 *   Phases" on the Phases section's (epic `epic-engine` I180;  the page header's before);  its mark moves the page on
 *   (`next()`), when `epic inbox apply` applies it;  `epic stage <epic> <stage>` sets it by hand.
 * - STATIC, pure, node-safe:  the elements, the docs runtime's toolbar and the epic tool all read this ONE rule.
 ****************/
export class PageStages {
  /** The stages, in the order a page goes through them. */
  static readonly ALL = ["overview", "phases", "building"] as const

  /** The stage of a page that names none. */
  static readonly DEFAULT: PageStage = "building"

  /**
   * The top-level section kinds that hide with nothing in them (`<epic-section kind>`).
   * - every other kind always shows:  the Overview's sub-sections, While you were out, a report, Choices, a saga's Epics
   * - Owen (2026-11-09, epic `data`'s Hide Empty Sections):  "We should just go ahead and hide them in all modes if they
   *   are empty."
   */
  static readonly HIDES_WHEN_EMPTY: readonly string[] = [
    "phases",
    "questions",
    "judgements",
    "todos",
    "issues",
    "tests",
    "log"
  ]

  /**
   * The section kinds with a New button while the page is reviewed:  empty, they stay, so the first one can be added.
   * - `NEW_KIND_LOOKS` (`<epic-new-item>`) is typed against this list, and a test holds the two equal
   * - Owen, 2026-11-09:  "For something like todos which has an add button, leave the header with "Nothing todo" type
   *   message and add button"
   */
  static readonly TAKES_NEW = ["phases", "questions", "todos", "issues", "tests"] as const

  /** Is `value` one of the stages? */
  static isStage(value: unknown): value is PageStage {
    return (PageStages.ALL as readonly unknown[]).includes(value)
  }

  /** The stage `value` names (an attribute's text);  `building` for none, or a word that isn't one. */
  static read(value: string | null | undefined): PageStage {
    return PageStages.isStage(value) ? value : PageStages.DEFAULT
  }

  /** The stage of `page` (an `<epic-page>`, or anything with a `stage` attribute);  `building` for none. */
  static of(page: Element | null | undefined): PageStage {
    return PageStages.read(page?.getAttribute("stage"))
  }

  /** The stage after `stage`:  `overview` -> `phases` -> `building`;  `building` stays. */
  static next(stage: PageStage): PageStage {
    return PageStages.ALL[Math.min(PageStages.ALL.indexOf(stage) + 1, PageStages.ALL.length - 1)]!
  }

  /** Is the page still being agreed (`overview` or `phases`), not building yet? */
  static isPlanning(stage: PageStage): stage is PlanningStage {
    return stage !== "building"
  }

  /**
   * How many questions are open on `page` (an `<epic-page>`):  its Questions section's open items, what a stage
   * button's tooltip counts (a reminder, never a lock).
   */
  static openQuestions(page: Element | null | undefined): number {
    return page?.querySelectorAll(OPEN_QUESTIONS).length ?? 0
  }

  /**
   * Is `element` hidden?  True for an empty top-level `<epic-section>` of a kind that hides (`HIDES_WHEN_EMPTY`), and
   * for anything inside one.
   * - not one you could add to right now (`canAddTo()`):  it stays, with a short line and its New button
   * - the Overview and its sub-sections never are;  outside an `<epic-page>`, nothing is
   * - everything that leaves a hidden section out asks this:  the numbers, the toolbar, its chips and Focus mode
   */
  static hides(element: Element): boolean {
    const section = element.closest("epic-page > epic-section")
    if (!section || !PageStages.HIDES_WHEN_EMPTY.includes(section.getAttribute("kind") ?? "")) return false
    return PageStages.isEmpty(section) && !PageStages.canAddTo(section)
  }

  /**
   * Has `section` nothing in it, and no part on its way?
   * - what's in it:  any child element but one of a named slot (the page's own buttons) or one the runtime added
   * - a `source` part may hold anything, so it never counts as empty:  the Log's, on every current page
   */
  static isEmpty(section: Element): boolean {
    if (section.hasAttribute("source")) return false
    return !Array.from(section.children).some(
      (child) => !child.hasAttribute("slot") && !child.hasAttribute(RUNTIME_ADDED)
    )
  }

  /** Could something be added to `section` right now:  its kind has a New button, and its page is being reviewed? */
  static canAddTo(section: Element): boolean {
    const takesNew = (PageStages.TAKES_NEW as readonly (string | null)[]).includes(section.getAttribute("kind"))
    return takesNew && !!section.parentElement?.hasAttribute(REVIEWING)
  }
}

/** One of `PageStages.ALL`. */
export type PageStage = (typeof PageStages.ALL)[number]

/** A stage the page is still being agreed in, which a stage button ends:  `overview` or `phases`. */
export type PlanningStage = Exclude<PageStage, "building">

/** One of `PageStages.TAKES_NEW`:  a section a New button adds to. */
export type NewSectionKind = (typeof PageStages.TAKES_NEW)[number]

/** Set on `<epic-page>` while it's reviewed (`ReviewState`). */
const REVIEWING = "reviewing"

/** What the docs runtime marks a child it added with:  no child of the page's own. */
const RUNTIME_ADDED = "data-spell-added"

/** A page's open questions, from the `<epic-page>`:  what a stage button's tooltip counts (`openQuestions()`). */
const OPEN_QUESTIONS = ':scope > epic-section[kind="questions"] > epic-item[status="open"]'
