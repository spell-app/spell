import { execFileSync } from "node:child_process"
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

/** A scratch repo with one commit, and a worktree of it. */
const TOP = realpathSync(mkdtempSync(join(tmpdir(), "git-")))
const REPO = join(TOP, "repo")
const WORKTREE = join(TOP, "wt")
execFileSync("git", ["init", "-q", "-b", "main", REPO])
writeFileSync(join(REPO, "a.txt"), "a\n")
writeFileSync(join(REPO, "b.txt"), "b\n")
const GIT_ID = ["-c", "user.name=t", "-c", "user.email=t@t"]
execFileSync("git", [...GIT_ID, "-C", REPO, "add", "."])
execFileSync("git", [...GIT_ID, "-C", REPO, "commit", "-qm", "one"])
execFileSync("git", ["-C", REPO, "worktree", "add", "-q", WORKTREE, "-b", "wt"])
afterAll(() => rmSync(TOP, { recursive: true, force: true }))

describe("Git", () => {
  test("run():  ok, output trimmed;  a failure is `ok: false`, never a throw", () => {
    expect(SRV.Git.run(["rev-parse", "--abbrev-ref", "HEAD"], REPO)).toMatchObject({ ok: true, out: "main", code: 0 })
    const failed = SRV.Git.run(["rev-parse", "no-such-ref"], REPO)
    expect(failed.ok).toBe(false)
    expect(failed.err).toMatch(/no-such-ref/)
    expect(SRV.Git.run(["status"], join(TOP, "missing")).ok).toBe(false)
  })

  test("out() and lines():  `undefined` and `[]` when it fails", () => {
    expect(SRV.Git.out(["rev-parse", "--abbrev-ref", "HEAD"], WORKTREE)).toBe("wt")
    expect(SRV.Git.out(["rev-parse", "no-such-ref"], REPO)).toBeUndefined()
    expect(SRV.Git.lines(["ls-files"], REPO)).toEqual(["a.txt", "b.txt"])
    expect(SRV.Git.lines(["ls-files"], join(TOP, "missing"))).toEqual([])
  })

  test("run() with `trim: false`:  the output as git printed it", () => {
    writeFileSync(join(REPO, "a.txt"), "changed\n")
    expect(SRV.Git.run(["status", "--porcelain"], REPO, { trim: false }).out).toBe(" M a.txt\n")
    execFileSync("git", ["-C", REPO, "checkout", "-q", "a.txt"])
  })

  test("mustRun():  its output, else a `GitError` naming the command, the folder and git's words", () => {
    expect(SRV.Git.mustRun(["rev-parse", "--abbrev-ref", "HEAD"], REPO)).toBe("main")
    expect(() => SRV.Git.mustRun(["rev-parse", "no-such-ref"], REPO)).toThrow(SRV.GitError)
    expect(() => SRV.Git.mustRun(["rev-parse", "no-such-ref"], REPO)).toThrow(
      new RegExp(`git rev-parse no-such-ref failed in ${REPO}:  .*no-such-ref`)
    )
  })

  test("mainRoot():  the main checkout, from a worktree too;  outside git, the folder itself", () => {
    expect(SRV.Git.mainRoot(WORKTREE)).toBe(REPO)
    expect(SRV.Git.mainRoot(REPO)).toBe(REPO)
    expect(SRV.Git.mainRoot(TOP)).toBe(TOP)
  })
})
