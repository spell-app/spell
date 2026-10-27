import { join } from "node:path"

import { SRV } from "spell/server"

import { EpicConfig } from "spell-epic/config/EpicConfig"
import { SessionFolders } from "spell-epic/config/SessionFolders"
import type { RunningSession } from "spell-epic/command/command.types"
import { Sessions } from "spell-epic/command/Sessions"
import { bareTitle } from "spell-epic/list/RunningEpics"

import { GuideSends } from "./InboxCommands"
import { PlanDocFiles } from "./PlanDocFiles"
import { LISTEN_STALE_MS, ReviewInbox } from "./ReviewInbox"

/****************
 * ### `InboxMonitor`
 * Keeps an epic's session listening to its epic page whenever the session is open (epic `epic-engine` P18):
 * ONE look at the page's inbox for the session, `epic session listen`.
 * - A small poller beside every session, `InboxPoller` (`monitors/listen.mjs`), runs this look whenever a file it
 *   names changes, or when it asks to be run again.
 *   - started by the plugin's `asyncRewake` `Stop` hook at each turn's end, in every session;  by the plugin's
 *     MONITOR too in a terminal session, the only kind Claude Code starts monitors in (epic `epic-engine` I144)
 *   - Why two parts (epic `epic-engine` P19):  this code, with the epic tool it reads the pages with, takes about
 *     150MB while it runs;  the poller is plain node, about 45MB, and runs it for a fraction of a second.
 *   - The poller prints the line this look gives (`notice`), once per batch of work, and nothing else:
 *     so it costs no tokens while idle.
 * - Which epic (`epicOf()`):
 *   - the session's title names one (`🚧 seo`)
 *   - else its folder is in an epic's worktree
 *   - else none:  a main or untitled session listens to nothing, and is looked at again when its record changes
 * - It LISTENS for the session (`ReviewInbox.setListening()`, with the session's id), so the page says so:
 *   - nobody listening:  it takes the listener's place, with the MONITOR's process id (`monitor`, the poller's):
 *     live while the poller runs, so it needs no heartbeat;  a poller that dies takes it with it, and a Send wakes
 *     the session the old way
 *   - another listener, live:  another session's, this session's own `/epic review` wait, or another session's
 *     poller:  that one hears the work;  this look says to look again when it would go stale, and watches nothing
 *     till then
 *   - this session's OLDER poller (the last turn's hook, I144):  this one takes its place, and the older one ends
 *     (`InboxPoller.claim()`)
 *   - run by hand, with no `monitor`:  it listens as `epic inbox watch` does, stale in `LISTEN_STALE_MS`
 * - Work waiting (`ReviewInbox.hasWork`, or a Send on a page the epic owns):  `waiting`, with the line to print,
 *   `📬 ...`, saying how to take it (`epic inbox wait <epic>`).
 *   - Never TAKES it:  the session does, with its own `wait`, so what Owen sent reaches the session's context.
 *   - A review asked for from the page while the poller runs (`ReviewInbox.reviewAsked`, epic `epic-engine` I144):
 *     waiting too, its line asking for `/epic review <epic>` (`askNotice()`):  the page server tells the session
 *     through its poller rather than typing into its tab, which VS Code refuses while the tab is open.
 *   - `batch`:  what's waiting, as one string, so a poller started after the line (the next turn's hook) never
 *     announces the same work twice
 * - NEVER throws:  a page or inbox it can't read is looked at again next time.
 ****************/
export class InboxMonitor {
  /** Claude Code's sessions:  this session's record, its title */
  readonly sessions: Sessions
  /** this session's registry record;  `ancestorSession()` by default */
  private readonly findSession: () => RunningSession | undefined

  constructor({ sessions = new Sessions(), findSession }: InboxMonitorProps = {}) {
    this.sessions = sessions
    this.findSession = findSession ?? (() => this.ancestorSession())
  }

  ////////////////
  // ## The look
  ////////////////

  /**
   * One look:  find the session and its epic, listen for it, and say what's waiting and what to watch.
   * - `monitor`:  the poller's process id, which the listener's place is held by
   * - NEVER throws:  a failure says to look again in `RECHECK_MS`
   * - SIDE EFFECT:  takes the inbox's listener place when nobody holds it (`listen()`)
   */
  check({ monitor, now = Date.now() }: { monitor?: number; now?: number } = {}): MonitorCheck {
    try {
      const session = this.findSession()
      // not registered yet (a session just starting):  soon again
      if (!session) return { watch: [], waiting: false, recheckMs: UNFOUND_RECHECK_MS }
      const pid = session.pid
      if (pid && !SRV.isProcessAlive(pid)) return { pid, ended: true, watch: [], waiting: false, recheckMs: 0 }
      const epic = this.epicOf(session)
      // no epic yet:  its registry record changes as it's titled (and on every turn)
      if (!epic) return { pid, watch: [this.recordFile(session)], waiting: false, recheckMs: IDLE_RECHECK_MS }
      return { pid, epic: epic.name, ...this.listen(session, epic, monitor, now) }
    } catch {
      return { watch: [], waiting: false, recheckMs: RECHECK_MS }
    }
  }

