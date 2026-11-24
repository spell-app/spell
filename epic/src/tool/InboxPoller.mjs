/****************
 * ### `InboxPoller`
 * Keeps an epic's session listening to its epic page while the session is open (epic `epic-engine` P18, P19, I144).
 * `monitors/listen.mjs` runs it, one of two ways (`mode`):
 * - `hook`, in EVERY session:  the plugin's `Stop` hook, `asyncRewake` (`hooks/hooks.json`), started at each turn's end
 *   - and at the session's start (its `SessionStart` hook, epic `epic-engine` I219):  a process VS Code started again
 *     (a window reloaded) had none until its first turn ended, so a Send to it found nobody listening
 *   - once work waits, it prints the line to stderr and exits 2:  Claude Code wakes the session with it
 *   - the next turn's end starts it again
 *   - why (I144):  Claude Code starts a plugin's MONITORS only in an interactive terminal session.
 *     VS Code's Claude panel runs `claude` as a stream (`--input-format stream-json`), where none ever starts:
 *     checked 2026-10-26 with Claude Code 2.1.310, a probe plugin's monitor never ran there,
 *     while its `asyncRewake` `Stop` hook woke the session.
 * - `monitor`, in a terminal session:  the plugin's monitor (`monitors/monitors.json`), for the session's life;
 *   the line goes to stdout, which wakes the session, and it keeps going.
 * - ONE per session, the newest (`claim()`):  a newer poller for the same session (the next turn's hook) takes over,
 *   and the older one ends without a word.
 *   - its file:  `~/.spell-epic/listeners/<session pid>.pid`, the poller's process id
 *   - so the page server knows a poller runs for a session (`listenerOf()`), and asks it to start a review through
 *     the inbox instead of typing into the session (`ReviewStart`)
 * - With the epic hub up, it HEARS THE HUB (epic `epic-engine` T163):  the hub's one listener (`InboxHub`) looks at
 *   every epic's inbox, and leaves this session a note when the person sends (`WakeNotes`)
 *   - the poller takes the note while the session is IDLE (its registry record's `status`), prints its line, and (as a
 *     `hook`) exits 2, which wakes the session
 *   - while the session is at work, it leaves the note to the `PostToolUse` hook (`hooks/inbox-note.mjs`), which puts
 *     the line in front of the session at its next tool call;  whichever takes it first, the other finds none
 *   - it watches the note and the session's record, a `stat` each, and runs no look of its own
 *   - the session:  the hook's input names it (`sessionId`, its `session_id`);  `monitor` mode has none, and looks
 * - Else (no hub, or no session id) it runs a LOOK, `epic session listen --json` (`InboxMonitor`), and prints the line
 *   the look gives (`notice`):  the line wakes the session.  It prints nothing else, ever, so it costs no tokens while
 *   idle.
 * - When it looks:
 *   - at start
 *   - `SETTLE_MS` after a file the last look named (`watch`) changes:  the epic's inbox, the inboxes of the pages it
 *     owns, the session's record.  The settle lets a `wait` already running in the session take the work first.
 *   - when the last look said to (`recheckMs`), whatever changed
 *   - `RETRY_MS` after a look that failed
 * - The line once per batch of work:  again only after a look found nothing waiting.
 *   - across pollers too:  the listener file keeps the last batch announced (the look's `batch`), so the next turn's
 *     hook never wakes the session again for work it was already woken for and left
 * - Ends when the session's process does (the look's `pid`), when a newer poller takes over, when Claude Code stops
 *   it, or (`hook`) once it printed the line.
 * - NEVER runs in an unattended session, a scripted `claude -p` (`ClaudeSession.isUnattended()`, epic `epic-engine`
 *   I319):  it ends at once, before its first look.
 *   - `claude -p` waits for every `SessionStart` hook to finish before its first answer, `asyncRewake` ones too:
 *     with the poller running a day, the run never started
 *   - nobody is there to Send to it anyway
 * - SMALL ON PURPOSE (P19):  plain JavaScript and node's own modules, so it runs in bare node, about 45MB.
 *   - The look needs the epic tool, about 150MB under `tsx`:  it runs for a fraction of a second, as its own process.
 *   - NEVER import TypeScript here, nor anything of ours:  node's TypeScript support alone adds about 28MB.
 * - NEVER throws.
 ****************/
