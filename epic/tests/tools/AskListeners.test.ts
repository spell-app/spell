/**
 * Tests of `AskListeners`, who waits for a details page's answer (epic `epic-engine` r6):  `epic ask wait`'s
 * heartbeat, in a scratch home folder (`SPELL_EPIC_HOME`).
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, expect, test } from "vite-plus/test"

import { DataFile } from "spell-epic/data/DataFile"

import { ASK_STALE_MS, AskListeners } from "spell-epic/tools/AskListeners"

let scratch: string
let page: string
/** `SPELL_EPIC_HOME` before these tests */
let home: string | undefined

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "ask-listeners-"))
  home = process.env.SPELL_EPIC_HOME
  process.env.SPELL_EPIC_HOME = join(scratch, "home")
  page = join(scratch, "layout.html")
  writeFileSync(page, "<h1>Layout</h1>")
})

afterAll(() => {
  if (home === undefined) delete process.env.SPELL_EPIC_HOME
  else process.env.SPELL_EPIC_HOME = home
  rmSync(scratch, { recursive: true, force: true })
})

test("a heartbeat in the home folder, one per page;  live while fresh and its process runs", () => {
  expect(AskListeners.liveFor(page)).toBeNull()
  const listener = AskListeners.stamp(page)
  expect(AskListeners.fileFor(page).startsWith(join(scratch, "home", "asks"))).toBe(true)
  expect(AskListeners.fileFor(join(scratch, "other.html"))).not.toBe(AskListeners.fileFor(page))
  expect(AskListeners.liveFor(page)).toEqual(listener)
  expect(listener.pid).toBe(process.pid)
  // a later beat keeps when it started
  const later = AskListeners.stamp(page, { since: listener.since, at: new Date(Date.now() + 1000).toISOString() })
  expect(later.since).toBe(listener.since)
  AskListeners.stop(page)
  expect(existsSync(AskListeners.fileFor(page))).toBe(false)
  expect(AskListeners.liveFor(page)).toBeNull()
})

test("not live:  a heartbeat three beats old, or one whose process is gone", () => {
  const listener = AskListeners.stamp(page, { at: new Date(Date.now() - ASK_STALE_MS - 1000).toISOString() })
  expect(AskListeners.liveFor(page)).toBeNull()
  // a process that ran and ended:  its pid is free
  const gone = spawnSync(process.execPath, ["-e", "console.log(process.pid)"], { encoding: "utf8" })
  DataFile.write(AskListeners.fileFor(page), {
    ...listener,
    pid: Number(gone.stdout.trim()),
    seen: new Date().toISOString()
  })
  expect(AskListeners.liveFor(page)).toBeNull()
  AskListeners.stop(page)
})

test("stop leaves another wait's heartbeat alone", () => {
  const listener = AskListeners.stamp(page)
  DataFile.write(AskListeners.fileFor(page), { ...listener, pid: process.ppid })
  AskListeners.stop(page)
  expect(existsSync(AskListeners.fileFor(page))).toBe(true)
  rmSync(AskListeners.fileFor(page))
})

test("hold:  stamped at once, gone with the undo", () => {
  const release = AskListeners.hold(page)
  expect(AskListeners.liveFor(page)?.pid).toBe(process.pid)
  release()
  release()
  expect(AskListeners.liveFor(page)).toBeNull()
})