  /**
   * Listen to `epic`'s inbox for `session`:  take the listener's place when it's free, and say what's waiting.
   * - another live listener holds it:  nothing to watch until it would go stale
   *   (a monitor's, with its process:  `RECHECK_MS`)
   */
  private listen(session: RunningSession, epic: MonitoredEpic, monitor: number | undefined, now: number): ListenResult {
    const inbox = ReviewInbox.read(epic.inbox)
    const live = inbox.liveListener(now)
    const mine = live?.session === session.sessionId && Boolean(monitor) && live.pid === monitor
    // the same session's older poller (the last turn's hook):  this newer one takes over, and the old one ends
    const older = live?.session === session.sessionId && Boolean(monitor && live.pid) && !mine
    if (live && !mine && !older) {
      const seen = Date.parse(live.seen ?? live.since)
      const recheckMs = live.pid ? RECHECK_MS : Math.max(seen + LISTEN_STALE_MS - now, 0) + STALE_MARGIN_MS
      return { watch: [], waiting: false, recheckMs }
    }
    if (!live || older) {
      ReviewInbox.update(epic.inbox, (box) => box.setListening(session.sessionId, undefined, monitor))
    }
    const guideSends = epic.guides.newSends
    const hasWork = inbox.hasWork || Boolean(guideSends)
    const waiting = hasWork || Boolean(inbox.reviewAsked)
    return {
      watch: [epic.inbox, ...epic.guides.files],
      waiting,
      ...(waiting && {
        notice: hasWork ? InboxMonitor.notice(epic.name) : InboxMonitor.askNotice(epic.name),
        batch: InboxMonitor.batchOf(inbox, guideSends)
      }),
      recheckMs: RECHECK_MS
    }
  }

  /**
   * What's waiting in `inbox` (and on the epic's pages, `guideSends`), as one string:  the Send, the requests for
   * now, the calls-off not told yet, the review asked for.  New work, a new string.
   */
  static batchOf(inbox: ReviewInbox, guideSends = ""): string {
    const now = inbox.now.map((request) => `${request.id}@${request.at}`).join(",")
    const canceled = Object.entries(inbox.canceled)
      .filter(([, each]) => !each.told)
      .map(([id, each]) => `${id}@${each.at}`)
      .join(",")
    const sent = inbox.hasNewSend ? inbox.sent : ""
    return [
      `sent=${sent ?? ""}`,
      `now=${now}`,
      `cancel=${canceled}`,
      `ask=${inbox.reviewAsked ?? ""}`,
      guideSends
    ].join(";")
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

  /** The file holding `session`'s registry record:  Claude Code rewrites it as the session is titled, and each turn. */
  private recordFile(session: RunningSession): string {
    return join(this.sessions.home, "sessions", `${session.pid}.json`)
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

  /** The one line that tells the session Owen asked for a review from epic `name`'s page (I144). */
  static askNotice(name: string): string {
    return `📬 ${name}:  Owen pressed "start review" on the epic page.  Start it:  the /epic skill, \`/epic review ${name}\`.`
  }
}

/** `InboxMonitor`'s constructor options. */
export type InboxMonitorProps = {
  /** Claude Code's sessions;  default `new Sessions()` */
  sessions?: Sessions
  /** this session's registry record;  default the running session whose process is an ancestor of this one */
  findSession?: () => RunningSession | undefined
}

/**
 * What one look found (`InboxMonitor.check()`), as `epic session listen --json` prints it for the poller
 * (`InboxPoller`).
 */
export type MonitorCheck = {
  /** the session's process;  absent while its record isn't found */
  pid?: number
  /** the session's process has ended:  the poller stops */
  ended?: true
  /** the epic listened to;  absent for none */
  epic?: string
  /** files whose change calls for another look;  `[]`:  only the clock does */
  watch: string[]
  /** work is waiting for the session */
  waiting: boolean
  /** the line to print, once per batch, while `waiting` */
  notice?: string
  /** what's waiting, as one string (`InboxMonitor.batchOf()`):  a poller announces each batch once */
  batch?: string
  /** look again after this long, ms, whatever changed */
  recheckMs: number
}

/** `listen()`'s part of a look. */
type ListenResult = Pick<MonitorCheck, "watch" | "waiting" | "notice" | "batch" | "recheckMs">

/** The epic a monitor listens to:  its name, its inbox file, the pages it owns. */
export type MonitoredEpic = { name: string; inbox: string; guides: GuideSends }

/**
 * How long until the next look, ms, while nothing changed:  a session titled, a guide linked, another session's
 * monitor gone.
 */
const RECHECK_MS = 5 * 60_000

/** How long until the next look while the session has no epic, ms:  its record changing looks sooner. */
const IDLE_RECHECK_MS = 5 * 60_000

/** How long until the next look while the session isn't found, ms:  Claude Code registers it as it starts. */
const UNFOUND_RECHECK_MS = 30_000

/** Past a heartbeat listener's going stale, ms, before looking again:  so it IS stale by then. */
const STALE_MARGIN_MS = 1_000

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
