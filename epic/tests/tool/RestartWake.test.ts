/**
 * Tests of `RestartWake` (epic `epic-engine` I310):  a session VS Code started again is woken to resume the helper
 * agents the restart cut off, by the plugin's `restarted` hook.
 * - NEVER the real epic home or Claude folder:  `$SPELL_EPIC_HOME` and `$CLAUDE_CONFIG_DIR` are scratch folders
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, beforeEach, expect, test } from "vite-plus/test"

import { RestartWake } from "spell/epic/tool/RestartWake"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

/** The hook, run as Claude Code runs it. */
const HOOK = fileURLToPath(new URL("../../hooks/restarted.mjs", import.meta.url))

/** An hour ago, and now. */
const NOW = Date.parse("2026-11-15T20:00:00Z")
const HOUR_AGO = "2026-11-15T19:00:00.000Z"

let epicHome: string
let claudeHome: string
let root: string
let big: string

beforeAll(() => {
  epicHome = realpathSync(mkdtempSync(join(tmpdir(), "restart-wake-home-")))
  claudeHome = realpathSync(mkdtempSync(join(tmpdir(), "restart-wake-claude-")))
  root = fakeMainCheckout(realpathSync(mkdtempSync(join(tmpdir(), "restart-wake-root-"))))
  big = fakeWorktree(root, join(root, ".claude", "worktrees", "big"))
  mkdirSync(join(root, "epics", "big"), { recursive: true })
  process.env.SPELL_EPIC_HOME = epicHome
})

afterAll(() => {
  delete process.env.SPELL_EPIC_HOME
  for (const folder of [epicHome, claudeHome, root]) rmSync(folder, { recursive: true, force: true })
})

beforeEach(() => {
  rmSync(RestartWake.folder, { recursive: true, force: true })
  rmSync(join(root, "epics", "big", "agents.json5"), { force: true })
})

/** Epic `big`'s running list:  `agents`. */
function listAgents(agents: object[]) {
  writeFileSync(join(root, "epics", "big", "agents.json5"), JSON.stringify(agents))
}

const LISTED = [
  { name: "big-fix", task: "fix the thing", status: "active", started: HOUR_AGO, taskId: "a1b2" },
  { name: "big-docs", task: "write the docs", status: "active", started: HOUR_AGO }
]

test("agents older than every session in the worktree:  cut off, one line naming each, its id and task", () => {
  listAgents(LISTED)
  const line = RestartWake.lineFor(big, { now: NOW, sessions: [{ cwd: big, startedAt: NOW - 1000 }] })
  expect(line).toContain("📬 big:  the restart cut off 2 agents")
  expect(line).toContain('big-fix (a1b2, "fix the thing")')
  expect(line).toContain('big-docs (no id, "write the docs")')
  expect(line).toContain("Resume each now with SendMessage to its id")
  expect(line).toContain("`epic inbox wait big`")
})

test("once per batch:  a second tab starting there stays quiet", () => {
  listAgents(LISTED)
  const sessions = [{ cwd: big, startedAt: NOW - 1000 }]
  expect(RestartWake.lineFor(big, { now: NOW, sessions })).toBeDefined()
  expect(RestartWake.lineFor(big, { now: NOW + 5000, sessions })).toBeUndefined()
})

test("nothing to do:  no list, no agents, an older session still running them, or no worktree", () => {
  expect(RestartWake.lineFor(big, { now: NOW, sessions: [] })).toBeUndefined()
  listAgents(LISTED)
  // a tab opened beside the session that started them:  they're still running
  const older = [{ cwd: big, startedAt: Date.parse(HOUR_AGO) - 1000 }]
  expect(RestartWake.lineFor(big, { now: NOW, sessions: older })).toBeUndefined()
  // a leftover listed for days:  never woken for
  listAgents([{ ...LISTED[0], started: "2026-10-12T07:14:52.158Z" }])
  expect(RestartWake.lineFor(big, { now: NOW, sessions: [] })).toBeUndefined()
  // a session in the main checkout:  no epic
  expect(RestartWake.lineFor(root, { now: NOW, sessions: [] })).toBeUndefined()
})

test("the hook:  a line goes to stderr with exit 2 (asyncRewake wakes the session);  none, exit 0", () => {
  const run = (cwd: string) =>
    spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ cwd, source: "resume" }),
      encoding: "utf8",
      env: { ...process.env, SPELL_EPIC_HOME: epicHome, CLAUDE_CONFIG_DIR: claudeHome }
    })
  const quiet = run(big)
  expect([quiet.status, quiet.stderr]).toEqual([0, ""])
  listAgents(LISTED)
  const woken = run(big)
  expect(woken.status).toBe(2)
  expect(woken.stderr).toContain("📬 big:  the restart cut off 2 agents")
  expect(woken.stdout).toBe("")
})
