/**
 * Tests of `Turns`:  one holder of each kind at a time on the machine, the same kind inside a turn running straight
 * away, a waiter told who has it, a command's exit code.  In a scratch epic home.
 */
import { type ChildProcess, spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { Turns } from "spell/epic/command/Turns"

const HOME = mkdtempSync(join(tmpdir(), "turns-"))
const before = process.env.SPELL_EPIC_HOME
// a run inside a turn (`epic turns run test -- yarn test`) hands its tests the turn's kinds:  not these tests'
const turnsBefore = process.env[Turns.ENV]
beforeAll(() => {
  process.env.SPELL_EPIC_HOME = HOME
  delete process.env[Turns.ENV]
})
afterEach(() => {
  delete process.env[Turns.ENV]
})
afterAll(() => {
  if (before === undefined) delete process.env.SPELL_EPIC_HOME
  else process.env.SPELL_EPIC_HOME = before
  if (turnsBefore !== undefined) process.env[Turns.ENV] = turnsBefore
  rmSync(HOME, { recursive: true, force: true })
})

describe("Turns", () => {
  test("take():  holds the turn while `fn` runs, names it in `ENV`, and lets go after", () => {
    const seen = Turns.take("merge", "epic merge seo", () => ({ held: Turns.held(), env: process.env[Turns.ENV] }))
    expect(seen.held).toMatchObject([{ kind: "merge", holder: { pid: process.pid, label: "epic merge seo" } }])
    expect(seen.env).toBe("merge")
    expect(Turns.held()).toEqual([])
    expect(process.env[Turns.ENV]).toBeUndefined()
  })

  test("take():  the same kind inside a turn runs straight away;  another kind takes its own", () => {
    const inner = Turns.take("test", "outer", () =>
      Turns.take("test", "inner", () => Turns.take("merge", "merge inside", () => Turns.held().map((it) => it.kind)))
    )
    expect(inner.sort()).toEqual(["merge", "test"])
  })

  test("take():  waits while another process holds the turn, saying who once;  gives up after `wait`", async () => {
    const holder = spawn(
      process.execPath,
      [
        "-e",
        `const { closeSync, openSync, writeSync, rmSync, mkdirSync } = require("node:fs");
         mkdirSync(${JSON.stringify(join(HOME, "turns"))}, { recursive: true });
         const file = ${JSON.stringify(join(HOME, "turns", "test.lock"))};
         const fd = openSync(file, "wx"); writeSync(fd, process.pid + " yarn test"); closeSync(fd);
         setTimeout(() => { rmSync(file); process.exit(0) }, 1500)`
      ],
      { stdio: "ignore" }
    )
    const exited = new Promise((done) => holder.on("exit", done))
    await new Promise((done) => setTimeout(done, 400))
    const said: string[] = []
    expect(() => Turns.take("test", "mine", () => "ran", { wait: 200, say: (line) => said.push(line) })).toThrow(
      /not free in/
    )
    expect(said[0]).toMatch(/^waiting for the test turn:  yarn test, pid \d+, for \d+s$/)
    const ran = await Turns.takeAsync("test", "mine", async () => "ran", { wait: 10_000, say: () => {} })
    expect(ran).toBe("ran")
    await exited
  })

  test("runCommand():  the command's exit code;  its environment names the turn", async () => {
    expect(await Turns.runCommand("test", [process.execPath, "-e", "process.exit(3)"])).toBe(3)
    const env = `process.exit(process.env.${Turns.ENV} === "test" ? 0 : 5)`
    expect(await Turns.runCommand("test", [process.execPath, "-e", env])).toBe(0)
  })

  test("run():  a bad kind or no command is a usage error", async () => {
    await expect(new Turns().run(["run", "Bad", "--", "true"])).rejects.toThrow(/lowercase word/)
    await expect(new Turns().run(["run", "test"])).rejects.toThrow(/usage/)
  })

  ////////////////
  // ## The line (I313)
  ////////////////

  /** A lock file held by `pid`, `ago` ms old. */
  function lockHeldBy(kind: string, pid: number, label: string, ago = 0): void {
    mkdirSync(join(HOME, "turns"), { recursive: true })
    const file = join(HOME, "turns", `${kind}.lock`)
    writeFileSync(file, `${pid} ${label}`)
    if (ago) utimesSync(file, new Date(Date.now() - ago), new Date(Date.now() - ago))
  }

  /** A ticket in `kind`'s line, for `pid`, taken `ago` ms back. */
  function ticketFor(kind: string, pid: number, label: string, ago: number): string {
    const folder = join(HOME, "turns", `${kind}.queue`)
    mkdirSync(folder, { recursive: true })
    const file = join(folder, `${Date.now() - ago}-${pid}-0`)
    writeFileSync(file, label)
    return file
  }

  /** A process that sleeps until killed:  a live pid that isn't ours. */
  function sleeper(): ChildProcess {
    return spawn(process.execPath, ["-e", "setTimeout(() => {}, 60_000)"], { stdio: "ignore" })
  }

  test("first come, first served:  an older live ticket goes first, even with the lock free", async () => {
    const other = sleeper()
    const ticket = ticketFor("order", other.pid!, "earlier waiter", 5_000)
    const said: string[] = []
    // the lock is free, but the earlier ticket is first:  we wait
    expect(() => Turns.take("order", "later", () => "ran", { wait: 1_500, say: (line) => said.push(line) })).toThrow(
      /not free in/
    )
    expect(said[0]).toMatch(/\(2 in line\)/)
    // the earlier waiter leaves:  our turn
    rmSync(ticket)
    expect(Turns.take("order", "later", () => "ran", { wait: 5_000, say: () => {} })).toBe("ran")
    expect(readdirSync(join(HOME, "turns", "order.queue"))).toEqual([])
    other.kill()
  })

  test("a ticket whose process is gone is dropped, so the line moves", () => {
    const dead = spawnSync(process.execPath, ["-e", "1"]).pid
    const ticket = ticketFor("dropped", dead, "crashed waiter", 5_000)
    expect(Turns.take("dropped", "mine", () => "ran", { wait: 5_000, say: () => {} })).toBe("ran")
    expect(existsSync(ticket)).toBe(false)
  })

  test("a holder that's stopped (suspended) is taken over at once, saying so", () => {
    const stopped = sleeper()
    stopped.kill("SIGSTOP")
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300)
    lockHeldBy("stopped", stopped.pid!, "yarn review")
    const said: string[] = []
    expect(Turns.take("stopped", "mine", () => "ran", { wait: 5_000, say: (line) => said.push(line) })).toBe("ran")
    expect(said.join("\n")).toMatch(/holder is stopped:  taking it over \(yarn review/)
    stopped.kill("SIGKILL")
  })

  test("a live holder past STUCK times usual:  its waiter gives up, naming it;  never taken over", () => {
    const holder = sleeper()
    lockHeldBy("stuck", holder.pid!, "yarn review", Turns.DEFAULT_USUAL.other! * Turns.STUCK + 60_000)
    expect(() => Turns.take("stuck", "mine", () => "ran", { say: () => {} })).toThrow(
      /the stuck turn is stuck:  held by yarn review, pid \d+, for .* -- longer than usual/
    )
    expect(Turns.held().find((it) => it.kind === "stuck")?.holder.pid).toBe(holder.pid)
    holder.kill()
  })

  test("a waiter doesn't give up while the line moves:  no fixed wait by default", async () => {
    const holder = sleeper()
    lockHeldBy("moving", holder.pid!, "a long test run", 40 * 60_000)
    setTimeout(() => holder.kill(), 1_500)
    // held 40 minutes already (past the old 30-minute wait), but under STUCK:  it waits, and gets the turn
    expect(await Turns.takeAsync("moving", "mine", async () => "ran", { say: () => {} })).toBe("ran")
  })

  test("listLines():  the holder, for how long, longer than usual, and the line", () => {
    const holder = sleeper()
    const waiter = sleeper()
    lockHeldBy("listed", holder.pid!, "yarn review", 45 * 60_000)
    ticketFor("listed", waiter.pid!, "epic merge seo", 3 * 60_000)
    const lines = Turns.listLines().join("\n")
    expect(lines).toMatch(/listed:  yarn review, pid \d+, for 45m -- longer than usual \(10m\)/)
    expect(lines).toMatch(/  waiting:  1\. epic merge seo, pid \d+, for 3m/)
    holder.kill()
    waiter.kill()
  })

  test("listLines():  a holder quiet past its stall window says stalled (I384)", () => {
    const holder = sleeper()
    lockHeldBy("quiet", holder.pid!, "yarn test", 15 * 60_000)
    writeFileSync(join(HOME, "turns", "quiet.busy"), `${holder.pid} ${Date.now() - 12 * 60_000} ${10 * 60_000}`)
    expect(Turns.listLines().join("\n")).toMatch(
      /quiet:  yarn test, pid \d+, for 15m -- stalled \(no output or CPU for 12m\)/
    )
    holder.kill()
  })

  test("a holder whose process is gone is taken over at once, saying so", () => {
    const dead = spawnSync(process.execPath, ["-e", "1"]).pid
    lockHeldBy("dead", dead, "yarn test")
    const said: string[] = []
    expect(Turns.take("dead", "mine", () => "ran", { wait: 5_000, say: (line) => said.push(line) })).toBe("ran")
    expect(said.join("\n")).toMatch(/holder is gone:  taking it over \(yarn test/)
  })

  test("usual():  the median of a kind's last runs, written down as each turn ends", () => {
    for (let i = 0; i < 3; i++)
      Turns.take("timed", "quick", () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5))
    // runs under 10s don't count:  still the default
    expect(Turns.usual("timed")).toBe(Turns.DEFAULT_USUAL.other)
    const file = join(HOME, "turns", "history.jsonl")
    const runs = [60_000, 120_000, 180_000].map((ms) => JSON.stringify({ kind: "timed", label: "x", ms, at: "" }))
    writeFileSync(file, `${runs.join("\n")}\n`, { flag: "a" })
    expect(Turns.usual("timed")).toBe(120_000)
  })
})
