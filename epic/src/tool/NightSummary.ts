import { PhaseStatuses } from "spell/epic/phases"

import { CALM_ID } from "./planDoc.types"
import type { PlanDoc } from "./PlanDoc"
import { PlanItem } from "./PlanItem"

/****************
 * ### `NightSummary`
 * What "0. While you were out" says (epic `epic-engine` P62):  what Claude did on an epic since Owen last pressed
 * "Done reading", and what needs him now, worked out ONE way from the page as it is.
 * - WHAT WAS DONE:  each phase done since then, in the order they finished;  UNDER WAY, a part of its own after it, each
 *   phase started since and still running (epic `epic-engine` I223;  Owen, 2026-11-04:  "P27 should be in an
 *   \"Underway\" section like `What was done`"):  its result in a phrase (its Done list's first
 *   line), its last commit, and whether that's in `main` (`isMerged`)
 * - STILL TO DO, in the order to look at them:  red items (calls and questions waiting on him), open issues, manual tests
 *   to run;  only those changed since he last read it
 *   - NOT a phase under way:  it is listed once, under What was done, its mark spinning (Owen, 2026-11-03:  "listed
 *     twice")
 * - the lead:  the bedtime runs that ended since (`Bedtime done:  ...`, the log's own line)
 * - Never kept by hand:  `PlanDoc.refreshAway()` draws the section from this on every edit (Owen's C3:  for all work,
 *   bedtime or not;  J198).
 * - A line Owen ticked Read leaves it (epic `epic-engine` I206):  `seen`, when he read each line (by its phase's or item's
 *   id) or each part (`done`, `todo`);  a change to it after that brings it back.
 * - Pure over the doc, but `isMerged`, which the caller hands in (it runs git);  without it, nothing is said of merging.
 ****************/
export class NightSummary {
  /** The bedtime runs that ended since:  their summaries, oldest first. */
  readonly lead: string[]

  /** The phases done or under way since. */
  readonly done: DoneLine[]

  /** What needs Owen, in the order to look at it. */
  readonly needs: NeedLine[]

  private constructor(lead: string[], done: DoneLine[], needs: NeedLine[]) {
    this.lead = lead
    this.done = done
    this.needs = needs
  }

  /**
   * The summary of `plan` since `since`.
   * - `isMerged(sha)`:  whether a commit is in `main`;  `undefined` (or none given):  unknown, so not said
   */
  static of(plan: PlanDoc, since: Date, { isMerged, seen = {} }: SummaryOptions = {}): NightSummary {
    const from = since.getTime()
    // read since it last changed:  by itself, or with its whole part
    const isRead = (id: string, part: AwayPart, at: number) =>
      NightSummary.timeOf(seen[id]) >= at || NightSummary.timeOf(seen[part]) >= at
    const lead = plan
      .reviewLines()
      .filter((line) => {
        const at = NightSummary.timeOf(line.at)
        return at >= from && BEDTIME_DONE.test(line.text) && NightSummary.timeOf(seen.done) < at
      })
      .map((line) => line.text.replace(BEDTIME_DONE, "").trim())
    const done: DoneLine[] = []
    for (const phase of plan.phases) {
      const element = plan.phase(phase.n)
      const doneAt = Date.parse(element.getAttribute("done-at") ?? "")
      const window = phase.status === "active" ? plan.activeWindow(phase.n) : undefined
      // finished:  done, or dropped (epic `epic-engine` I228), in the same part:  "P18 · ... dropped:  Moved to P38"
      const dropped = phase.status === "dropped"
      const isDone = PhaseStatuses.isFinished(phase.status) && doneAt >= from
      const isUnderWay = phase.status === "active" && !!window && window.from >= from
      if (!isDone && !isUnderWay) continue
      const changedAt = isDone ? doneAt : window!.from
      if (isRead(phase.id, isDone ? "done" : "underway", changedAt)) continue
      const sha = Array.from(element.querySelectorAll("epic-commit"))
        .map((commit) => commit.getAttribute("sha") ?? "")
        .findLast(Boolean)
      done.push({
        id: phase.id,
        label: `P${phase.number} · ${phase.name}`,
        status: isDone ? (dropped ? "dropped" : "done") : "under way",
        built: NightSummary.firstLine(
          element.querySelector(`:scope > epic-field[name='${dropped ? "dropped" : "done"}']`)
        ),
        sha: sha ? sha.slice(0, 9) : undefined,
        merged: sha ? isMerged?.(sha) : undefined,
        at: isDone ? doneAt : Infinity
      })
    }
    // in the order they finished, the ones still under way last (Owen, 2026-11-03:  "should list there in the order
    // completed")
    done.sort((a, b) => a.at - b.at)
    const items = Array.from(plan.document.querySelectorAll("epic-item[id]")).filter((item) => {
      const changed = NightSummary.timeOf(item.getAttribute("changed"))
      return (
        changed >= from &&
        !CLOSED.test(item.getAttribute("status") ?? "") &&
        !NightSummary.isFollowedUp(item) &&
        !isRead(item.id, "todo", changed)
      )
    })
    const needs = NEED_ORDER.flatMap(([why, wants]) =>
      items.filter(wants).map((item) => ({
        id: item.id,
        label: item.id.toUpperCase(),
        title: PlanItem.titleOf(item),
        why
      }))
    )
    return new NightSummary(lead, done, needs)
  }

