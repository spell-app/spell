import { mkdirSync } from "node:fs"
import { constants } from "node:os"
import { dirname } from "node:path"

// By their files, with their `.ts`:  plain `node` loads this file (below)
import { waitUntil } from "spell/util/timing.ts"
import { DataFile } from "./DataFile.ts"

/****************
 * ### `Heartbeat`
 * How a process that WAITS on someone says it's still there, and how anyone else tells:
 * the ONE rule, "90 seconds without a beat, or its process gone, and it's gone" (epic `coherence` P28).
 *
 * ```ts
 * const undo = Heartbeat.hold(file, { command })   // writes { command, pid, seen } now and every 30s
 * Heartbeat.liveIn(file)                           // the record, while it's fresh and its process runs
 * undo()                                           // the file goes;  so it does however the process ends
 * ```
 *
 * - Who beats:  a command run's wait (`CommandRun`), `epic ask wait` (spell-epic's `AskListeners`),
 *   `epic inbox wait` (its listening stamp, inside the review inbox:  `keep()`), and `spell app changes wait`
 *   (the app's `ChangeRequests`)
 * - A beat is a record `{ pid, seen }`:  its process, and when it last beat (ISO);
 *   `isLive()` reads one wherever it's kept, a file of its own or a field of a bigger one
 * - The process check is here too, `isProcessAlive()` and `endProcess()`:  `PidFile` re-exports them
 * - Its position:  node's own modules, util's timing file and the server's `DataFile` only,
 *   so plain `node` loads it by its own name, `spell/server/Heartbeat` (an entry of its own in the kit's `exports`:
 *   spell-epic's plain-node scripts, the window script)
 * - Before P28 each waiter had its own pair of numbers and its own check, and three files copied the process check
 ****************/
export class Heartbeat {
  /** How often a waiter beats, in ms. */
  static readonly EVERY_MS = 30_000

  /** A beat older than this is a waiter that died, in ms:  three missed beats. */
  static readonly STALE_MS = 90_000

  /**
   * Whether `record`'s waiter is still there at `now` (ms):  its last beat (`seen`) within `STALE_MS`, and its process
   * (`pid`) running.
   * - a record without `seen` is judged by its process alone (a review inbox's poller:  live while it runs);
   *   without `pid`, by its beat alone (an old file's)
   * - `undefined`, or neither field:  not live
   * - NEVER throws
   */
  static isLive(record: Beat | undefined | null, now = Date.now()): boolean {
    if (!record || (record.seen === undefined && record.pid === undefined)) return false
    if (record.seen !== undefined && !(now - Date.parse(record.seen) <= Heartbeat.STALE_MS)) return false
    return record.pid === undefined || isProcessAlive(record.pid)
  }

  /**
   * Beat:  `beat()` now and every `every` ms, and `end()` once, as the undo it returns is called or the process ends
   * (exit, `SIGINT`, `SIGTERM`, `SIGHUP`:  a background task stopped).
   * - for a beat kept inside a bigger file (`epic inbox wait`'s, in the review inbox);  `hold()` for a file of its own
   * - NEVER throws:  a `beat()` that throws is tried again a second later (`RETRY_MS`), the first one too
   * - a signal with no other listener ends the process as the shell would:  exit code 128 + its number
   * - SIDE EFFECT:  a timer (unref'd:  it never keeps the process alive) and signal handlers, until undone
   */
  static keep(beat: () => void, end: () => void, every = Heartbeat.EVERY_MS): () => void {
    let retry: NodeJS.Timeout | undefined
    // can't write now (a file mid-write, its lock held):  again a second later, not at the next beat,
    // as three missed in a row make it stale
    const beatNow = () => {
      clearTimeout(retry)
      try {
        beat()
      } catch {
        if (isHeld) (retry = setTimeout(beatNow, RETRY_MS)).unref()
      }
    }
    const timer = setInterval(beatNow, every)
    timer.unref()
    const onSignal = (signal: NodeJS.Signals) => {
      undo()
      // ours was the only listener, which stopped node's own ending:  end as it would have
      if (process.listenerCount(signal) === 0) process.exit(128 + (constants.signals[signal] ?? 1))
    }
    const onExit = () => undo()
    let isHeld = true
    const undo = () => {
      if (!isHeld) return
      isHeld = false
      clearInterval(timer)
      clearTimeout(retry)
      for (const signal of SIGNALS) process.off(signal, onSignal)
      process.off("exit", onExit)
      try {
        end()
      } catch {
        // gone already
      }
    }
    for (const signal of SIGNALS) process.once(signal, onSignal)
    process.once("exit", onExit)
    beatNow()
    return undo
  }

  /**
   * Hold a beat in `file`, a data file of its own:  `{ ...record, pid, seen }` written now and every `EVERY_MS`
   * (`keep()`), and the file removed as it's undone or the process ends, unless another process beats in it since.
   * - its folder made if missing (throws if it can't be);  a write that fails is tried again (`keep()`)
   */
  static hold<T extends object>(file: string, record: T, every = Heartbeat.EVERY_MS): () => void {
    mkdirSync(dirname(file), { recursive: true })
    return Heartbeat.keep(
      () => DataFile.write(file, { ...record, pid: process.pid, seen: new Date().toISOString() }),
      () => {
        if (Heartbeat.read(file)?.pid === process.pid) DataFile.remove(file)
      },
      every
    )
  }

  /** The beat in `file`, or `undefined` (none, or one that won't read as a beat).  NEVER throws. */
  static read<T extends object = object>(file: string): (T & Beat) | undefined {
    try {
      const record = DataFile.read<T & Beat>(file)
      return record && typeof record.seen === "string" && typeof record.pid === "number" ? record : undefined
    } catch {
      return undefined
    }
  }

  /** The beat in `file` while it's live at `now` (`isLive()`), else `undefined`.  NEVER throws. */
  static liveIn<T extends object = object>(file: string, now = Date.now()): (T & Beat) | undefined {
    const record = Heartbeat.read<T>(file)
    return Heartbeat.isLive(record, now) ? record : undefined
  }
}

/**
 * One beat, as kept:  its waiting process, and when it last beat.
 * - `pid`:  the process;  `seen`:  ISO
 */
export type Beat = { pid?: number; seen?: string }

/** How soon a beat that failed is tried again, in ms. */
const RETRY_MS = 1000

/** The signals a held beat ends on. */
const SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"]

/**
 * Whether process `pid` is alive:  signal 0 checks without sending anything;  `EPERM`:  alive, not ours.
 * - the ONE process check:  a beat's (`Heartbeat.isLive()`), the pid file's server, the review inbox's poller,
 *   the checkout servers being stopped, the window script's sessions
 * - NEVER throws
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
}

/**
 * End process `pid`, and wait until it's gone:  `SIGTERM`, then `SIGKILL` if it's still there after `wait` ms.
 * - gone means `isProcessAlive()` says so, not that it stopped answering:  its port is free then
 * - NEVER throws (it may end between the checks)
 */
export async function endProcess(pid: number, wait: number): Promise<void> {
  const signal = (name: NodeJS.Signals) => {
    try {
      process.kill(pid, name)
    } catch {
      // gone already
    }
  }
  signal("SIGTERM")
  const isGone = () => !isProcessAlive(pid)
  // Until it ends, looking every 0.1s;  `SIGKILL` after `wait`, then 2s more, every 0.05s
  if (await waitUntil(isGone, { timeout: wait / 1000 })) return
  signal("SIGKILL")
  await waitUntil(isGone, { timeout: 2, every: 0.05 })
}
