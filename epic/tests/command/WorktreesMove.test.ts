/**
 * `epic worktree move` (epic `epic-eject` P8):
 * worktrees from the old place (`.claude/worktrees`) to the new one beside the repo.
 * - on a throwaway repo, a scratch content repo and temp Claude Code folders
 */
import { execFileSync } from "node:child_process"
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
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { Shared } from "spell/epic/command/Shared"
import { Worktrees } from "spell/epic/command/Worktrees"
import { SessionFolders } from "spell/epic/config/SessionFolders"

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "worktree-move-")))
const MAIN = join(TEMP, "repo")
const BESIDE = join(TEMP, "repo.worktrees")
const OLD = join(MAIN, ".claude", "worktrees")
const CLAUDE = join(TEMP, "claude")
const saved = {
  shared: process.env.SPELL_SHARED_DIR,
  home: process.env.SPELL_CLAUDE_HOME,
  config: process.env.CLAUDE_CONFIG_DIR
}
process.env.SPELL_SHARED_DIR = join(TEMP, "content")
process.env.SPELL_CLAUDE_HOME = CLAUDE
process.env.CLAUDE_CONFIG_DIR = CLAUDE
afterAll(() => {
  for (const [key, value] of [
    ["SPELL_SHARED_DIR", saved.shared],
    ["SPELL_CLAUDE_HOME", saved.home],
    ["CLAUDE_CONFIG_DIR", saved.config]
  ] as const)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  rmSync(TEMP, { recursive: true, force: true })
})

mkdirSync(join(TEMP, "content", "epics"), { recursive: true })
mkdirSync(join(MAIN, ".epic"), { recursive: true })
writeFileSync(join(MAIN, "package.json"), JSON.stringify({ shared: { links: ["epics"] } }))
writeFileSync(join(MAIN, ".gitignore"), "/.claude/worktrees\n/epics\n")
writeFileSync(
  join(MAIN, ".epic", "config.json5"),
  '{ "worktreesFolder": "../repo.worktrees", "linkSessionFolders": true }'
)
git(MAIN, "init", "-q", "-b", "main")
git(MAIN, "add", "-A")
git(MAIN, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "first")
for (const name of ["idle", "busy"]) {
  git(MAIN, "worktree", "add", "-q", "-b", name, join(OLD, name))
  new Shared({ checkout: join(OLD, name) }).link(join(OLD, name))
}
// a live session working in `busy`:  this test's own process
mkdirSync(join(CLAUDE, "sessions"), { recursive: true })
writeFileSync(
  join(CLAUDE, "sessions", `${process.pid}.json`),
  JSON.stringify({ pid: process.pid, sessionId: "476d3ed5-a6ab-45fb-ae80-323bd1948901", cwd: join(OLD, "busy") })
)

describe("Worktrees.move()", () => {
  const worktrees = new Worktrees({ main: MAIN })

  test("--dry-run:  says where each idle one goes, moves nothing", () => {
    const reports = worktrees.moveIdle({ dryRun: true })
    expect(reports.map(({ name, to }) => [name, to])).toEqual([["idle", join(BESIDE, "idle")]])
    expect(existsSync(join(OLD, "idle"))).toBe(true)
  })

  test("a busy worktree stays put until its /epic done", () => {
    expect(() => worktrees.move("busy")).toThrow(/a session works in busy .*moves at its \/epic done/)
  })

  test("the move:  git knows the new place, its shared links work again, its session folder is linked", () => {
    const [report] = worktrees.moveIdle()
    expect(report).toMatchObject({ name: "idle", from: join(OLD, "idle"), to: join(BESIDE, "idle"), window: false })
    expect(report!.links).toEqual(["epics linked"])
    expect(report!.sessionFolder).toBe("linked")
    expect(git(MAIN, "worktree", "list", "--porcelain")).toContain(`worktree ${join(BESIDE, "idle")}`)
    expect(existsSync(join(OLD, "idle"))).toBe(false)
    expect(lstatSync(join(BESIDE, "idle", "epics")).isSymbolicLink()).toBe(true)
    expect(existsSync(join(BESIDE, "idle", "epics"))).toBe(true)
    expect(lstatSync(SessionFolders.folderOf(join(BESIDE, "idle"), CLAUDE)).isSymbolicLink()).toBe(true)
    // found where it is now, and the old one where it still is
    expect(worktrees.config.worktreeFolder("idle")).toBe(join(BESIDE, "idle"))
    expect(worktrees.config.worktreeFolder("busy")).toBe(join(OLD, "busy"))
    expect(
      worktrees
        .named()
        .map(({ name }) => name)
        .sort()
    ).toEqual(["busy", "idle"])
  })

  test("refuses:  no such worktree in the old place;  a taken folder", () => {
    expect(() => worktrees.move("nope")).toThrow(/no worktree nope in/)
    mkdirSync(join(BESIDE, "busy"), { recursive: true })
    writeFileSync(join(BESIDE, "busy", "x"), "")
    expect(() => worktrees.move("busy")).toThrow(/is taken/)
    expect(readFileSync(join(BESIDE, "busy", "x"), "utf8")).toBe("")
  })
})

/** `git <args>` in `cwd`, trimmed output. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}
