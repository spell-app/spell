import { spawn, spawnSync } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"

import { waitUntilSync } from "spell/util/node/timing"
import { after, waitUntil } from "spell/util/timing"
import { SRV } from "spell/server"
import { Processes } from "spell/server/Processes"
import { ClaudeHome } from "spell/epic/config/ClaudeHome"
import { EpicHome } from "spell/epic/config/EpicHome"

import { EXIT, EpicCommandError } from "./command.types"
import { StallWatch, type WatchProps } from "./StallWatch"

/****************
 * ### `Turns`
 * Work that takes turns, one at a time on this machine (epic `epic-engine` T77):  `epic merge` and
 * `epic worktree merge-main` take the `merge` turn by themselves;  a full test run takes the `test` turn through
 * `epic turns run test -- yarn test`.
 * - Why (Owen, 2026-11-15:  "the main session should just respond to me"):  an epic's work goes to background agents,
 *   several at once in one worktree;  two merges at once trip over each other's files, and three full test runs at
 *   once drove the load to ~50 and failed tests on their 5s timeouts.
 * - Each kind is ONE lock file in the epic home, `turns/<kind>.lock` (`SRV.FileLock`), naming its holder.
 * - FIRST COME, FIRST SERVED (epic `epic-engine` I313):  a waiter takes a TICKET, a file in `turns/<kind>.queue/`
 *   named by its time and pid;  the turn goes to the oldest live ticket, and a ticket whose process is gone is dropped.
 *   - Before I313 whoever looked first after the lock freed won, so an early waiter could lose to later ones.
 * - A holder is taken over at once when its process is gone, STOPPED (suspended) or a zombie (`holderState()`);
 *   a live one only once STALLED (below), never for how long it runs (J233, I400):  its waiters wait, and say so.
 * - HOW LONG IS USUAL:  every turn's run is written down (`turns/history.jsonl`);  usual is the median of its kind's
 *   last runs (`usual()`), else `DEFAULT_USUAL`.
 *   - past 3 times usual (`LONG`), `epic turns list` and its waiters say "longer than usual":  words only
 * - A waiter NEVER gives up on a live holder that isn't stalled, however long it runs;
 *   only a `wait` it's handed ends its wait (`TakeProps`).
 *   - I400:  a 5-15 minute `spell perf run` passed 6 times a usual ~30s test run, and its waiters gave up.
 *   - I313:  a fixed 30 minutes made T83's and T84's waits give up behind a kit-wide `yarn review`.
 * - The same kind inside a turn runs straight away:  a turn's commands are told their kinds (`ENV`), so
 *   `epic turns run test -- yarn test` at the kit's root, whose folders' tests might queue again, never waits on itself.
 * - Kinds are open:  any lowercase word (`merge`, `test`, `build` ...).
 * - A session may STOP ITS OWN runs (`stop()`, epic `epic-engine` T139:  a pause abandons its tests):
 *   - its own:  the processes under that session's `claude` process, its agents' included;  never another session's
 *   - NEVER a merge, nor a run with one inside it or around it:  a merge is left to finish
 * - A single test file (`yarn vitest run <file>`) takes no turn:  it's light, and an agent runs one often.
 * - A STALLED command is stopped, freeing the turn (`StallWatch`, epic `epic-engine` I384):  no output and next to no
 *   CPU over its whole process tree for the stall window (10 minutes;  `--stall <minutes>`, `SPELL_EPIC_TURN_STALL`,
 *   `0` off), one line saying where it was;  `epic turns list` says "stalled" for a holder past it.
 *   - Its output is piped through to watch it (colours kept when ours is a terminal:  `FORCE_COLOR`).
 *   - A holder still quiet a minute past its window (`STALL_MARGIN`:  its own watch failed to stop it)
 *     is taken over by its waiters, its tree stopped:  stalled is the only "stuck" for a live holder (I400).
 ****************/
