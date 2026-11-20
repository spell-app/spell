import { statSync } from "node:fs"

import { ClaudeHome } from "spell/epic/config/ClaudeHome"
import { FreshAll } from "spell/epic/command/FreshAll"
import { PlanDocError } from "./planDoc.types"

import type { EpicSession } from "./FocusCommands"
import type { Flags, PlanDocCommands } from "./PlanDocCommands"

/****************
 * ### `FreshCommands`
 * `epic fresh all | status | drop` (epic `epic-engine` T113):  `/epic fresh all`, every running epic session handed to a
 * fresh session, each at its first clear moment (`FreshAll`).
 * - `all [--json]`:  marks every running epic session pending (`FreshAll.mark()`), the session running it too (`self`,
 *   last), then prints:
 *   - a `TELL:` line for each other session, which the skill sends (`SendMessage`), as `epic focus on`'s
 *   - `now:` the sessions clear already, `later:` the rest, each with why (`FreshAll.whyNot()`), for the reply
 * - `status [--json]`:  the sessions still pending, and why each waits
 * - `drop [<session id>]`:  one session let off, this one by default (`$CLAUDE_CODE_SESSION_ID`):  its
 *   `epic window fresh` was refused
 * - The running sessions:  `FocusCommands.runningSessions()`, the epics in progress only
 * - The sessions' own end-of-turn hook does the rest ([fresh-wait.mjs](../../hooks/fresh-wait.mjs)):  nothing here
 *   moves a session
 ****************/
export class FreshCommands {
  /** the epic-page command line this belongs to:  its files, output and running sessions.  STATIC */
  readonly owner: PlanDocCommands

  constructor(owner: PlanDocCommands) {
    this.owner = owner
  }

  /** `fresh <verb> ...`, `positional` after `fresh`;  resolves to the exit code, `undefined` for 0. */
  async run([verb = "status", ...rest]: string[], flags: Flags): Promise<number | void> {
    const json = Boolean(flags.json)
    switch (verb) {
      case "all":
        return this.all(json)
      case "status":
        return this.status(json)
      case "drop":
        return this.drop(rest[0] ?? process.env.CLAUDE_CODE_SESSION_ID)
      default:
        throw new PlanDocError(`fresh what?  all | status | drop (not '${verb}');  one epic:  epic window fresh <epic>`)
    }
  }

  ////////////////
  // ## The verbs
  ////////////////

  /** `all`:  every running epic session marked pending;  `TELL:` lines, and which go now and which later. */
  private async all(json: boolean): Promise<void> {
    const { others, self } = await this.owner.focus.runningSessions()
    const me = process.env.CLAUDE_CODE_SESSION_ID
    const now = Date.now()
    const round = `${me ?? "none"}@${new Date(now).toISOString()}`
    for (const { epic, sessionId } of others) FreshAll.mark(sessionId, epic, { round, now })
    for (const { epic, sessionId } of self) FreshAll.mark(sessionId, epic, { round, now, self: true })
    const tell = others.map(({ epic, session }) => ({ epic, session, line: tellLine(epic) }))
    const states = [...others, ...self].map((one) => ({ ...one, why: this.whyNot(one, now) }))
    if (json) return this.owner.print(JSON.stringify({ round, tell, sessions: states }, null, 2))
    if (tell.length) {
      this.owner.print("TELL:  send each running session its line (SendMessage:  this command can't send them itself)")
      for (const { session, line } of tell) this.owner.print(`  to ${session}:  ${line}`)
    }
    for (const { epic } of self) this.owner.print(`this session:  ${epic}:  goes last, at its own next clear moment`)
    this.printStates(states)
  }

  /** `status`:  the sessions still pending, and why each waits. */
  private status(json: boolean): void {
    const now = Date.now()
    const pending = FreshAll.allPending().map(({ sessionId, mark }) => ({
      epic: mark.epic,
      sessionId,
      self: Boolean(mark.self),
      why: FreshAll.whyNot(sessionId, mark, {
        transcript: ClaudeHome.transcriptOf(sessionId),
        cwd: this.owner.files.root,
        now
      })
    }))
    if (json) return this.owner.print(JSON.stringify(pending, null, 2))
    if (!pending.length) return this.owner.print("no session waits to go fresh")
    for (const { epic, sessionId, why } of pending)
      this.owner.print(`${epic} (${sessionId.slice(0, 8)}):  ${why ?? "clear:  goes at its turn's end"}`)
  }

  /** `drop <session id>`:  that session no longer waits. */
  private drop(sessionId: string | undefined): number | void {
    if (!sessionId || !FreshAll.pending(sessionId)) {
      this.owner.warn(`epic:  fresh drop:  ${sessionId ?? "this session"} isn't waiting to go fresh`)
      return 1
    }
    FreshAll.drop(sessionId)
    this.owner.print(`${sessionId.slice(0, 8)} no longer waits to go fresh`)
  }

  ////////////////
  // ## Helpers
  ////////////////

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
function tellLine(epic: string): string {
  return (
    `/epic fresh all:  ${epic} goes to a fresh session at your next clear moment.  Nothing to do but finish what ` +
    "you're on and end your turn:  your end-of-turn hook wakes you once you're clear (no agents running, no question " +
    "waiting on the person, no prompt from them in the last few minutes), and then you run /epic fresh.  No reply."
  )
}

/** A transcript written this recently:  its session is mid-turn. */
const BUSY_MS = 60 * 1000
