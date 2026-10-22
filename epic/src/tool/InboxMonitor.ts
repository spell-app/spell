import { setTimeout as sleep } from "node:timers/promises"

import { EpicConfig } from "spell-epic/config/EpicConfig"
import { SessionFolders } from "spell-epic/config/SessionFolders"
import type { RunningSession } from "spell-epic/command/command.types"
import { Sessions } from "spell-epic/command/Sessions"
import { bareTitle } from "spell-epic/list/RunningEpics"

import { GuideSends } from "./InboxCommands"
import { PlanDocFiles } from "./PlanDocFiles"
import { LISTEN_HEARTBEAT_MS, ReviewInbox } from "./ReviewInbox"

/****************
 * ### `InboxMonitor`
 * Keeps an epic's session listening to its epic page whenever the session is open (epic `epic-engine` P18):
 * `epic session listen`, run by the spell-epic plugin's MONITOR (`monitors/monitors.json`), one per session.
 * - Claude Code starts it with the session, and stops it with the session.
 *   Each line it prints reaches the session as a notification, and wakes it when idle.
 * - It prints NOTHING while there's nothing to do, so it costs no tokens while idle:
 *   a quiet file read every `POLL_MS`.
 * - Which epic (`epicOf()`), looked up again every `RESOLVE_MS`, so a session titled later starts listening then:
 *   - the session's title names one (`🚧 seo`)
 *   - else its folder is in an epic's worktree
 *   - else none:  a main or untitled session listens to nothing
 * - It LISTENS for the session (`ReviewInbox.setListening()`, with the session's id), so the page says so:
 *   - nobody listening, or this session:  it takes the listener's place, and keeps its heartbeat
 *   - another session listening:  that one hears it;  this monitor stays quiet
 *   - so `/epic review`'s own `inbox watch` and `wait` in the same session agree with it:  one listener, one id
 * - Work waiting (`ReviewInbox.hasWork`, or a Send on a page the epic owns):  ONE line, `📬 ...`, saying how to
 *   take it (`epic inbox wait <epic>`), once per batch.
 *   - Never TAKES it:  the session does, with its own `wait`, so what Owen sent reaches the session's context.
 *   - Only once the work has waited two polls:  a `wait` already running in the session takes it first, and nothing
 *     is said twice.
 * - Ends when its session's process does (`claude`, the ancestor it found).
 * - NEVER throws out of a poll:  a page or inbox it can't read is tried again next time.
 ****************/
export class InboxMonitor {
  /** Claude Code's sessions:  this session's record, its title */
  readonly sessions: Sessions
  /** where its lines go:  stdout, which Claude Code reads */
  readonly print: (line: string) => void
  /** this session's registry record, once found;  `findSession()` by default */
  private readonly findSession: () => RunningSession | undefined
  /** the session, as last found */
  private session: RunningSession | undefined
  /** the epic it listens to, as last looked up */
  private epic: MonitoredEpic | undefined
  /** when the session and its epic were last looked up, ms */
  private resolvedAt = -Infinity
  /** when the heartbeat was last stamped, ms */
  private beatAt = -Infinity
  /** polls in a row that found work waiting */
  private waitingPolls = 0
  /** whether this batch of work was announced already */
  private announced = false

  constructor({
    sessions = new Sessions(),
    print = (line: string) => void process.stdout.write(`${line}\n`),
    findSession
  }: InboxMonitorProps = {}) {
    this.sessions = sessions
    this.print = print
    this.findSession = findSession ?? (() => this.ancestorSession())
  }

  ////////////////
  // ## Running
  ////////////////

  /**
   * Poll until the session ends;  resolves to the exit code.
   * - `once`:  one poll, then return (tests, a quick look)
   */
  async run({ once = false }: { once?: boolean } = {}): Promise<number> {
    for (;;) {
      const alive = this.poll()
      if (!alive || once) return 0
      await sleep(this.epic ? POLL_MS : IDLE_POLL_MS)
    }
  }

  /**
   * One poll:  look the session and its epic up when due, then listen and announce.
   * - returns `false` once the session is gone (its process ended):  the monitor stops
   * - NEVER throws
   */
  poll(now = Date.now()): boolean {
    try {
      if (now - this.resolvedAt >= RESOLVE_MS) this.resolve(now)
      if (!this.session) return true
      if (this.session.pid && !isAlive(this.session.pid)) return false
      if (this.epic) this.listen(this.epic, now)
    } catch {
      // a file mid-write, a page being renamed:  the next poll tries again
    }
    return true
  }