export class Turns {
  /** Run `epic turns <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const split = args.indexOf("--")
    const [verb = "list", kind] = split === -1 ? args : args.slice(0, split)
    if (verb === "list") {
      for (const line of Turns.listLines()) console.log(line)
      return EXIT.OK
    }
    if (verb === "stop") return Turns.stopCommand(kind)
    if (verb !== "run")
      throw new EpicCommandError(`unknown verb '${verb}':  epic turns run <kind> -- <command> | stop <kind> | list`)
    const command = split === -1 ? [] : args.slice(split + 1)
    if (!kind || !command.length)
      throw new EpicCommandError("usage:  epic turns run <kind> [--stall <minutes>] -- <command> [args...]")
    const head = split === -1 ? args : args.slice(0, split)
    const stall = head.indexOf("--stall")
    if (stall === -1) return Turns.runCommand(kind, command)
    const minutes = Number(head[stall + 1])
    if (!Number.isFinite(minutes) || minutes < 0)
      throw new EpicCommandError(`epic turns:  --stall takes minutes (0:  off), not '${head[stall + 1] ?? ""}'`)
    return Turns.runCommand(kind, command, { stallMs: minutes * 60_000 })
  }

  /**
   * Run `fn` holding the `kind` turn;  returns what it returns.
   * - `label`:  what the lock says it's for, in another waiter's message
   * - waits in line (`TurnQueue`), saying who it waits for, and again when that changes
   * - waits while the holder lives and isn't stalled, however long;
   *   throws `SRV.FileLockError` after `props.wait` ms, only when that's given
   */
  static take<T>(kind: string, label: string, fn: () => T, props: TakeProps = {}): T {
    if (Turns.inTurn(kind)) return fn()
    const queue = new TurnQueue(kind, label, props)
    try {
      if (!queue.tryNow() && !waitUntilSync(() => queue.poll(), { timeout: queue.waitSeconds, every: 1 }))
        throw queue.timeout()
    } finally {
      queue.leave()
    }
    return Turns.holding(kind, queue, fn)
  }

  /** `take()` for async `fn`:  waits with timers, so the process keeps running meanwhile. */
  static async takeAsync<T>(kind: string, label: string, fn: () => Promise<T>, props: TakeProps = {}): Promise<T> {
    if (Turns.inTurn(kind)) return fn()
    const queue = new TurnQueue(kind, label, props)
    try {
      if (!queue.tryNow() && !(await waitUntil(() => queue.poll(), { timeout: queue.waitSeconds, every: 1 })))
        throw queue.timeout()
    } finally {
      queue.leave()
    }
    process.env[Turns.ENV] = [...Turns.kindsHeld(), kind].join(",")
    const started = Date.now()
    try {
      return await fn()
    } finally {
      Turns.release(kind, queue, started)
    }
  }

  /**
   * Run `command` (its words) holding the `kind` turn, its output straight through;  resolves to its exit code.
   * - the turn's kinds are in its environment (`ENV`):  the same kind inside runs straight away
   * - stalled (`StallWatch`):  its tree stopped, one line saying so, `EXIT.ERRORS`;  `props.stallMs` the window
   *   (default `stallWindow()`, `0` off), `props.watch` the watch's own (its tests')
   */
  static runCommand(kind: string, command: string[], props: RunProps = {}): Promise<number> {
    Turns.checkKind(kind)
    const label = command.join(" ")
    const stallMs = props.stallMs ?? Turns.stallWindow()
    return Turns.takeAsync(
      kind,
      label,
      () =>
        new Promise<number>((done) => {
          const env = { ...process.env }
          if (process.stdout.isTTY && env.FORCE_COLOR === undefined && env.NO_COLOR === undefined) env.FORCE_COLOR = "1"
          const child = spawn(command[0]!, command.slice(1), { stdio: ["inherit", "pipe", "pipe"], env })
          child.stdout?.pipe(process.stdout, { end: false })
          child.stderr?.pipe(process.stderr, { end: false })
          let stalled = false
          const watch = new StallWatch({ stallMs })
          const unwatch = stallMs
            ? watch.watch(child, {
                ...props.watch,
                busy: () => Turns.writeBusy(kind, Date.now(), stallMs),
                stalled: () => {
                  stalled = true
                  console.error(watch.stoppedLine(label))
                }
              })
            : () => {}
          if (stallMs) Turns.writeBusy(kind, Date.now(), stallMs)
          child.on("error", (error) => {
            unwatch()
            console.error(`epic turns:  ${command[0]} won't start:  ${error.message}`)
            done(EXIT.ERRORS)
          })
          child.on("exit", (code, signal) => {
            unwatch()
            rmSync(Turns.busyFile(kind), { force: true })
            const finish = () => {
              // a process it left running (a server) may hold the pipes:  they mustn't hold this one
              child.stdout?.destroy()
              child.stderr?.destroy()
              done(stalled ? EXIT.ERRORS : (code ?? (signal ? EXIT.ERRORS : EXIT.OK)))
            }
            // its last output first:  the pipes close just after it exits, unless something holds them
            const late = setTimeout(finish, 1_000)
            child.on("close", () => {
              clearTimeout(late)
              finish()
            })
          })
        }),
      props
    )
  }

