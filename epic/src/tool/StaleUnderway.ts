import { SRV } from "spell/server"

import { PlanCommits } from "./PlanCommits"
import type { PlanDoc } from "./PlanDoc"
import { PlanItem } from "./PlanItem"
import { CLOSED, PlanDocError, UNDERWAY_CARD } from "./planDoc.types"

/****************
 * ### `StaleUnderway`
 * The open items whose Underway card has gone STALE, and whether their work is on `main` (epic `epic-engine` T78).
 * - Owen, 2026-11-15, on I172 (Underway since 10/29) and I209 (since 11/3):  "I believe these have been fixed";
 *   then "Seems like we need an 'end of turn' action to go through the open/underway issues and clean things up?"
 * - stale:  an open item whose LATEST status card is still Underway, older than `hours`, with no live working flag;
 *   or still Owen's Do this "Go ahead" card, older than `GO_AHEAD_MINUTES`, nobody on it (I292)
 * - SAID FINISHED (epic `epic-engine` I452):  an open item whose latest card is a Noted one saying its work is done
 *   (`Fixed in f43cc8655, unit tests running before the merge`), at any age:  the fix waited for its merge, and
 *   nobody said `fixed` after it
 *   - the shas the card names, when it names any, are the ONLY evidence (`onMainAs()`):  editor's I329 listed another
 *     change's commit, made before the fix
 *   - not on `main` yet:  left alone while younger than `hours`, then a Stale card, once
 *   - `epic update ... noted` refuses such words since (`refuseFinishedNote()`):  these are the ones from before
 *   (`working`:  the inbox's, younger than `WORKING_HOURS`, as the page counts them, I280)
 * - its work on `main`:  a commit on `main` naming it (`<epic> I172:  ...`, this epic's only), or one of its own
 *   `<epic-commit>` cards' shas, found in ONE `git log` of `main` since the oldest such card
 * - `apply()`:  found on `main` => an issue Claude found, grey (`SelfFix`);  any other issue or judgement call
 *   fixed for Owen's review (`PlanDoc.fixedForReview()`,
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
    const named = (commit: MainCommit, sha: string) => commit.sha.startsWith(sha) || sha.startsWith(commit.sha)
    return stale.map(({ element, since, said: saidCard }) => {
      const id = element.id
      const listed = Array.from(element.querySelectorAll(":scope > epic-commit"))
        .map((commit) => commit.getAttribute("sha") ?? "")
        .filter(Boolean)
      // said finished naming its commits:  only those count, another commit naming the item may be another change
      const onMain = saidCard?.shas.length
        ? [
            ...new Map(
              saidCard.shas
                .flatMap((sha) => log.find((commit) => named(commit, sha)) ?? this.onMainAs(sha) ?? [])
                .map((commit) => [commit.sha, commit])
            ).values()
          ]
        : log.filter(
            (commit) =>
              listed.some((sha) => named(commit, sha)) ||
              (commit.parsed?.epic === this.epic && commit.parsed.items.includes(id))
          )
      return {
        id,
        title: PlanItem.titleOf(element),
        since: new Date(since).toISOString(),
        ageDays: Math.floor((now - since) / DAY),
        onMain: onMain.map(({ sha, subject }) => ({ sha: sha.slice(0, 9), full: sha, subject })),
        noted: StaleUnderway.isNoted(element),
        ...(saidCard && { said: saidCard.words, waiting: now - since < this.hours * HOUR })
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
        const reviewable = /^[ij]\d/.test(item.id)
        if (reviewable) this.plan.fixedForReview(item.id, StaleUnderway.evidence(item))
        else
          this.plan.noteStatus(
            item.id,
            `${StaleUnderway.evidence(item)}<p>Still open:  close it once it's checked.</p>`
          )
        // the commits themselves under its Commits (the git icon), each subject clamped there to two lines
        for (const commit of item.onMain)
          if (!this.plan.hasCommit({ item: item.id }, commit.full))
            this.plan.addCommit({ item: item.id }, commit.full, StaleUnderway.sentenceOf(commit.subject))
        const grey = this.plan.item(item.id).hasAttribute("self-fixed")
        const said = grey ? "fixed, grey" : reviewable ? "fixed, for review" : "noted"
        lines.push(`${label} ${said}:  on main as ${first.sha}`)
      } else if (item.waiting) {
        continue
      } else if (item.said && !item.noted) {
        this.plan.noteStatus(
          item.id,
          `<p>${STALE_CARD}  Said finished on ${item.since.slice(0, 10)}, but no commit on main names it, nor ` +
            `the commit its card gave.</p><p>Claude will merge it and mark it fixed, or say why not.</p>`
        )
        lines.push(`${label} stale:  said finished ${item.ageDays}d ago, nothing on main`)
      } else if (!item.said && !item.noted) {
        this.plan.noteStatus(
          item.id,
          `<p>${STALE_CARD}  Underway since ${item.since.slice(0, 10)}, nobody working on it, and no commit on main ` +
            `names it.</p><p>Claude will pick it up, or close it with a reason.</p>`
        )
        lines.push(`${label} stale:  underway ${item.ageDays}d, nothing on main`)
      }
    }
    return lines
  }

  /**
   * The card a tidy writes on an item whose work it found on `main`:  SHORT, a paragraph per fact (epic `epic-engine`
   * I290).
   * - the commit's sha only:  the commit itself goes under the item's Commits, its subject clamped to two lines there
   * - Owen, 2026-11-15, on I172's card, which pasted the whole subject:  "that `done` text is waaaay to dense"
   */
  static evidence(item: StaleUnderwayItem): string {
    const [first, ...rest] = item.onMain
    const more = rest.length ? ` and ${rest.length} more` : ""
    return (
      `<p>Found on main by the end-of-turn tidy, in commit <code>${first!.sha}</code>${more}.</p>` +
      `<p>The commit is under this item's Commits (its git icon).</p>`
    )
  }

  /** A commit's line under Commits:  its subject without the `<epic> I172:  ` head, as `addCommits()` lists one. */
  static sentenceOf(subject: string): string {
    return PlanCommits.parseCommitSubject(subject)?.sentence || subject
  }

  /** `report()` as lines to read. */
  static lines(epic: string, items: StaleUnderwayItem[]): string[] {
    if (!items.length) return [`${epic}:  no stale Underway items`]
    return [
      `${epic}:  ${items.length} stale Underway`,
      ...items.map((item) => {
        const where = item.onMain.length
          ? `on main:  ${item.onMain.map((each) => `${each.sha} ${each.subject}`).join(";  ")}`
          : item.waiting
            ? "said finished, waiting for its merge"
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

  /**
   * Open items whose latest status card is Underway, older than `hours`, nobody working on them;
   * or a Noted card saying the work is finished (`saidFinished()`), at any age.
   */
  private candidates(now: number): Candidate[] {
    const found: Candidate[] = []
    for (const element of Array.from(this.plan.document.querySelectorAll("epic-item[id]"))) {
      if (CLOSED.has(element.getAttribute("status") ?? "open")) continue
      if (element.hasAttribute("fixed")) continue
      const cards = Array.from(element.querySelectorAll(":scope > epic-status"))
      const last = cards.at(-1)
      if (!last) continue
      const said = StaleUnderway.saidFinished(last)
      if (said) {
        const since = StaleUnderway.timeOf(last.getAttribute("done-at") ?? last.getAttribute("at"))
        if (Number.isFinite(since)) found.push({ element, since, said })
        continue
      }
      const underway = last.matches(UNDERWAY_CARD.replace(":scope > ", ""))
      if (!underway && !StaleUnderway.isGoAhead(last)) continue
      const since = StaleUnderway.timeOf(last.getAttribute("at"))
      const wait = underway ? this.hours * HOUR : GO_AHEAD_MINUTES * MINUTE
      if (!Number.isFinite(since) || now - since < wait) continue
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

  /**
   * The commit on `main` a card's `sha` stands for, when the log's days didn't reach it (I452);  `undefined` for none.
   * - itself, when `main` has it
   * - else `main`'s commit of the SAME subject:  a branch rebased before its merge leaves the card's sha behind
   *   (mockup's T49:  ff79e90f3 on no branch, its work on main as 51a423edc)
   * - a few git runs per sha:  only said-finished cards ask, and they're few.  NEVER throws.
   */
  private onMainAs(sha: string): MainCommit | undefined {
    const options = { timeout: GIT_TIMEOUT }
    const [full, subject = ""] = (SRV.Git.out(["log", "-1", "--format=%H%x01%s", sha], this.main, options) ?? "").split(
      "\x01"
    )
    if (!full || !subject) return undefined
    const commit = (each: string) => ({ sha: each, subject, parsed: PlanCommits.parseCommitSubject(subject) })
    if (SRV.Git.run(["merge-base", "--is-ancestor", full, this.base], this.main, options).ok) return commit(full)
    const copies = SRV.Git.lines(
      ["log", this.base, "-F", `--grep=${subject}`, "-n", "20", "--format=%H%x01%s"],
      this.main,
      options
    )
    const copy = copies.map((line) => line.split("\x01")).find(([, each]) => each === subject)?.[0]
    return copy ? commit(copy) : undefined
  }

  /**
   * What a Noted `card` says, when it says the item's work is finished (`FINISHED_WORDS`), and the shas it names;
   * `undefined` for any other card (epic `epic-engine` I452).
   * - its summary (an underway card turned noted keeps its reading first), else its whole text
   */
  static saidFinished(card: Element): { words: string; shas: string[] } | undefined {
    if (card.getAttribute("state") !== "noted") return undefined
    const summary = card.querySelector(':scope > [slot="summary"]')?.textContent
    const words = StaleUnderway.plain(summary ?? card.textContent ?? "")
    if (!FINISHED_WORDS.test(words)) return undefined
    return { words, shas: words.match(SHA_WORDS) ?? [] }
  }

  /**
   * Throws when a Noted card's `what` (HTML) says item `id`'s work is finished (epic `epic-engine` I452):  that is
   * `fixed` once merged, or `underway` while the merge waits, never a Noted card.
   * - Owen, 2026-11-23, on editor's I329, red under "Noted · Fixed in f43cc8655":  "This should show as `Fixed`.
   *   I've noticed this a lot lately"
   */
  static refuseFinishedNote(id: string, what: string): void {
    const words = StaleUnderway.plain(what)
    if (!FINISHED_WORDS.test(words)) return
    const label = id.toUpperCase()
    throw new PlanDocError(
      `${label}:  a Noted card is a record, not finished work ("${words.slice(0, 40)}...").\n` +
        `  merged:  epic update <epic>#${label} fixed "<what changed>"  (a todo:  done "<summary>")\n` +
        `  waiting for its merge:  epic update <epic>#${label} underway "<what's left>", then fixed once merged`
    )
  }

  /** Text, its tags dropped and its spaces folded. */
  private static plain(html: string): string {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  /**
   * Is `card` the Noted "Go ahead" card Owen's Do this leaves (`PlanDoc.doThis()`), nobody's Underway card after it
   * (epic `epic-engine` I292:  I287 sat at "Go ahead:  fix this here", its fix merged, nobody on it)
   */
  private static isGoAhead(card: Element): boolean {
    return card.getAttribute("state") === "noted" && (card.textContent ?? "").trim().startsWith(GO_AHEAD_CARD)
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
  /** the commits on `main` naming it or listed on it, newest first:  `sha` short, `full` whole */
  onMain: { sha: string; full: string; subject: string }[]
  /** a tidy's Stale card is on it already */
  noted: boolean
  /** its latest card is a Noted one saying its work is finished:  those words (I452) */
  said?: string
  /** said finished, not on main, younger than `hours`:  left alone */
  waiting?: boolean
}

/** One item `candidates()` found:  its element, its latest card's time (ms), and what that card said, if finished. */
type Candidate = { element: Element; since: number; said?: { words: string; shas: string[] } }

/** How a card saying the work is finished starts (I452):  `Fixed in f43cc8655`, `Done, on main in ...`, `Merged:`. */
export const FINISHED_WORDS = /^(fixed|done|built|merged)\b/i

/** A sha in a card's words:  7 to 40 hex digits. */
const SHA_WORDS = /\b[0-9a-f]{7,40}\b/g

/** A commit of `main`'s log. */
type MainCommit = { sha: string; subject: string; parsed: ReturnType<typeof PlanCommits.parseCommitSubject> }

/** How old an Underway card must be before the end-of-turn tidy looks at it. */
export const STALE_HOURS = 3

/** A working flag older than this no longer counts (the page's rule too, epic `epic-engine` I280). */
const WORKING_HOURS = 12

/** How a tidy's Stale card starts:  so the next tidy leaves it alone. */
const STALE_CARD = "Stale:"

const HOUR = 3_600_000

/** A minute, in ms. */
const MINUTE = 60_000

/** How long a Do this's "Go ahead" card may wait with nobody's Underway card after it (I292). */
const GO_AHEAD_MINUTES = 30

/** The start of the Noted card Owen's Do this leaves (`PlanDoc.doThis()`). */
const GO_AHEAD_CARD = "Go ahead:"
const DAY = 24 * HOUR
const GIT_TIMEOUT = 30_000