import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { fileURLToPath } from "node:url"

import { ClaudeSession } from "spell/epic/config/ClaudeSession.mjs"
import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"

import { WakeNotes } from "./WakeNotes.mjs"

export class InboxPoller {
  /**
   * - `look`:  one look, its answer (`MonitorCheck`), or `undefined` when it failed;  default `epic session listen
   *   --json`, this checkout's
   * - `mode`:  `monitor` (the default) or `hook`:  the header says which runs where
   * - `print`:  where the line goes;  default stdout for a `monitor`, stderr for a `hook` (Claude Code reads each)
   * - `listeners`:  the folder of the one-poller-per-session files (`claim()`);  default `listenersFolder()`
   * - `pollMs`, `settleMs`, `retryMs`:  tests make them short
   * - `env`:  the environment Claude Code started it in (`ClaudeSession.isUnattended()`);  default `process.env`
   * - `sessionId`:  the Claude session it listens for, from the hook's input;  with it, the hub's notes are heard
   * - `notes`:  the hub's notes (`WakeNotes`);  `recordOf`:  a session's registry record (`ClaudeSession.recordOf()`)
   */
  constructor({
    look = lookWithEpic,
    sessionId = /** @type {string | undefined} */ (undefined),
    notes = new WakeNotes(),
    recordOf = (id) => ClaudeSession.recordOf(id),
    mode = "monitor",
    print = printTo(mode === "hook" ? process.stderr : process.stdout),
    listeners = listenersFolder(),
    pollMs = POLL_MS,
    settleMs = SETTLE_MS,
    retryMs = RETRY_MS,
    env = process.env
  } = {}) {
    this.look = look
    this.mode = mode
    this.print = print
    this.listeners = listeners
    this.pollMs = pollMs
    this.settleMs = settleMs
    this.retryMs = retryMs
    this.env = env
    this.sessionId = sessionId
    this.notes = notes
    this.recordOf = recordOf
    /** whether this batch of work was announced already */
    this.announced = false
    /** the session's process this poller claimed (`claim()`), once a look found it */
    this.claimed = undefined
    /** the batch the last line announced, this poller's or (from its listener file) the one before it */
    this.lastBatch = undefined
    /** whether it hears the hub's notes now, rather than looking itself */
    this.hearsHub = false
  }

  /**
   * Look, announce, wait for a change;  again, until the session ends or a newer poller takes over.
   * Resolves to the exit code:  0;  2 for a `hook` that printed the line, which wakes the session.
   * - an unattended session (`claude -p`):  0 at once, nothing looked at or claimed
   */
  async run() {
    if (ClaudeSession.isUnattended(this.env)) return 0
    for (;;) {
      const hearsHub = Boolean(this.sessionId) && this.notes.hubIsLive()
      // the listener file says which:  the hub takes the inbox's place only from a poller that hears it
      if (hearsHub !== this.hearsHub) {
        this.hearsHub = hearsHub
        this.writeClaim()
      }
      const found = hearsHub ? this.hearHub() : this.lookSafely()
      if (found?.ended) return 0
      this.claim(found?.pid)
      const printed = hearsHub ? Boolean(found?.printed) : this.announce(found)
      if (printed && this.mode === "hook") return 2
      const next = await this.waitForChange(found, hearsHub ? 0 : this.settleMs)
      if (next === "ended" || next === "superseded") return 0
    }
  }