  /**
   * The turn runs, held or waiting, of session `sessionId`:  those under its `claude` process.
   * - `parents`:  each process's parent (a test's to stub);  a session no process runs:  `[]`
   */
  static runsOf(
    sessionId: string | undefined,
    { live = ClaudeHome.liveSessions(), parents = Processes.parents() }: OwnRunsProps = {}
  ): OwnRun[] {
    const roots = live.filter((session) => session.sessionId === sessionId).map(({ pid }) => pid)
    if (!roots.length) return []
    const held = Turns.held().flatMap(({ kind, holder: { pid, label } }): OwnRun[] =>
      pid ? [{ kind, pid, label: label ?? "", waiting: false }] : []
    )
    const waiting = TurnQueue.kindsWaiting().flatMap((kind) =>
      TurnQueue.ticketsOf(kind).map(({ pid, label }): OwnRun => ({ kind, pid, label, waiting: true }))
    )
    return [...waiting, ...held].filter(({ pid }) => !isGone(pid) && roots.some((root) => isUnder(pid, root, parents)))
  }

  /**
   * Stop session `sessionId`'s own `kind` runs, waiters first, each with its whole process tree, and free its turn;
   * resolves to what it stopped and what it left.
   * - left:  a merge of that session's, and a run sharing a process tree with one:  a merge is never killed half way
   * - throws for the `merge` kind
   */
  static async stop(
    kind: string,
    sessionId: string | undefined,
    { graceMs = STOP_GRACE_MS, ...props }: OwnRunsProps & { graceMs?: number } = {}
  ): Promise<{ stopped: OwnRun[]; left: OwnRun[] }> {
    Turns.checkKind(kind)
    if (kind === MERGE) throw new EpicCommandError("epic turns stop:  a merge is never stopped:  let it finish")
    const parents = props.parents ?? Processes.parents()
    const own = Turns.runsOf(sessionId, { ...props, parents })
    const merges = own.filter((run) => run.kind === MERGE)
    const stopped = own.filter(
      (run) =>
        run.kind === kind && !merges.some(({ pid }) => isUnder(pid, run.pid, parents) || isUnder(run.pid, pid, parents))
    )
    if (stopped.length) {
      for (const { pid } of stopped) StallWatch.stop(pid, graceMs)
      // the SIGKILL comes at the grace's end:  stay for it
      await after(graceMs / 1000)
      await waitUntil(() => stopped.every(({ pid }) => Turns.holderState(pid) !== "running"), { timeout: 2 })
      const lock = new SRV.FileLock(join(Turns.folder(), kind))
      const holder = lock.holder()
      if (holder?.pid && stopped.some(({ pid }) => pid === holder.pid) && Turns.holderState(holder.pid) !== "running") {
        rmSync(lock.lockFile, { force: true })
        rmSync(Turns.busyFile(kind), { force: true })
      }
    }
    return { stopped, left: own.filter((run) => !stopped.includes(run)) }
  }

