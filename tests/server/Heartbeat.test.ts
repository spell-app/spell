import { spawn } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { waitUntil } from "spell/util/timing"
import { SRV } from "spell/server"

/** A scratch folder, gone after the tests. */
const DIR = mkdtempSync(join(tmpdir(), "heartbeat-"))
afterAll(() => rmSync(DIR, { recursive: true, force: true }))

/** A pid no process has:  past macOS's and Linux's largest. */
const GONE_PID = 4_194_305

describe("Heartbeat", () => {
  test("isLive():  a beat within 90s from a process that runs;  a stale beat or a dead process is gone", () => {
    const now = Date.now()
    const seen = new Date(now).toISOString()
    expect(SRV.Heartbeat.isLive({ pid: process.pid, seen }, now + SRV.Heartbeat.STALE_MS)).toBe(true)
    expect(SRV.Heartbeat.isLive({ pid: process.pid, seen }, now + SRV.Heartbeat.STALE_MS + 1)).toBe(false)
    expect(SRV.Heartbeat.isLive({ pid: GONE_PID, seen }, now)).toBe(false)
    // its process alone (a poller's), its beat alone (an old file's)
    expect(SRV.Heartbeat.isLive({ pid: process.pid })).toBe(true)
    expect(SRV.Heartbeat.isLive({ seen }, now + 1000)).toBe(true)
    expect(SRV.Heartbeat.isLive({ seen: "not a date" })).toBe(false)
    expect(SRV.Heartbeat.isLive({})).toBe(false)
    expect(SRV.Heartbeat.isLive(undefined)).toBe(false)
    expect(SRV.Heartbeat.EVERY_MS * 3).toBe(SRV.Heartbeat.STALE_MS)
  })

  test("hold():  beats in its file every `every` ms, and removes it when undone", async () => {
    const file = join(DIR, "held.json5")
    const stop = SRV.Heartbeat.hold(file, { command: "spell x" }, 20)
    const first = SRV.Heartbeat.liveIn<{ command: string }>(file)
    expect(first).toMatchObject({ command: "spell x", pid: process.pid })
    expect(await waitUntil(() => SRV.Heartbeat.read(file)?.seen !== first!.seen, { timeout: 2 })).toBe(true)
    stop()
    expect(existsSync(file)).toBe(false)
    expect(SRV.Heartbeat.liveIn(file)).toBeUndefined()
  })

  test("keep():  a beat that throws is tried again a second later, and never throws", async () => {
    let calls = 0
    const stop = SRV.Heartbeat.keep(
      () => {
        if (++calls === 1) throw new Error("mid-write")
      },
      () => {}
    )
    expect(calls).toBe(1)
    expect(await waitUntil(() => calls === 2, { timeout: 3 })).toBe(true)
    stop()
  })

  test("a beat is removed as its process ends:  by a signal, exit code 128 + its number", async () => {
    const file = join(DIR, "signalled.json5")
    // plain node, as spell-epic's scripts load it:  by its own name
    const script = [
      'import { Heartbeat } from "spell/server/Heartbeat"',
      `Heartbeat.hold(${JSON.stringify(file)}, { command: "wait" })`,
      'console.log("held")',
      "setInterval(() => {}, 1000)"
    ].join("\n")
    const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
      stdio: ["ignore", "pipe", "inherit"]
    })
    await new Promise((held) => child.stdout.once("data", held))
    expect(SRV.Heartbeat.liveIn(file)?.pid).toBe(child.pid)
    const exited = new Promise<number | null>((done) => child.on("exit", (code) => done(code)))
    child.kill("SIGTERM")
    expect(await exited).toBe(143)
    expect(existsSync(file)).toBe(false)
  })

  test("a beat left by a process that's gone is not live", () => {
    const file = join(DIR, "left.json5")
    SRV.DataFile.write(file, { pid: GONE_PID, seen: new Date().toISOString() })
    expect(SRV.Heartbeat.read(file)?.pid).toBe(GONE_PID)
    expect(SRV.Heartbeat.liveIn(file)).toBeUndefined()
    expect(readFileSync(file, "utf8")).toContain(String(GONE_PID))
  })
})
