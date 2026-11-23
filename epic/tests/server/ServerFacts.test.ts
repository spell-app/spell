import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { AT_LEAST, ServerFacts, openItemsOf } from "spell/epic/server/ServerFacts"

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
})