  /** `stop <kind>`:  this session's own runs of it stopped, and what's left said. */
  private static async stopCommand(kind: string | undefined): Promise<number> {
    if (!kind) throw new EpicCommandError("usage:  epic turns stop <kind>:  this session's own runs of it (test)")
    const me = process.env.CLAUDE_CODE_SESSION_ID
    if (!ClaudeHome.liveSessions().some((session) => session.sessionId === me))
      throw new EpicCommandError("epic turns stop:  can't tell which runs are this session's, so it stops none")
    const { stopped, left } = await Turns.stop(kind, me)
    for (const run of stopped) console.log(`stopped, abandoned:  ${runLine(run)}`)
    if (!stopped.length) console.log(`none of this session's ${kind} runs to stop`)
    for (const run of left) {
      const merge = run.kind === MERGE ? " -- let it finish, and stop no agent until it has" : ""
      console.log(`left running:  ${runLine(run)}${merge}`)
    }
    return EXIT.OK
  }

  /** The stall window, ms:  `SPELL_EPIC_TURN_STALL` (minutes;  `0` off), else `StallWatch.DEFAULT_MS`. */
  static stallWindow(): number {
    const minutes = Number(process.env[StallWatch.ENV])
    return process.env[StallWatch.ENV] && Number.isFinite(minutes) && minutes >= 0
      ? minutes * 60_000
      : StallWatch.DEFAULT_MS
  }

  /** The turns taken now, by kind:  `{ kind, holder }` each, oldest first. */
  static held(): { kind: string; holder: SRV.FileLockHolder }[] {
    const folder = Turns.folder()
    if (!existsSync(folder)) return []
    return readdirSync(folder)
      .filter((name) => name.endsWith(".lock"))
      .flatMap((name) => {
        const kind = basename(name, ".lock")
        const holder = new SRV.FileLock(join(folder, kind)).holder()
        return holder ? [{ kind, holder }] : []
      })
      .sort((a, b) => a.holder.since.getTime() - b.holder.since.getTime())
  }

  /**
   * What `epic turns list` prints:  each turn's holder, how long, whether that's longer than usual, then its queue.
   * - `test:  yarn review, pid 123, for 34m -- longer than usual (12m)`
   * - `  waiting:  1. epic merge seo, pid 456, for 3m`
   */
  static listLines(now = Date.now()): string[] {
    const held = Turns.held()
    const kinds = new Set([...held.map((it) => it.kind), ...TurnQueue.kindsWaiting()])
    if (!kinds.size) return ["no turns taken now"]
    const lines: string[] = []
    for (const kind of [...kinds].sort()) {
      const holder = held.find((it) => it.kind === kind)?.holder
      lines.push(`${kind}:  ${holder ? Turns.holderLine(holder, kind, now) : "free"}`)
      TurnQueue.ticketsOf(kind).forEach((ticket, index) =>
        lines.push(
          `  waiting:  ${index + 1}. ${ticket.label || "someone"}, pid ${ticket.pid}, for ${minutes(now - ticket.at)}`
        )
      )
    }
    return lines
  }

  /**
   * A holder as a person reads it:  `epic merge seo, pid 123, since 13:05`;  with its `kind`, how long it's held, and
   * "longer than usual" past `LONG` times its kind's usual run.
   */
  static holderLine({ label, pid, since }: SRV.FileLockHolder, kind?: string, now = Date.now()): string {
    const who = `${label || "someone"}${pid ? `, pid ${pid}` : ""}`
    if (!kind) return `${who}, since ${since.toTimeString().slice(0, 5)}`
    const held = now - since.getTime()
    const usual = Turns.usual(kind)
    const long = held > usual * Turns.LONG ? ` -- longer than usual (${minutes(usual)})` : ""
    const quiet = pid ? Turns.quietFor(kind, pid, now) : undefined
    const stalled = quiet === undefined ? "" : ` -- stalled (no output or CPU for ${minutes(quiet)})`
    return `${who}, for ${minutes(held)}${long}${stalled}`
  }

