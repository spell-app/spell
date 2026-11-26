import { statSync } from "node:fs"

import { ClaudeHome } from "spell/epic/config/ClaudeHome"
import { AFTER_FRESH, FreshAll, SESSION_ID } from "spell/epic/command/FreshAll"
import { FreshPause } from "spell/epic/command/FreshPause"
import { PlanDocError } from "./planDoc.types"

import { tellLines, type EpicSession } from "./FocusCommands"
import { FreshPauseCommands } from "./FreshPauseCommands"
import type { PlanDoc } from "./PlanDoc"
import type { Flags, PlanDocCommands } from "./PlanDocCommands"

/****************
 * ### `FreshCommands`
 * `epic fresh all | later | queued | status | drop | quiet | wait | cancel` (epic `epic-engine` T113):  `/epic fresh all`,
 * every running epic session handed to a fresh session, each at its first clear moment (`FreshAll`);  and one session's
 * `/epic fresh`, waiting for its agents.
 * - `later <epic>` (epic `epic-engine` T172):  this session goes fresh by itself once `<epic>`'s agents are done
 *   (`FreshAll.markSolo()`), instead of `/epic fresh` refusing while they run
 *   - prints `fresh as soon as <names> finish`;  exit 1, marking nothing, when none runs (go now) or a pause round holds
 *     the epic
 * - `queued <epic>`:  its POST-FRESH LIST, the items queued with work `AFTER_FRESH`, which the new session takes up first
 * - `all [--json]`:  marks every running epic session pending (`FreshAll.mark()`), the session running it too (`self`,
 *   last), then prints:
 *   - a `TELL:` line for each other session, which the skill sends (`SendMessage`), as `epic focus on`'s
 *   - `now:` the sessions clear already, `later:` the rest, each with why (`FreshAll.whyNot()`), for the reply
 * - `status [--json]`:  the sessions still pending, and why each waits
 * - `drop [<session id>]`:  one session let off, this one by default (`$CLAUDE_CODE_SESSION_ID`):  its
 *   `epic window fresh` was refused, or the person called its `later` off
 * - PAUSE FIRST (`all --pause`, `quiet`, `wait`, `cancel`;  epic `epic-engine` T139):  `FreshPauseCommands`
 *   - while a round is under way `all` refuses until every session is quiet, then marks them `paused` and ends it
 *   - `status` then says who is quiet and who is outstanding
 *   - no round:  every verb here as it was
 * - The running sessions:  `FocusCommands.runningSessions()`, the epics in progress only
 * - The sessions' own end-of-turn hook does the rest ([fresh-wait.mjs](../../hooks/fresh-wait.mjs)):  nothing here
 *   moves a session
 ****************/
export class FreshCommands {
  /** the epic-page command line this belongs to:  its files, output and running sessions.  STATIC */
  readonly owner: PlanDocCommands
  /** the pause round's verbs (epic `epic-engine` T139).  STATIC */
  readonly pause: FreshPauseCommands

  constructor(owner: PlanDocCommands) {
    this.owner = owner
    this.pause = new FreshPauseCommands(owner)
  }

  /** `fresh <verb> ...`, `positional` after `fresh`;  resolves to the exit code, `undefined` for 0. */
  async run([verb = "status", ...rest]: string[], flags: Flags): Promise<number | void> {
    const json = Boolean(flags.json)
    switch (verb) {
      case "all":
        return flags.pause ? this.pause.start(json) : this.all(json)
      case "status":
        return this.status(json)
      case "quiet":
        return this.pause.quiet()
      case "wait":
        return this.pause.wait(typeof flags.max === "string" ? flags.max : undefined)
      case "cancel":
        return this.pause.cancel(json)
      case "drop":
        return this.drop(rest[0] ?? process.env.CLAUDE_CODE_SESSION_ID)
      case "later":
        return this.later(rest[0], process.env.CLAUDE_CODE_SESSION_ID)
      case "queued":
        return this.queued(rest[0], json)
      default:
        throw new PlanDocError(
          `fresh what?  all | later <epic> | queued <epic> | status | drop | quiet | wait | cancel (not '${verb}');  ` +
            "one epic, now:  epic window fresh <epic>"
        )
    }
  }

  ////////////////
  // ## The verbs
  ////////////////

