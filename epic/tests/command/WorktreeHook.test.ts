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
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SessionFolders } from "spell/epic/config/SessionFolders"

/** The hook, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks/worktree.mjs")

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

  test("a content folder beside the repo:  the worktrees' folder gets ONE link to it (T31), its folders in the worktree", () => {
    const content = join(TEMP, "repo.epics")
    mkdirSync(join(content, "agents"), { recursive: true })
    git(content, "init", "-q", "-b", "main")
    config({ contentFolder: "../repo.epics", sharedFolders: ["agents"] })
    const made = hook("create", { name: "docs", cwd: MAIN })
    expect(made.status).toBe(0)
    const link = join(BESIDE, "repo.epics")
    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(readlinkSync(link)).toBe("../repo.epics")
    // the text docs write from the main checkout's root reaches the content folder from the worktree's too
    expect(realpathSync(join(made.stdout, "../repo.epics"))).toBe(content)
    expect(realpathSync(join(made.stdout, "agents"))).toBe(join(content, "agents"))
    // a second worktree:  the same link, left as it is
    expect(hook("create", { name: "docs2", cwd: MAIN }).status).toBe(0)
    expect(readlinkSync(link)).toBe("../repo.epics")
    config({})
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

  test("extraInstalls (I65):  the install runs again in each yarn project of its own;  one missing or failing warns", () => {
    // `tools/vscode`:  its own yarn project, tracked by the repo, outside the one install
    mkdirSync(join(MAIN, "tools", "vscode"), { recursive: true })
    writeFileSync(join(MAIN, "tools", "vscode", "package.json"), "{}\n")
    git(MAIN, "add", "-A")
    git(MAIN, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "vscode")
    const mark = join(TEMP, "installed-in-each")
    config({ installOnCreate: true, installCommand: `pwd >> "${mark}"`, extraInstalls: ["tools/vscode", "gone"] })
    const made = hook("create", { name: "extras", cwd: MAIN })
    expect(made.status, made.stderr).toBe(0)
    expect(readFileSync(mark, "utf8").trim().split("\n")).toEqual([made.stdout, join(made.stdout, "tools", "vscode")])
    expect(made.stderr).toMatch(/extraInstalls: {2}gone isn't in .*: {2}skipped/)

    // the root's install passes, the folder's fails:  a warning, and the worktree handed over
    config({
      installOnCreate: true,
      installCommand: 'case "$PWD" in */vscode) exit 4;; esac',
      extraInstalls: ["tools/vscode"]
    })
    const warned = hook("create", { name: "extras-failing", cwd: MAIN })
    expect(warned.status, warned.stderr).toBe(0)
    expect(warned.stdout).toBe(join(BESIDE, "extras-failing"))
    expect(warned.stderr).toMatch(/failed in .*extras-failing\/tools\/vscode: {2}exit 4\. {2}Its packages are missing/)
  })

  test("an install that fails, or runs out of time, fails the hook, saying how to carry on;  the worktree stays", () => {
    config({ installOnCreate: true, installCommand: "exit 3" })
    const failed = hook("create", { name: "broken", cwd: MAIN })
    expect(failed.status).toBe(1)
    expect(failed.stdout).toBe("")
    expect(failed.stderr).toMatch(/`exit 3` failed in .*broken:  exit 3\..*EnterWorktree with name "broken"/)
    expect(existsSync(join(BESIDE, "broken", ".git"))).toBe(true)

    // `exec`:  the timeout stops the shell, so sleep must BE the shell;  Linux's `sh` (dash) runs it as a child,
    // which lives on, holding the hook's stderr, and this test waits the whole 5s for it (CI, epic `repo-split` I65)
    config({ installOnCreate: true, installCommand: "exec sleep 5", installTimeout: 1 })
    const slow = hook("create", { name: "slow", cwd: MAIN })
    expect(slow.status).toBe(1)
    expect(slow.stderr).toMatch(/stopped after 1s \(installTimeout/)
  })

  test("a tracked link out of the repo (`.dep -> ../dep`) finds its target from a worktree too (I13)", () => {
    config({})
    // `.dep -> ../dep`:  found beside the main checkout, one folder short from `repo.worktrees/<name>/`
    mkdirSync(join(TEMP, "dep"))
    writeFileSync(join(TEMP, "dep", "package.json"), "{}\n")
    symlinkSync("../dep", join(MAIN, ".dep"))
    git(MAIN, "add", ".dep")
    git(MAIN, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "dep")
    const made = hook("create", { name: "deps", cwd: MAIN })
    expect(made.status).toBe(0)
    expect(made.stderr).toMatch(/\.dep's target linked/)
    // ONE link beside the worktrees, which every worktree there shares;  the worktree itself untouched
    expect(readlinkSync(join(BESIDE, "dep"))).toBe("../dep")
    expect(realpathSync(join(made.stdout, ".dep", "package.json"))).toBe(join(TEMP, "dep", "package.json"))
    expect(git(made.stdout, "status", "--porcelain")).toBe("")
    // the next worktree finds it there:  nothing more to make
    const next = hook("create", { name: "deps-two", cwd: MAIN })
    expect(next.stderr).not.toMatch(/target linked/)
    expect(existsSync(join(next.stdout, ".dep", "package.json"))).toBe(true)
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
