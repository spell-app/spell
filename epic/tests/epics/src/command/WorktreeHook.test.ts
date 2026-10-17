/**
 * The worktree hook, `hooks/worktree.mjs`, run as Claude Code runs it (JSON on stdin), on a throwaway repo:
 * - worktrees beside the repo, the old place still found
 * - the session-folder link
 * - the install before it hands over
 * - Claude Code's folder is a temp one (`CLAUDE_CONFIG_DIR`):  never the real `~/.claude`.
 */
import { execFileSync, spawnSync } from "node:child_process"
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SessionFolders } from "$/epics/config/SessionFolders"

/** The hook, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../hooks/worktree.mjs")

/** A throwaway repo, `repo`, its worktrees going beside it;  and a temp Claude Code folder. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "worktree-hook-")))
const MAIN = join(TEMP, "repo")
const BESIDE = join(TEMP, "repo.worktrees")
const CLAUDE = join(TEMP, "claude")
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

mkdirSync(MAIN)
git(MAIN, "init", "-q", "-b", "main")
writeFileSync(join(MAIN, ".gitignore"), "/.claude/worktrees\n")
git(MAIN, "add", "-A")
git(MAIN, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "first")
// an OLD worktree, made before the move
const OLD = join(MAIN, ".claude", "worktrees", "old")
git(MAIN, "worktree", "add", "-q", "-b", "old", OLD)

/** Write the repo's `.epic/config.json5`. */
function config(settings: Record<string, unknown>): void {
  mkdirSync(join(MAIN, ".epic"), { recursive: true })
  writeFileSync(
    join(MAIN, ".epic", "config.json5"),
    JSON.stringify({ worktreesFolder: "../repo.worktrees", ...settings })
  )
}

/** Run the hook's `command` with `input` on stdin:  its exit status, stdout and stderr. */
function hook(command: "create" | "remove", input: Record<string, unknown>) {
  const run = spawnSync(process.execPath, [HOOK, command], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_CONFIG_DIR: CLAUDE }
  })
  return { status: run.status, stdout: run.stdout.trim(), stderr: run.stderr }
}

describe("worktree hook", () => {
  test("a new worktree goes beside the repo, on its branch;  stdout is its path alone", () => {
    config({})
    const made = hook("create", { name: "seo", cwd: MAIN })
    expect(made.status).toBe(0)
    expect(made.stdout).toBe(join(BESIDE, "seo"))
    expect(git(join(BESIDE, "seo"), "branch", "--show-current")).toBe("seo")
    // no link asked for:  nothing under Claude Code's folder
    expect(existsSync(SessionFolders.folderOf(join(BESIDE, "seo"), CLAUDE))).toBe(false)
  })

  test("an old worktree is found where it is, and reused", () => {
    const reused = hook("create", { name: "old", cwd: MAIN })
    expect(reused.stdout).toBe(OLD)
    expect(reused.stderr).toMatch(/reusing/)
  })

  test("an agent's worktree, from a session in a worktree beside the repo, is named for it", () => {
    const made = hook("create", { name: "agent-a1b2", cwd: join(BESIDE, "seo") })
    expect(made.stdout).toBe(join(BESIDE, "seo-agent-a1b2"))
  })

  test("linkSessionFolders:  the new worktree's saved-session folder is a link to main's;  remove takes it away", () => {
    config({ linkSessionFolders: true })
    const made = hook("create", { name: "linked", cwd: MAIN })
    expect(made.status).toBe(0)
    const folder = SessionFolders.folderOf(made.stdout, CLAUDE)
    expect(lstatSync(folder).isSymbolicLink()).toBe(true)
    expect(realpathSync(folder)).toBe(realpathSync(SessionFolders.folderOf(MAIN, CLAUDE)))
    const removed = hook("remove", { worktree_path: made.stdout, cwd: MAIN })
    expect(removed.status).toBe(0)
    expect(removed.stderr).toMatch(/session-folder link/)
    expect(existsSync(made.stdout)).toBe(false)
    expect(lstatSync(folder, { throwIfNoEntry: false })).toBeUndefined()
    expect(existsSync(SessionFolders.folderOf(MAIN, CLAUDE))).toBe(true)
  })

  test("installOnCreate:  the install command runs in the new worktree before the hook answers", () => {
    const mark = join(TEMP, "installed-in")
    config({ installOnCreate: true, installCommand: `pwd > "${mark}"` })
    const made = hook("create", { name: "ready", cwd: MAIN })
    expect(made.status).toBe(0)
    expect(made.stdout).toBe(join(BESIDE, "ready"))
    expect(readFileSync(mark, "utf8").trim()).toBe(join(BESIDE, "ready"))
  })

  test('installOnCreate with no install command ("", a repo with no packages):  nothing to run, the worktree made', () => {
    config({ installOnCreate: true, installCommand: "" })
    const made = hook("create", { name: "bare", cwd: MAIN })
    expect(made.status).toBe(0)
    expect(made.stdout).toBe(join(BESIDE, "bare"))
    expect(made.stderr).not.toMatch(/worktree hook: {2}in /)
  })

  test("an install that fails, or runs out of time, fails the hook, saying how to carry on;  the worktree stays", () => {
    config({ installOnCreate: true, installCommand: "exit 3" })
    const failed = hook("create", { name: "broken", cwd: MAIN })
    expect(failed.status).toBe(1)
    expect(failed.stdout).toBe("")
    expect(failed.stderr).toMatch(/`exit 3` failed in .*broken:  exit 3\..*EnterWorktree with path/)
    expect(existsSync(join(BESIDE, "broken", ".git"))).toBe(true)

    config({ installOnCreate: true, installCommand: "sleep 5", installTimeout: 1 })
    const slow = hook("create", { name: "slow", cwd: MAIN })
    expect(slow.status).toBe(1)
    expect(slow.stderr).toMatch(/stopped after 1s \(installTimeout/)
  })

  test("remove never loses work:  uncommitted changes keep the worktree", () => {
    config({})
    const made = hook("create", { name: "busy", cwd: MAIN })
    writeFileSync(join(made.stdout, "draft.txt"), "work\n")
    const kept = hook("remove", { worktree_path: made.stdout, cwd: MAIN })
    expect(kept.status).toBe(1)
    expect(kept.stderr).toMatch(/uncommitted changes/)
  })
})

/** `git <args>` in `cwd`, trimmed output. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}
