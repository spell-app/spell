import { stringFlag } from "spell/epic/command/command.types"
import { CLOSED_AS, type ClosedAs } from "spell/epic/components/epic-item/ItemBadge"
import { Markup } from "spell/epic/markup"

import { ItemJudge, type Judgement } from "./ItemJudge"
import { PlanItem } from "./PlanItem"
import { PlanTime } from "./PlanTime"
import { StaleFacts } from "./StaleFacts"
import { JUDGEMENT_ID, PlanDocError, type BadgeMode } from "./planDoc.types"

import type { PlanDoc } from "./PlanDoc"
import type { Flags, PlanDocCommands } from "./PlanDocCommands"

/****************
 * ### `BadgeCommands`
 * `epic badges <epic> ...` (epic `epic-engine` P81):  one page's item badges.
 * - `trial | on | off`:  turn them on, or undo them all in one command (`off`)
 * - `score`, `set`:  store judgements (`ItemJudge`), only on a page with badges:  no other epic is ever scored
 * - `close`:  what a badge would grey, or what a recheck found;  NEVER in a trial
 * - `close-new yes | no`:  may a new item close as it's made?  Only once they said yes to that by itself (I435)
 * - `list`:  each open item's scores, badge, and what would close
 * - it stores and prints;  it starts no work
 * - node only;  imported by `PlanDocCommands`, by path
 ****************/
export class BadgeCommands {
  constructor(private readonly owner: PlanDocCommands) {}

