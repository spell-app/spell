import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { AT_LEAST, ServerFacts, openItemsOf } from "spell/epic/server/ServerFacts"
import type { EpicWorktree } from "spell/epic/server/server.types"

describe("ServerFacts:  what the Servers tab says beside the servers (epic `epic-engine` P82)", () => {
  let folder: string

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "server-facts-")))
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  /** git in `folder`, quietly */
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: folder, stdio: "pipe" })

  it("mergedIntoMain:  only landings count, never a reset;  at least AT_LEAST shown", () => {
    git("init", "-q", "-b", "main")
    for (let index = 1; index <= AT_LEAST + 1; index++) git("commit", "-q", "--allow-empty", "-m", `landing ${index}`)
    git("reset", "-q", "--hard", "HEAD~1")
    const moves = ServerFacts.mergedIntoMain(folder, "main", Date.now() + 3_600_000)
    expect(moves.map((move) => move.subject)).toEqual(["landing 6", "landing 5", "landing 4", "landing 3", "landing 2"])
    expect(moves.every((move) => !move.isNew && move.commits === 1 && !move.branch)).toBe(true)
    // within the last 10 minutes:  every landing, marked new
    expect(ServerFacts.mergedIntoMain(folder, "main").filter((move) => move.isNew)).toHaveLength(AT_LEAST + 1)
  })

  it("mergedIntoMain:  a merged branch by its name and its own commits;  a branch that only merged main in, left out", () => {
    git("init", "-q", "-b", "main")
    git("commit", "-q", "--allow-empty", "-m", "start")
    git("checkout", "-q", "-b", "editor")
    git("commit", "-q", "--allow-empty", "-m", "editor P43:  Spell UI site -- the details")
    git("commit", "-q", "--allow-empty", "-m", "editor P44:  Epic UI -- the details")
    git("checkout", "-q", "main")
    git("merge", "-q", "editor")
    // a branch with nothing of its own merges main into itself, and main fast-forwards to that
    git("checkout", "-q", "-b", "idle", "HEAD~2")
    git("merge", "-q", "--no-ff", "-m", "Merge main into idle", "main")
    git("checkout", "-q", "main")
    git("merge", "-q", "idle")
    const [newest, ...rest] = ServerFacts.mergedIntoMain(folder, "main")
    expect(newest).toMatchObject({ branch: "editor", commits: 2, subject: "editor P44:  Epic UI -- the details" })
    expect(rest.map((move) => move.branch)).not.toContain("idle")
  })

  it("openItemsOf:  open issues, todos and questions, in words;  judgement calls and tests left out", () => {
    const page = join(folder, "x.plan.html")
    mkdirSync(folder, { recursive: true })
    writeFileSync(
      page,
      `<epic-page>
        <epic-item id="i1" status="open"></epic-item><epic-item
          id="i2"
          status="open"
        ></epic-item><epic-item id="i3" status="done"></epic-item>
        <epic-item id="t1" status="open"></epic-item>
        <epic-item id="j1" status="open"></epic-item><epic-item id="m1" status="open"></epic-item>
      </epic-page>`
    )
    expect(openItemsOf(page)).toBe("2 issues, 1 todo open")
    expect(openItemsOf(join(folder, "missing.html"))).toBeUndefined()
  })

  it("lastWorked:  the branch's newest commit, or an uncommitted file changed since", () => {
    git("init", "-q", "-b", "prefs")
    git("commit", "-q", "--allow-empty", "-m", "start", "--date=2026-11-01T10:00:00Z")
    const committed = ServerFacts.lastWorked(folder, "prefs")
    expect(committed?.by).toBe("commit")

    // a file older than the commit doesn't count;  a newer one does
    const file = join(folder, "draft.txt")
    writeFileSync(file, "x")
    const old = new Date("2020-01-01T00:00:00Z")
    utimesSync(file, old, old)
    expect(ServerFacts.lastWorked(folder, "prefs")).toEqual(committed)
    const later = new Date(Date.parse(committed!.at) + 60_000)
    utimesSync(file, later, later)
    expect(ServerFacts.lastWorked(folder, "prefs")).toEqual({ at: later.toISOString(), by: "change" })

    expect(ServerFacts.lastWorked(join(folder, "gone"), "prefs")).toBeUndefined()
  })

  it("newestFirst:  the worktree worked on last comes first;  never worked out, last", () => {
    const worktree = (name: string, at?: string): EpicWorktree => ({
      epic: name,
      worktree: name,
      url: "",
      ahead: 0,
      ...(at && { worked: { at, by: "commit" as const } })
    })
    const sorted = ServerFacts.newestFirst([
      worktree("prefs-and-undo", "2026-10-30T10:00:00.000Z"),
      worktree("unknown"),
      worktree("editor", "2026-11-23T09:00:00.000Z"),
      worktree("atmosphere", "2026-11-22T09:00:00.000Z")
    ])
    expect(sorted.map((one) => one.worktree)).toEqual(["editor", "atmosphere", "prefs-and-undo", "unknown"])
  })
})
