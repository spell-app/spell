import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { WorktreeGuard } from "$/epics/command/WorktreeGuard"
import { fakeMainCheckout, fakeWorktree } from "$/server/test/checkouts"

/** The hook, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../hooks/worktree-guard.mjs")

/** A repo using epics, its worktrees beside it;  an old one nested;  and a repo that doesn't use epics. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "worktree-guard-")))
const MAIN = fakeMainCheckout(join(TEMP, "repo"))
const BESIDE = fakeWorktree(MAIN, join(TEMP, "repo.worktrees", "seo"))
const NESTED = fakeWorktree(MAIN, join(MAIN, ".claude", "worktrees", "old"))
const PLAIN = fakeMainCheckout(join(TEMP, "plain"))
mkdirSync(join(MAIN, ".epic"))
writeFileSync(join(MAIN, ".epic", "config.json5"), '{ "worktreesFolder": "../repo.worktrees" }')
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** A transcript whose lines are `entries`, as JSON lines;  returns its path. */
function transcript(name: string, entries: object[]): string {
  const file = join(TEMP, `${name}.jsonl`)
  writeFileSync(file, entries.map((entry) => `${JSON.stringify(entry)}\n`).join(""))
  return file
}

/** A worktree note, as Claude Code writes one on `EnterWorktree` (`null`:  on `ExitWorktree`). */
function note(path: string | null): object {
  return {
    type: "worktree-state",
    worktreeSession: path && { originalCwd: MAIN, worktreePath: path, worktreeName: "seo", sessionId: "s" },
    sessionId: "s"
  }
}

const entered = transcript("entered", [{ type: "user", cwd: MAIN }, note(BESIDE), { type: "user", cwd: BESIDE }])

describe("WorktreeGuard", () => {
  test("LOST:  reopened outside the worktree its last note names:  told to EnterWorktree back, Owen told too", () => {
    const output = WorktreeGuard.check({ cwd: MAIN, transcript_path: entered, source: "resume" })
    expect(output?.hookSpecificOutput.additionalContext).toMatch(`run EnterWorktree with path "${BESIDE}"`)
    expect(output?.systemMessage).toMatch(/⎇ seo:  this session was reopened outside its worktree/)
  })

  test("nothing to say:  already in it;  it LEFT on purpose;  its worktree is gone;  another source", () => {
    expect(WorktreeGuard.check({ cwd: BESIDE, transcript_path: entered, source: "resume" })).toBeUndefined()
    expect(WorktreeGuard.check({ cwd: join(BESIDE, "packages"), transcript_path: entered, source: "resume" })).toBe(
      undefined
    )
    const left = transcript("left", [note(BESIDE), note(null)])
    expect(WorktreeGuard.check({ cwd: MAIN, transcript_path: left, source: "resume" })).toBeUndefined()
    const gone = transcript("gone", [note(join(TEMP, "repo.worktrees", "gone"))])
    expect(WorktreeGuard.check({ cwd: MAIN, transcript_path: gone, source: "resume" })).toBeUndefined()
    expect(WorktreeGuard.check({ cwd: MAIN, transcript_path: entered, source: "compact" })).toBeUndefined()
  })

  test("NOT RECORDED:  started in a worktree beside the repo with no note:  told to EnterWorktree where it is", () => {
    const fresh = transcript("fresh", [{ type: "user", cwd: BESIDE }])
    const output = WorktreeGuard.check({ cwd: BESIDE, transcript_path: fresh, source: "startup" })
    expect(output?.hookSpecificOutput.additionalContext).toMatch(`run EnterWorktree with path "${BESIDE}"`)
    expect(output?.hookSpecificOutput.additionalContext).toMatch(/without EnterWorktree/)
    // no transcript yet (a brand-new session):  the same
    expect(WorktreeGuard.check({ cwd: BESIDE, source: "startup" })).toBeDefined()
    // a nested worktree:  the Claude panel hands its session its folder itself
    expect(WorktreeGuard.check({ cwd: NESTED, source: "startup" })).toBeUndefined()
  })

  test("only in a repo that uses epics (`.epic/config.json5`)", () => {
    expect(WorktreeGuard.check({ cwd: PLAIN, transcript_path: entered, source: "resume" })).toBeUndefined()
  })

  test("lastNote():  the last worktree note, `null` after leaving, `undefined` with none;  a torn line skipped", () => {
    expect(WorktreeGuard.lastNote(entered)).toMatchObject({ worktreePath: BESIDE })
    const torn = join(TEMP, "torn.jsonl")
    writeFileSync(torn, `${JSON.stringify(note(BESIDE))}\n{"type":"worktree-state","worktreeSess`)
    expect(WorktreeGuard.lastNote(torn)).toMatchObject({ worktreePath: BESIDE })
    expect(WorktreeGuard.lastNote(transcript("none", [{ type: "user" }]))).toBeUndefined()
    expect(WorktreeGuard.lastNote(undefined)).toBeUndefined()
  })

  test("the hook:  prints the guard's JSON, exits 0;  bad input is never a failure", () => {
    const input = JSON.stringify({ cwd: MAIN, transcript_path: entered, source: "resume" })
    const run = spawnSync(process.execPath, [HOOK], { input, encoding: "utf8" })
    expect(run.status).toBe(0)
    expect(JSON.parse(run.stdout).hookSpecificOutput.hookEventName).toBe("SessionStart")
    const bad = spawnSync(process.execPath, [HOOK], { input: "{nope", encoding: "utf8" })
    expect(bad.status).toBe(0)
    expect(bad.stdout).toBe("")
  })
})