  /**
   * `all`:  every running epic session marked pending;  `TELL:` lines, and which go now and which later.
   * - a pause round under way:  exit 1 until all are quiet;  then the marks are `paused`, and the round is over
   */
  private async all(json: boolean): Promise<number | void> {
    const running = await this.owner.focus.runningSessions()
    const pausing = FreshPause.round()
    if (pausing && !this.pause.mayGoFresh(pausing, running)) return 1
    const { others, self } = running
    const me = process.env.CLAUDE_CODE_SESSION_ID
    const now = Date.now()
    const round = `${me ?? "none"}@${new Date(now).toISOString()}`
    // a round's marks stay paused when it's run again before they've all gone
    const pausedOf = (sessionId: string) => Boolean(pausing || FreshAll.pending(sessionId)?.paused)
    const tell: { epic: string; session: string; line: string }[] = []
    for (const { epic, session, sessionId } of others) {
      const paused = pausedOf(sessionId)
      FreshAll.mark(sessionId, epic, { round, now, paused })
      tell.push({ epic, session, line: tellLine(epic, paused) })
    }
    for (const { epic, sessionId } of self)
      FreshAll.mark(sessionId, epic, { round, now, self: true, paused: pausedOf(sessionId) })
    // the marks hold them now:  the round is over
    if (pausing) FreshPause.end()
    const states = [...others, ...self].map((one) => ({ ...one, why: this.whyNot(one, now) }))
    if (json) return this.owner.print(JSON.stringify({ round, tell, sessions: states }, null, 2))
    for (const line of tellLines(tell)) this.owner.print(line)
    for (const { epic } of self) this.owner.print(`this session:  ${epic}:  goes last, at its own next clear moment`)
    this.printStates(states)
  }

  /**
   * `later <epic>`:  session `sessionId` goes fresh by itself once `<epic>`'s agents are done (T172).
   * - exit 1, marking nothing:  no session, no epic, none of its agents running (go fresh now), a pause round holds it
   */
  private later(epic: string | undefined, sessionId: string | undefined): number | void {
    if (!epic) throw new PlanDocError("fresh later <epic>:  which epic?")
    if (!sessionId || !SESSION_ID.test(sessionId)) {
      this.owner.warn("epic:  fresh later:  no session ($CLAUDE_CODE_SESSION_ID isn't set)")
      return 1
    }
    if (FreshPause.holds(epic)) {
      this.owner.warn("epic:  fresh later:  epic fresh all --pause is under way:  `epic fresh status`")
      return 1
    }
    const running = FreshAll.runningAgents(epic, this.owner.files.root)
    if (!running.length) {
      this.owner.warn(
        `epic:  fresh later:  none of ${epic}'s agents is running:  go fresh now (\`epic window fresh ${epic}\`)`
      )
      return 1
    }
    FreshAll.markSolo(sessionId, epic)
    this.owner.print(`fresh as soon as ${running.join(", ")} finish`)
    this.owner.print(
      "until then start no new work:  queue what the person asks for the fresh session " +
        `(\`epic queue ${epic} <id> "${AFTER_FRESH}"\`);  \`epic fresh drop\` calls it off`
    )
  }

  /** `queued <epic>`:  its post-fresh list, the items queued `AFTER_FRESH`, oldest first. */
  private queued(epic: string | undefined, json: boolean): void {
    if (!epic) throw new PlanDocError("fresh queued <epic>:  which epic?")
    const items = FreshCommands.postFresh(this.owner.read(this.owner.files.findDoc(epic)))
    if (json) return this.owner.print(JSON.stringify(items, null, 2))
    if (!items.length) return this.owner.print(`nothing queued for ${epic}'s fresh session`)
    this.owner.print(`queued for ${epic}'s fresh session (take each up, then \`epic unqueue ${epic} <id>\`):`)
    for (const { id, title } of items) this.owner.print(`  - ${id.toUpperCase()}  ${title}`)
  }

  /** The post-fresh list of page `plan`:  its items queued with work `AFTER_FRESH`. */
  static postFresh(plan: PlanDoc): { id: string; title: string }[] {
    return plan
      .reviewStatus()
      .queued.filter(({ work }) => work === AFTER_FRESH)
      .map(({ id, title }) => ({ id, title }))
  }

