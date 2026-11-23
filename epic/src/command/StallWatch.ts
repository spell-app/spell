import { spawnSync, type ChildProcess } from "node:child_process"

/****************
 * ### `StallWatch`
 * Notices when a command run in its turn (`Turns.runCommand()`) has STALLED:  it printed nothing, and its whole
 * process tree used next to no CPU, for the stall window (epic `epic-engine` I384);
 * or it printed nothing at all, busy or not, for `SILENT_TIMES` the window (I422).
 * - Why:  twice on 2026-11-20 a full `yarn test` hung inside a browser test run, headless Chromium still alive, at 0%
 *   CPU and silent, for ~40 minutes;  it held the machine's test turn, and every other session's runs queued behind it
 *   until someone killed it by hand.
 * - A stalled command is stopped (`stop()`):  SIGTERM to its whole tree, SIGKILL after `GRACE_MS`;  the turn frees as
 *   it exits.
 * - Busy is EITHER:  any output, or the tree using more than `BUSY_SHARE` of one core between two looks.
 *   - So a long quiet step that works (a build, a type check) is never taken for stalled.
 *   - Unless it stays silent past the hard limit, `SILENT_TIMES` the window (30 minutes):  a page stuck in a loop
 *     keeps its browser busy for ever, and prints nothing (I422:  Spell UI's `motion` tests, a browser at ~112% CPU).
 * - The rule is pure (`output()`, `sample()`), handed the clock:  its tests need no processes.
 *   `watch()` drives it from a child's output and `ps`.
 * - NEVER throws:  a tree it can't measure (no `ps`, Windows) counts as busy.
 ****************/
export class StallWatch {
  /** how long without output or CPU counts as stalled, ms */
  readonly stallMs: number

  /** how long without output counts as stalled however busy, ms:  `SILENT_TIMES` the window */
  readonly silentMs: number

  /** the last line printed, ANSI colours taken out */
  lastLine = ""

  /** the last Vitest project its output named (`|browser (chromium)|`), if any */
  lastProject = ""

  private readonly now: () => number
  private lastBusy: number
  private lastOutput: number
  private lastCpu: number | undefined
  private lastLook: number
  private partial = ""

  constructor({ stallMs, now = Date.now }: { stallMs: number; now?: () => number }) {
    this.stallMs = stallMs
    this.silentMs = stallMs * SILENT_TIMES
    this.now = now
    this.lastBusy = this.lastLook = this.lastOutput = now()
  }

  /** Output from the command:  it's busy;  keeps its last line, and the last project it named. */
  output(text: string): void {
    this.lastBusy = this.lastOutput = this.now()
    const lines = (this.partial + text).split(/\r?\n|\r/)
    this.partial = lines.pop() ?? ""
    for (const line of [...lines, this.partial]) {
      const plain = line.replace(ANSI, "").trim()
      if (!plain) continue
      this.lastLine = plain
      const project = PROJECT.exec(plain)?.[1]
      if (project) this.lastProject = project.trim()
    }
  }

  /**
   * One look at the tree's CPU, seconds used so far by every process in it (`undefined`:  can't tell, so busy);
   * `true` once it has stalled.
   */
  sample(cpuSeconds: number | undefined): boolean {
    const now = this.now()
    const elapsed = now - this.lastLook
    const used = cpuSeconds === undefined || this.lastCpu === undefined ? undefined : cpuSeconds - this.lastCpu
    // a process leaving the tree lowers the sum:  that's change, not idleness
    if (cpuSeconds === undefined || (used !== undefined && (used * 1000 > elapsed * BUSY_SHARE || used < 0)))
      this.lastBusy = now
    this.lastCpu = cpuSeconds
    this.lastLook = now
    return this.idleMs >= this.stallMs || this.silentFor >= this.silentMs
  }

  /** How long since it was last busy, ms. */
  get idleMs(): number {
    return this.now() - this.lastBusy
  }

  /** How long since it last printed anything, ms. */
  get silentFor(): number {
    return this.now() - this.lastOutput
  }

  /** The line said once it's stopped:  how long, where it was. */
  stoppedLine(command: string): string {
    const where = [
      this.lastProject && `in project ${this.lastProject}`,
      this.lastLine ? `last output:  "${this.lastLine.slice(0, 200)}"` : "no output at all"
    ]
      .filter(Boolean)
      .join(";  ")
    const why =
      this.idleMs >= this.stallMs
        ? `no output and no CPU for ${quietWords(this.idleMs)}`
        : `no output for ${quietWords(this.silentFor)}, though busy`
    return `epic turns:  "${command}" stalled -- ${why};  ` + `stopped it and freed the turn (${where})`
  }

