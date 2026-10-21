import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { WorktreeGuard } from "$/epics/command/WorktreeGuard"
import { fakeMainCheckout, fakeWorktree } from "spell-kit/server/test/checkouts"

/** The hook, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks/worktree-guard.mjs")

/** A repo using epics, its worktrees beside it;  an old one nested;  and a repo that doesn't use epics. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "worktree-guard-")))
const MAIN = fakeMainCheckout(join(TEMP, "repo"))
const BESIDE = fakeWorktree(MAIN, join(TEMP, "repo.worktrees", "seo"))
const NESTED = fakeWorktree(MAIN, join(MAIN, ".claude", "worktrees", "old"))
const PLAIN = fakeMainCheckout(join(TEMP, "plain"))
mkdirSync(join(MAIN, ".epic"))
writeFileSync(join(MAIN, ".epic", "config.json5"), '{ "worktreesFolder": "../repo.worktrees" }')
// the guard's own records (rule 2) in a temp home, never ~/.spell-epic
const HOME = process.env.SPELL_EPIC_HOME
process.env.SPELL_EPIC_HOME = join(TEMP, "home")
afterAll(() => {
  if (HOME === undefined) delete process.env.SPELL_EPIC_HOME
  else process.env.SPELL_EPIC_HOME = HOME
  rmSync(TEMP, { recursive: true, force: true })
})

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
    expect(output?.hookSpecificOutput.additionalContext).toMatch(`run EnterWorktree with name "seo"`)
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

  test("NOT RECORDED:  started in a worktree beside the repo with no note:  recorded quietly, never told to enter", () => {
    const fresh = transcript("fresh", [{ type: "user", cwd: BESIDE }])
    expect(WorktreeGuard.check({ cwd: BESIDE, transcript_path: fresh, source: "startup", session_id: "new-1" })).toBe(
      undefined
    )
    expect(WorktreeGuard.recordOf("new-1")).toMatchObject({ worktreePath: BESIDE, worktreeName: "seo" })
    // no transcript yet (a brand-new session):  the same
    expect(WorktreeGuard.check({ cwd: BESIDE, source: "startup", session_id: "new-2" })).toBeUndefined()
    expect(WorktreeGuard.recordOf("new-2")).toMatchObject({ worktreePath: BESIDE })
    // a nested worktree:  the Claude panel hands its session its folder itself
    expect(WorktreeGuard.check({ cwd: NESTED, source: "startup", session_id: "new-3" })).toBeUndefined()
    expect(WorktreeGuard.recordOf("new-3")).toBeUndefined()
  })

  test("LOST by the guard's record:  reopened outside it, no note of Claude Code's:  told to EnterWorktree back", () => {
    WorktreeGuard.record("rec-1", { worktreePath: BESIDE, worktreeName: "seo" })
    const plain = transcript("plain", [{ type: "user", cwd: BESIDE }])
    const output = WorktreeGuard.check({ cwd: MAIN, transcript_path: plain, source: "resume", session_id: "rec-1" })
    expect(output?.hookSpecificOutput.additionalContext).toMatch(`run EnterWorktree with name "seo"`)
    // Claude Code's note wins:  a session that LEFT on purpose stays out, record or not
    const left = transcript("left-rec", [note(BESIDE), note(null)])
    expect(WorktreeGuard.check({ cwd: MAIN, transcript_path: left, source: "resume", session_id: "rec-1" })).toBe(
      undefined
    )
    // an id can't name another folder
    expect(WorktreeGuard.recordFile("../x")).toBe(join(TEMP, "home", "session-worktrees", "___x.json"))
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
