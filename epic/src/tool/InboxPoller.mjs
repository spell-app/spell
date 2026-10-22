/****************
 * ### `InboxPoller`
 * The spell-epic plugin's MONITOR, one beside every Claude Code session (`monitors/monitors.json`, run by
 * `monitors/listen.mjs`):  keeps an epic's session listening to its epic page while the session is open
 * (epic `epic-engine` P18, P19).
 * - It runs a LOOK, `epic session listen --json` (`InboxMonitor`), and prints the line the look gives (`notice`):
 *   the line wakes the session.  It prints nothing else, ever, so it costs no tokens while idle.
 * - When it looks:
 *   - at start
 *   - `SETTLE_MS` after a file the last look named (`watch`) changes:  the epic's inbox, the inboxes of the pages it
 *     owns, the session's record.  The settle lets a `wait` already running in the session take the work first.
 *   - when the last look said to (`recheckMs`), whatever changed
 *   - `RETRY_MS` after a look that failed
 * - The line once per batch of work:  again only after a look found nothing waiting.
 * - Ends when the session's process does (the look's `pid`), or when Claude Code stops it.
 * - SMALL ON PURPOSE (P19):  plain JavaScript and node's own modules, so it runs in bare node, about 45MB.
 *   - The look needs the epic tool, about 150MB under `tsx`:  it runs for a fraction of a second, as its own process.
 *   - NEVER import TypeScript here, nor anything of ours:  node's TypeScript support alone adds about 28MB.
 * - NEVER throws.
 ****************/
import { spawnSync } from "node:child_process"
import { statSync } from "node:fs"
import { dirname, join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { fileURLToPath } from "node:url"

export class InboxPoller {
  /**
   * - `look`:  one look, its answer (`MonitorCheck`), or `undefined` when it failed;  default `epic session listen
   *   --json`, this checkout's
   * - `print`:  where the line goes;  default stdout, which Claude Code reads
   * - `pollMs`, `settleMs`, `retryMs`:  tests make them short
   */
  constructor({
    look = lookWithEpic,
    print = (line) => void process.stdout.write(`${line}\n`),
    pollMs = POLL_MS,
    settleMs = SETTLE_MS,
    retryMs = RETRY_MS
  } = {}) {
    this.look = look
    this.print = print
    this.pollMs = pollMs
    this.settleMs = settleMs
    this.retryMs = retryMs
    /** whether this batch of work was announced already */
    this.announced = false
  }

  /** Look, announce, wait for a change;  again, until the session ends.  Resolves to the exit code, 0. */
  async run() {
    for (;;) {
      const found = this.lookSafely()
      if (found?.ended) return 0
      this.announce(found)
      if ((await this.waitForChange(found)) === "ended") return 0
    }
  }

  /** The line, once per batch:  work waiting and not announced yet.  A look that failed changes nothing. */
  announce(found) {
    if (!found) return
    if (!found.waiting) {
      this.announced = false
    } else if (found.notice && !this.announced) {
      this.announced = true
      this.print(found.notice)
    }
  }

  /**
   * Wait until it's time to look again:  a watched file changed (then `settleMs` more), or the look's `recheckMs`
   * passed;  `"ended"` once the session's process is gone.
   */
  async waitForChange(found) {
    const files = found?.watch ?? []
    const before = files.map(stampOf)
    const until = Date.now() + (found ? found.recheckMs : this.retryMs)
    while (Date.now() < until) {
      await sleep(Math.min(this.pollMs, Math.max(until - Date.now(), 0)))
      if (found?.pid && !isAlive(found.pid)) return "ended"
      if (files.some((file, at) => stampOf(file) !== before[at])) {
        await sleep(this.settleMs)
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

/** How long after a failed look before it looks again, ms. */
const RETRY_MS = 60_000

/** The longest a look may take, ms:  past it, the look failed. */
const LOOK_TIMEOUT_MS = 60_000

/** This checkout's `epic` command:  the look runs this copy's code. */
const EPIC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "bin", "epic")

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
