import { closeSync, openSync, readFileSync, rmSync, statSync, writeSync } from "node:fs"

// By their files, with their `.ts`:  plain `node` loads this file (below)
import { waitUntilSync } from "spell/util/node/timing.ts"
import { waitUntil } from "spell/util/timing.ts"
import { FileLockError } from "./server.types.ts"

/**
 * A lock on one file, held as `<file>.lock`, so tools that write the same file take turns:
 * the page server's page edits, `epic`, the app's saves.
 * - created with `open(wx)`:  atomic, so exactly one holder
 * - waits up to `wait` ms (default 20s), then throws a `FileLockError` naming the holder (its pid and label)
 *   - `tell`:  called ONCE with the holder after `tellAfter` ms (default 5s) of waiting, so a caller can say who it waits
 *     for (`epic`'s page edits print it), instead of sitting silent
 * - or tries ONCE (`runOnce()`):  answers `"held"` when another holder has it, without waiting
 * - a lock older than `stale` ms (default 60s) is a crashed holder's, and is taken over
 * - a BLOCKING wait (`run()`) for a lock this same process holds (`runAsync()`'s holder, awaiting) throws at once:
 *   the thread it blocks is the one that would let go, so it could only time out, freezing the process meanwhile
 *   (epic `epic-engine` I463:  the epic hub stood still 20s at a time, and a tick on an epic page bounced)
 * - the lock file holds its holder:  `<pid> <label>` (`holder()`);  a holder whose process is gone is stale at once,
 *   whatever its age, so a long `stale` (a merge, a test run) never waits on a crashed one
 * - writers that don't lock (VS Code, an agent's edit tool) aren't stopped:
 *   the page server's `If-Match` check catches those
 * - From goals' `withLock()` (also copied into the old `plan-doc.js`).
 * - Its position:  node's own modules, util's two timing files and the server's types file only,
 *   so plain `node` loads it by its own name,
 *   `spell/server/FileLock` (an entry of its own in the kit's `exports`:  spell-epic's plain-node scripts).
 *   Before epic `coherence` P7 it imported the server's barrel, and those scripts wrote three copies of it,
 *   one of which two runs could both take.
 */
export class FileLock {
  /** file being guarded */
  readonly file: string

  /** the lock's own file, `<file>.lock` */
  readonly lockFile: string

  /** longest wait for the lock, ms */
  readonly wait: number

  /** age at which a lock is a dead holder's, ms */
  readonly stale: number

  /** what the lock file says about its holder, after its pid:  `epic merge seo` */
  readonly label: string

  /** told the holder once, after `tellAfter` ms of waiting */
  readonly tell: ((holder: FileLockHolder | undefined) => void) | undefined

  /** how long to wait before `tell`, ms */
  readonly tellAfter: number

  constructor(
    file: string,
    { wait = 20_000, stale = 60_000, label = "", tell, tellAfter = 5_000 }: FileLockProps = {}
  ) {
    this.file = file
    this.lockFile = `${file}.lock`
    this.wait = wait
    this.stale = stale
    this.label = label
    this.tell = tell
    this.tellAfter = tellAfter
  }

  /**
   * Who holds the lock now:  `{ pid, label, since }`;  `undefined` when nobody does.
   * - `pid` 0:  a holder that wrote nothing (an older writer)
   */
  holder(): FileLockHolder | undefined {
    const since = statSync(this.lockFile, { throwIfNoEntry: false })?.mtimeMs
    if (since === undefined) return undefined
    let text = ""
    try {
      text = readFileSync(this.lockFile, "utf8")
    } catch {
      // gone between the two reads:  nobody holds it
      return undefined
    }
    const [, pid = "0", label = ""] = /^(\d+) ?(.*)$/s.exec(text.trim()) ?? []
    return { pid: Number(pid), label, since: new Date(since) }
  }

  /** Run `fn` holding the lock on `file`, blocking while waiting. */
  static run<T>(file: string, fn: () => T, props?: FileLockProps): T {
    return new FileLock(file, props).run(fn)
  }

  /** Run async `fn` holding the lock on `file`, without blocking while waiting. */
  static runAsync<T>(file: string, fn: () => Promise<T>, props?: FileLockProps): Promise<T> {
    return new FileLock(file, props).runAsync(fn)
  }

  /**
   * Run `fn` holding the lock on `file` if it's free (or stale);  `"held"`, without running it, when it isn't.
   * - for work another run is doing already:  this run skips it, rather than waiting to do it again
   */
  static runOnce<T>(file: string, fn: () => T, props?: FileLockProps): T | typeof FileLock.HELD {
    return new FileLock(file, props).runOnce(fn)
  }

  /** What `runOnce()` answers when another holder has the lock. */
  static readonly HELD = "held"

