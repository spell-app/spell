import { execFileSync } from "child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, join } from "path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

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

  test("another agent's uncommitted file in the worktree:  main still taken in and merged, the file left alone (I406)", () => {
    commit("h.txt", "eight", "h on main")
    commit("i.txt", "nine", "P6", WORKTREE)
    commit("wip.txt", "committed", "an agent's file", WORKTREE)
    writeFileSync(join(WORKTREE, "wip.txt"), "another agent, mid-change")
    const { commits } = Requests.mergeTakingMain("tooling", REPO)[0]!
    expect(commits.some((line) => line.endsWith("P6"))).toBe(true)
    expect(readFileSync(join(REPO, "i.txt"), "utf8")).toBe("nine")
    expect(readFileSync(join(WORKTREE, "h.txt"), "utf8")).toBe("eight")
    expect(readFileSync(join(WORKTREE, "wip.txt"), "utf8")).toBe("another agent, mid-change")
    expect(execFileSync("git", ["status", "--porcelain"], { cwd: WORKTREE, encoding: "utf8" })).toBe(" M wip.txt\n")

    // one the merge would change:  refused, naming it;  nothing merged
    commit("wip.txt", "main's", "wip on main")
    const before = git("rev-parse", "main")
    expect(() => Requests.mergeTakingMain("tooling", REPO)).toThrow(/files the merge changes.*\n  wip\.txt/s)
    expect(git("rev-parse", "main")).toBe(before)
    expect(readFileSync(join(WORKTREE, "wip.txt"), "utf8")).toBe("another agent, mid-change")
    execFileSync("git", ["checkout", "--", "wip.txt"], { cwd: WORKTREE })
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

describe("the packages, installed in the main checkout after the merge (T89)", () => {
  /** A repo of its own, on `main`, with branch `deps`, checked out in a worktree */
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "merge-install-")))
  const worktree = join(repo, ".claude", "worktrees", "deps")
  afterAll(() => rmSync(repo, { recursive: true, force: true }))
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: repo })
  commit(".gitignore", ".claude/\n", "ignore worktrees", repo)
  commit("yarn.lock", "v1\n", "first", repo)
  execFileSync("git", ["worktree", "add", "-q", "-b", "deps", worktree], { cwd: repo })

  /** A fake install runner:  each call's command and checkout, answering `ok` */
  const runner = (ok = true) => {
    const calls: { install: string[]; root: string }[] = []
    return { calls, run: (install: string[], root: string) => (calls.push({ install, root }), ok) }
  }
  const command = ["yarn", "install"]

  test("no lockfile or package.json changed:  nothing installed", () => {
    commit("src/a.txt", "a", "P1:  code only", worktree)
    const { calls, run } = runner()
    const [merged] = Requests.mergeEach("deps", repo, { install: { command, run } })
    expect(merged!.commits).toHaveLength(1)
    expect(merged!.installed).toBeUndefined()
    expect(calls).toEqual([])
    expect(Requests.installReport([merged!])).toEqual({ lines: [], restart: false })
  })

  test("the lockfile changed:  installed in the MAIN checkout, said, and the page server restarts", () => {
    commit("yarn.lock", "v2\n", "P2:  a dependency", worktree)
    const { calls, run } = runner()
    const [merged] = Requests.mergeEach("deps", worktree, { install: { command, run } })
    expect(calls).toEqual([{ install: command, root: repo }])
    expect(merged!.installed).toEqual({ command: "yarn install", root: repo, changed: ["yarn.lock"], ok: true })
    expect(Requests.installReport([merged!])).toEqual({
      lines: ["main checkout:  installed the packages:  `yarn install` (yarn.lock changed)"],
      restart: true
    })
  })

  test("a package.json changed, anywhere:  installed too", () => {
    commit("app/package.json", "{}\n", "P3:  a workspace's dependency", worktree)
    const { calls, run } = runner()
    const [merged] = Requests.mergeEach("deps", repo, { install: { command, run } })
    expect(calls).toHaveLength(1)
    expect(merged!.installed?.changed).toEqual(["app/package.json"])
  })

  test("a failed install:  the merge stands, said loudly, with what to run by hand;  no restart", () => {
    commit("yarn.lock", "v3\n", "P4:  another", worktree)
    const [merged] = Requests.mergeEach("deps", repo, { install: { command, run: runner(false).run } })
    expect(execFileSync("git", ["log", "-1", "--format=%s", "main"], { cwd: repo, encoding: "utf8" }).trim()).toBe(
      "P4:  another"
    )
    expect(merged!.installed?.ok).toBe(false)
    const { lines, restart } = Requests.installReport([merged!])
    expect(lines).toEqual([
      "main checkout:  `yarn install` FAILED (yarn.lock changed):  the merge stands;  run it by hand:  " +
        `cd ${repo} && yarn install, then epic server stop && epic server start --all`
    ])
    expect(restart).toBe(false)
  })

  test("a runner that throws:  failed, the same", () => {
    commit("yarn.lock", "v4\n", "P5:  one more", worktree)
    const run = () => {
      throw new Error("no yarn")
    }
    const [merged] = Requests.mergeEach("deps", repo, { install: { command, run } })
    expect(merged!.installed?.ok).toBe(false)
  })
})

describe("refreshPageServer() (T89)", () => {
  /** A fake page server:  what was done to it, in order */
  const fakeServer = (running: boolean, launched = false) => {
    const done: string[] = []
    const server = {
      isRunning: async () => (done.push("asked"), running),
      stop: async () => done.push("stopped"),
      ensure: async () => (done.push("started"), { base: "http://127.0.0.1:4747", launched })
    }
    return { done, server }
  }

  test("after an install:  a running one is stopped and started again, its editor with it", async () => {
    const { done, server } = fakeServer(true)
    const out = await captured(() => Requests.refreshPageServer(REPO, { restart: true, server }))
    expect(done).toEqual(["asked", "stopped", "started"])
    expect(out).toBe("page server restarted after the install, its editor with it:  http://127.0.0.1:4747\n")
  })

  test("no install:  only restarted when its code changed (ensure), as before", async () => {
    const { done, server } = fakeServer(true)
    expect(await captured(() => Requests.refreshPageServer(REPO, { server }))).toBe("")
    expect(done).toEqual(["asked", "started"])
  })

  test("not running:  left stopped, install or not", async () => {
    const { done, server } = fakeServer(false)
    await Requests.refreshPageServer(REPO, { restart: true, server })
    expect(done).toEqual(["asked"])
  })

  test("a restart that fails:  one line, with what to run by hand;  never throws", async () => {
    const server = { ...fakeServer(true).server, ensure: () => Promise.reject(new Error("port taken")) }
    const out = await captured(() => Requests.refreshPageServer(REPO, { restart: true, server }))
    expect(out).toBe(
      "page server:  not restarted (port taken);  by hand:  epic server stop && epic server start --all\n"
    )
  })
})

/** What `run` writes to stdout, while it runs. */
async function captured(run: () => Promise<void>): Promise<string> {
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
  try {
    await run()
    return spy.mock.calls.map(([chunk]) => String(chunk)).join("")
  } finally {
    spy.mockRestore()
  }
}

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
