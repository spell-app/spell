import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readdirSync } from "node:fs"
import { basename, join } from "node:path"

import { waitUntilSync } from "spell/util/node/timing"
import { waitUntil } from "spell/util/timing"
import { SRV } from "spell/server"
import { EpicHome } from "spell/epic/config/EpicHome"

import { EXIT, EpicCommandError } from "./command.types"

/****************
 * ### `Turns`
 * Work that takes turns, one at a time on this machine (epic `epic-engine` T77):  `epic merge` and
 * `epic worktree merge-main` take the `merge` turn by themselves;  a full test run takes the `test` turn through
 * `epic turns run test -- yarn test`.
 * - Why (Owen, 2026-11-15:  "the main session should just respond to me"):  an epic's work goes to background agents,
 *   several at once in one worktree;  two merges at once trip over each other's files, and three full test runs at
 *   once drove the load to ~50 and failed tests on their 5s timeouts.
 * - Each kind is ONE lock file in the epic home, `turns/<kind>.lock` (`SRV.FileLock`), naming its holder:
 *   - waiting says once who has it (`epic merge seo, pid 123, since 13:05`), then waits:  `wait` long
 *   - a holder whose process is gone is taken over at once (`FileLock.holder()`);  else after `STALE`
 * - The same kind inside a turn runs straight away:  a turn's commands are told their kinds (`ENV`), so
 *   `epic turns run test -- yarn test` at the kit's root, whose folders' tests might queue again, never waits on itself.
 * - Kinds are open:  any lowercase word (`merge`, `test`, `build` ...).
 * - A single test file (`yarn vitest run <file>`) takes no turn:  it's light, and an agent runs one often.
 ****************/
export class Turns {
  /** Run `epic turns <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const split = args.indexOf("--")
    const [verb = "list", kind] = split === -1 ? args : args.slice(0, split)
    if (verb === "list") {
      const held = Turns.held()
      if (!held.length) console.log("no turns taken now")
      for (const { kind, holder } of held) console.log(`${kind}:  ${Turns.holderLine(holder)}`)
      return EXIT.OK
    }
    if (verb !== "run") throw new EpicCommandError(`unknown verb '${verb}':  epic turns run <kind> -- <command> | list`)
    const command = split === -1 ? [] : args.slice(split + 1)
    if (!kind || !command.length) throw new EpicCommandError("usage:  epic turns run <kind> -- <command> [args...]")
    return Turns.runCommand(kind, command)
  }

  /**
   * Run `fn` holding the `kind` turn;  returns what it returns.
   * - `label`:  what the lock says it's for, in another waiter's message
   * - `say`:  where the one waiting line goes (default stderr)
   * - throws `SRV.FileLockError` when the turn isn't free within `wait` ms
   */
  static take<T>(kind: string, label: string, fn: () => T, props: TakeProps = {}): T {
    if (Turns.inTurn(kind)) return fn()
    const lock = Turns.lockFor(kind, label)
    const wait = props.wait ?? Turns.WAIT
    if (!lock.tryAcquire()) {
      Turns.sayWaiting(kind, lock, props.say)
      if (!waitUntilSync(() => lock.tryAcquire(), { timeout: wait / 1000, every: 1 })) throw Turns.timeout(kind, wait)
    }
    return Turns.holding(kind, lock, fn)
  }

  /** `take()` for async `fn`:  waits with timers, so the process keeps running meanwhile. */
  static async takeAsync<T>(kind: string, label: string, fn: () => Promise<T>, props: TakeProps = {}): Promise<T> {
    if (Turns.inTurn(kind)) return fn()
    const lock = Turns.lockFor(kind, label)
    const wait = props.wait ?? Turns.WAIT
    if (!lock.tryAcquire()) {
      Turns.sayWaiting(kind, lock, props.say)
      if (!(await waitUntil(() => lock.tryAcquire(), { timeout: wait / 1000, every: 1 })))
        throw Turns.timeout(kind, wait)
    }
    process.env[Turns.ENV] = [...Turns.kindsHeld(), kind].join(",")
    try {
      return await fn()
    } finally {
      Turns.release(kind, lock)
    }
  }

  /**
   * Run `command` (its words) holding the `kind` turn, its output straight through;  resolves to its exit code.
   * - the turn's kinds are in its environment (`ENV`):  the same kind inside runs straight away
   */
  static runCommand(kind: string, command: string[], props: TakeProps = {}): Promise<number> {
    Turns.checkKind(kind)
    return Turns.takeAsync(
      kind,
      command.join(" "),
      () =>
        new Promise<number>((done) => {
          const child = spawn(command[0]!, command.slice(1), { stdio: "inherit", env: process.env })
          child.on("error", (error) => {
            console.error(`epic turns:  ${command[0]} won't start:  ${error.message}`)
            done(EXIT.ERRORS)
          })
          child.on("exit", (code, signal) => done(code ?? (signal ? EXIT.ERRORS : EXIT.OK)))
        }),
      props
    )
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

  /** A holder as a person reads it:  `epic merge seo, pid 123, since 13:05`. */
  static holderLine({ label, pid, since }: SRV.FileLockHolder): string {
    const time = since.toTimeString().slice(0, 5)
    return `${label || "someone"}${pid ? `, pid ${pid}` : ""}, since ${time}`
  }

  /** The turns' folder:  the epic home's `turns/`. */
  static folder(): string {
    return EpicHome.subfolder("turns")
  }

  /** Longest wait for a turn, ms:  30 minutes. */
  static readonly WAIT = 30 * 60_000

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

  /** The `kind` turn's lock, its folder made. */
  private static lockFor(kind: string, label: string): SRV.FileLock {
    Turns.checkKind(kind)
    mkdirSync(Turns.folder(), { recursive: true })
    return new SRV.FileLock(join(Turns.folder(), kind), { stale: Turns.STALE, label })
  }

  /** Run `fn` holding `lock`, `ENV` naming `kind` meanwhile. */
  private static holding<T>(kind: string, lock: SRV.FileLock, fn: () => T): T {
    process.env[Turns.ENV] = [...Turns.kindsHeld(), kind].join(",")
    try {
      return fn()
    } finally {
      Turns.release(kind, lock)
    }
  }

  /** Let go of `lock`, and take `kind` out of `ENV`. */
  private static release(kind: string, lock: SRV.FileLock): void {
    lock.release()
    const rest = Turns.kindsHeld().filter((it) => it !== kind)
    if (rest.length) process.env[Turns.ENV] = rest.join(",")
    else delete process.env[Turns.ENV]
  }

  /** Say once who has the turn, before waiting for it. */
  private static sayWaiting(kind: string, lock: SRV.FileLock, say = (line: string) => console.error(line)): void {
    const holder = lock.holder()
    say(`waiting for the ${kind} turn:  ${holder ? Turns.holderLine(holder) : "just taken"}`)
  }

  /** The error for a turn not free in time. */
  private static timeout(kind: string, wait: number): SRV.FileLockError {
    return new SRV.FileLockError(`epic turns:  the ${kind} turn wasn't free in ${Math.round(wait / 60_000)}m:  stuck?`)
  }

  /** Throws unless `kind` is a lowercase word. */
  private static checkKind(kind: string): void {
    if (!/^[a-z][a-z-]*$/.test(kind)) throw new EpicCommandError(`epic turns:  kind '${kind}' isn't a lowercase word`)
  }
}

/**
 * `Turns.take()` props.
 * - `wait`:  longest wait, ms (default `Turns.WAIT`)
 * - `say`:  where the one waiting line goes (default stderr)
 */
export type TakeProps = { wait?: number; say?: (line: string) => void }
