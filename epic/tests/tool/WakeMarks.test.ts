/**
 * Tests of `WakeMarks` (epic `epic-engine` I286):  a session the page server opens for an epic is titled `🚧 <epic>`
 * as it starts, by the plugin's `woken` hook.
 * - NEVER the real epic home:  `$SPELL_EPIC_HOME` is a scratch folder
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, beforeEach, expect, test } from "vite-plus/test"

import { WakeMarks } from "spell/epic/tool/WakeMarks"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

/** The hook, run as Claude Code runs it. */
const HOOK = fileURLToPath(new URL("../../hooks/woken.mjs", import.meta.url))

let epicHome: string
let root: string
let big: string

beforeAll(() => {
  epicHome = realpathSync(mkdtempSync(join(tmpdir(), "wake-marks-home-")))
  root = fakeMainCheckout(realpathSync(mkdtempSync(join(tmpdir(), "wake-marks-root-"))))
  big = fakeWorktree(root, join(root, ".claude", "worktrees", "big"))
  process.env.SPELL_EPIC_HOME = epicHome
})

afterAll(() => {
  delete process.env.SPELL_EPIC_HOME
  rmSync(epicHome, { recursive: true, force: true })
  rmSync(root, { recursive: true, force: true })
})

beforeEach(() => rmSync(WakeMarks.folder, { recursive: true, force: true }))

test("a fresh mark titles the first session to start in its epic's worktree, once", () => {
  WakeMarks.mark("big")
  expect(WakeMarks.claim(join(big, "src"))).toBe("🚧 big")
  expect(existsSync(WakeMarks.fileOf("big"))).toBe(false)
  // a tab Owen opens there later:  left alone
  expect(WakeMarks.claim(big)).toBeUndefined()
})

test("no mark, a stale one, or a folder in no worktree:  untitled", () => {
  expect(WakeMarks.claim(big)).toBeUndefined()
  WakeMarks.mark("big", Date.now() - 10 * 60_000)
  expect(WakeMarks.claim(big)).toBeUndefined()
  // the stale one taken away
  expect(existsSync(WakeMarks.fileOf("big"))).toBe(false)
  WakeMarks.mark("big")
  expect(WakeMarks.claim(root)).toBeUndefined()
})

test("the hook:  a startup in a marked worktree answers its title;  a resume, nothing", () => {
  const run = (input: object) =>
    execFileSync(process.execPath, [HOOK], {
      input: JSON.stringify(input),
      encoding: "utf8",
      env: { ...process.env, SPELL_EPIC_HOME: epicHome }
    }).trim()
  WakeMarks.mark("big")
  expect(run({ cwd: big, source: "resume" })).toBe("")
  expect(JSON.parse(run({ cwd: big, source: "startup" }))).toEqual({
    hookSpecificOutput: { hookEventName: "SessionStart", sessionTitle: "🚧 big" }
  })
})
