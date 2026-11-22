import { waitUntil } from "spell/util/timing"
import { ClaudeHome } from "spell/epic/config/ClaudeHome"
import { FreshAll } from "spell/epic/command/FreshAll"
import { FreshPause, type PauseReport, type PauseRound } from "spell/epic/command/FreshPause"
import { Turns } from "spell/epic/command/Turns"
import { EpicCommandError, duration } from "spell/epic/command/command.types"
import { PlanDocError } from "./planDoc.types"

import { tellLines, type EpicSession, type RunningSessions } from "./FocusCommands"
import type { PlanDocCommands } from "./PlanDocCommands"

/****************
 * ### `FreshPauseCommands`
 * `epic fresh all --pause | quiet | wait | cancel` (epic `epic-engine` T139):  the pause round's commands
 * (`FreshPause`), and the gate `epic fresh all` passes while one is under way.
 * - `start()`:  the round, this session its initiator, and a `TELL:` line for each session still to pause
 * - `quiet()`:  this session's epic is quiet:  refused while it has agents or turns running;  prints the report to send
 * - `wait()`:  run in the background by the initiator:  wakes it when all are quiet, or to name who isn't
 * - `cancel()`:  the round off, and a `TELL:` line for each session to start its agents again
 * - A session that doesn't report is never skipped, however long it takes (Owen, 2026-11-22)
 * - Nothing here messages, stops or moves a session or an agent:  the skill does ("Pause first")
 ****************/
export class FreshPauseCommands {
  /** the epic-page command line this belongs to.  STATIC */
  readonly owner: PlanDocCommands

  constructor(owner: PlanDocCommands) {
    this.owner = owner
  }

  ////////////////
  // ## The verbs
  ////////////////

  /**
   * `all --pause`:  a round started, or run again by its initiator to tell whoever isn't quiet.
   * - another session takes a round over only once its initiator has exited
   * - throws with no session to report back to
   */
  async start(json: boolean): Promise<number | void> {
    const me = process.env.CLAUDE_CODE_SESSION_ID
    if (!me)
      throw new PlanDocError("fresh all --pause:  run it from a Claude Code session:  the others report back to it")
    const running = await this.owner.focus.runningSessions()
    const before = FreshPause.round()
    if (before && before.initiator.sessionId !== me && this.isRunning(before.initiator.sessionId, running)) {
      this.owner.warn(`epic:  ${before.initiator.session} already started a pause:  see epic fresh status`)
      return 1
    }
    const mine = running.self[0]
    const session = mine?.session ?? ClaudeHome.liveSessions().find((one) => one.sessionId === me)?.name ?? me
    const round = FreshPause.start({
      initiator: { session, sessionId: me, ...(mine && { epic: mine.epic }) },
      running: [...running.others, ...running.self]
    })
    const tell = running.others
      .filter((one) => !FreshPause.quietAt(one.sessionId) || FreshAll.runningAgents(one.epic, this.root).length)
      .map((one) => ({ epic: one.epic, session: one.session, line: pauseLine(one.epic, session) }))
    if (json) return this.owner.print(JSON.stringify({ round, tell }, null, 2))
    for (const line of tellLines(tell)) this.owner.print(line)
    for (const { epic } of running.self)
      this.owner.print(`this session:  ${epic}:  pause its agents now too, then epic fresh quiet`)
    this.owner.print("next:  epic fresh wait, in the background;  epic fresh all only once every session is quiet")
    this.owner.print(`sessions to pause:  ${round.sessions.length}`)
  }