  /** Run `fn` holding the lock if it's free (or stale);  `"held"`, without running it, when it isn't. */
  runOnce<T>(fn: () => T): T | typeof FileLock.HELD {
    // twice:  the first try only clears a stale lock
    if (!this.tryAcquire() && !this.tryAcquire()) return FileLock.HELD
    try {
      return fn()
    } finally {
      this.release()
    }
  }

  /** Run `fn` holding the lock;  BLOCKS the thread while waiting (`waitUntilSync()`), for sync scripts. */
  run<T>(fn: () => T): T {
    if (this.isHeldHere()) throw this.heldHere()
    // Takes it when free, looking every 0.1s;  gives up after `wait`
    if (!waitUntilSync(this.attempt(), { timeout: this.wait / 1000 })) throw this.timeout()
    try {
      return fn()
    } finally {
      this.release()
    }
  }

  /** Run async `fn` holding the lock;  waits with timers, so a server keeps serving meanwhile. */
  async runAsync<T>(fn: () => Promise<T>): Promise<T> {
    // Takes it when free, looking every 0.05s;  gives up after `wait`
    if (!(await waitUntil(this.attempt(), { timeout: this.wait / 1000, every: 0.05 }))) throw this.timeout()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }

  /**
   * Take the lock if it's free (or stale);  returns whether we hold it now.
   * - SIDE EFFECT:  removes a stale lock
   */
  tryAcquire(): boolean {
    try {
      const fd = openSync(this.lockFile, "wx")
      try {
        writeSync(fd, `${process.pid} ${this.label}`.trim())
      } finally {
        closeSync(fd)
      }
      HELD_HERE.add(this.lockFile)
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      const holder = this.holder()
      if (holder && this.isStale(holder)) rmSync(this.lockFile, { force: true })
      return false
    }
  }

  /** Is `holder` gone:  older than `stale`, or its process ended? */
  private isStale(holder: FileLockHolder): boolean {
    return Date.now() - holder.since.getTime() > this.stale || (holder.pid > 0 && !isAlive(holder.pid))
  }

  /** One try at the lock per call (`tryAcquire()`), telling `tell` the holder once `tellAfter` ms have gone by. */
  private attempt(): () => boolean {
    const started = Date.now()
    let told = !this.tell
    return () => {
      if (this.tryAcquire()) return true
      if (!told && Date.now() - started >= this.tellAfter) {
        told = true
        this.tell!(this.holder())
      }
      return false
    }
  }

  /** Let go of the lock. */
  release(): void {
    HELD_HERE.delete(this.lockFile)
    rmSync(this.lockFile, { force: true })
  }

  /** the error for a lock held too long, naming its holder when the lock file says */
  private timeout(): FileLockError {
    return new FileLockError(`${this.lockFile} held for ${this.wait / 1000}s${FileLock.byWhom(this.holder())}:  stuck?`)
  }

  /**
   * Does this process hold the lock now, and not so long that it's stale (`stale`, which `tryAcquire()` takes over)?
   * - so a blocking wait for it could only time out (`run()`)
   */
  private isHeldHere(): boolean {
    if (!HELD_HERE.has(this.lockFile)) return false
    const holder = this.holder()
    if (holder?.pid === process.pid && !this.isStale(holder)) return true
    // gone, taken over by another, or stale:  a wait may end
    HELD_HERE.delete(this.lockFile)
    return false
  }

  /** the error for a blocking wait on a lock this process holds itself (`run()`) */
  private heldHere(): FileLockError {
    return new FileLockError(
      `${this.lockFile} is held by this process (pid ${process.pid}), awaiting:  a blocking wait would freeze it;  ` +
        "use runAsync() or runOnce()"
    )
  }

  /** ` by pid 123 (epic add seo#I ...), since 14:36:20`;  `""` when nobody holds it, or it wrote nothing. */
  static byWhom(holder: FileLockHolder | undefined): string {
    if (!holder?.pid) return ""
    const label = holder.label ? ` (${holder.label})` : ""
    return ` by pid ${holder.pid}${label}, since ${holder.since.toTimeString().slice(0, 8)}`
  }
}

/** The lock files this process holds now:  a blocking wait for one of them throws at once (`run()`). */
const HELD_HERE = new Set<string>()

/** Whether process `pid` is still running on this machine. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM:  running, someone else's
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
}

/**
 * `new FileLock()` props.
 * - `wait`:  longest wait, ms
 * - `stale`:  age at which a lock is taken over, ms
 * - `label`:  what the lock file says about its holder, after its pid (`holder()`)
 * - `tell`:  called once with the holder after `tellAfter` ms (default 5s) of waiting
 */
export type FileLockProps = {
  wait?: number
  stale?: number
  label?: string
  tell?: (holder: FileLockHolder | undefined) => void
  tellAfter?: number
}

/** Who holds a lock (`FileLock.holder()`). */
export type FileLockHolder = {
  /** its process;  0 when it wrote none */
  pid: number
  /** what it said it was doing:  `epic merge seo`;  `""` for nothing */
  label: string
  /** when it took the lock */
  since: Date
}
