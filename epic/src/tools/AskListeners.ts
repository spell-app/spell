import { createHash } from "node:crypto"
import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

import { RealPath } from "spell/server/RealPath"
import { DataFile } from "spell-epic/data/DataFile.ts"
import { HOME_ENV, HOME_FOLDER } from "spell-epic/server/server.types.ts"

/****************
 * ### `AskListeners`
 * Who is WAITING for a details page's answer (epic `epic-engine` r6):  a session's `epic ask wait` (or
 * `ask show --wait`), which the page's `<epic-send>` names, "repo-split is listening".
 * - Why:  `ask wait` watches the answer file, never the review inbox, so the page could only ask the inbox's
 *   heartbeat (`epic inbox wait`'s), and said "nobody is listening" while a session waited on it (request r6).
 * - A HEARTBEAT per page, as the review inbox's `listening.seen` (`ReviewInbox`):
 *   - `hold()`, by `ask wait`:  stamped at the start and every `ASK_HEARTBEAT_MS`, removed as the wait ends
 *     (an answer, the timeout, a signal)
 *   - `liveFor()`, by the details route module (`detailsRoutes.ts`):  `null` once older than `ASK_STALE_MS`, or its
 *     process is gone, so a wait killed outright never leaves the page claiming it's there
 * - Kept in spell-epic's home folder (`~/.spell-epic/asks/`, `SPELL_EPIC_HOME` for tests and the demo server), one
 *   file per page, named by a hash of its real path:
 *   - NOT beside the page:  the content folder is a git repo committed after every turn, and a file rewritten every
 *     30s there would be a commit each time
 *   - one machine:  the wait and the page server that serves the page are on it
 * - node only;  plain `node` loads it (`details.js`, under tsx without the tsconfig's paths):  relative imports only
 ****************/
export class AskListeners {
  /** The heartbeat file of details page `page` (its file):  `<home>/asks/<hash of its real path>.json5`. */
  static fileFor(page: string): string {
    const key = createHash("sha1").update(RealPath.of(page)).digest("hex").slice(0, 16)
    return join(homeFolder(), ASKS_FOLDER, `${key}${DataFile.SUFFIX}`)
  }

  /**
   * Stamp `page`'s heartbeat:  this process waits for its answer, `since` (ISO) and seen `at` now.
   * - SIDE EFFECT:  writes the heartbeat file (its folder made if missing)
   */
  static stamp(page: string, { since, at = new Date().toISOString() }: { since?: string; at?: string } = {}) {
    const file = AskListeners.fileFor(page)
    mkdirSync(dirname(file), { recursive: true })
    const listener: AskListener = { page: RealPath.of(page), pid: process.pid, since: since ?? at, seen: at }
    DataFile.write(file, listener)
    return listener
  }

  /**
   * This process stopped waiting on `page`:  its heartbeat goes, unless another wait has stamped it since.
   * - SIDE EFFECT:  removes the heartbeat file
   */
  static stop(page: string) {
    const file = AskListeners.fileFor(page)
    const listener = readListener(file)
    if (listener && listener.pid !== process.pid) return
    DataFile.remove(file)
  }

  /**
   * The wait on `page`, alive at `now` (ms);  `null` for none:  no heartbeat, one older than `ASK_STALE_MS`, or its
   * process gone.
   */
  static liveFor(page: string, now = Date.now()): AskListener | null {
    const listener = readListener(AskListeners.fileFor(page))
    if (!listener) return null
    if (now - Date.parse(listener.seen) > ASK_STALE_MS) return null
    return isRunning(listener.pid) ? listener : null
  }

  /**
   * Hold `page`'s heartbeat while this process waits on it:  stamped now and every `ASK_HEARTBEAT_MS`, removed by
   * the undo, or as the process ends (exit, `SIGINT`, `SIGTERM`, `SIGHUP`:  a background task stopped).
   * - SIDE EFFECT:  a timer (unref'd:  it never keeps the process alive) and signal handlers, until undone
   */
  static hold(page: string): () => void {
    const { since } = AskListeners.stamp(page)
    const timer = setInterval(() => {
      try {
        AskListeners.stamp(page, { since })
      } catch {
        // home folder unwritable:  the page says nobody is waiting, and the wait still works
      }
    }, ASK_HEARTBEAT_MS)
    timer.unref()
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"]
    const onSignal = (signal: NodeJS.Signals) => {
      undo()
      process.exit(128 + (SIGNAL_NUMBERS[signal] ?? 1))
    }
    const onExit = () => undo()
    let isHeld = true
    const undo = () => {
      if (!isHeld) return
      isHeld = false
      clearInterval(timer)
      for (const signal of signals) process.off(signal, onSignal)
      process.off("exit", onExit)
      try {
        AskListeners.stop(page)
      } catch {
        // gone already
      }
    }
    for (const signal of signals) process.once(signal, onSignal)
    process.once("exit", onExit)
    return undo
  }
}

/**
 * A wait on a details page's answer, as its heartbeat file holds it.
 * - `page`:  the page's real path;  `pid`:  the waiting process;  `since`, `seen`:  ISO, when it started, its last
 *   heartbeat
 */
export type AskListener = { page: string; pid: number; since: string; seen: string }

/** How often a wait stamps its heartbeat, in ms:  the review inbox's beat (`ReviewInbox` `LISTEN_HEARTBEAT_MS`). */
export const ASK_HEARTBEAT_MS = 30_000

/** A heartbeat older than this is a wait that died, in ms:  three missed beats (`ReviewInbox` `LISTEN_STALE_MS`). */
export const ASK_STALE_MS = 90_000

/** The heartbeats' folder, in spell-epic's home folder. */
const ASKS_FOLDER = "asks"

/** The signals `hold()` ends on, by number:  the exit code is 128 + it, as the shell's. */
const SIGNAL_NUMBERS: Partial<Record<NodeJS.Signals, number>> = { SIGHUP: 1, SIGINT: 2, SIGTERM: 15 }

/** spell-epic's home folder:  `$SPELL_EPIC_HOME`, else `~/.spell-epic` (`RepoList.homeFolder()`'s rule). */
function homeFolder(): string {
  return process.env[HOME_ENV] || join(homedir(), HOME_FOLDER)
}

/** The heartbeat in `file`, or `undefined` (none, or one that won't read). */
function readListener(file: string): AskListener | undefined {
  try {
    const listener = DataFile.read<AskListener>(file)
    return listener && typeof listener.seen === "string" && typeof listener.pid === "number" ? listener : undefined
  } catch {
    return undefined
  }
}

/**
 * Is process `pid` running?  `EPERM`:  it is, someone else's.
 * - a copy of the kit's `SRV.isProcessAlive()`:  plain `node` loads this file, and can't load the kit's `PidFile`
 */
function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
}