  /**
   * How long a `kind` turn's run usually takes, ms:  the median of its last `HISTORY` runs (`history.jsonl`),
   * else `DEFAULT_USUAL`'s.
   * - runs under 10s don't count:  a quick merge says nothing about a full test run's
   */
  static usual(kind: string): number {
    const runs = Turns.history()
      .filter((it) => it.kind === kind && it.ms >= 10_000)
      .slice(-Turns.HISTORY)
      .map((it) => it.ms)
      .sort((a, b) => a - b)
    if (runs.length < 3) return Turns.DEFAULT_USUAL[kind] ?? Turns.DEFAULT_USUAL.other!
    return runs[Math.floor(runs.length / 2)]!
  }

  /** The runs written down, oldest first:  `{ kind, label, ms, at }` each. */
  static history(): TurnRun[] {
    const file = join(Turns.folder(), "history.jsonl")
    if (!existsSync(file)) return []
    return readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line) => {
        try {
          return line ? [JSON.parse(line) as TurnRun] : []
        } catch {
          return []
        }
      })
  }

  /**
   * What a turn's holder process is doing:  `"running"`, `"stopped"` (suspended, `kill -STOP`, Ctrl-Z), `"zombie"`,
   * or `"gone"`.
   * - `ps`'s state letter:  `T` stopped, `Z` zombie
   * - NEVER throws:  `ps` failing reads as running
   */
  static holderState(pid: number): HolderState {
    if (pid <= 0) return "running"
    if (isGone(pid)) return "gone"
    const ps = spawnSync("ps", ["-o", "stat=", "-p", String(pid)], { encoding: "utf8" })
    const state = ps.stdout?.trim() ?? ""
    if (!state) return ps.status === 0 ? "running" : "gone"
    if (state.startsWith("Z")) return "zombie"
    if (state.startsWith("T")) return "stopped"
    return "running"
  }

  /**
   * How long `kind`'s holder `pid` has been quiet, ms, once past its stall window;  else `undefined`.
   * - from `<kind>.busy`, which the holder's watch rewrites while it's busy:  `<pid> <last busy ms> <stall ms>`
   */
  static quietFor(kind: string, pid: number, now = Date.now()): number | undefined {
    let words: string[]
    try {
      words = readFileSync(Turns.busyFile(kind), "utf8").trim().split(/\s+/)
    } catch {
      return undefined
    }
    const [holder, busy, stallMs] = words.map(Number)
    if (holder !== pid || !busy || !stallMs) return undefined
    return now - busy >= stallMs ? now - busy : undefined
  }

  /** The turns' folder:  the epic home's `turns/`. */
  static folder(): string {
    return EpicHome.subfolder("turns")
  }

  /** A run past this many times usual is "longer than usual". */
  static readonly LONG = 3

  /**
   * How far past its stall window a quiet holder is taken over by a waiter, ms:  a minute.
   * - its own watch stops it within a look (15s at most) and the grace (10s):  past this, that watch is hung too
   */
  static readonly STALL_MARGIN = 60_000

  /**
   * Usual run times before 3 are written down, ms, by kind:  a guess on the long side, replaced by `history.jsonl`'s
   * median as turns end (I313).
   * - `test`:  a folder's full run;  a kit-wide `yarn review` runs far longer, and is what held the turn 30+ minutes
   * - `merge`:  `epic merge`, merge-main and the page server's restart
   */
  static readonly DEFAULT_USUAL: Record<string, number> = { test: 10 * 60_000, merge: 2 * 60_000, other: 10 * 60_000 }

  /** How many of a kind's last runs make its usual. */
  static readonly HISTORY = 20

  /** Age at which a turn whose holder still runs is taken over anyway, ms:  6 hours, a hung one. */
  static readonly STALE = 6 * 3_600_000

  /** The environment variable naming the kinds of turn this process holds, comma-separated. */
  static readonly ENV = "SPELL_EPIC_TURNS"

  ////////////////
  // ## Helpers
  ////////////////

  /** Whether this process (or the turn that started it) holds the `kind` turn already. */
  private static inTurn(kind: string): boolean {
    return Turns.kindsHeld().includes(kind)
  }

  /** The kinds this process holds, from `ENV`. */
  private static kindsHeld(): string[] {
    return (process.env[Turns.ENV] ?? "").split(",").filter(Boolean)
  }

  /** Run `fn` holding `queue`'s lock, `ENV` naming `kind` meanwhile. */
  private static holding<T>(kind: string, queue: TurnQueue, fn: () => T): T {
    process.env[Turns.ENV] = [...Turns.kindsHeld(), kind].join(",")
    const started = Date.now()
    try {
      return fn()
    } finally {
      Turns.release(kind, queue, started)
    }
  }

  /** Let go of `queue`'s lock, write the run down, and take `kind` out of `ENV`. */
  private static release(kind: string, queue: TurnQueue, started: number): void {
    queue.lock.release()
    Turns.writeDown({ kind, label: queue.label, ms: Date.now() - started, at: new Date().toISOString() })
    const rest = Turns.kindsHeld().filter((it) => it !== kind)
    if (rest.length) process.env[Turns.ENV] = rest.join(",")
    else delete process.env[Turns.ENV]
  }

  /** The file a holder's watch keeps its last busy time in. */
  private static busyFile(kind: string): string {
    return join(Turns.folder(), `${kind}.busy`)
  }

  /** Write down that this process's `kind` command was busy at `at`.  NEVER throws. */
  private static writeBusy(kind: string, at: number, stallMs: number): void {
    try {
      writeFileSync(Turns.busyFile(kind), `${process.pid} ${at} ${stallMs}`)
    } catch {
      // best effort:  only `epic turns list` reads it
    }
  }

  /** Add `run` to `history.jsonl`, keeping its last 200 lines.  NEVER throws. */
  private static writeDown(run: TurnRun): void {
    try {
      const file = join(Turns.folder(), "history.jsonl")
      appendFileSync(file, `${JSON.stringify(run)}\n`)
      const lines = readFileSync(file, "utf8").split("\n").filter(Boolean)
      if (lines.length > 200) writeFileSync(file, `${lines.slice(-200).join("\n")}\n`)
    } catch (ignored) {
      console.error(`epic turns:  couldn't write the run down:  ${(ignored as Error).message}`)
    }
  }

  /** Throws unless `kind` is a lowercase word. */
  static checkKind(kind: string): void {
    if (!/^[a-z][a-z-]*$/.test(kind)) throw new EpicCommandError(`epic turns:  kind '${kind}' isn't a lowercase word`)
  }
}