  /**
   * `quiet`:  this session is quiet;  prints the line to send the initiator.
   * - refused, naming them, while its epic has unpaused agents, or it holds or waits for a turn (a merge finishes)
   * - two sessions on one epic:  the agents are checked as the last of them reports
   */
  async quiet(): Promise<number | void> {
    const me = process.env.CLAUDE_CODE_SESSION_ID
    const round = FreshPause.round()
    if (!round) return this.refuse("no pause is under way")
    const mine = round.sessions.find((one) => one.sessionId === me)
    if (!me || !mine)
      return this.refuse("this session isn't in the pause;  epic fresh all --pause again, where it started, adds it")

    const { epic } = mine
    const running = await this.owner.focus.runningSessions()
    const others = round.sessions.filter(
      (one) =>
        one.epic === epic &&
        one.sessionId !== me &&
        !FreshPause.quietAt(one.sessionId) &&
        this.isRunning(one.sessionId, running)
    )
    const agents = others.length ? [] : FreshAll.runningAgents(epic, this.root)
    if (agents.length)
      return this.refuse(`not quiet yet:  agents still running (${agents.join(", ")}):  epic agents pause each`)
    const runs = Turns.runsOf(me)
    if (runs.length) {
      const named = runs.map(({ kind, label }) => `${kind}:  ${label}`).join(", ")
      return this.refuse(`not quiet yet:  ${named};  let a merge finish, stop the rest with epic turns stop <kind>`)
    }

    FreshPause.markQuiet(me)
    const saved = FreshAll.pausedAgents(epic, this.root)
    this.owner.print(`${epic} is quiet:  ${saved.length} paused agent(s) saved`)
    const { initiator } = round
    if (initiator.sessionId === me)
      return this.owner.print("this session started the pause:  epic fresh wait says when")
    const agentsSaid = saved.length ? `paused and saved:  ${saved.join(", ")}` : "no agents to pause"
    const line =
      `epic fresh all --pause:  ${epic} is quiet (${agentsSaid}).  ` +
      "Run `epic fresh status`:  once it says all are quiet, run `epic fresh all`."
    for (const each of tellLines([{ session: initiator.session, line }])) this.owner.print(each)
  }

  /** `status`, while `round` is under way:  each session, quiet or outstanding, and what comes next. */
  async status(round: PauseRound, json: boolean): Promise<void> {
    const report = this.reportOf(round, await this.owner.focus.runningSessions())
    if (json) return this.owner.print(JSON.stringify({ pause: round, ...report }, null, 2))
    this.printReport(round, report)
  }

  /**
   * `wait [--max <time>]`:  until every session is quiet (exit 0);  after `max` (2 minutes), exit 2 naming who isn't.
   * - exit 3:  no round, or it ended meanwhile
   * - NEVER ends or skips anything:  the person is told, and it's run again
   */
  async wait(max = WAIT_MAX): Promise<number> {
    const found = await waitUntil(
      async () => {
        const round = FreshPause.round()
        if (!round) return "over"
        return this.reportOf(round, await this.owner.focus.runningSessions()).allQuiet ? "quiet" : undefined
      },
      { timeout: secondsOf(max), every: WAIT_EVERY }
    )
    const round = FreshPause.round()
    if (found === "over" || !round) {
      this.owner.print("no pause is under way:  nothing to wait for")
      return 3
    }
    await this.status(round, false)
    if (found) return 0
    this.owner.print("still waiting:  tell the person who is outstanding, then run epic fresh wait again;  skip nobody")
    return 2
  }

  /**
   * `cancel`:  the round off, or a finished one's sessions still waiting to go fresh let off;  each told to resume.
   * - from any session, or none
   */
  async cancel(json: boolean): Promise<number | void> {
    const round = FreshPause.round()
    const marked = FreshAll.allPending().filter(({ mark }) => mark.paused)
    if (!round && !marked.length) return this.refuse("no pause to cancel")
    const running = await this.owner.focus.runningSessions()
    FreshPause.end()
    for (const { sessionId } of marked) FreshAll.drop(sessionId)

    const me = process.env.CLAUDE_CODE_SESSION_ID
    const told = new Map(running.others.map((one) => [one.sessionId, one.session]))
    for (const one of round ? [...round.sessions, round.initiator] : [])
      if (one.sessionId !== me && this.isRunning(one.sessionId, running)) told.set(one.sessionId, one.session)
    const tell = [...told.values()].map((session) => ({ session, line: CANCEL_LINE }))
    if (json) return this.owner.print(JSON.stringify({ cancelled: true, tell }, null, 2))
    this.owner.print("pause cancelled:  nobody goes fresh")
    for (const line of tellLines(tell)) this.owner.print(line)
    for (const { epic } of running.self)
      this.owner.print(`this session:  ${epic}:  epic agents resume each paused agent, and start it again`)
  }

  ////////////////
  // ## The gate
  ////////////////

