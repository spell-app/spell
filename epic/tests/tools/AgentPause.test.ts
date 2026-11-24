/**
 * `AgentPause` (epic `epic-engine` T139):  what's saved of a paused agent, from a scratch git repo and worktree, the
 * brief that starts it again, and `epic agents pause | resume` run as a session runs them.
 * - Nothing here starts, stops or messages an agent.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, beforeEach, expect, test } from "vite-plus/test"

import { Git } from "spell/server/Git"
import { FreshPause } from "spell/epic/command/FreshPause"
import { AgentList } from "spell/epic/tools/AgentList"
import { AgentPause } from "spell/epic/tools/AgentPause"

/** The epic command, as a session runs it. */
const EPIC = fileURLToPath(new URL("../../bin/epic", import.meta.url))

const OLD_SESSION = "0a1b2c3d-0000-4000-8000-000000000001"
const NEW_SESSION = "0a1b2c3d-0000-4000-8000-000000000002"

let scratch: string
let main: string
let worktree: string

/** Git in `cwd`, as a made-up author. */
function git(cwd: string, ...args: string[]): string {
  return Git.mustRun(["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], cwd)
}

/** Write `text` to `path` in `cwd`, its folders made. */
function write(cwd: string, path: string, text: string) {
  mkdirSync(join(cwd, path, ".."), { recursive: true })
  writeFileSync(join(cwd, path), text)
}

beforeEach(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), "agent-pause-")))
  main = join(scratch, "repo")
  worktree = join(scratch, "worktrees", "seo")
  const settings = { contentFolder: "../content", worktreesFolder: "../worktrees", baseBranch: "main" }
  write(main, ".epic/config.json5", JSON.stringify(settings))
  write(main, "src/mine.txt", "one\n")
  write(main, "src/theirs.txt", "one\n")
  write(scratch, "content/epics/seo/seo.plan.html", "<!doctype html>")
  git(main, "init", "-q", "-b", "main")
  git(main, "add", ".")
  // committed long before any agent started
  Git.mustRun(["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-q", "-m", "start"], main, {
    env: { ...process.env, GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" }
  })
  git(main, "worktree", "add", "-q", "-b", "seo", worktree)
})
afterEach(() => {
  FreshPause.end()
  rmSync(scratch, { recursive: true, force: true })
})

test("save():  files, commits and whether merged, the next step;  another agent's work is left EXACTLY as it was", () => {
  const list = new AgentList(main, { epic: "seo" })
  list.add("mine", "fix I407 in the parser", { taskId: "a1", files: ["src/mine.txt", "src/new"] })
  list.add("theirs", "the docs", { files: ["src/theirs.txt"] })
  write(worktree, "src/mine.txt", "two\n")
  git(worktree, "commit", "-q", "-m", "merged one", "--", "src/mine.txt")
  git(main, "merge", "-q", "--ff-only", "seo")
  write(worktree, "src/mine.txt", "three\n")
  git(worktree, "commit", "-q", "-m", "open one", "--", "src/mine.txt")
  write(worktree, "src/mine.txt", "four\n")
  write(worktree, "src/new/file.txt", "new\n")
  write(worktree, "src/theirs.txt", "their work\n")
  write(worktree, "stray.txt", "nobody's\n")
  const status = git(worktree, "status", "--short", "--untracked-files=all")

  const { agent, saved } = AgentPause.save(list, "mine", {
    root: main,
    next: "run the parser's tests",
    tests: "yarn test:unit",
    session: OLD_SESSION
  })
  expect(saved).toMatchObject({
    checkout: worktree,
    next: "run the parser's tests",
    item: "I407",
    tests: "yarn test:unit",
    session: OLD_SESSION,
    uncommitted: ["src/mine.txt", "src/new/file.txt"],
    unclaimed: ["stray.txt"]
  })
  expect(saved.merge).toBeUndefined()
  expect(saved.commits.map(({ subject, merged }) => [subject, merged])).toEqual([
    ["open one", false],
    ["merged one", true]
  ])
  expect(agent).toMatchObject({ name: "seo-mine", status: "paused", files: ["src/mine.txt", "src/new"] })
  expect(git(worktree, "status", "--short", "--untracked-files=all")).toBe(status)
  expect(readFileSync(join(worktree, "src/theirs.txt"), "utf8")).toBe("their work\n")
  // still guarded:  another agent can't take its files, and it's read back by any session
  expect(() => list.claim("theirs", ["src/mine.txt"])).toThrow(/seo-mine has/)
  expect(new AgentList(worktree).agents[0]?.paused).toEqual(saved)
})

