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
  test("a stray file in a file the merge changes:  refused, saying to ask Owen;  nothing moved", () => {
    writeFileSync(join(REPO, "b.txt"), "mine")
    expect(() => Requests.merge("tooling", REPO)).toThrow(
      /1 stray file.*\n  b\.txt  \(new\)\n.*epic merge tooling --ditch/s
    )
    expect(() => Requests.merge("tooling", WORKTREE)).toThrow(/stray file/)
    expect(readFileSync(join(REPO, "b.txt"), "utf8")).toBe("mine")
    rmSync(join(REPO, "b.txt"))
  })

  test("more than a few is somebody's work:  refused, --ditch or not", () => {
    const names = ["n1", "n2", "n3", "n4"]
    for (const name of names) writeFileSync(join(WORKTREE, `${name}.json5`), "{ theirs: true }")
    git("-C", WORKTREE, "add", ...names.map((name) => `${name}.json5`))
    git("-C", WORKTREE, "-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-q", "-m", "four files")
    for (const name of names) writeFileSync(join(REPO, `${name}.json5`), "{}")
    expect(() => Requests.merge("tooling", REPO, { ditch: true })).toThrow(/uncommitted work \(4 files\)/)
    expect(existsSync(join(REPO, "n4.json5"))).toBe(true)
    for (const name of names) rmSync(join(REPO, `${name}.json5`))
  })

  test("uncommitted work in files the merge doesn't change is left alone, and the merge goes on (I270)", () => {
    writeFileSync(join(REPO, "a.txt"), "Owen's live edit")
    const { commits, ditched } = Requests.merge("tooling", WORKTREE)
    expect(commits.map((line) => line.replace(/^\w+ /, ""))).toEqual(["P1:  the phase", "four files"])
    expect(ditched).toEqual([])
    expect(git("log", "-1", "--format=%s", "main")).toBe("four files")
    expect(readFileSync(join(REPO, "a.txt"), "utf8")).toBe("Owen's live edit")
    expect(Requests.merge("tooling", REPO).commits).toEqual([])
    git("checkout", "--", "a.txt")
  })

  test("a test's snapshot is moved aside by itself;  a hand-made file once --ditch says so;  both kept, not deleted", () => {
    commit("e.txt", "five", "P3", WORKTREE)
    commit("tests/x/__snapshots__/x.test.ts.snap", "fresh", "P3's snapshot", WORKTREE)
    put("tests/x/__snapshots__/x.test.ts.snap", "stale")
    writeFileSync(join(REPO, "e.txt"), "mine")
    writeFileSync(join(REPO, "a.txt"), "changed")
    expect(() => Requests.merge("tooling", REPO)).toThrow(/1 stray file/)
    const folder = join(HOME, "moved")
    const { commits, ditched, ditchedTo } = Requests.merge("tooling", REPO, { ditch: true, ditched: folder })
    expect(commits.map((line) => line.replace(/^\w+ /, ""))).toEqual(["P3", "P3's snapshot"])
    expect(ditched.sort()).toEqual(["e.txt", "tests/x/__snapshots__/x.test.ts.snap"])
    expect(ditchedTo).toBe(folder)
    expect(readFileSync(join(folder, "e.txt"), "utf8")).toBe("mine")
    expect(readFileSync(join(folder, "tests/x/__snapshots__/x.test.ts.snap"), "utf8")).toBe("stale")
    expect(readFileSync(join(REPO, "e.txt"), "utf8")).toBe("five")
    // not the merge's:  left as it was
    expect(git("status", "--porcelain")).toBe("M a.txt")
    git("checkout", "--", "a.txt")

    // generated only:  no --ditch needed
    commit("f.txt", "six", "P4", WORKTREE)
    commit("tests/x/__snapshots__/y.test.ts.snap", "fresh", "P4's snapshot", WORKTREE)
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

describe("mergeTakingMain() (T83)", () => {
  test("main moved past the branch:  taken into it in its worktree first, then merged", () => {
    // left by the test above:  main has c.txt, the branch d.txt, and a stale snapshot sits in the main checkout
    expect(Requests.takeMainIn("tooling", REPO)).not.toBeNull()
    const { commits } = Requests.mergeTakingMain("tooling", REPO)[0]!
    expect(commits.some((line) => line.endsWith("P2"))).toBe(true)
    expect(readFileSync(join(REPO, "d.txt"), "utf8")).toBe("four")
    expect(readFileSync(join(WORKTREE, "c.txt"), "utf8")).toBe("three")
  })

  test("nothing to take in:  null, and the merge goes on as before", () => {
    commit("g.txt", "seven", "P5", WORKTREE)
    expect(Requests.takeMainIn("tooling", REPO)).toBeNull()
    const { commits } = Requests.mergeTakingMain("tooling", REPO)[0]!
    expect(commits.map((line) => line.replace(/^\w+ /, ""))).toEqual(["P5"])
  })

  test("a conflict it can't settle:  stops, naming the files, and merges nothing", () => {
    commit("x.txt", "main's", "x on main")
    commit("x.txt", "the branch's", "x on the branch", WORKTREE)
    const before = git("rev-parse", "main")
    expect(() => Requests.mergeTakingMain("tooling", REPO)).toThrow(/conflicts in x\.txt.*merge-main --continue/s)
    expect(git("rev-parse", "main")).toBe(before)
    git("-C", WORKTREE, "merge", "--abort")
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
  mkdirSync(dirname(join(cwd, file)), { recursive: true })
  writeFileSync(join(cwd, file), text)
  const run = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" })
  run("add", file)
  run("-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-q", "-m", message)
}
