import { PlanDates } from "spell/epic/dates"
import { PhaseStatuses } from "spell/epic/phases"

import { DOC_REVIEW, type PhaseStateName } from "./EpicSection.types"

/****************
 * ### `PhaseState`
 * Where a phase stands, as its Phases chip counts it and its status circle draws it (epic `epic-engine` I157;  Owen's
 * colours and order since I170):  ONE state, the first that holds.
 * 1. `attention` (red):  a choice set inside it, not done, is still open (`choices-open`, written by the epic tool:  epic
 *    `epic-engine` P50)
 * 2. `waiting` (orange):  its build plan waits for his Accept, not done (`plan="waiting"`, but the doc pass:
 *    `DOC_REVIEW`):  a plan to read is a review, not a blocker (epic `epic-engine` P63;  red before)
 * 3. `updated` (orange):  its plan changed since he looked, not done:  update blocks in `to-see` neither marked Seen
 *    nor quiet (`PlanDates.isQuiet()`, 3 days);  an older page's `changes` until the tool's next write
 * 4. `progress` (blue):  under way (`status="active"`), or Claude at work on it (the review inbox's `working`)
 * 5. `paused` (grey, a pause glyph):  still to do, held by Owen (`plan="held"`, epic `epic-engine` I221;  Owen,
 *    2026-11-04:  "These are paused, red feels wrong"):  not built till he accepts its plan again
 * 6. `scheduled` (dotted blue):  still to do, nothing above
 * 7. `recent` (green):  done in the last 3 days (`done-at`, the same `isQuiet()` window)
 * 8. `old` (grey):  done longer ago, or done with no `done-at`;  DROPPED, at once (never built:  epic `epic-engine`
 *    I228)
 * - "not done" above means not FINISHED:  a dropped phase asks nothing either (`PhaseStatuses.isFinished()`)
 * - Owen, 2026-10-29:  "The order, one chip per phase:  red, orange, blue (working), dotted blue, green, grey."
 * - Pure:  NEVER reads the page.  The caller hands it the fields (`fieldsOf()`, or a component's own) and what the
 *   review inbox says now (`live`).
 * - The ONE rule:  `<epic-section kind="phases">`'s chips, counts and toolbar badges, and `<epic-phase>`'s circle.
 ****************/
export class PhaseState {
  /** `fields`' state, with the review inbox saying `live`, at `now`. */
  static of(fields: PhaseFields, live: PhaseLive = NO_PHASE_LIVE, now: Date = new Date()): PhaseStateName {
    // dropped (I228):  never built, nothing to celebrate:  grey at once
    if (fields.status === "dropped") return "old"
    if (fields.status === "done") {
      return fields.doneAt && !PlanDates.isQuiet(fields.doneAt, now) ? "recent" : "old"
    }
    if (Number(fields.choicesOpen) > 0) return "attention"
    if (PhaseState.isPlanWaiting(fields)) return "waiting"
    if (PhaseState.newUpdates(fields, live, now).length) return "updated"
    if (fields.status === "active" || live.workedOn) return "progress"
    if (PhaseState.isHeld(fields)) return "paused"
    return "scheduled"
  }

  /** Is it HELD by Owen (`plan="held"`, epic `epic-engine` I221), and not done?  Paused:  not built till he accepts it. */
  static isHeld({ status, plan }: PhaseFields): boolean {
    return plan === "held" && !PhaseStatuses.isFinished(status)
  }

  /** Does its build plan wait for Owen's Accept (`plan="waiting"`), and it isn't done?  Never the doc pass. */
  static isPlanWaiting({ status, plan, title }: PhaseFields): boolean {
    return plan === "waiting" && !PhaseStatuses.isFinished(status) && !DOC_REVIEW.test(title)
  }

  /**
   * Its update blocks still NEW, by id (epic `epic-engine` I168):  `to-see`'s, less the ones gone quiet since it was
   * written (`PlanDates.isQuiet()`) or marked Seen (`live.isSeen()`), while it isn't done.
   * - an older page, with `changes` and no `to-see` yet:  that many, unnamed (`""`), until the tool's next write
   */
  static newUpdates({ status, toSee, changes }: PhaseFields, live: PhaseLive, now: Date): string[] {
    if (PhaseStatuses.isFinished(status)) return []
    if ((toSee === null || toSee === undefined) && Number(changes) > 0)
      return Array.from({ length: Number(changes) }, () => "")
    return PhaseState.ids(toSee)
      .map((token) => token.split("@"))
      .filter(([id, at]) => !PlanDates.isQuiet(at, now) && !live.isSeen(id!))
      .map(([id]) => id!)
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
      toSee: phase.getAttribute("to-see"),
      changes: phase.getAttribute("changes"),
      choicesOpen: phase.getAttribute("choices-open"),
      doneAt: phase.getAttribute("done-at"),
      title: (slotted ?? phase.getAttribute("title") ?? "").replace(/\s+/g, " ").trim()
    }
  }

  /** A space-separated list's entries:  `"a b"` => `["a", "b"]`;  none => `[]`. */
  private static ids(list: string | null | undefined): string[] {
    return (list ?? "").split(/\s+/).filter(Boolean)
  }
}

/** What `PhaseState.of()` reads of a phase. */
export type PhaseFields = {
  /** `todo`, `active`, `done`, `dropped` */
  status: string | null | undefined
  /** its build plan:  `waiting` for Owen, `accepted` */
  plan: string | null | undefined
  /** its update blocks still new as of the tool's last write:  `up3@2026-10-27T10:00 up5@...` */
  toSee: string | null | undefined
  /** an OLDER page's count of its plan changes, before `to-see` */
  changes: string | number | null | undefined
  /** how many choice sets inside it are still open (`choices-open`) */
  choicesOpen: string | number | null | undefined
  /** when it was done (ISO, `done-at`) */
  doneAt: string | null | undefined
  /** its title, as text */
  title: string
}

/** What the page's review inbox says of a phase now, for `PhaseState.of()`. */
export type PhaseLive = {
  /** Claude's agent at work on it (the inbox's `working`) */
  workedOn: boolean
  /** has Owen marked update block `id` Seen (not applied yet)? */
  isSeen: (id: string) => boolean
}

/** No live review:  outside a review, or a server render. */
export const NO_PHASE_LIVE: PhaseLive = { workedOn: false, isSeen: () => false }
