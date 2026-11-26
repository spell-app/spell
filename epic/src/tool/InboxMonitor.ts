import { join } from "node:path"

import { SRV } from "spell/server"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { SessionFolders } from "spell/epic/config/SessionFolders"
import { isSupersededTitle, type RunningSession } from "spell/epic/command/command.types"
import { Sessions } from "spell/epic/command/Sessions"
import { bareTitle } from "spell/epic/list/RunningEpics"
import type { GearAsk } from "spell/epic/review/review.types"

import { GuideSends } from "./InboxCommands"
import { PlanDocFiles } from "./PlanDocFiles"
import { ReviewInbox } from "./ReviewInbox"

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
 *   - run by hand, with no `monitor`:  it listens as `epic inbox watch` does, stale in 90s (`SRV.Heartbeat.STALE_MS`)
 * - Work waiting (`ReviewInbox.hasWork`, or a Send on a page the epic owns):  `waiting`, with the line to print,
 *   `📬 ...`, saying how to take it (`epic inbox wait <epic>`).
 *   - Never TAKES it:  the session does, with its own `wait`, so what Owen sent reaches the session's context.
 *   - A review asked for from the page while the poller runs (`ReviewInbox.reviewAsked`, epic `epic-engine` I144):
 *     waiting too, its line asking for `/epic review <epic>` (`askNotice()`):  the page server tells the session
 *     through its poller rather than typing into its tab, which VS Code refuses while the tab is open.
 *   - Each ask from the page's gear (`ReviewInbox.gearAsks`):  the same, each its own line (`gearNotice()`)
 *     - Tidy (epic `epic-engine` T168), Where are we?, Hush settled items, Start fresh, Merge and push (T174)
 *     - a review asked for at the same time comes first;  then the asks in the order they were pressed
 *     - SIDE EFFECT:  an ask's line said, the ask is gone (`ReviewInbox.askStarted()`):  the next look tells the next one
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
   * - `monitor`:  the poller's process id, which the listener's place is held by;  the epic hub's look
   *   (`InboxHub`) holds it by the SESSION's own process, live while the session runs
   * - `takesOver`:  whether a live listener of the same session, process `pid`, is one this look replaces;  default
   *   any (the session's older poller);  the hub's look replaces only the session's poller, never its own `wait`
   * - NEVER throws:  a failure says to look again in `RECHECK_MS`
   * - SIDE EFFECT:  takes the inbox's listener place when nobody holds it (`listen()`)
   */
  check({ monitor, now = Date.now(), takesOver }: CheckOptions = {}): MonitorCheck {
    try {
      const session = this.findSession()
      // not registered yet (a session just starting):  soon again
      if (!session) return { watch: [], waiting: false, recheckMs: UNFOUND_RECHECK_MS }
      const pid = session.pid
      if (pid && !SRV.isProcessAlive(pid)) return { pid, ended: true, watch: [], waiting: false, recheckMs: 0 }
      const epic = this.epicOf(session)
      // no epic yet:  its registry record changes as it's titled (and on every turn)
      if (!epic) return { pid, watch: [this.recordFile(session)], waiting: false, recheckMs: IDLE_RECHECK_MS }
      return { pid, epic: epic.name, ...this.listen(session, epic, { monitor, now, takesOver }) }
    } catch {
      return { watch: [], waiting: false, recheckMs: RECHECK_MS }
    }
  }

  /**
   * Listen to `epic`'s inbox for `session`:  take the listener's place when it's free, and say what's waiting.
   * - another live listener holds it:  nothing to watch until it would go stale
   *   (a monitor's, with its process:  `RECHECK_MS`)
   */
  private listen(
    session: RunningSession,
    epic: MonitoredEpic,
    { monitor, now = Date.now(), takesOver = () => true }: CheckOptions
  ): ListenResult {
    const inbox = ReviewInbox.read(epic.inbox)
    const live = inbox.liveListener(now)
    const mine = live?.session === session.sessionId && Boolean(monitor) && live.pid === monitor
    // the same session's older poller (the last turn's hook):  this newer one takes over, and the old one ends
    const older = live?.session === session.sessionId && Boolean(monitor && live.pid) && !mine && takesOver(live.pid!)
    if (live && !mine && !older) {
      const seen = Date.parse(live.seen ?? live.since)
      const recheckMs = live.pid ? RECHECK_MS : Math.max(seen + SRV.Heartbeat.STALE_MS - now, 0) + STALE_MARGIN_MS
      return { watch: [], waiting: false, recheckMs }
    }
    // never a blocking wait:  in the epic hub a wait here froze the hub, its own routes holding the lock (I463);
    // held, the next look takes the listener's place
    if (
      (!live || older) &&
      !ReviewInbox.updateIfFree(epic.inbox, (box) => box.setListening(session.sessionId, undefined, monitor))
    )
      return { watch: [epic.inbox], waiting: false, recheckMs: LOCK_RECHECK_MS }
    const guideSends = epic.guides.newSends
    const hasWork = inbox.hasWork || Boolean(guideSends)
    const gearAsk = inbox.firstAsk
    const waiting = hasWork || Boolean(inbox.reviewAsked || gearAsk)
    const notice = hasWork
      ? InboxMonitor.notice(epic.name, InboxMonitor.summaryOf(inbox, Boolean(guideSends)))
      : inbox.reviewAsked
        ? InboxMonitor.askNotice(epic.name)
        : gearAsk && InboxMonitor.gearNotice(epic.name, gearAsk)
    // a gear ask is said once:  gone now, so the next look says the next one (held:  said again, the same batch)
    if (!hasWork && !inbox.reviewAsked && gearAsk)
      ReviewInbox.updateIfFree(epic.inbox, (box) => void box.askStarted(gearAsk))
    return {
      watch: [epic.inbox, ...epic.guides.files],
      waiting,
      ...(waiting && { notice, batch: InboxMonitor.batchOf(inbox, guideSends) }),
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
      `gear=${Object.entries(inbox.gearAsks)
        .map(([ask, at]) => `${ask}@${at}`)
        .join(",")}`,
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
   * - never a session a `/epic fresh` replaced (`🗄️ seo (replaced)`, `isSupersededTitle()`;  epic `epic-engine`
   *   I488):  its worktree is still the epic's, but the new session listens, not it
   */
  epicOf(session: RunningSession): MonitoredEpic | undefined {
    const cwd = session.cwd
    if (!cwd) return undefined
    const recorded = SessionFolders.recordTitle(session, this.sessions.home)
    if (isSupersededTitle(recorded)) return undefined
    const files = new PlanDocFiles({ root: cwd })
    const title = bareTitle(recorded)
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

  /**
   * The one line that tells the session work is waiting on epic `name`'s page, what it is (`summary`), and how to take
   * it;  it's the first thing Owen sees of a session a Send woke (epic `epic-engine` I286).
   * - nothing to arm after it (epic `epic-engine` T163):  the epic hub listens for every session, and the next Send
   *   reaches it at its next tool call, or wakes it once idle
   */
  static notice(name: string, summary = "marks, comments or Do Now"): string {
    return (
      `📬 ${name}:  taking your Send from the epic page (${summary}).  ` +
      `Take it:  \`epic inbox wait ${name} --timeout 5\`, then the /epic skill's "7.3 Woken".`
    )
  }

  /**
   * What's waiting in `inbox`, in words, for the notice:  `3 marks:  J149 approve, I91 approve, I83 do this`;
   * then the requests for now, the calls-off, and comments on the epic's other pages (`guides`).
   * - at most `SUMMARY_IDS` items named:  the rest counted (`+4 more`)
   */
  static summaryOf(inbox: ReviewInbox, guides = false): string {
    const marks = inbox.hasNewSend ? inbox.sentMarks.map((mark) => `${mark.id} ${actionWords(mark.action)}`) : []
    const now = inbox.now.map((request) => `${request.id} ${actionWords(request.action)} now`)
    const canceled = Object.entries(inbox.canceled)
      .filter(([, each]) => !each.told)
      .map(([id]) => `${id} called off`)
    const parts = [
      marks.length && `${plural(marks.length, "mark")}:  ${named(marks)}`,
      now.length && named(now),
      canceled.length && named(canceled),
      guides && "comments on its other pages"
    ].filter(Boolean)
    return parts.join(";  ") || "marks, comments or Do Now"
  }

  /** The one line that tells the session the person asked for a review from epic `name`'s page (I144). */
  static askNotice(name: string): string {
    return `📬 ${name}:  the person pressed "start review" on the epic page.  Start it:  the /epic skill, \`/epic review ${name}\`.`
  }

  /**
   * The one line that tells the session the person pressed `ask` in epic `name`'s page gear, and what to run.
   * - Tidy (epic `epic-engine` T168);  Where are we?, Hush settled items, Start fresh, Merge and push (T174)
   */
  static gearNotice(name: string, ask: GearAsk): string {
    return `📬 ${name}:  the person pressed ${GEAR_NOTICES[ask](name)}`
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

/** `InboxMonitor.check()`'s options. */
export type CheckOptions = {
  /** the process that holds the listener's place for the session:  its poller's, or (the hub's look) the session's */
  monitor?: number
  /** the time of the look, ms */
  now?: number
  /** whether a live listener of the same session, process `pid`, is one this look replaces;  default any */
  takesOver?: (pid: number) => boolean
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

/** How long until the next look when the inbox's lock was held, ms:  a write of a moment, so soon. */
const LOCK_RECHECK_MS = 1_000

/** How many items `summaryOf()` names before counting the rest. */
const SUMMARY_IDS = 6

/**
 * Each gear ask's line, after "the person pressed":  the row's name, then what to run (`gearNotice()`).
 * - Merge and push is the person's go-ahead to push:  the tooling home's session is the one that pushes (the kit's
 *   `AGENTS.md`, "Commands")
 */
const GEAR_NOTICES: Record<GearAsk, (name: string) => string> = {
  tidy: (name) => `Tidy on the epic page.  Run it:  the /epic skill, \`/epic tidy ${name}\` ("14. Tidy").`,
  status: () => `"Where are we?" on the epic page.  Post a short status:  the /wtf skill, \`/wtf\`.`,
  hush: (name) =>
    `"Hush settled items" on the epic page.  Run it:  the /epic skill, \`/epic hush ${name}\` ("17. Hush":  ` +
    `the dry run first, then ask before greying).`,
  fresh: () => `"Start fresh" on the epic page.  Run it:  the /epic skill, \`/epic fresh\` ("16. Fresh").`,
  push: (name) =>
    `"Merge and push" on the epic page:  their go-ahead to push.  Merge the finished work into main ` +
    `(\`epic worktree merge-main\`, \`epic merge ${name}\`), push main to GitHub (\`git push origin main\`), ` +
    `and say what was pushed.`
}

/** A mark's or request's action, as the page's button says it. */
const ACTION_WORDS: Record<string, string> = {
  todo: "do this",
  details: "add details",
  next: "next phase",
  seen: "seen",
  accept: "accepted"
}

/** `action` in the page's words (`todo` -> `do this`). */
function actionWords(action: string): string {
  return ACTION_WORDS[action] ?? action
}

/** `words` joined, at most `SUMMARY_IDS` of them, the rest counted. */
function named(words: string[]): string {
  const more = words.length - SUMMARY_IDS
  return words.slice(0, SUMMARY_IDS).join(", ") + (more > 0 ? `, +${more} more` : "")
}

/** `1 mark`, `3 marks`. */
function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

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