  /** Look the session and its epic up again;  a new epic starts its batch afresh. */
  private resolve(now: number): void {
    this.resolvedAt = now
    this.session = this.findSession() ?? this.session
    const epic = this.session && this.epicOf(this.session)
    if (epic?.name !== this.epic?.name) {
      this.waitingPolls = 0
      this.announced = false
      this.beatAt = -Infinity
    }
    this.epic = epic
  }

  /**
   * Listen to `epic`'s inbox for the session:  take the listener's place when it's free (or ours), stamp the
   * heartbeat, and announce work waiting.
   */
  private listen(epic: MonitoredEpic, now: number): void {
    const id = this.session!.sessionId
    const inbox = ReviewInbox.read(epic.inbox)
    const live = inbox.liveListener(now)
    if (live && live.session !== id) {
      this.waitingPolls = 0
      return
    }
    if (!live) {
      ReviewInbox.update(epic.inbox, (box) => box.setListening(id))
      this.beatAt = now
    } else if (now - this.beatAt >= LISTEN_HEARTBEAT_MS) {
      ReviewInbox.update(epic.inbox, (box) => box.touchListening())
      this.beatAt = now
    }
    const waiting = inbox.hasWork || epic.guides.hasNewSend
    this.waitingPolls = waiting ? this.waitingPolls + 1 : 0
    if (!waiting) this.announced = false
    if (this.waitingPolls >= SETTLE_POLLS && !this.announced) {
      this.announced = true
      this.print(InboxMonitor.notice(epic.name))
    }
  }

  ////////////////
  // ## Which epic
  ////////////////

  /**
   * The epic session `session` works on, with its inbox;  `undefined` for none.
   * - its title, without its icon, when an epic page has that name (`🚧 seo` -> `seo`)
   * - else the worktree its folder is in, when an epic page has that name
   * - an epic page only:  not a saga page, nor a name with no page
   */
  epicOf(session: RunningSession): MonitoredEpic | undefined {
    const cwd = session.cwd
    if (!cwd) return undefined
    const files = new PlanDocFiles({ root: cwd })
    const title = bareTitle(SessionFolders.recordTitle(session, this.sessions.home))
    const worktree = EpicConfig.of(cwd).worktreeNameOf(cwd)
    for (const name of [title, worktree]) {
      if (!name || !EPIC_NAME.test(name)) continue
      const file = docOf(files, name)
      if (file) return { name, inbox: ReviewInbox.pathFor(file), guides: new GuideSends(files.root, name) }
    }
    return undefined
  }

  /** This session's registry record:  the running session whose `claude` process is an ancestor of this one. */
  private ancestorSession(): RunningSession | undefined {
    const mine = Sessions.ancestorPids()
    return [...this.sessions.running().values()].find((session) => mine.has(session.pid))
  }

  ////////////////
  // ## The line
  ////////////////

  /** The one line that tells the session work is waiting on epic `name`'s page, and how to take it. */
  static notice(name: string): string {
    return (
      `📬 ${name}:  Owen sent work from the epic page (marks, comments or Do Now).  ` +
      `Take it:  \`epic inbox wait ${name} --timeout 5\`, then the /epic skill's "7.3 Woken".`
    )
  }
}

/** `InboxMonitor`'s constructor options. */
export type InboxMonitorProps = {
  /** Claude Code's sessions;  default `new Sessions()` */
  sessions?: Sessions
  /** where its lines go;  default stdout */
  print?: (line: string) => void
  /** this session's registry record;  default the running session whose process is an ancestor of this one */
  findSession?: () => RunningSession | undefined
}

/** The epic a monitor listens to:  its name, its inbox file, the pages it owns. */
export type MonitoredEpic = { name: string; inbox: string; guides: GuideSends }

/** How often it polls while it listens to an epic, ms:  a file read, no output. */
export const POLL_MS = 2_000

/** How often it polls while the session has no epic, ms:  only to find one. */
const IDLE_POLL_MS = 30_000

/** How often the session's title and folder are looked up again, ms. */
const RESOLVE_MS = 30_000

/** Polls in a row work must wait before it's announced:  a `wait` running in the session takes it first. */
const SETTLE_POLLS = 2

/** An epic's name:  lower-kebab-case, as its folder. */
const EPIC_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Epic `name`'s page through `files`, or `undefined` when there's none (or it's a saga's). */
function docOf(files: PlanDocFiles, name: string): string | undefined {
  try {
    return files.findDoc(name)
  } catch {
    return undefined
  }
}

/** Whether process `pid` is running. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
}
