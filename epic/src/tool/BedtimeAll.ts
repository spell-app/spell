import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import JSON5 from "json5"

import { ClaudeHome, type RunningSession } from "spell/epic/config/ClaudeHome"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicHome } from "spell/epic/config/EpicHome"
import type { EpicListing } from "./PlanDocFiles"
import type { Phase, PlanSummary } from "./planDoc.types"

/****************
 * ### `BedtimeAll`
 * `/bedtime all`'s data (epic `epic-engine` T85;  Owen, 2026-11-16:  "`/bedtime all` to put everything in bedtime
 * mode"):  which epics a night takes, one details page asking for all of them at once, and where each run stands.
 * - `epic bedtime all plan [--include <epic,...>] [--json]`:  the CANDIDATES (`candidates()`), written into tonight's
 *   folder, `plan.json5`
 *   - every RUNNING epic (a Claude Code session in its worktree) in progress with a phase still to do (todo or
 *     active), not in bedtime mode already
 *   - an epic with phases to do and no session is only listed (`idle`), unless `--include` names it:  then a session
 *     is started for it in its window
 *   - a STANDING epic (epic-engine) only when it has a phase to do:  its open todos are started by day (I314)
 *   - each with its running session's address (`SendMessage`'s `to`), when one runs in its worktree
 * - `epic bedtime all questions <epic> --file <questions.json>`:  an epic's session drops its up-front questions there
 *   (`QuestionsFile`), when the home session asked it to
 * - `epic bedtime all spec [--wait 5m] [--out <file>]`:  waits for every epic with a running session to have dropped its
 *   questions (or the wait to run out), then writes the ONE details page's `DetailsSpec` (`spec()`):  a section per
 *   epic, its phases to pick (All recommended) then its questions;  an epic that sent none:  its open Q items
 *   - question ids `<epic>--phases`, `<epic>--<id>`:  the answer splits back by epic on the `--`
 * - `epic bedtime status [--json]`:  every epic in bedtime mode, its phases, how many of them are done (`status()`)
 * - Tonight's folder:  `<epic home>/bedtime-all/<YYYY-MM-DD>/`, the day the night started.
 * - The skill does the rest:  asking each session, `epic ask create`, sending each epic its answers, starting a
 *   session where none runs (bedtime's SKILL.md, "All epics").
 * - Node only;  NEVER reads the network.
 ****************/
export class BedtimeAll {
  /** Tonight's folder, made when written:  `<epic home>/bedtime-all/<day>`. */
  static folderFor(now: Date = new Date()): string {
    return join(EpicHome.subfolder("bedtime-all"), dayOf(now))
  }

  /**
   * The epics a `/bedtime all` night takes, with what the page asks of each:  `listings` (`PlanDocFiles.listEpics()`),
   * read through `summaryOf`;  `sessions`:  the live Claude Code sessions;  `worktreeOf`:  the epic a folder is the
   * worktree of.
   * - NEVER throws for one epic:  a page that won't read is left out, named in `skipped`
   */
  static candidates({
    listings,
    summaryOf,
    sessions = ClaudeHome.liveSessions(),
    worktreeOf = defaultWorktreeOf(),
    include = []
  }: CandidatesProps): BedtimePlan {
    const epics: BedtimeEpic[] = []
    const skipped: string[] = []
    const idle: string[] = []
    for (const listing of listings) {
      if (listing.status !== "in progress") continue
      let summary: PlanSummary
      try {
        summary = summaryOf(listing.file)
      } catch {
        skipped.push(listing.name)
        continue
      }
      if (summary.bedtime) continue
      const phases = summary.phases.filter((phase) => phase.status === "todo" || phase.status === "active")
      if (!phases.length) continue
      const session = sessions.find((one) => worktreeOf(one.cwd) === listing.name)
      if (!session && !include.includes(listing.name)) {
        idle.push(listing.name)
        continue
      }
      epics.push({
        name: listing.name,
        title: summary.title,
        standing: summary.standing,
        session: session ? (session.name ?? `session ${session.sessionId}`) : null,
        phases: phases.map(phaseLabel),
        questions: summary.open.question.map((item) => ({ id: item.id, title: item.title }))
      })
    }
    return { epics, skipped, idle }
  }

  /** Write `plan` as tonight's `plan.json5` in `folder`;  returns its path. */
  static writePlan(plan: BedtimePlan, folder: string): string {
    mkdirSync(folder, { recursive: true })
    const file = join(folder, PLAN_FILE)
    writeFileSync(file, JSON5.stringify(plan, null, 2) + "\n")
    return file
  }

  /** Tonight's plan in `folder`;  throws when `plan` hasn't run yet. */
  static readPlan(folder: string): BedtimePlan {
    const file = join(folder, PLAN_FILE)
    if (!existsSync(file)) throw new Error("bedtime all:  no plan for tonight yet:  `epic bedtime all plan` first")
    return JSON5.parse(readFileSync(file, "utf8")) as BedtimePlan
  }