  /** Run `badges <name> [verb] [ids...]` on the epic page at `file`. */
  async run(name: string, file: string, [verb = "list", ...refs]: string[], flags: Flags): Promise<void> {
    const ids = refs.flatMap((ref) => ref.split(",")).flatMap((ref) => ref.trim().replace(/^#/, "") || [])
    switch (verb) {
      case "list":
        return this.list(file, Boolean(flags.json))
      case "trial":
      case "on":
        return this.turn(file, verb)
      case "off":
        return this.turnOff(file)
      case "score":
        return this.score(name, file, ids, flags)
      case "set":
        return this.set(file, ids, flags)
      case "close":
        return this.close(file, ids, flags)
      case "close-new":
        return this.turnCloseNew(file, refs[0])
      default:
        throw new PlanDocError(`badges ${verb}?  list, trial, on, off, score, set, close or close-new`)
    }
  }

  /**
   * The items `ids` judged and stored, as they were just made (`PlanDocCommands.edit()`).
   * - never closed for it, unless they said yes to that (`close-new`), with badges `on`
   *   - and never a call:  its work can't be on main as it's made (I435)
   * - NEVER throws for a judge that can't run:  one line on stderr, the items drawn as before badges
   */
  async judgeNew(name: string, file: string, ids: readonly string[]): Promise<void> {
    const judge = this.owner.itemJudge
    const skip = judge.skipReason()
    if (skip) {
      if (!skip.quiet) this.owner.warn(`epic:  not scored for a badge (${skip.why})`)
      return
    }
    try {
      const plan = this.owner.read(file)
      const items = ItemJudge.candidates(plan, { ids: new Set(ids) })
      if (!items.length) return
      const judgements = judge.decide(name, plan.today, items)
      await this.owner.files.edit(file, (doc) => {
        const stored = ItemJudge.store(doc, judgements)
        if (doc.badges.mode !== "on" || !doc.page.hasAttribute("badges-close-new")) return
        doc.badges.refresh()
        for (const id of stored) {
          if (JUDGEMENT_ID.test(id) || !doc.badges.badgeOf(doc.item(id)).closes) continue
          if (!doc.closeRefusal(id, { tests: true })) doc.closeByBadge(id)
        }
      })
    } catch (error) {
      this.owner.warn(`epic:  not scored for a badge:  ${(error as Error).message}`)
    }
  }

  ////////////////
  // ## The verbs
  ////////////////

  /** `list [--json]`:  every open item's scores and badge, what would close last. */
  private list(file: string, json: boolean) {
    const plan = this.owner.read(file)
    const rows = BadgeCommands.rowsOf(plan)
    const mode = plan.badges.mode ?? "off"
    if (json) return this.owner.print(JSON.stringify({ badges: mode, items: rows }, null, 2))
    const closing = rows.filter((row) => row.closes)
    const line = (row: BadgeRow) =>
      `  ${row.id.toUpperCase().padEnd(6)}${scoreOf(row.care).padEnd(5)}${scoreOf(row.doubt).padEnd(5)}` +
      `${(row.badge ?? "--").padEnd(16)}${row.title}`
    this.owner.print(
      [
        `badges ${mode}:  ${rows.length} open, ${rows.filter((row) => row.care !== undefined).length} scored, ` +
          `${closing.length} would close (id, care, doubt, badge)`,
        ...rows.filter((row) => !row.closes).map(line),
        ...(closing.length ? ["would close, left as they are:", ...closing.map(line)] : [])
      ].join("\n")
    )
  }

  /** `trial | on`:  the page's badges, logged. */
  private async turn(file: string, mode: BadgeMode) {
    await this.owner.files.edit(file, (plan) => {
      if (plan.badges.mode === mode) return
      Markup.set(plan.page, { badges: mode })
      plan.log(`item badges ${mode}`)
    })
    this.owner.print(`badges ${mode}`)
  }

  /** `close-new yes | no`:  whether a new item its badge would grey closes as it's made, logged. */
  private async turnCloseNew(file: string, answer: string | undefined) {
    if (answer !== "yes" && answer !== "no")
      throw new PlanDocError("badges close-new takes yes or no:  yes only once they said so to that by itself")
    await this.owner.files.edit(file, (plan) => {
      if (!plan.badges.mode) throw new PlanDocError(NO_BADGES)
      Markup.set<"epic-page">(plan.page, { badgesCloseNew: answer === "yes" || undefined })
      plan.log(`item badges:  new items close as they're made:  ${answer}`)
    })
    this.owner.print(`close-new ${answer}`)
  }

  /** `off`:  every badge, score and close by a badge undone (`PlanDoc.clearBadges()`). */
  private async turnOff(file: string) {
    const { cleared, reopened } = await this.owner.files.edit(file, (plan) => plan.clearBadges())
    this.owner.print(`badges off:  ${cleared} scores cleared, ${reopened} reopened`)
  }

  /**
   * `score [ids...]`:  judge the open items never judged (or `ids`, again), saved a batch at a time.
   * - several:  each with what the repo knows since it was written (`StaleFacts`)
   * - a batch that fails is said, and left as it is;  run it again for those
   */
  private async score(name: string, file: string, ids: string[], flags: Flags) {
    const plan = this.owner.read(file)
    if (!plan.badges.mode) throw new PlanDocError(NO_BADGES)
    for (const id of ids) plan.item(id)
    const wanted = ids.length ? new Set(ids.map((id) => id.toLowerCase())) : undefined
    const model = stringFlag(flags.model)
    const judge = model ? new ItemJudge({ model }) : this.owner.itemJudge
    const skip = judge.skipReason()
    if (skip) throw new PlanDocError(`can't score (${skip.why})`)
    let items = ItemJudge.candidates(plan, { ids: wanted })
    if (items.length >= HINTS_FROM)
      items = ItemJudge.candidates(plan, { ids: wanted, hints: this.hintsOf(name, plan, file) })
    let scored = 0
    const batches = ItemJudge.batches(items)
    for (const [at, batch] of batches.entries()) {
      let judgements: Judgement[]
      try {
        judgements = judge.decide(name, plan.today, batch)
      } catch (error) {
        this.owner.warn(`epic:  batch ${at + 1} of ${batches.length} not scored:  ${(error as Error).message}`)
        continue
      }
      scored += (await this.owner.files.edit(file, (doc) => ItemJudge.store(doc, judgements))).length
      this.owner.warn(`epic:  batch ${at + 1} of ${batches.length}:  ${scored} of ${items.length} scored`)
    }
    if (scored) await this.owner.files.edit(file, (doc) => doc.log(`item badges:  ${scored} items scored`))
    this.owner.print(`scored ${scored} of ${items.length};  ${items.length - scored} left as they were`)
  }

  /** `set <ids> [--care n] [--doubt n] [--severe yes|no] [--your-call yes|no] [--why ...]`:  a recheck's outcome. */
  private async set(file: string, ids: string[], flags: Flags) {
    if (!ids.length) throw new PlanDocError("badges set:  which items?")
    const given = {
      care: percentFlag(flags.care, "--care"),
      doubt: percentFlag(flags.doubt, "--doubt"),
      severe: yesFlag(flags.severe, "--severe"),
      needsYou: yesFlag(flags.yourCall, "--your-call")
    }
    const why = stringFlag(flags.why)
    const lines = await this.owner.files.edit(file, (plan) => {
      if (!plan.badges.mode) throw new PlanDocError(NO_BADGES)
      return ids.map((id) => {
        const item = plan.item(id)
        const was = Markup.read<"epic-item">(item)
        const [care, doubt] = [given.care ?? was.care, given.doubt ?? was.doubt]
        if (care === undefined || doubt === undefined)
          throw new PlanDocError(`${id.toUpperCase()} was never scored:  give both --care and --doubt`)
        Markup.set<"epic-item">(item, {
          care,
          doubt,
          severe: (given.severe ?? was.severe) || undefined,
          needsYou: (given.needsYou ?? was.needsYou) || undefined,
          // said outright, it holds for every kind, whatever the scores (I435)
          asksYou: (given.needsYou ?? was.asksYou) || undefined,
          judged: PlanTime.isoTime(plan.now),
          judgedWhy: why ?? was.judgedWhy
        })
        plan.log(`${item.id.toUpperCase()} scored:  care ${care}, doubt ${doubt}${why ? `:  ${why}` : ""}`)
        return `${item.id.toUpperCase()} care ${care}, doubt ${doubt}`
      })
    })
    this.owner.print(lines.join("\n"))
  }

  /**
   * `close <ids> [--as vanished | moot | duplicate | declined] [--why ...]`:
   * - none given as `--as`:  only what its badge would grey
   * - `--as`:  what a recheck found, with no fix
   * - refused:  in a trial, and by the one rule, the tidy's (`PlanDoc.closeRefusal()`);  all or none
   */
  private async close(file: string, ids: string[], flags: Flags) {
    if (!ids.length) throw new PlanDocError("badges close:  which items?  epic badges <epic> list names them")
    const as = stringFlag(flags.as)
    if (as !== undefined && !(CLOSED_AS as readonly string[]).includes(as))
      throw new PlanDocError(`--as must be ${CLOSED_AS.join(" / ")}`)
    const why = stringFlag(flags.why)
    const lines = await this.owner.files.edit(file, (plan) => {
      if (plan.badges.mode !== "on")
        throw new PlanDocError("badges close:  only with badges on;  a trial closes nothing (epic badges <epic> on)")
      const refused = ids.flatMap((id) => {
        const item = plan.item(id)
        const reason =
          plan.closeRefusal(item.id, { tests: true }) ??
          (as || plan.badges.badgeOf(item).closes ? undefined : "its badge wouldn't close it:  --as says why")
        return reason ? [`${item.id.toUpperCase()}:  ${reason}`] : []
      })
      if (refused.length) throw new PlanDocError(`nothing closed:\n  ${refused.join("\n  ")}`)
      return ids.map((id) => plan.closeByBadge(id, { as: as as ClosedAs | undefined, why }))
    })
    this.owner.print(lines.join("\n"))
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** What the repo knows of each open call, issue and todo since it was written, a few phrases each. */
  private hintsOf(name: string, plan: PlanDoc, file: string): Map<string, string[]> {
    const hints = new Map<string, string[]>()
    for (const item of new StaleFacts(this.owner.staleOptions(name, plan, file)).report().items) {
      const said = [
        item.ageDays === undefined ? "" : `${item.ageDays} days old`,
        item.waitsOnDone.length ? "a phase it waits for is done" : "",
        ...item.namedInCommits.slice(0, HINT_LINES).map(({ subject }) => `a commit since names it:  ${subject}`),
        ...item.laterMentions
          .slice(0, HINT_LINES)
          .map(({ id, status, title }) => `later item ${id.toUpperCase()} (${status}) mentions it:  ${title}`)
      ].filter(Boolean)
      hints.set(item.id, said)
    }
    return hints
  }

  /** Each open item of `plan`, as `list` says it. */
  private static rowsOf(plan: PlanDoc): BadgeRow[] {
    plan.badges.refresh()
    return plan.allItems.flatMap((item): BadgeRow[] => {
      const facts = plan.badges.badgeFacts(item)
      if (facts.status !== "open") return []
      const { badge, closes } = plan.badges.badgeOf(item)
      const held = closes && plan.closeRefusal(item.id, { tests: true })
      return [
        {
          id: item.id,
          kind: facts.kind,
          title: PlanItem.titleOf(item),
          care: facts.care,
          doubt: facts.doubt,
          severe: facts.severe,
          needsYou: facts.needsYou,
          why: item.getAttribute("judged-why") ?? undefined,
          state: plan.itemState(item),
          badge: badge ?? closes?.badge,
          closes: held ? undefined : closes?.status,
          held
        }
      ]
    })
  }
}

/** One open item, as `list --json` prints it. */
type BadgeRow = {
  id: string
  kind: string
  title: string
  care?: number
  doubt?: number
  severe?: boolean
  needsYou?: boolean
  why?: string
  state: string
  badge?: string
  /** the status its badge would close it with */
  closes?: string
  /** why it's left open though its badge would close it */
  held?: string
}

/** The refusal on a page without badges. */
const NO_BADGES = "this page has no badges, so nothing is scored:  epic badges <epic> trial (or on) first"

/** A batch this big or bigger is judged with the repo's facts. */
const HINTS_FROM = 4

/** How many of each kind of hint an item gets. */
const HINT_LINES = 3

/** A score, as a list shows it. */
function scoreOf(score: number | undefined): string {
  return score === undefined ? "-" : String(score)
}

/** `--care 70`:  a whole percentage;  `undefined` when left out. */
function percentFlag(value: string | true | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined
  const percent = Number(value)
  if (value === true || value === "" || !(percent >= 0 && percent <= 100))
    throw new PlanDocError(`${flag} must be 0 to 100, not "${value}"`)
  return Math.round(percent)
}

/** `--severe yes`;  bare, yes;  `undefined` when left out. */
function yesFlag(value: string | true | undefined, flag: string): boolean | undefined {
  if (value === undefined) return undefined
  if (value === true || value === "yes") return true
  if (value === "no") return false
  throw new PlanDocError(`${flag} takes yes or no, not "${value}"`)
}