  /**
   * Did Owen turn `item` into a todo (Make Todo:  its Noted card "Made todo T45 to follow this up.")?  Then it waits
   * on that todo, not on him:  never in Still to do (epic `epic-engine` r57, I224;  🚧 language:  I11-I14 stayed
   * "open issue" after each was made a todo).
   * - the same for an issue or a call he asked for with Do this (I232):  it waits on Claude, red, until it's `fixed`,
   *   when it's his to review again
   */
  static isFollowedUp(item: Element): boolean {
    if (item.hasAttribute("fixed")) return false
    if (item.hasAttribute("urgent") && CALM_ID.test(item.id)) return true
    return Array.from(item.querySelectorAll("epic-status")).some((card) => FOLLOWED_UP.test(card.textContent ?? ""))
  }

  /** Nothing new since:  the section isn't drawn. */
  get isEmpty(): boolean {
    return !this.lead.length && !this.done.length && !this.needs.length
  }

  /** How many things wait on Owen:  the section's toolbar badge. */
  get waiting(): number {
    return this.needs.length
  }

  /** `text`, a time as the page writes it (`2026-11-03 14:30`, ISO), in ms;  `-Infinity` for none. */
  private static timeOf(text: string | null | undefined): number {
    const at = text ? Date.parse(text.replace(" ", "T")) : NaN
    return Number.isNaN(at) ? -Infinity : at
  }

  /** The text of `field`'s first line:  its first list item or paragraph, else its own text;  "" for none. */
  private static firstLine(field: Element | null): string {
    if (!field) return ""
    const first = field.querySelector("li, p") ?? field
    return (first.textContent ?? "").replace(/\s+/g, " ").trim()
  }
}

/** One phase done or under way since Owen last read. */
export type DoneLine = {
  /** its stable id, for the link */
  id: string
  /** `P61 · Formatting While You Edit` */
  label: string
  /** `done`, `dropped` (never built, I228;  listed with the done), or `under way` (left part done, or still running) */
  status: "done" | "dropped" | "under way"
  /** what it built, in a phrase:  its Done list's first line (a dropped one's:  its Dropped field's);  "" for none */
  built: string
  /** its last commit, short;  `undefined` for none */
  sha: string | undefined
  /** is that commit in `main`?  `undefined`:  unknown */
  merged: boolean | undefined
  /** when it finished, in ms;  `Infinity` while under way:  the list's order */
  at: number
}

/** One thing that needs Owen. */
export type NeedLine = {
  /** the item's or phase's id, for the link */
  id: string
  /** `J196`, `P62` */
  label: string
  /** its title */
  title: string
  /** why it waits on him, in a word or two */
  why: string
}

/** What `NightSummary.of()` takes besides the doc. */
export type SummaryOptions = {
  /** whether a commit (its sha) is in `main`;  `undefined`:  unknown */
  isMerged?: (sha: string) => boolean | undefined
  /**
   * when Owen ticked each line Read (by its phase's or item's id) or each part (`done`, `todo`), as the page writes
   * times;  read before its last change, it shows again (`<epic-page away-seen>`, I206)
   */
  seen?: Readonly<Record<string, string>>
}

/** A part of the section, as its heading's tick names it. */
export type AwayPart = "done" | "underway" | "todo"

/** A Noted card saying the item was made a todo (`PlanDoc`'s `filedTodo()`). */
const FOLLOWED_UP = /\bMade todo T\d+ to follow this up\b/

/** The log's line for a bedtime run that ended (`epic bedtime <name> done "<summary>"`). */
const BEDTIME_DONE = /^Bedtime done:\s*/

/** An item closed:  done, decided or canceled. */
const CLOSED = /^(done|decided|canceled)$/

/**
 * What needs Owen, in the order to look at it, each with what picks it:
 * - a call or a question waiting on him (drawn red)
 * - an open issue
 * - a manual test to run
 */
const NEED_ORDER: readonly [string, (item: Element) => boolean][] = [
  ["needs your call", (item) => item.getAttribute("state") === "attention" && !/^[im]\d/.test(item.id)],
  ["open issue", (item) => /^i\d/.test(item.id)],
  ["to test", (item) => /^m\d/.test(item.id)]
]