  /**
   * Keep epic `epic`'s questions from `json` (a `QuestionsFile`'s text) in `folder`;  returns how many.
   * - throws when the epic isn't in tonight's plan, or the JSON isn't `{ questions: [{ title, ... }] }`
   */
  static keepQuestions(folder: string, epic: string, json: string): number {
    const plan = BedtimeAll.readPlan(folder)
    if (!plan.epics.some((one) => one.name === epic))
      throw new Error(`bedtime all:  ${epic} isn't in tonight's plan (${plan.epics.map((one) => one.name).join(", ")})`)
    const parsed = JSON5.parse(json) as Partial<QuestionsFile>
    if (!Array.isArray(parsed.questions) || parsed.questions.some((question) => !question?.title))
      throw new Error('bedtime all:  questions are { "questions": [{ "title": "...", "options": [...] }] }')
    writeFileSync(join(folder, `${epic}.questions.json5`), JSON5.stringify(parsed, null, 2) + "\n")
    return parsed.questions.length
  }

  /** The epics in `plan` whose session hasn't sent its questions yet:  the ones `spec --wait` waits for. */
  static waitingFor(folder: string, plan: BedtimePlan): string[] {
    return plan.epics
      .filter((epic) => epic.session && !existsSync(join(folder, `${epic.name}.questions.json5`)))
      .map((epic) => epic.name)
  }

  /**
   * The ONE details page's spec (`DetailsSpec`, `epic ask create --from`) for tonight's `plan`, with the questions in
   * `folder`.
   * - per epic:  its phases (`<epic>--phases`, every one ticked, All recommended), then its questions
   *   (`<epic>--<id or qN>`):  the ones its session sent, else its open Q items, answered in the box
   */
  static spec(folder: string, plan: BedtimePlan): DetailsSpecLike {
    const questions: DetailsQuestion[] = []
    for (const epic of plan.epics) {
      questions.push({
        id: `${epic.name}${SPLIT}phases`,
        title: `${epic.title}:  which phases tonight?`,
        multiple: true,
        selectAll: true,
        text: `<p>${epic.session ? `Runs in ${escape(epic.session)}.` : "No session runs it:  one starts in its window."}</p>`,
        options: [
          { title: "All", summary: "every phase still to do, in order", recommended: true, checked: true },
          ...epic.phases.map((phase) => ({ title: phase }))
        ]
      })
      const sent = readSent(folder, epic.name)
      const own: DetailsQuestion[] = sent
        ? sent.map((question, i) => ({ ...question, id: `${epic.name}${SPLIT}${question.id ?? `q${i + 1}`}` }))
        : epic.questions.map((question) => ({
            id: `${epic.name}${SPLIT}${question.id}`,
            title: `${epic.title}, ${question.id.toUpperCase()}:  ${question.title}`,
            text: "<p>An open question on its epic page:  answer in the box, or leave it for a calm call overnight.</p>"
          }))
      questions.push(...own)
    }
    return {
      title: "Bedtime:  every epic",
      lede:
        "<p>Pick each epic's phases for tonight and answer its questions, then Send:  each epic's session runs its " +
        "phases unattended, merging each one into main as it lands.</p>",
      where: {
        epic: plan.epics.map((epic) => epic.name).join(", "),
        justNow: "about to run every epic overnight (/bedtime all)",
        decides: "what each epic does while you sleep:  anything left open becomes a judgement call"
      },
      questions
    }
  }

  /**
   * Every epic in bedtime mode, from `listings`:  its phases (`P3-P6,P9`) and how many of them are done.
   * - an epic whose page won't read:  left out
   */
  static status({ listings, summaryOf }: Pick<CandidatesProps, "listings" | "summaryOf">): BedtimeStatus[] {
    const found: BedtimeStatus[] = []
    for (const listing of listings) {
      let summary: PlanSummary
      try {
        summary = summaryOf(listing.file)
      } catch {
        continue
      }
      if (!summary.bedtime) continue
      const wanted = phaseNumbers(summary.bedtime)
      const phases = summary.phases.filter((phase) => wanted.has(phase.number))
      found.push({
        name: listing.name,
        bedtime: summary.bedtime,
        done: phases.filter((phase) => phase.status === "done").length,
        total: phases.length,
        active: phases.find((phase) => phase.status === "active")?.number
      })
    }
    return found
  }

  /** `status()`'s line for one epic:  `language  P52-P55  2 of 4 done, P54 under way`. */
  static statusLine(epic: BedtimeStatus): string {
    const under = epic.active ? `, P${epic.active} under way` : ""
    return `${epic.name.padEnd(20)} ${epic.bedtime.padEnd(12)} ${epic.done} of ${epic.total} done${under}`
  }