  /** `status`:  the sessions still pending, and why each waits;  during a pause round, who is quiet and who isn't. */
  private async status(json: boolean): Promise<void> {
    const pausing = FreshPause.round()
    if (pausing) return this.pause.status(pausing, json)
    const now = Date.now()
    const pending = FreshAll.allPending().map(({ sessionId, mark }) => ({
      epic: mark.epic,
      sessionId,
      self: Boolean(mark.self),
      solo: Boolean(mark.solo),
      why: FreshAll.whyNot(sessionId, mark, {
        transcript: ClaudeHome.transcriptOf(sessionId),
        cwd: this.owner.files.root,
        now
      })
    }))
    if (json) return this.owner.print(JSON.stringify(pending, null, 2))
    if (!pending.length) return this.owner.print("no session waits to go fresh")
    for (const { epic, sessionId, solo, why } of pending) {
      const alone = solo ? "  (its own /epic fresh, waiting for its agents)" : ""
      this.owner.print(`${epic} (${sessionId.slice(0, 8)}):  ${why ?? "clear:  goes at its turn's end"}${alone}`)
      if (solo) this.printPostFresh(epic, "  ")
    }
  }

  /** `drop <session id>`:  that session no longer waits. */
  private drop(sessionId: string | undefined): number | void {
    if (!sessionId || !FreshAll.pending(sessionId)) {
      this.owner.warn(`epic:  fresh drop:  ${sessionId ?? "this session"} isn't waiting to go fresh`)
      return 1
    }
    const { paused, solo, epic } = FreshAll.pending(sessionId)!
    FreshAll.drop(sessionId)
    this.owner.print(`${sessionId.slice(0, 8)} no longer waits to go fresh`)
    if (paused) this.owner.print("its agents are paused:  epic agents resume each, and start it as that prints")
    if (solo) this.printPostFresh(epic, "", "no fresh now:  take these up yourself, then `epic unqueue` each")
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Print epic `epic`'s post-fresh list, a line each, `indent`ed, under `lead`;  nothing when it's empty.  NEVER throws. */
  private printPostFresh(epic: string, indent: string, lead = "queued for the fresh session:"): void {
    try {
      const items = FreshCommands.postFresh(this.owner.read(this.owner.files.findDoc(epic)))
      if (!items.length) return
      this.owner.print(`${indent}${lead}`)
      for (const { id, title } of items) this.owner.print(`${indent}  - ${id.toUpperCase()}  ${title}`)
    } catch {
      // no page to read:  nothing listed
    }
  }

  /** Why `session`, just marked, waits;  `null`:  it goes now.  A transcript written in the last `BUSY_MS`:  mid-turn. */
  private whyNot({ sessionId }: EpicSession, now: number): string | null {
    const mark = FreshAll.pending(sessionId)
    if (!mark) return "not marked"
    if (mark.self) return "it's this session:  it goes last"
    const transcript = ClaudeHome.transcriptOf(sessionId)
    const why = FreshAll.whyNot(sessionId, mark, { transcript, cwd: this.owner.files.root, now })
    if (why) return why
    const written = transcript ? statSync(transcript, { throwIfNoEntry: false })?.mtimeMs : undefined
    return written !== undefined && now - written < BUSY_MS ? "it's mid-turn:  it goes at its turn's end" : null
  }

  /** The `now:` and `later:` lines, and the one line for the reply. */
  private printStates(states: (EpicSession & { why: string | null })[]): void {
    const now = states.filter((one) => !one.why)
    const later = states.filter((one) => one.why)
    if (now.length) this.owner.print(`now:  ${now.map(({ session }) => session).join(", ")}`)
    if (later.length) {
      this.owner.print("later, at each one's next clear moment:")
      for (const { session, why } of later) this.owner.print(`  ${session}:  ${why}`)
    }
    this.owner.print(`sessions marked:  ${states.length} (${now.length} now, ${later.length} later)`)
  }
}

/** What each running epic session is told. */
function tellLine(epic: string, paused: boolean): string {
  const saved = paused ? "  Your paused agents stay saved:  don't restart them, the fresh session does." : ""
  return (
    `/epic fresh all:  ${epic} goes to a fresh session at your next clear moment.  Nothing to do but finish what ` +
    "you're on and end your turn:  your end-of-turn hook wakes you once you're clear (no agents running, no question " +
    "waiting on the person, no prompt from them in the last few minutes), and then you run /epic fresh.  No reply." +
    saved
  )
}

/** A transcript written this recently:  its session is mid-turn. */
const BUSY_MS = 60 * 1000
