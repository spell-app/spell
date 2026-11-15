import { SRV } from "spell/server"

import { PlanCommits } from "./PlanCommits"
import type { PlanDoc } from "./PlanDoc"
import { PlanItem } from "./PlanItem"
import { PlanMarkup } from "./PlanMarkup"
import { CLOSED, UNDERWAY_CARD } from "./planDoc.types"

/****************
 * ### `StaleUnderway`
 * The open items whose Underway card has gone STALE, and whether their work is on `main` (epic `epic-engine` T78).
 * - Owen, 2026-11-15, on I172 (Underway since 10/29) and I209 (since 11/3):  "I believe these have been fixed";
 *   then "Seems like we need an 'end of turn' action to go through the open/underway issues and clean things up?"
 * - stale:  an open item whose LATEST status card is still Underway, older than `hours`, with no live working flag
 *   (`working`:  the inbox's, younger than `WORKING_HOURS`, as the page counts them, I280)
 * - its work on `main`:  a commit on `main` naming it (`<epic> I172:  ...`, this epic's only), or one of its own
 *   `<epic-commit>` cards' shas, found in ONE `git log` of `main` since the oldest such card
 * - `apply()`:  found on `main` => an issue or judgement call fixed for Owen's review (`PlanDoc.fixedForReview()`,
 *   orange), the commit its evidence;  another kind (a todo) a Noted card with the evidence;  not found => a Noted card
 *   saying it's stale ("Stale:  ..."), once, so it's back on Owen's list instead of spinning blue forever
 *   - NEVER closes anything:  only Owen's Approve, or Claude's own `close`, does
 * - the mechanical half of `/epic tidy`:  the epic skill's "14. Tidy" judges the rest;  the end of every turn runs
 *   it (`TurnEnd`), at most once an hour per epic
 * - Node only (git);  imported by `PlanDocCommands`, by path.
 ****************/
export class StaleUnderway {
  /** the page, its parts read in */
  readonly plan: PlanDoc

  /** the epic's name, as commit subjects give it */
  readonly epic: string

  /** the main checkout:  its base branch is what "on main" means */
  readonly main: string

  /** the base branch's name (`main`) */
  readonly base: string

  /** the inbox's working flags:  id (lower case) => since (ISO) */
  readonly working: Readonly<Record<string, { since: string }>>

  /** how old an Underway card must be to count as stale */
  readonly hours: number

  constructor({ plan, epic, main, base = "main", working = {}, hours = STALE_HOURS }: StaleUnderwayOptions) {
    this.plan = plan
    this.epic = epic
    this.main = main
    this.base = base
    this.working = working
    this.hours = hours
  }

  /**
   * Every stale Underway item, in page order, with the commits on `main` that name it or that it lists.
   * - NEVER throws for a git failure:  without git, nothing is found on `main`
   */
  report(): StaleUnderwayItem[] {
    const now = this.plan.now.getTime()
    const stale = this.candidates(now)
    if (!stale.length) return []
    const oldest = Math.min(...stale.map((each) => each.since))
    const log = this.mainLog(oldest)
    return stale.map(({ element, since }) => {
      const id = element.id
      const listed = Array.from(element.querySelectorAll(":scope > epic-commit"))
        .map((commit) => commit.getAttribute("sha") ?? "")
        .filter(Boolean)
      const onMain = log.filter(
        (commit) =>
          listed.some((sha) => commit.sha.startsWith(sha) || sha.startsWith(commit.sha)) ||
          (commit.parsed?.epic === this.epic && commit.parsed.items.includes(id))
      )
      return {
        id,
        title: PlanItem.titleOf(element),
        since: new Date(since).toISOString(),
        ageDays: Math.floor((now - since) / DAY),
        onMain: onMain.map(({ sha, subject }) => ({ sha: sha.slice(0, 9), subject })),
        noted: StaleUnderway.isNoted(element)
      }
    })
  }

  /**
   * Act on `report()`:  each one found on `main`, fixed for review (another kind:  a Noted card);  each one not, a
   * Stale card, once.  Returns a line per item changed.
   * - SIDE EFFECT:  edits `plan`;  the caller writes it (`PlanDocFiles.edit()`)
   */
  apply(items = this.report()): string[] {
    const lines: string[] = []
    for (const item of items) {
      const label = item.id.toUpperCase()
      if (item.onMain.length) {
        const first = item.onMain[0]!
        const evidence =
          `Found on main by the end-of-turn tidy:  <code>${first.sha}</code> ${PlanMarkup.text(first.subject)}` +
          (item.onMain.length > 1 ? ` (and ${item.onMain.length - 1} more)` : "")
        const reviewable = /^[ij]\d/.test(item.id)
        if (reviewable) this.plan.fixedForReview(item.id, evidence)
        else this.plan.noteStatus(item.id, `${evidence}.  Still open:  close it once it's checked.`)
        lines.push(`${label} ${reviewable ? "fixed, for review" : "noted"}:  on main as ${first.sha}`)
      } else if (!item.noted) {
        this.plan.noteStatus(
          item.id,
          `${STALE_CARD}  Underway since ${item.since.slice(0, 10)}, nobody working on it, and no commit on main ` +
            `names it.  Claude will pick it up, or close it with a reason.`
        )
        lines.push(`${label} stale:  underway ${item.ageDays}d, nothing on main`)
      }
    }
    return lines
  }

