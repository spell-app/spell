/**
 * Tests of `Turns`:  one holder of each kind at a time on the machine, the same kind inside a turn running straight
 * away, a waiter told who has it, a command's exit code.  In a scratch epic home.
 */
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
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
      /wasn't free/
    )
    expect(said[0]).toMatch(/^waiting for the test turn:  yarn test, pid \d+, since \d\d:\d\d$/)
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
})
