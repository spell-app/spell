/****************
 * ### `PageStages`
 * An epic page's STAGE (epic `epic-engine` P29):  how far planning has got, and so which sections the page shows.
 * - `overview`:  the Overview is being agreed;  only the Overview, Questions and Todos show
 * - `phases`:  the phases are being agreed;  the Phases section shows too
 * - `building`:  everything shows, as every page did before stages
 * - Written as `<epic-page stage="overview">`;  a page with none (every page made before P29) reads as `building`,
 *   so it looks as it always did:  an optional attribute, no migration.
 * - Hiding a section is only a VIEW:  the file still holds every section, and the tool reads them all.
 * - The page header's stage button ends a stage ("Accept Overview", "Accept Phases"):  its mark moves the page on
 *   (`next()`), when `epic inbox apply` applies it;  `epic stage <epic> <stage>` sets it by hand.
 * - STATIC, pure, node-safe:  the elements, the docs runtime's toolbar and the epic tool all read this ONE rule.
 ****************/
export class PageStages {
  /** The stages, in the order a page goes through them. */
  static readonly ALL = ["overview", "phases", "building"] as const

  /** The stage of a page that names none:  everything shows. */
  static readonly DEFAULT: PageStage = "building"

  /**
   * The top-level section kinds each stage shows (`<epic-section kind>`);  `building` shows every kind.
   * - the Overview (`<epic-overview>`) always shows, and its sub-sections with it
   */
  static readonly SHOWN: Readonly<Record<PlanningStage, readonly string[]>> = {
    overview: ["questions", "todos"],
    phases: ["phases", "questions", "todos"]
  }

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

  /** Does a page in `stage` show a top-level section of `kind`? */
  static shows(stage: PageStage, kind: string | null | undefined): boolean {
    if (stage === "building") return true
    return PageStages.SHOWN[stage].includes(kind ?? "")
  }

  /**
   * Is `element` hidden by its page's stage?  True for a top-level `<epic-section>` its page's stage doesn't show,
   * and for anything inside one.
   * - the Overview and its sub-sections never are;  outside an `<epic-page>`, nothing is
   */
  static hides(element: Element): boolean {
    const section = element.closest("epic-page > epic-section")
    if (!section) return false
    return !PageStages.shows(PageStages.of(section.parentElement), section.getAttribute("kind"))
  }
}

/** One of `PageStages.ALL`. */
export type PageStage = (typeof PageStages.ALL)[number]

/** A stage the page is still being agreed in, which a stage button ends:  `overview` or `phases`. */
export type PlanningStage = Exclude<PageStage, "building">