  /**
   * One look at the hub's note for this session (epic `epic-engine` T163):  taken and its line printed while the
   * session is idle;  left for the `PostToolUse` hook while it's at work.
   * - answers as a look does (`watch`, `recheckMs`, `pid`, `ended`), plus `printed`
   * - the session not in the registry yet:  looked at again soon
   */
  hearHub() {
    const record = this.recordOf(this.sessionId)
    if (!record) return { watch: [], waiting: false, recheckMs: UNFOUND_MS }
    if (!isAlive(record.pid)) return { pid: record.pid, ended: true, watch: [], waiting: false, recheckMs: 0 }
    const watch = [this.notes.fileOf(this.sessionId), record.file]
    const found = { pid: record.pid, watch, waiting: false, recheckMs: HUB_RECHECK_MS }
    if (record.status === "busy") return found
    // claimed first:  the batch the poller before this one printed is known
    this.claim(record.pid)
    const note = this.notes.take(this.sessionId)
    if (!note?.notice || note.batch === this.lastBatch) return found
    this.print(note.notice)
    this.lastBatch = note.batch
    this.writeClaim()
    return { ...found, printed: true }
  }

  /**
   * The line, once per batch:  work waiting and not announced yet;  true when it printed it.
   * - a batch is the look's `batch` when it names one (a newer Send is a new batch), else everything waiting until a
   *   look finds nothing
   * - a look that failed changes nothing
   */
  announce(found) {
    if (!found) return false
    if (!found.waiting) {
      this.announced = false
      this.lastBatch = undefined
      return false
    }
    if (!found.notice) return false
    // the poller before this one may have announced it already:  the session was woken for it
    const isNew = found.batch ? found.batch !== this.lastBatch : !this.announced
    this.announced = true
    if (!isNew) return false
    this.print(found.notice)
    this.lastBatch = found.batch
    this.writeClaim()
    return true
  }

  /**
   * Claim session process `pid`'s listener file for this poller, the first time a look finds the session:
   * an older poller of it sees it taken (`isSuperseded`), and ends.
   * - NEVER throws:  a file it can't write leaves an older poller running beside it, each saying its line once
   */
  claim(pid) {
    if (!pid || this.claimed === pid) return
    this.claimed = pid
    this.lastBatch ??= readClaim(this.claimFile).batch
    this.writeClaim()
  }

  /** This poller's listener file, once it claimed a session. */
  get claimFile() {
    return this.claimed ? join(this.listeners, `${this.claimed}.pid`) : ""
  }

  /**
   * Write the listener file:  this poller's process id, then the batch last announced, then `hub` while it hears the
   * hub's notes.  NEVER throws.
   */
  writeClaim() {
    if (!this.claimed) return
    try {
      mkdirSync(this.listeners, { recursive: true, mode: 0o700 })
      writeFileSync(this.claimFile, `${process.pid}\n${this.lastBatch ?? ""}\n${this.hearsHub ? HEARS_HUB : ""}\n`)
    } catch {
      // best effort:  see claim()
    }
  }

  /** Has a newer poller claimed this one's session? */
  get isSuperseded() {
    if (!this.claimed) return false
    const holder = readClaim(this.claimFile).pid
    return holder !== undefined && holder !== process.pid
  }

  /**
   * Wait until it's time to look again:  a watched file changed (then `settleMs` more), or the look's `recheckMs`
   * passed;  `"ended"` once the session's process is gone, `"superseded"` once a newer poller claimed it.
   */
  async waitForChange(found, settleMs = this.settleMs) {
    const files = found?.watch ?? []
    const before = files.map(stampOf)
    const until = Date.now() + (found ? found.recheckMs : this.retryMs)
    while (Date.now() < until) {
      await sleep(Math.min(this.pollMs, Math.max(until - Date.now(), 0)))
      if (found?.pid && !isAlive(found.pid)) return "ended"
      if (this.isSuperseded) return "superseded"
      if (files.some((file, at) => stampOf(file) !== before[at])) {
        await sleep(settleMs)
        return "changed"
      }
    }
    return "due"
  }

  /** One look;  `undefined` when it threw. */
  lookSafely() {
    try {
      return this.look()
    } catch {
      return undefined
    }
  }
}

/** How often it checks the watched files, ms:  a `stat` each. */
export const POLL_MS = 2_000

