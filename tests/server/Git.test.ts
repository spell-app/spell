import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
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

  test("config():  a key as git reads it in the folder;  `undefined` when unset", () => {
    execFileSync("git", ["-C", REPO, "config", "spell.test", "Ana Lima"])
    expect(SRV.Git.config("spell.test", REPO)).toBe("Ana Lima")
    expect(SRV.Git.config("spell.no-such-key", REPO)).toBeUndefined()
  })

  test("mainRoot():  the main checkout, from a worktree too;  outside git, the folder itself", () => {
    expect(SRV.Git.mainRoot(WORKTREE)).toBe(REPO)
    expect(SRV.Git.mainRoot(REPO)).toBe(REPO)
    expect(SRV.Git.mainRoot(TOP)).toBe(TOP)
  })

  test("exclude():  the main checkout's private ignore list, from a worktree too;  each line once, its note once", () => {
    const file = join(REPO, ".git", "info", "exclude")
    expect(SRV.Git.excludeFile(WORKTREE)).toBe(file)
    expect(SRV.Git.exclude(["/epics", "/.epic/"], "# epic init --local", WORKTREE, { dryRun: true })).toEqual([
      "/epics",
      "/.epic/"
    ])
    expect(readFileSync(file, "utf8")).not.toContain("/epics")
    expect(SRV.Git.exclude(["/epics", "/.epic/"], "# epic init --local", WORKTREE)).toEqual(["/epics", "/.epic/"])
    expect(SRV.Git.exclude(["/epics", "/guides"], "# epic init --local", REPO)).toEqual(["/guides"])
    expect(readFileSync(file, "utf8")).toMatch(/\n# epic init --local\n\/epics\n\/\.epic\/\n\/guides\n$/)
    // a link, listed without a slash, is ignored in every checkout;  the worktree's status stays clean
    mkdirSync(join(TOP, "shared", "epics"), { recursive: true })
    symlinkSync(join(TOP, "shared", "epics"), join(WORKTREE, "epics"))
    expect(SRV.Git.run(["status", "--porcelain"], WORKTREE).out).toBe("")
  })
})
