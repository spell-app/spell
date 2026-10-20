/**
 * A repo MOVED behind compat links, as repo-split's move to `~/www/spell/` leaves spell-epic (epic `epic-engine` I59;
 * the read-only check:  `epics/epic-engine/details/move-check.md`):
 * - `www/spell-app/spell-epic` (a git repo, `contentFolder: "../spell-app.epics"`) and its worktrees moved to
 *   `www/spell/`, the content folder renamed `spell.epics`, a link at each old path
 * - the worktrees NOT repaired:  git lists them by their old paths, and each one's `.git` file names the old main
 * - a session started before the move:  its `cwd` the old spelling
 * - on a throwaway layout and temp Claude Code folders;  nothing real touched
 */
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { Sessions } from "$/epics/command/Sessions"
import { Worktrees } from "$/epics/command/Worktrees"
import { EpicConfig } from "$/epics/config/EpicConfig"

const TOP = realpathSync(mkdtempSync(join(tmpdir(), "moved-checkout-")))
const OLD_WWW = join(TOP, "www", "spell-app")
const NEW_WWW = join(TOP, "www", "spell")
/** the main checkout, its old spelling (a link) and its real one */
const OLD_MAIN = join(OLD_WWW, "spell-epic")
const MAIN = join(NEW_WWW, "spell-epic")
const OLD_WORKTREES = join(OLD_WWW, "spell-epic.worktrees")
const WORKTREES = join(NEW_WWW, "spell-epic.worktrees")
/** the content folder, moved and renamed:  only the old name, through its link, finds it */
const CONTENT = join(NEW_WWW, "spell.epics")
const CLAUDE = join(TOP, "claude")
const saved = process.env.SPELL_CLAUDE_HOME
process.env.SPELL_CLAUDE_HOME = CLAUDE
afterAll(() => {
  if (saved === undefined) delete process.env.SPELL_CLAUDE_HOME
  else process.env.SPELL_CLAUDE_HOME = saved
  rmSync(TOP, { recursive: true, force: true })
})

// before the move:  www/spell-app/{spell-epic, spell-epic.worktrees/{wt,gone}, spell-app.epics}
mkdirSync(join(OLD_MAIN, ".epic"), { recursive: true })
writeFileSync(
  join(OLD_MAIN, EpicConfig.FILE),
  '{ "contentFolder": "../spell-app.epics", "worktreesFolder": "../spell-epic.worktrees" }\n'
)
git(OLD_MAIN, "init", "-q", "-b", "main")
git(OLD_MAIN, "add", "-A")
git(OLD_MAIN, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "first")
for (const name of ["wt", "gone"]) git(OLD_MAIN, "worktree", "add", "-q", "-b", name, join(OLD_WORKTREES, name))
mkdirSync(join(OLD_WWW, "spell-app.epics", "epics"), { recursive: true })
// the move, the links in the same step;  no `git worktree repair`
mkdirSync(NEW_WWW)
renameSync(OLD_MAIN, MAIN)
renameSync(OLD_WORKTREES, WORKTREES)
renameSync(join(OLD_WWW, "spell-app.epics"), CONTENT)
symlinkSync("../spell/spell-epic", OLD_MAIN)
symlinkSync("../spell/spell-epic.worktrees", OLD_WORKTREES)
symlinkSync("../spell/spell.epics", join(OLD_WWW, "spell-app.epics"))

// live sessions started before the move, their cwds the OLD spelling:  one in `wt` (this test's own process), one in
// the main checkout (our parent's)
mkdirSync(join(CLAUDE, "sessions"), { recursive: true })
writeFileSync(
  join(CLAUDE, "sessions", `${process.pid}.json`),
  JSON.stringify({
    pid: process.pid,
    sessionId: "5f0c4d2e-1111-4a5b-9c8d-000000000059",
    cwd: join(OLD_WORKTREES, "wt")
  })
)
writeFileSync(
  join(CLAUDE, "sessions", `${process.ppid}.json`),
  JSON.stringify({ pid: process.ppid, sessionId: "5f0c4d2e-2222-4a5b-9c8d-000000000059", cwd: join(OLD_MAIN, "src") })
)