/** One of a session's turn runs (`Turns.runsOf()`):  held, or waiting for it. */
export type OwnRun = { kind: string; pid: number; label: string; waiting: boolean }

/** `Turns.runsOf()`'s options:  the running sessions and each process's parent, a test's to stub. */
export type OwnRunsProps = { live?: { sessionId: string; pid: number }[]; parents?: Map<number, number> }

/** What `Turns.holderState()` answers. */
export type HolderState = "running" | "stopped" | "zombie" | "gone"

/** One turn's run, as `history.jsonl` keeps it. */
export type TurnRun = { kind: string; label: string; ms: number; at: string }

/**
 * `Turns.take()` props.
 * - `wait`:  longest wait, ms;  by default none:  it waits while the holder lives and isn't stalled, however long
 * - `say`:  where the waiting lines go (default stderr)
 */
export type TakeProps = { wait?: number; say?: (line: string) => void }

/**
 * `Turns.runCommand()` props:  `take()`'s, plus
 * - `stallMs`:  the stall window, ms (`0` off;  default `Turns.stallWindow()`)
 * - `watch`:  the stall watch's look interval, grace and CPU reader (its tests')
 */
export type RunProps = TakeProps & {
  stallMs?: number
  watch?: Pick<WatchProps, "every" | "graceMs" | "cpu">
}