  /**
   * Whether `epic fresh all` may go now `round` is under way:  asked by its initiator (anyone, once that has exited),
   * with every session quiet.  Says why not.
   */
  mayGoFresh(round: PauseRound, running: RunningSessions): boolean {
    const me = process.env.CLAUDE_CODE_SESSION_ID
    const { sessionId, session } = round.initiator
    if (sessionId !== me && this.isRunning(sessionId, running)) {
      this.owner.warn(`epic:  a pause is under way, and ${session} runs epic fresh all once every session is quiet`)
      return false
    }
    const report = this.reportOf(round, running)
    if (report.allQuiet) return true
    this.owner.warn(`epic:  not yet:  ${report.outstanding.length} session(s) not quiet, so nobody goes fresh`)
    for (const one of report.outstanding) this.owner.warn(`  ${one.session}:  ${one.why}`)
    return false
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The checkout whose epic folder has the agents lists. */
  private get root(): string {
    return this.owner.files.root
  }

  /** Whether session `sessionId` still runs:  in `running`, or Claude Code's registry. */
  private isRunning(sessionId: string, { others, self }: RunningSessions): boolean {
    return (
      [...others, ...self].some((one: EpicSession) => one.sessionId === sessionId) ||
      ClaudeHome.liveSessions().some((one) => one.sessionId === sessionId)
    )
  }

  /** Where `round` stands. */
  private reportOf(round: PauseRound, { others, self }: RunningSessions): PauseReport {
    return FreshPause.report(round, { running: [...others, ...self], cwd: this.root })
  }

  /** `round`'s lines, for the person. */
  private printReport(round: PauseRound, { sessions, outstanding, allQuiet }: PauseReport): void {
    this.owner.print(`Pausing every session before each restarts fresh.  ${round.initiator.session} started it.`)
    const done = sessions.filter((one) => !outstanding.includes(one))
    if (done.length) this.owner.print("Ready:")
    for (const { session, why } of done) this.owner.print(`  ${session}:  ${why}`)
    if (outstanding.length) this.owner.print("Still waiting for:")
    for (const { session, why } of outstanding) this.owner.print(`  ${session}:  ${why}`)
    if (allQuiet) return this.owner.print(`All are quiet.  ${round.initiator.session} can now run:  epic fresh all`)
    this.owner.print("No session restarts until every one has paused.")
    this.owner.print("To stop the restart and let the agents keep working, type:  epic fresh cancel")
  }

  /** Refused, saying why;  exit 1. */
  private refuse(why: string): number {
    this.owner.warn(`epic:  fresh:  ${why}`)
    return 1
  }
}

/**
 * What each running epic session is told as a round starts.
 * - all the steps are in it:  a session that has run for days read an older skill
 */
function pauseLine(epic: string, initiator: string): string {
  return (
    `epic fresh all --pause, from ${initiator}:  we are going to start epic fresh ASAP.  Pause ${epic} NOW:  start ` +
    "nothing new.  (1) `epic turns stop test` abandons this session's test runs, only its own.  " +
    "(2) SendMessage each of your agents:  stop now, drop any tests you started, finish a merge under way, claim the " +
    'files you changed, run `epic agents pause <name> --item <id> --next "<next step>" --tests "<runs dropped>"`, ' +
    "return.  (3) One not back within a minute:  TaskStop it, NEVER while a merge of yours runs (`epic turns list`), " +
    "then run that pause for it yourself.  Commit and discard nothing of anyone else's.  (4) Write what's open onto " +
    `the page, then \`epic fresh quiet\`, and send ${initiator} the line it prints.  End your turn.  ` +
    '(The epic skill, "Pause first".)'
  )
}

/** A `--max` time in seconds;  throws `PlanDocError` for one it can't read. */
function secondsOf(max: string): number {
  try {
    return duration(max) / 1000
  } catch (error) {
    if (!(error instanceof EpicCommandError)) throw error
    throw new PlanDocError(`fresh wait:  --max ${max}?  a time like 2m, or seconds`)
  }
}

/** What each session is told when a round is cancelled. */
const CANCEL_LINE =
  "epic fresh all --pause is cancelled:  nobody goes fresh.  For each agent `epic agents` lists as paused:  " +
  "`epic agents resume <name>`, then start it as that prints.  An agent you stopped but hadn't saved:  SendMessage it " +
  "to carry on.  Then carry on as before.  No reply."

/** How long `wait` waits before it names who's outstanding:  2 minutes. */
const WAIT_MAX = "2m"

/** How often `wait` looks, seconds. */
const WAIT_EVERY = 5