  /**
   * Watch `child`'s output and tree, every `every` ms;  stalled, stop its tree and call `stalled()`.
   * - `cpu`:  the tree's CPU seconds (default `treeCpu()`, from `ps`)
   * - `busy()`:  called on each look it's busy (`Turns` writes it down, for `epic turns list`)
   * - returns the function that stops watching
   */
  watch(child: ChildProcess, props: WatchProps): () => void {
    const { every = Math.min(LOOK_MS, Math.max(1_000, this.stallMs / 4)), cpu = treeCpu, stalled, busy } = props
    for (const stream of [child.stdout, child.stderr]) stream?.on("data", (data: Buffer) => this.output(String(data)))
    let stopped = false
    const timer = setInterval(() => {
      if (stopped || child.pid === undefined) return
      if (!this.sample(cpu(child.pid))) {
        if (this.idleMs < every) busy?.()
        return
      }
      stopped = true
      clearInterval(timer)
      StallWatch.stop(child.pid, props.graceMs ?? GRACE_MS)
      stalled()
    }, every)
    timer.unref()
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }

  /** Stop `pid` and every process under it:  SIGTERM, then SIGKILL after `graceMs` to what's left.  NEVER throws. */
  static stop(pid: number, graceMs = GRACE_MS): void {
    const tree = treeOf(pid)
    for (const it of tree) signal(it, "SIGTERM")
    // not unref'd:  the turn's process stays up the grace, so the SIGKILL is sent
    setTimeout(() => {
      for (const it of tree) signal(it, "SIGKILL")
    }, graceMs)
  }

  /** The stall window when nobody says, ms:  10 minutes, longer than any quiet step of a working run. */
  static readonly DEFAULT_MS = 10 * 60_000

  /** The environment variable that sets the stall window, in minutes;  `0` turns the watch off. */
  static readonly ENV = "SPELL_EPIC_TURN_STALL"
}

/**
 * `StallWatch.watch()` props.
 * - `stalled()`:  called once, after the tree was told to stop
 * - `every`:  ms between looks (default `LOOK_MS`, a quarter of a short window);  `graceMs`:  SIGTERM to SIGKILL (default `GRACE_MS`)
 */
export type WatchProps = {
  stalled: () => void
  busy?: () => void
  every?: number
  graceMs?: number
  cpu?: (pid: number) => number | undefined
}

/** How many stall windows of silence stop a command however busy it is:  3 (30 minutes by default). */
const SILENT_TIMES = 3

/** A look's CPU over this share of one core is busy:  2%, over a hung tree's idle timers. */
const BUSY_SHARE = 0.02

/** ms between looks at the tree. */
const LOOK_MS = 15_000

/** ms from SIGTERM to SIGKILL. */
const GRACE_MS = 10_000

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g // oxlint-disable-line no-control-regex -- ANSI escapes are control characters

/** A Vitest line's project:  ` ✓ |browser (chromium)| tests/x.test.ts`. */
const PROJECT = /\|([^|]{1,60})\|/

/** Every process in `pid`'s tree, `pid` first:  `ps`'s `pid ppid time` rows. */
function treeOf(pid: number): number[] {
  return [...treeRows(pid).keys()]
}

/** The tree's CPU seconds so far, summed;  `undefined` when `ps` can't say. */
export function treeCpu(pid: number): number | undefined {
  const rows = treeRows(pid)
  if (!rows.size) return undefined
  return [...rows.values()].reduce((sum, seconds) => sum + seconds, 0)
}

/** `pid` and its descendants, each with its CPU seconds;  empty when `ps` fails. */
function treeRows(pid: number): Map<number, number> {
  const tree = new Map<number, number>()
  if (process.platform === "win32") return tree
  const ps = spawnSync("ps", ["-axo", "pid=,ppid=,time="], { encoding: "utf8" })
  if (ps.status !== 0 || !ps.stdout) return tree
  const children = new Map<number, number[]>()
  const cpu = new Map<number, number>()
  for (const line of ps.stdout.split("\n")) {
    const [child, parent, time] = line.trim().split(/\s+/)
    if (!child || !parent || !time) continue
    cpu.set(Number(child), cpuSeconds(time))
    children.set(Number(parent), [...(children.get(Number(parent)) ?? []), Number(child)])
  }
  if (!cpu.has(pid)) return tree
  const queue = [pid]
  while (queue.length) {
    const next = queue.shift()!
    if (tree.has(next)) continue
    tree.set(next, cpu.get(next) ?? 0)
    queue.push(...(children.get(next) ?? []))
  }
  return tree
}

/** `ps`'s `time`:  `[dd-][hh:]mm:ss[.cc]`, as seconds. */
export function cpuSeconds(time: string): number {
  const [days, clock] = time.includes("-") ? time.split("-") : ["0", time]
  const seconds = Number(days) * 86_400 + (clock ?? "").split(":").reduce((sum, part) => sum * 60 + Number(part), 0)
  return Number.isFinite(seconds) ? seconds : 0
}

/** `12m`, or `45s` under a minute. */
function quietWords(ms: number): string {
  return ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`
}

/** Send `name` to `pid`, if it's still there. */
function signal(pid: number, name: NodeJS.Signals): void {
  try {
    process.kill(pid, name)
  } catch {
    // gone already
  }
}