  /** `candidates()`' line for one epic:  its phases, its session, how many questions its page has open. */
  static planLine(epic: BedtimeEpic): string {
    const session = epic.session ? `session ${epic.session}` : "no session"
    const asks = epic.questions.length ? `, ${epic.questions.length} open question(s)` : ""
    return `${epic.name.padEnd(20)} ${epic.phases.length} phase(s) to do;  ${session}${asks}`
  }
}

////////////////
// ## Helpers
////////////////

/** The plan's file in tonight's folder. */
const PLAN_FILE = "plan.json5"

/** Between an epic's name and its own id in a question's id:  `language--phases`. */
const SPLIT = "--"

/** `P52 · Tune the Bubbly Look`. */
function phaseLabel(phase: Phase): string {
  return `P${phase.number} · ${phase.name}${phase.status === "active" ? " (under way)" : ""}`
}

/** The phase numbers a bedtime range names:  `P3-P6,P9` => 3, 4, 5, 6, 9 (as text, to match `Phase.number`). */
export function phaseNumbers(range: string): Set<string> {
  const numbers = new Set<string>()
  for (const part of range.split(",")) {
    const match = /^\s*P?(\d+)(?:\s*-\s*P?(\d+))?\s*$/i.exec(part)
    if (!match) continue
    const from = Number(match[1])
    const to = match[2] === undefined ? from : Number(match[2])
    for (let n = from; n <= to; n++) numbers.add(String(n))
  }
  return numbers
}

/** The questions epic `epic`'s session sent, or `undefined` when it sent none. */
function readSent(folder: string, epic: string): DetailsQuestion[] | undefined {
  const file = join(folder, `${epic}.questions.json5`)
  if (!existsSync(file)) return undefined
  return (JSON5.parse(readFileSync(file, "utf8")) as QuestionsFile).questions
}

/** `YYYY-MM-DD`, local. */
function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** HTML-safe text. */
function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** The epic a folder is the worktree of, from this checkout's epic settings;  none when they won't read. */
function defaultWorktreeOf(): (path: string | undefined) => string | undefined {
  try {
    const config = EpicConfig.of(process.cwd())
    return (path) => config.worktreeNameOf(path)
  } catch {
    return () => undefined
  }
}

////////////////
// ## Types
////////////////

/** What `candidates()` reads. */
export type CandidatesProps = {
  /** every epic, as `PlanDocFiles.listEpics()` lists them */
  listings: EpicListing[]
  /** an epic page's summary, by its file */
  summaryOf: (file: string) => PlanSummary
  /** the live Claude Code sessions */
  sessions?: RunningSession[]
  /** the epic a folder is the worktree of */
  worktreeOf?: (path: string | undefined) => string | undefined
  /** epics to take though no session runs them:  one is started in each one's window */
  include?: string[]
}

/** Tonight's plan:  the epics a `/bedtime all` night takes. */
export type BedtimePlan = {
  /** the epics, in the list's order */
  epics: BedtimeEpic[]
  /** epics whose page wouldn't read */
  skipped: string[]
  /** epics with phases to do and no session running them, left out (`--include` takes one) */
  idle: string[]
}

/** One epic of a `/bedtime all` night. */
export type BedtimeEpic = {
  /** its id:  `language` */
  name: string
  /** its title */
  title: string
  /** a standing epic (never done) */
  standing: boolean
  /** its running session's address (`SendMessage`'s `to`, `🚧 language`), or `null` when none runs */
  session: string | null
  /** its phases still to do:  `P52 · Tune the Bubbly Look (under way)` */
  phases: string[]
  /** its open Q items */
  questions: { id: string; title: string }[]
}

/** What an epic's session sends back:  its up-front questions, as `DetailsSpec` questions. */
export type QuestionsFile = {
  /** each one's `id` (no epic prefix:  added), `title`, `text`, `options` ... as `DetailsSpec` takes them */
  questions: DetailsQuestion[]
}

/** A `DetailsSpec` question (`details.js`), as far as this file writes one. */
export type DetailsQuestion = {
  id?: string
  title: string
  text?: string
  multiple?: boolean
  selectAll?: boolean
  options?: { title: string; summary?: string; recommended?: boolean; checked?: boolean }[]
}

/** A `DetailsSpec`, as far as this file writes one. */
export type DetailsSpecLike = {
  title: string
  lede: string
  where: { epic: string; justNow: string; decides: string }
  questions: DetailsQuestion[]
}

/** One epic in bedtime mode (`status()`). */
export type BedtimeStatus = {
  /** its id */
  name: string
  /** its run's phases:  `P3-P6,P9` */
  bedtime: string
  /** how many of them are done */
  done: number
  /** how many phases the range names that the page has */
  total: number
  /** the one under way, its number */
  active: string | undefined
}