describe("a repo moved behind compat links, its worktrees unrepaired", () => {
  test("the layout:  git still lists the worktrees by their OLD paths", () => {
    expect(readFileSync(join(WORKTREES, "wt", ".git"), "utf8")).toContain(join(OLD_MAIN, ".git"))
    expect(Worktrees.listOf(MAIN).map((it) => it.path)).toEqual([
      MAIN,
      join(OLD_WORKTREES, "gone"),
      join(OLD_WORKTREES, "wt")
    ])
  })

  test("EpicConfig:  main is the REAL path from any spelling;  the content folder found by its old name, with a warning", () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    try {
      for (const from of [MAIN, OLD_MAIN, join(WORKTREES, "wt"), join(OLD_WORKTREES, "wt", "src")]) {
        const config = EpicConfig.of(from)
        expect(config.main).toBe(MAIN)
        expect(config.contentFolder).toBe(CONTENT)
        expect(config.worktreesFolder).toBe(WORKTREES)
        expect(EpicConfig.contentOf(from)).toBe(CONTENT)
      }
      expect(EpicConfig.mainOf(join(OLD_WORKTREES, "wt"))).toBe(MAIN)
      // said once, saying what to change
      const warnings = write.mock.calls.map(([text]) => String(text)).filter((text) => text.includes("contentFolder"))
      expect(warnings).toEqual([
        `EpicConfig:  contentFolder ../spell-app.epics is missing beside ${MAIN};  using ${CONTENT} -- update ` +
          `${join(MAIN, EpicConfig.FILE)}\n`
      ])
    } finally {
      write.mockRestore()
    }
  })

  test("worktreeNameOf():  from the real cwd and the old one, a worktree's name;  the main checkout's none", () => {
    const config = new EpicConfig(MAIN)
    expect(config.worktreeNameOf(join(WORKTREES, "wt", "src"))).toBe("wt")
    expect(config.worktreeNameOf(join(OLD_WORKTREES, "wt"))).toBe("wt")
    expect(config.worktreeNameOf(process.cwd())).toBeUndefined()
    expect(config.worktreeNameOf(join(OLD_MAIN, "src"))).toBeUndefined()
  })

  test("worktree list:  both found by name, as git spells them;  the sessions' old cwds count where they are", () => {
    const worktrees = new Worktrees({ main: MAIN, sessions: new Sessions({ home: CLAUDE }) })
    expect(worktrees.named()).toEqual([
      { name: "gone", path: join(OLD_WORKTREES, "gone"), branch: "gone" },
      { name: "wt", path: join(OLD_WORKTREES, "wt"), branch: "wt" }
    ])
    const live = worktrees.sessions.live(MAIN)
    // in the main checkout:  its old spelling counts (`Sessions.live()`'s `inRepo`, `Worktrees.repoSessions()`)
    expect(live.find((session) => session.pid === process.ppid)?.inRepo).toBe(true)
    expect(worktrees.repoSessions().map((record) => record.pid)).toEqual([process.ppid])
    // `wt` has its session:  only `gone` is idle (before I59, both, and `/worktrees` offered `wt` for clean-up)
    expect(worktrees.idle(live).map((it) => it.branch)).toEqual(["gone"])
    expect(worktrees.nameStatus("wt", []).worktree).toBe(join(WORKTREES, "wt"))
  })

  test("worktree remove:  by name, or by its REAL folder;  never the main checkout by its old name", () => {
    const worktrees = new Worktrees({ main: MAIN, sessions: new Sessions({ home: CLAUDE }) })
    expect(() => worktrees.remove(OLD_MAIN)).toThrow(/is the main checkout/)
    expect(worktrees.remove(join(WORKTREES, "gone"))).toEqual([`removed ${join(OLD_WORKTREES, "gone")}`])
    expect(existsSync(join(WORKTREES, "gone"))).toBe(false)
    expect(worktrees.named().map((it) => it.name)).toEqual(["wt"])
  })
})

/** Run git in `cwd`. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" })
}