test("save():  a merge stopped on conflicts is stated, with how to carry it on, and left in progress", () => {
  write(main, "src/mine.txt", "main's\n")
  git(main, "commit", "-q", "-m", "main's", "--", "src/mine.txt")
  write(worktree, "src/mine.txt", "the branch's\n")
  git(worktree, "commit", "-q", "-m", "branch's", "--", "src/mine.txt")
  expect(Git.run(["merge", "main"], worktree).ok).toBe(false)
  const list = new AgentList(worktree)
  list.add("mine", "merge main")
  const { saved } = AgentPause.save(list, "mine", { root: worktree, next: "finish the merge" })
  expect(saved.merge).toMatch(/conflicts left in src\/mine.txt.*merge-main --continue/)
  expect(Git.run(["rev-parse", "-q", "--verify", "MERGE_HEAD"], worktree).ok).toBe(true)
})

test("brief():  everything saved, and how to start it:  the same session messages it, a new one starts an Agent", async () => {
  const list = new AgentList(worktree)
  list.add("mine", "fix it", { taskId: "a1", files: ["src/mine.txt"] })
  await list.redirect("mine", "keep it small")
  write(worktree, "src/mine.txt", "half\n")
  AgentPause.save(list, "mine", { root: worktree, next: "finish it", item: "T7", session: OLD_SESSION })
  const agent = list.agents[0]!
  const brief = AgentPause.brief(agent, { session: NEW_SESSION })
  for (const part of ["seo-mine", "fix it", "T7", worktree, "finish it", "src/mine.txt", "keep it small"])
    expect(brief).toContain(part)
  expect(brief).toContain("a new Agent")
  expect(brief).not.toContain("a1 with all")
  expect(AgentPause.brief(agent, { session: OLD_SESSION })).toContain("SendMessage to a1")
})

test("the command:  nothing starts during a round;  after it, resumed once", () => {
  const epic = (session: string, ...args: string[]) =>
    spawnSync(process.execPath, [EPIC, "agents", ...args], {
      cwd: worktree,
      encoding: "utf8",
      env: { ...process.env, EPIC_CHECKOUT: worktree, CLAUDE_CODE_SESSION_ID: session }
    })
  expect(epic(OLD_SESSION, "add", "mine", "fix it").status).toBe(0)
  FreshPause.start({
    initiator: { session: "🚧 seo", sessionId: OLD_SESSION },
    running: [{ epic: "seo", session: "🚧 seo", sessionId: OLD_SESSION }]
  })
  expect(epic(OLD_SESSION, "pause", "mine").status).toBe(2)
  expect(epic(OLD_SESSION, "pause", "mine", "--next", "finish it").status).toBe(0)
  expect(epic(OLD_SESSION, "done", "mine").status).toBe(1)
  expect(epic(OLD_SESSION, "add", "more", "new work").status).toBe(1)
  expect(epic(NEW_SESSION, "resume", "mine").status).toBe(1)
  FreshPause.end()
  const resumed = epic(NEW_SESSION, "resume", "mine")
  expect(resumed.status).toBe(0)
  expect(resumed.stdout).toContain("next step:  finish it")
  expect(epic(NEW_SESSION, "resume", "mine").status).toBe(1)
}, 60_000)