/** How long after a change before it looks, ms:  a `wait` running in the session takes the work first. */
export const SETTLE_MS = 4_000

/** How long, hearing the hub, before it looks again with nothing changed, ms:  the hub going away, say. */
const HUB_RECHECK_MS = 60_000

/** How long, hearing the hub, before it looks again for a session not in the registry yet, ms. */
const UNFOUND_MS = 10_000

/** How long after a failed look before it looks again, ms. */
const RETRY_MS = 60_000

/** The longest a look may take, ms:  past it, the look failed. */
const LOOK_TIMEOUT_MS = 60_000

/** This copy's `epic` command:  the look runs this copy's code. */
const EPIC = EngineFiles.bin

/**
 * The folder of the one-poller-per-session files, `<session pid>.pid` each, holding its poller's process id:
 * `$SPELL_EPIC_LISTENERS_DIR`, else `~/.spell-epic/listeners`.
 */
export function listenersFolder() {
  return process.env.SPELL_EPIC_LISTENERS_DIR || join(homedir(), ".spell-epic", "listeners")
}

/**
 * The process id of the poller running for the Claude session whose process is `sessionPid`, else `undefined`:
 * its listener file names one, and that process is alive.
 * - `folder`:  default `listenersFolder()`
 * - NEVER throws
 */
export function listenerOf(sessionPid, folder = listenersFolder()) {
  const { pid } = readClaim(join(folder, `${sessionPid}.pid`))
  return pid && isAlive(pid) ? pid : undefined
}

/**
 * Does the poller running for the Claude session whose process is `sessionPid` hear the epic hub's notes
 * (`WakeNotes`), rather than look at the inbox itself?  Its listener file says so, and it's alive.
 * - the hub takes the inbox's listener place only from such a poller:  one that looks itself would take it back
 * - NEVER throws
 */
export function listenerHearsHub(sessionPid, folder = listenersFolder()) {
  const { pid, hearsHub } = readClaim(join(folder, `${sessionPid}.pid`))
  return Boolean(pid && hearsHub && isAlive(pid))
}

/** A listener file's third line while its poller hears the hub. */
const HEARS_HUB = "hub"

/**
 * One look:  `epic session listen --json`, in a process of its own, its last line parsed;  `undefined` when it failed.
 * - `--monitor`, this process:  the inbox's listener place is held while it runs (`ReviewInbox.liveListener()`)
 * - this node (`process.execPath`), not the `PATH`'s:  no version manager's shim in between
 */
function lookWithEpic() {
  const run = spawnSync(process.execPath, [EPIC, "session", "listen", "--json", "--monitor", String(process.pid)], {
    encoding: "utf8",
    timeout: LOOK_TIMEOUT_MS
  })
  const line = run.status === 0 ? run.stdout.trim().split("\n").at(-1) : ""
  return line ? JSON.parse(line) : undefined
}

/** A `print` writing each line to `stream`. */
function printTo(stream) {
  return (line) => void stream.write(`${line}\n`)
}

/**
 * A listener file's poller process id, last batch announced and whether it hears the hub;  `undefined` (`false`) for
 * what isn't there.
 */
function readClaim(file) {
  try {
    const [first = "", batch = "", mode = ""] = readFileSync(file, "utf8").split("\n")
    const pid = Number(first.trim())
    return {
      pid: Number.isInteger(pid) && pid > 0 ? pid : undefined,
      batch: batch.trim() || undefined,
      hearsHub: mode.trim() === HEARS_HUB
    }
  } catch {
    return { pid: undefined, batch: undefined, hearsHub: false }
  }
}

/** A file's modified time and size, as a string to compare;  `"none"` while it isn't there. */
function stampOf(file) {
  try {
    const stat = statSync(file)
    return `${stat.mtimeMs}:${stat.size}`
  } catch {
    return "none"
  }
}

/** Whether a process `pid` exists:  signal 0 checks without signalling;  EPERM means it exists, someone else's. */
function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === "EPERM"
  }
}