  /** `report()` as lines to read. */
  static lines(epic: string, items: StaleUnderwayItem[]): string[] {
    if (!items.length) return [`${epic}:  no stale Underway items`]
    return [
      `${epic}:  ${items.length} stale Underway`,
      ...items.map((item) => {
        const where = item.onMain.length
          ? `on main:  ${item.onMain.map((each) => `${each.sha} ${each.subject}`).join(";  ")}`
          : item.noted
            ? "nothing on main (Stale card already)"
            : "nothing on main"
        return `${item.id.toUpperCase().padEnd(6)}${item.title}\n      ${item.ageDays}d  ·  ${where}`
      })
    ]
  }

  ////////////////
  // ## Finding them
  ////////////////

  /** Open items whose latest status card is Underway, older than `hours`, nobody working on them. */
  private candidates(now: number): { element: Element; since: number }[] {
    const found: { element: Element; since: number }[] = []
    for (const element of Array.from(this.plan.document.querySelectorAll("epic-item[id]"))) {
      if (CLOSED.has(element.getAttribute("status") ?? "open")) continue
      if (element.hasAttribute("fixed")) continue
      const cards = Array.from(element.querySelectorAll(":scope > epic-status"))
      const last = cards.at(-1)
      if (!last || !last.matches(UNDERWAY_CARD.replace(":scope > ", ""))) continue
      const since = StaleUnderway.timeOf(last.getAttribute("at"))
      if (!Number.isFinite(since) || now - since < this.hours * HOUR) continue
      if (this.isWorkedOn(element.id, now)) continue
      found.push({ element, since })
    }
    return found
  }

  /** Is someone working on `id` now:  a working flag younger than `WORKING_HOURS`? */
  private isWorkedOn(id: string, now: number): boolean {
    const since = Date.parse(this.working[id]?.since ?? "")
    return Number.isFinite(since) && now - since < WORKING_HOURS * HOUR
  }

  /** `main`'s commits since `from` (ms, less a day), newest first:  ONE `git log`. */
  private mainLog(from: number): MainCommit[] {
    const since = new Date(from - DAY).toISOString()
    const lines = SRV.Git.lines(["log", this.base, `--since=${since}`, "--format=%H%x01%s"], this.main, {
      timeout: GIT_TIMEOUT
    })
    return lines.flatMap((line) => {
      const [sha, subject = ""] = line.split("\x01")
      return sha ? [{ sha, subject, parsed: PlanCommits.parseCommitSubject(subject) }] : []
    })
  }

  /** Has a tidy already left its Stale card on `item`, after its Underway card? */
  private static isNoted(item: Element): boolean {
    return Array.from(item.querySelectorAll(":scope > epic-status")).some((card) =>
      (card.textContent ?? "").trim().startsWith(STALE_CARD)
    )
  }

  /** A card's `at` (`2026-10-29 10:44`, local), in ms;  `NaN` for none. */
  private static timeOf(text: string | null): number {
    return text ? Date.parse(text.trim().replace(" ", "T")) : NaN
  }
}

/** What `new StaleUnderway()` takes. */
export type StaleUnderwayOptions = {
  plan: PlanDoc
  epic: string
  main: string
  base?: string
  working?: Readonly<Record<string, { since: string }>>
  hours?: number
}

/** One stale Underway item, as `report()` gives it. */
export type StaleUnderwayItem = {
  /** its id, lower case */
  id: string
  title: string
  /** when its Underway card was written (ISO) */
  since: string
  ageDays: number
  /** the commits on `main` naming it or listed on it, newest first */
  onMain: { sha: string; subject: string }[]
  /** a tidy's Stale card is on it already */
  noted: boolean
}

/** A commit of `main`'s log. */
type MainCommit = { sha: string; subject: string; parsed: ReturnType<typeof PlanCommits.parseCommitSubject> }

/** How old an Underway card must be before the end-of-turn tidy looks at it. */
export const STALE_HOURS = 3

/** A working flag older than this no longer counts (the page's rule too, epic `epic-engine` I280). */
const WORKING_HOURS = 12

/** How a tidy's Stale card starts:  so the next tidy leaves it alone. */
const STALE_CARD = "Stale:"

const HOUR = 3_600_000
const DAY = 24 * HOUR
const GIT_TIMEOUT = 30_000