/**
 * ### `TurnQueue`
 * One waiter's place in a kind's line (epic `epic-engine` I313):  its ticket, the lock it waits for, and what it says.
 * - a ticket:  `turns/<kind>.queue/<ms>-<pid>-<n>`, its text the waiter's label;  removed as it takes the turn or
 *   gives up (`leave()`), and dropped by the others once its process is gone
 * - the turn goes to the oldest live ticket (`isFirst()`), never to whoever looks first
 */
class TurnQueue {
  /** the kind's lock */
  readonly lock: SRV.FileLock

  /** what the lock says the turn is for */
  readonly label: string

  /** how long to wait at most, seconds:  `props.wait`, else for ever */
  readonly waitSeconds: number

  private readonly kind: string
  private readonly say: (line: string) => void
  private ticket: string | undefined
  private toldHolder = ""
  private toldLong = false

  constructor(kind: string, label: string, props: TakeProps) {
    Turns.checkKind(kind)
    mkdirSync(Turns.folder(), { recursive: true })
    this.kind = kind
    this.label = label
    this.lock = new SRV.FileLock(join(Turns.folder(), kind), { stale: Turns.STALE, label })
    this.waitSeconds = props.wait === undefined ? Number.POSITIVE_INFINITY : props.wait / 1000
    this.say = props.say ?? ((line) => console.error(line))
  }

  /** Take the turn now if it's free and nobody waits before us;  else join the line and say who has it. */
  tryNow(): boolean {
    this.takeOverDead()
    if (!TurnQueue.ticketsOf(this.kind).length && this.lock.tryAcquire()) return true
    this.join()
    this.tell()
    return false
  }

  /**
   * One look:  the turn when our ticket is first and the lock is free;  `false` to look again.
   * - NEVER gives up on a live holder, however long it's held (I400):  only a dead or stalled one is taken over
   */
  poll(): boolean {
    this.takeOverDead()
    if (this.isFirst() && this.lock.tryAcquire()) return true
    this.tell()
    return false
  }

  /** Leave the line:  our ticket removed.  NEVER throws. */
  leave(): void {
    if (this.ticket) rmSync(this.ticket, { force: true })
    this.ticket = undefined
  }

  /** The error for giving up:  `wait` run out. */
  timeout(): SRV.FileLockError {
    const holder = this.lock.holder()
    const who = holder ? Turns.holderLine(holder, this.kind) : "nobody"
    const wait = Math.round((this.waitSeconds * 1000) / 60_000)
    return new SRV.FileLockError(`epic turns:  the ${this.kind} turn is not free in ${wait}m:  held by ${who}`)
  }

  /** The kinds with anyone waiting. */
  static kindsWaiting(): string[] {
    const folder = Turns.folder()
    if (!existsSync(folder)) return []
    return readdirSync(folder)
      .filter((name) => name.endsWith(".queue"))
      .map((name) => basename(name, ".queue"))
      .filter((kind) => TurnQueue.ticketsOf(kind).length)
  }

