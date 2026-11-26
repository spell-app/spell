import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

/** A scratch folder, gone after the tests. */
const DIR = mkdtempSync(join(tmpdir(), "file-lock-"))
afterAll(() => rmSync(DIR, { recursive: true, force: true }))

describe("FileLock", () => {
  test("run():  holds `<file>.lock` while `fn` runs, and lets go after, even when it throws", () => {
    const file = join(DIR, "run.json")
    expect(SRV.FileLock.run(file, () => existsSync(`${file}.lock`))).toBe(true)
    expect(existsSync(`${file}.lock`)).toBe(false)
    expect(() =>
      SRV.FileLock.run(file, () => {
        throw new Error("no")
      })
    ).toThrow("no")
    expect(existsSync(`${file}.lock`)).toBe(false)
  })

  test("run():  a lock held past `wait` throws a `FileLockError`", () => {
    const file = join(DIR, "held.json")
    writeFileSync(`${file}.lock`, "")
    expect(() => SRV.FileLock.run(file, () => 1, { wait: 150 })).toThrow(SRV.FileLockError)
    rmSync(`${file}.lock`)
  })

  // epic `epic-engine` I463:  the epic hub froze 20s at a time, a blocking wait behind its own async edit
  test("run():  a lock this process holds in `runAsync()` throws at once, never blocking", async () => {
    const file = join(DIR, "own.json")
    let blocked = -1
    await SRV.FileLock.runAsync(file, async () => {
      const started = Date.now()
      expect(() => SRV.FileLock.run(file, () => 1, { wait: 5000 })).toThrow(/held by this process/)
      blocked = Date.now() - started
    })
    expect(blocked).toBeLessThan(500)
    expect(SRV.FileLock.run(file, () => 2)).toBe(2)
  })

  test("runOnce():  `held` without running `fn` while another holder has it;  a stale lock is taken over", () => {
    const file = join(DIR, "once.json")
    let ran = 0
    const inner = SRV.FileLock.runOnce(file, () => SRV.FileLock.runOnce(file, () => ran++))
    expect(inner).toBe(SRV.FileLock.HELD)
    expect(ran).toBe(0)
    writeFileSync(`${file}.lock`, "")
    expect(SRV.FileLock.runOnce(file, () => ran++, { stale: -1 })).toBe(0)
    expect(existsSync(`${file}.lock`)).toBe(false)
  })

  test("holder():  the lock names its holder;  a holder whose process is gone is taken over at once", () => {
    const file = join(DIR, "holder.json")
    const seen = SRV.FileLock.run(file, () => new SRV.FileLock(file).holder(), { label: "epic merge seo" })
    expect(seen).toMatchObject({ pid: process.pid, label: "epic merge seo" })
    expect(new SRV.FileLock(file).holder()).toBeUndefined()
    // a pid nobody runs:  stale at once, however long `stale` is
    writeFileSync(`${file}.lock`, "999999 epic merge gone")
    expect(SRV.FileLock.runOnce(file, () => "ran", { stale: 3_600_000 })).toBe("ran")
    // a live holder (this process) with a long `stale`:  held
    writeFileSync(`${file}.lock`, `${process.pid} busy`)
    expect(SRV.FileLock.runOnce(file, () => "ran", { stale: 3_600_000 })).toBe(SRV.FileLock.HELD)
    rmSync(`${file}.lock`)
  })

  // epic `epic-engine` I491:  eight writers on a big epic page, the later ones giving up while the line still moved
  test("runAsync():  `wait` counts one holder at a time, so a line of holders handing on never times it out", async () => {
    const file = join(DIR, "line.json")
    let handedOn = 0
    writeFileSync(`${file}.lock`, `${process.pid} holder 0`)
    // a new holder every 150ms, 6 of them:  900ms in all, each well under `wait`
    const line = setInterval(() => {
      rmSync(`${file}.lock`, { force: true })
      if (++handedOn < 6) writeFileSync(`${file}.lock`, `${process.pid} holder ${handedOn}`)
      else clearInterval(line)
    }, 150)
    const started = Date.now()
    expect(await SRV.FileLock.runAsync(file, async () => "mine", { wait: 400 })).toBe("mine")
    expect(Date.now() - started).toBeGreaterThan(400)
    clearInterval(line)
  })

  test("a timeout names the holder;  `tell` hears who holds it, once (I283)", () => {
    const file = join(DIR, "live.json")
    writeFileSync(`${file}.lock`, `${process.pid} epic add seo#I ...`)
    const told: (number | undefined)[] = []
    expect(() =>
      SRV.FileLock.run(file, () => 1, { wait: 400, tellAfter: 100, tell: (holder) => told.push(holder?.pid) })
    ).toThrow(
      new RegExp(`held for 0.4s by pid ${process.pid} \\(epic add seo#I \\.\\.\\.\\), since \\d\\d:\\d\\d:\\d\\d`)
    )
    expect(told).toEqual([process.pid])
    rmSync(`${file}.lock`)
  })

  test("runOnce():  two takers at once, in two processes:  exactly one wins", async () => {
    const file = join(DIR, "race.json")
    const lock = new URL("../../src/server/FileLock.ts", import.meta.url).pathname
    // each waits for a shared start time, then takes the lock and holds it a moment
    const start = Date.now() + 400
    const script = `
      const { FileLock } = await import(${JSON.stringify(lock)})
      while (Date.now() < ${start});
      const got = FileLock.runOnce(${JSON.stringify(file)}, () => {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300)
        return "won"
      })
      console.log(got)`
    const { spawn } = await import("node:child_process")
    const taker = () =>
      new Promise<string>((done, fail) => {
        const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
          stdio: ["ignore", "pipe", "inherit"]
        })
        let out = ""
        child.stdout.on("data", (chunk) => (out += chunk))
        child.on("error", fail)
        child.on("close", () => done(out.trim()))
      })
    const answers = await Promise.all([taker(), taker()])
    expect(answers.sort()).toEqual([SRV.FileLock.HELD, "won"])
  })
})
