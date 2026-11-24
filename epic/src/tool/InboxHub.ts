import { statSync } from "node:fs"
import { join } from "node:path"

import { every } from "spell/util/timing"

import type { RunningSession } from "spell/epic/command/command.types"
import { Sessions } from "spell/epic/command/Sessions"

import { InboxMonitor } from "./InboxMonitor"
import { listenerHearsHub } from "./InboxPoller.mjs"
import { WakeNotes } from "./WakeNotes.mjs"

/****************
 * ### `InboxHub`
 * The ONE listener for every epic's page (epic `epic-engine` T163;  Owen, 2026-11-23:  "Can we have a single server
 * which waits for comments on pages for all epics"):  it runs in the epic hub, and looks at every running Claude
 * session's epic for it.
 * - Every `LOOK_SECONDS`, for each running session (`Sessions.running()`):  a look at its epic's inbox and the pages
 *   the epic owns (`InboxMonitor.check()`), but only when one of those files, or the session's record, changed since
 *   the last look, or the last look said to look again (at most `MAX_RECHECK_MS` later)
 * - It LISTENS for the session:  the inbox's listener place, held by the session's own process (`monitor` its pid),
 *   so the page says a session listens exactly while the session runs, and a Send with nobody listening still wakes
 *   the epic the page server's way (`ReviewStart`)
 *   - a listener already there for the session keeps the place, and hears the work itself, unless it's the session's
 *     poller hearing the hub (`listenerHearsHub()`):  the session's own `epic inbox wait`, `/epic review`'s `watch`,
 *     a poller that looks at the inbox itself (one started before T163, or while no hub ran)
 * - Work waiting:  a NOTE for the session (`WakeNotes.leave()`), once per batch, with the `📬` line;  the session's
 *   poller takes it while it's idle and wakes it, the `PostToolUse` hook while it's at work, at its next tool call
 *   - nothing waiting any more (the session took the work):  its note goes (`clear()`)
 * - So a session never runs a `wait` of its own in the background, and nothing times out:  no turn is ever woken with
 *   nothing to do.
 * - A session that ended:  forgotten, its note gone.
 * - Its position:  node only, in the hub's process (`EpicServer`, beside the `ServerKeeper`);  the pollers and the hook
 *   read only its notes, in plain node.
 * - NEVER throws.
 ****************/
export class InboxHub {
  /** Claude Code's sessions:  the running ones, and their records */
  readonly sessions: Sessions
  /** the notes it leaves */
  readonly notes: WakeNotes
  /** whether session process `pid`'s inbox poller hears the hub (rather than looking itself) */
  private readonly hearsHub: (sessionPid: number) => boolean
  /** the clock, ms */
  private readonly now: () => number
  /** what the last look at each session found, by session id */
  private readonly known = new Map<string, LastLook>()
  /** stops the timer, once started */
  private stopLooking?: () => void

  constructor({
    sessions = new Sessions(),
    notes = new WakeNotes(),
    hearsHub = listenerHearsHub,
    now = Date.now
  }: InboxHubProps = {}) {
    this.sessions = sessions
    this.notes = notes
    this.hearsHub = hearsHub
    this.now = now
  }

  /** Start listening:  the hub's record written (`WakeNotes.writeHub()`), a look now, then every `LOOK_SECONDS`. */
  start(): this {
    this.notes.writeHub()
    this.look()
    this.stopLooking = every(LOOK_SECONDS, () => this.look(), { inBackground: true })
    return this
  }

  /** Stop listening:  the timer, and the hub's record if it's ours;  the pollers look for themselves again. */
  stop(): void {
    this.stopLooking?.()
    this.notes.removeHub()
  }

  /** One look at every running session that's due one.  NEVER throws. */
  look(): void {
    try {
      const running = this.sessions.running()
      for (const session of running.values()) this.lookAt(session)
      for (const id of this.known.keys()) if (!running.has(id)) this.known.delete(id)
      for (const id of this.notes.sessions()) if (!running.has(id)) this.notes.clear(id)
    } catch (error) {
      console.error("inbox hub:  a look failed;  the next one still comes", error)
    }
  }

  /** Look at `session`'s epic, when it's due:  listen for it, and leave or clear its note. */
  private lookAt(session: RunningSession): void {
    const id = session.sessionId
    if (!id || !session.pid) return
    const record = join(this.sessions.home, "sessions", `${session.pid}.json`)
    const last = this.known.get(id)
    const stamps = stampsOf([record, ...(last?.watch ?? [])])
    if (last && last.stamps === stamps && this.now() < last.next) return
    const monitor = new InboxMonitor({ sessions: this.sessions, findSession: () => session })
    // the session's poller hearing the hub gives the place up to it;  its own `wait`, or a poller that looks itself
    // (one started before T163, or while no hub ran), keeps it
    const found = monitor.check({
      monitor: session.pid,
      now: this.now(),
      takesOver: () => this.hearsHub(session.pid)
    })
    this.known.set(id, {
      watch: found.watch,
      stamps: stampsOf([record, ...found.watch]),
      next: this.now() + Math.min(found.recheckMs, MAX_RECHECK_MS)
    })
    if (!found.epic) return
    if (found.waiting && found.notice && found.batch)
      this.notes.leave(id, { epic: found.epic, batch: found.batch, notice: found.notice })
    else if (!found.waiting) this.notes.clear(id)
  }
}

/** `InboxHub`'s constructor options:  tests hand their own. */
export type InboxHubProps = {
  /** Claude Code's sessions;  default `new Sessions()` */
  sessions?: Sessions
  /** the notes;  default `new WakeNotes()` */
  notes?: WakeNotes
  /** whether session process `pid`'s inbox poller hears the hub;  default `listenerHearsHub()` */
  hearsHub?: (sessionPid: number) => boolean
  /** the clock, ms;  default `Date.now` */
  now?: () => number
}

/** What the last look at a session found:  the files to watch, their stamps then, when it's due again. */
type LastLook = { watch: string[]; stamps: string; next: number }

/** How often the hub looks, seconds:  a `stat` per watched file;  a look at an inbox only when one changed. */
export const LOOK_SECONDS = 2

/** The longest between two looks at one session, ms, nothing changed:  a guide linked, another listener gone. */
const MAX_RECHECK_MS = 60_000

/** The files' modified times and sizes, as one string to compare;  `none` for one that isn't there. */
function stampsOf(files: string[]): string {
  return files
    .map((file) => {
      try {
        const stat = statSync(file)
        return `${stat.mtimeMs}:${stat.size}`
      } catch {
        return "none"
      }
    })
    .join(",")
}
