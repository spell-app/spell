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
