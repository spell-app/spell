import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { fakeMainCheckout } from "$/server/test/checkouts"

/** The hook, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks/left-worktree.mjs")

/** A repo using epics, and one that doesn't. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "left-worktree-")))
const EPICS = fakeMainCheckout(join(TEMP, "repo"))
const PLAIN = fakeMainCheckout(join(TEMP, "plain"))
mkdirSync(join(EPICS, ".epic"))
writeFileSync(join(EPICS, ".epic", "config.json5"), "{}")
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** Run the hook on `input`;  its output, parsed, else `undefined`. */
function hook(input: object): { hookSpecificOutput: { hookEventName: string; additionalContext: string } } | undefined {
  const run = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(input), encoding: "utf8" })
  expect(run.status).toBe(0)
  return run.stdout.trim() ? JSON.parse(run.stdout) : undefined
}

describe("the left-worktree hook (epic-eject P10, r1)", () => {
  test("kept:  the closing line's checks, and the /isolate done question", () => {
    const output = hook({ cwd: EPICS, hook_event_name: "PostToolUse", tool_input: { action: "keep" } })
    const context = output?.hookSpecificOutput.additionalContext ?? ""
    expect(output?.hookSpecificOutput.hookEventName).toBe("PostToolUse")
    expect(context).toMatch("*You can close this tab*")
    expect(context).toMatch(/no uncommitted or unmerged work, no background task or agent running/)
    expect(context).toMatch(/say what keeps the tab open/)
    expect(context).toMatch(/skills\/isolate\/SKILL\.md/)
    expect(context).toMatch(/Run `\/isolate done`/)
  })

  test("removed:  the line's checks, no question;  a repo without epics, or bad input:  nothing", () => {
    const removed = hook({ cwd: EPICS, tool_input: { action: "remove" } })?.hookSpecificOutput.additionalContext
    expect(removed).toMatch("*You can close this tab*")
    expect(removed).not.toMatch(/isolate done/)
    expect(hook({ cwd: PLAIN, tool_input: { action: "keep" } })).toBeUndefined()
    expect(hook({})).toBeUndefined()
  })
})
