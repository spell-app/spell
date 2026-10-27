import { execFileSync } from "child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, join } from "path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { Requests } from "spell/epic/command/Requests"
import { StrayFiles } from "spell/epic/command/StrayFiles"

/** A scratch repo on `main`, with branch `tooling` one commit ahead, and a worktree of it. */
const REPO = realpathSync(mkdtempSync(join(tmpdir(), "merge-repo-")))
const WORKTREE = join(REPO, ".claude", "worktrees", "tooling")
/** the epic home, where stray files are moved aside */
const HOME = realpathSync(mkdtempSync(join(tmpdir(), "merge-home-")))
const OLD_HOME = process.env.SPELL_EPIC_HOME
process.env.SPELL_EPIC_HOME = HOME
afterAll(() => {
  rmSync(REPO, { recursive: true, force: true })
  rmSync(HOME, { recursive: true, force: true })
  if (OLD_HOME === undefined) delete process.env.SPELL_EPIC_HOME
  else process.env.SPELL_EPIC_HOME = OLD_HOME
})

git("init", "-q", "-b", "main")
// as the real repo:  worktrees are git-ignored
commit(".gitignore", ".claude/\n", "ignore worktrees")
commit("a.txt", "one", "first")
git("branch", "tooling")
git("worktree", "add", "-q", WORKTREE, "tooling")
commit("b.txt", "two", "P1:  the phase", WORKTREE)

describe("mergeEpic()", () => {
  test("a stray file someone may have made in the main checkout:  refused, saying to ask Owen;  nothing moved", () => {
    writeFileSync(join(REPO, "a.txt"), "changed")
    expect(() => Requests.merge("tooling", REPO)).toThrow(/1 stray file.*\n  a\.txt\n.*epic merge tooling --ditch/s)
    expect(() => Requests.merge("tooling", WORKTREE)).toThrow(/stray file/)
    expect(readFileSync(join(REPO, "a.txt"), "utf8")).toBe("changed")
    git("checkout", "--", "a.txt")
  })

  test("more than a few is somebody's work:  refused, --ditch or not", () => {
    for (const name of ["n1", "n2", "n3", "n4"]) writeFileSync(join(REPO, `${name}.json5`), "{}")
    expect(() => Requests.merge("tooling", REPO, { ditch: true })).toThrow(/uncommitted work \(4 files\)/)
    expect(existsSync(join(REPO, "n4.json5"))).toBe(true)
    for (const name of ["n1", "n2", "n3", "n4"]) rmSync(join(REPO, `${name}.json5`))
  })

  test("fast-forwards main from the epic's own worktree (no ExitWorktree), returning the commits;  then nothing", () => {
    const { commits, ditched } = Requests.merge("tooling", WORKTREE)
    expect(commits.map((line) => line.replace(/^\w+ /, ""))).toEqual(["P1:  the phase"])
    expect(ditched).toEqual([])
    expect(git("log", "-1", "--format=%s", "main")).toBe("P1:  the phase")
    expect(Requests.merge("tooling", REPO).commits).toEqual([])
  })

  test("a test's snapshot is moved aside by itself;  a hand-made file once --ditch says so;  both kept, not deleted", () => {
    commit("e.txt", "five", "P3", WORKTREE)
    put("tests/x/__snapshots__/x.test.ts.snap", "stale")
    writeFileSync(join(REPO, "a.txt"), "changed")
    put("settings.json5", "{}")
    expect(() => Requests.merge("tooling", REPO)).toThrow(/2 stray files/)
    const folder = join(HOME, "moved")
    const { commits, ditched, ditchedTo } = Requests.merge("tooling", REPO, { ditch: true, ditched: folder })
    expect(commits.map((line) => line.replace(/^\w+ /, ""))).toEqual(["P3"])
    expect(ditched.sort()).toEqual(["a.txt", "settings.json5", "tests/x/__snapshots__/x.test.ts.snap"])
    expect(ditchedTo).toBe(folder)
    expect(readFileSync(join(folder, "a.txt"), "utf8")).toBe("changed")
    expect(readFileSync(join(folder, "tests/x/__snapshots__/x.test.ts.snap"), "utf8")).toBe("stale")
    expect(readFileSync(join(REPO, "a.txt"), "utf8")).toBe("one")
    expect(existsSync(join(REPO, "settings.json5"))).toBe(false)
    expect(git("status", "--porcelain")).toBe("")

    // generated only:  no --ditch needed
    commit("f.txt", "six", "P4", WORKTREE)
    put("tests/x/__snapshots__/y.test.ts.snap", "stale")
    expect(Requests.merge("tooling", REPO).ditched).toEqual(["tests/x/__snapshots__/y.test.ts.snap"])
    expect(new StrayFiles(REPO).files).toEqual([])
  })

  test("refuses once main has moved past the branch, moving nothing aside", () => {
    commit("c.txt", "three", "on main")
    commit("d.txt", "four", "P2", WORKTREE)
    put("tests/x/__snapshots__/z.test.ts.snap", "stale")
    expect(() => Requests.merge("tooling", REPO)).toThrow(/main has moved/)
    expect(existsSync(join(REPO, "tests/x/__snapshots__/z.test.ts.snap"))).toBe(true)
  })
})

/** Write `file`, from the repo's root, holding `text`. */
function put(file: string, text: string): void {
  mkdirSync(dirname(join(REPO, file)), { recursive: true })
  writeFileSync(join(REPO, file), text)
}

/** `git <args>` in `cwd` (default the repo), its output trimmed. */
function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim()
}

/** Commit `file` holding `text` in `cwd`, with `message`. */
function commit(file: string, text: string, message: string, cwd = REPO): void {
  writeFileSync(join(cwd, file), text)
  const run = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" })
  run("add", file)
  run("-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-q", "-m", message)
}