  /** A kind's live tickets, oldest first;  SIDE EFFECT:  a ticket whose process is gone is removed. */
  static ticketsOf(kind: string): Ticket[] {
    const folder = join(Turns.folder(), `${kind}.queue`)
    if (!existsSync(folder)) return []
    return readdirSync(folder)
      .flatMap((name) => {
        const [at = "", pid = ""] = name.split("-")
        const file = join(folder, name)
        if (!/^\d+$/.test(at) || !/^\d+$/.test(pid)) return []
        if (isGone(Number(pid))) {
          rmSync(file, { force: true })
          return []
        }
        let label = ""
        try {
          label = readFileSync(file, "utf8")
        } catch {
          return []
        }
        return [{ file, at: Number(at), pid: Number(pid), label }]
      })
      .sort((a, b) => a.at - b.at || a.file.localeCompare(b.file))
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Take our ticket. */
  private join(): void {
    if (this.ticket) return
    const folder = join(Turns.folder(), `${this.kind}.queue`)
    mkdirSync(folder, { recursive: true })
    this.ticket = join(folder, `${Date.now()}-${process.pid}-${TurnQueue.count++}`)
    writeFileSync(this.ticket, this.label)
  }

  /** Whether our ticket is the oldest live one. */
  private isFirst(): boolean {
    return TurnQueue.ticketsOf(this.kind)[0]?.file === this.ticket
  }

  /**
   * A holder whose process is gone, stopped or a zombie:  its lock removed at once, saying so.
   * - and a live one still quiet `STALL_MARGIN` past its stall window (`Turns.quietFor()`):
   *   its tree stopped too, as its own watch would have
   */
  private takeOverDead(): void {
    const holder = this.lock.holder()
    if (!holder?.pid || holder.pid === process.pid) return
    const state = Turns.holderState(holder.pid)
    // quiet past the window as of a margin ago:  past the window plus the margin now
    const quiet =
      state === "running" ? Turns.quietFor(this.kind, holder.pid, Date.now() - Turns.STALL_MARGIN) : undefined
    if (state === "running" && quiet === undefined) return
    const why = quiet === undefined ? state : `stalled (no output or CPU for ${minutes(quiet + Turns.STALL_MARGIN)})`
    this.say(`epic turns:  the ${this.kind} turn's holder is ${why}:  taking it over (${Turns.holderLine(holder)})`)
    if (quiet !== undefined) StallWatch.stop(holder.pid)
    rmSync(this.lock.lockFile, { force: true })
  }

  /** Say who has the turn and our place, when that changes;  once more when it runs longer than usual. */
  private tell(): void {
    const holder = this.lock.holder()
    const who = holder ? Turns.holderLine(holder, this.kind) : "just taken"
    const place = TurnQueue.ticketsOf(this.kind).findIndex((it) => it.file === this.ticket) + 1
    const key = `${holder?.pid}:${holder?.since.getTime()}:${place}`
    const long = who.includes("longer than usual")
    if (key === this.toldHolder && (!long || this.toldLong)) return
    this.toldHolder = key
    this.toldLong ||= long
    this.say(`waiting for the ${this.kind} turn${place > 1 ? ` (${place} in line)` : ""}:  ${who}`)
  }

  /** Tickets made by this process so far:  two waiters in one process get two tickets. */
  private static count = 0
}

/** A waiter's ticket (`TurnQueue.ticketsOf()`). */
type Ticket = { file: string; at: number; pid: number; label: string }

/** The kind of turn a merge takes:  never stopped. */
const MERGE = "merge"

/** SIGTERM to SIGKILL for a run its own session abandons:  shorter than a stall's, a pause is in a hurry. */
const STOP_GRACE_MS = 3_000

/** Whether process `pid` is `root` or runs under it, by `parents`. */
function isUnder(pid: number, root: number, parents: Map<number, number>): boolean {
  const seen = new Set<number>()
  for (let at = pid; at > 1 && !seen.has(at); at = parents.get(at) ?? 0) {
    if (at === root) return true
    seen.add(at)
  }
  return false
}

/** A session's own run as a person reads it:  `test:  yarn test, pid 123 (waiting)`. */
function runLine({ kind, label, pid, waiting }: OwnRun): string {
  return `${kind}:  ${label || "someone"}, pid ${pid}${waiting ? " (waiting)" : ""}`
}

/** Whether process `pid` has ended:  `kill(pid, 0)` alone, cheap enough for every look at the line. */
function isGone(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return false
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "EPERM"
  }
}

/** `12m`, `1h 05m`, `45s`. */
function minutes(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  if (total < 60) return `${total}s`
  const mins = Math.round(total / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`
}
