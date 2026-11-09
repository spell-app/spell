/**
 * A repo whose base branch takes only pull requests (`baseBranchProtected`), on throwaway repos:
 * - the "GitHub" is a local bare repo whose `pre-receive` hook refuses every push to `main`
 * - `gh` is a stand-in script named by `$SPELL_EPIC_GH`
 * - the path holds `github.com/acme/app`, so `GitHub.repoIn()` reads it as GitHub's
 */
import { execFileSync, spawnSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { BaseBranch } from "spell/epic/command/BaseBranch"
import { MainMerge } from "spell/epic/command/MainMerge"
import { RepoInit } from "spell/epic/command/RepoInit"
import { Requests } from "spell/epic/command/Requests"
import { Worktrees } from "spell/epic/command/Worktrees"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { GitHub } from "spell/epic/config/GitHub"

/** The worktree hook, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks/worktree.mjs")

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "protected-base-")))
const before = { ...process.env }
process.env.SPELL_EPIC_HOME = join(TEMP, "epic-home")
process.env.GIT_CONFIG_GLOBAL = join(TEMP, "gitconfig")
process.env.GIT_CONFIG_NOSYSTEM = "1"
writeFileSync(
  join(TEMP, "gitconfig"),
  '[user]\n  name = Ana Lima\n  email = ana@example.com\n[commit]\n  gpgsign = false\n[protocol "file"]\n  allow = always\n'
)
afterAll(() => {
  for (const key of ["SPELL_EPIC_HOME", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "SPELL_EPIC_GH"])
    if (before[key] === undefined) delete process.env[key]
    else process.env[key] = before[key]
  rmSync(TEMP, { recursive: true, force: true })
})

/** every test gets its own stand-in `gh` state:  no rules, nothing merged */
const GH = join(TEMP, "gh")
const GH_STATE = join(TEMP, "gh-state")
const GH_LOG = join(TEMP, "gh.log")
beforeAll(() => {
  mkdirSync(GH_STATE)
  writeFileSync(
    GH,
    `#!/bin/sh
echo "$*" >> "${GH_LOG}"
case "$1 $2" in
  "--version "*) echo "gh version 2.0.0" ;;
  "auth status") [ -f "${GH_STATE}/logged-out" ] && exit 1;  exit 0 ;;
  "api repos/acme/app/rules"*) cat "${GH_STATE}/rules" 2>/dev/null || echo '[]' ;;
  "api repos/acme/app/branches"*) cat "${GH_STATE}/protection" 2>/dev/null || { echo Not Found >&2;  exit 1; } ;;
  "pr list") case "$*" in *merged*) cat "${GH_STATE}/merged" 2>/dev/null || echo '[]' ;; *) echo '[]' ;; esac ;;
  "pr create") echo "https://github.com/acme/app/pull/7" ;;
  *) echo "stub gh:  $*" >&2;  exit 1 ;;
esac
`
  )
  chmodSync(GH, 0o755)
  process.env.SPELL_EPIC_GH = GH
})
afterEach(() => rmSync(GH_LOG, { force: true }))

/** Set what the stand-in `gh` answers:  `rules`, `protection`, `merged` (JSON), `logged-out` (any text);  `undefined` clears it. */
function ghSays(file: "rules" | "protection" | "merged" | "logged-out", text?: string) {
  const path = join(GH_STATE, file)
  if (text === undefined) rmSync(path, { force: true })
  else writeFileSync(path, text)
}

let count = 0

/** A clone of a bare "GitHub" repo, on `main`, one commit in;  pushes to `main` refused once `protect` is on. */
function clone({ protect = true } = {}): { app: string; origin: string; refuse: (on: boolean) => void } {
  const folder = join(TEMP, `repo-${++count}`)
  const origin = join(folder, "github.com/acme/app.git")
  const app = join(folder, "app")
  mkdirSync(dirname(origin), { recursive: true })
  mkdirSync(app, { recursive: true })
  git(folder, "init", "-q", "--bare", "-b", "main", origin)
  git(app, "init", "-q", "-b", "main")
  writeFileSync(join(app, "README.md"), "# app\n")
  git(app, "add", "-A")
  git(app, "commit", "-q", "-m", "first")
  git(app, "remote", "add", "origin", `file://${origin}`)
  git(app, "push", "-q", "-u", "origin", "main")
  const hook = join(origin, "hooks/pre-receive")
  writeFileSync(
    hook,
    `#!/bin/sh
while read old new ref;  do [ "$ref" = refs/heads/main ] && { echo "GH006: pull request required" >&2;  exit 1; };  done
exit 0
`
  )
  chmodSync(hook, 0o755)
  const refuse = (on: boolean) => chmodSync(hook, on ? 0o755 : 0o644)
  refuse(protect)
  return { app, origin, refuse }
}

/** `RepoInit` for `main`:  a stand-in plugin and server, no remote for the plans. */
function init(main: string) {
  const plugin = () => ({ isInstalled: () => true, install: () => ({ changes: [] }) }) as never
  const hub = () => ({ registerHere: () => undefined, addressOf: async () => "http://x/" }) as never
  return new RepoInit({ main, plugin, hub })
}

/** `RepoInit.commitStep()`'s lines for the report of an `init()` that commits, without colour. */
function lines(report: Parameters<typeof RepoInit.lines>[0]) {
  // oxlint-disable-next-line no-control-regex -- removing terminal colour codes
  return RepoInit.lines(report).map((line) => line.replace(/\u001b\[[0-9;]*m/g, ""))
}

describe("epic init, the base branch takes only pull requests", () => {
  test("--protected-base:  the files go on epic-setup, pushed, a pull request opened;  local main stays clean", async () => {
    const { app } = clone()
    const head = git(app, "rev-parse", "main")
    const report = await init(app).init({ noRemote: true, protectedBase: true, commit: true })
    expect(report.protection).toEqual({ action: "flag", on: true })
    expect(report.commit).toMatchObject({
      action: "on branch",
      branch: "epic-setup",
      push: "pushed",
      pullRequest: "https://github.com/acme/app/pull/7"
    })
    expect(git(app, "rev-parse", "main")).toBe(head)
    expect(git(app, "branch", "--show-current")).toBe("main")
    expect(git(app, "status", "--porcelain")).toBe("")
    expect(existsSync(join(app, EpicConfig.FILE))).toBe(false)
    expect(git(app, "show", `origin/epic-setup:${EpicConfig.FILE}`)).toMatch(/"baseBranchProtected": true/)
    expect(git(app, "show", "origin/epic-setup:.gitignore")).toMatch(/\/epics/)
    expect(readFileSync(GH_LOG, "utf8")).toMatch(/pr create --base main --head epic-setup/)
    expect(lines(report).join("\n")).toMatch(/Once it's merged:  git pull on main.*teammates can join then/)
  })

  test("GitHub's pull_request rule turns it on, saying so in one line;  gh not logged in:  what to run", async () => {
    const { app } = clone()
    ghSays("rules", '[{"type":"pull_request","ruleset_id":1}]')
    ghSays("logged-out", "x")
    const quiet = await init(app).init({ noRemote: true, dryRun: true })
    expect(quiet.protection.action).toBe("off")
    ghSays("logged-out")
    const found = await init(app).init({ noRemote: true, commit: true })
    expect(found.protection).toEqual({ action: "detected", on: true })
    expect(lines(found).filter((line) => /GitHub requires a pull request into main/.test(line))).toHaveLength(1)
    ghSays("rules")
  })

  test("classic branch protection counts too;  detection failing never fails init", async () => {
    const { app } = clone({ protect: false })
    ghSays("protection", '{"required_pull_request_reviews":{}}')
    expect(GitHub.requiresPullRequest("acme/app", "main")).toBe(true)
    ghSays("protection", "not json")
    expect(GitHub.requiresPullRequest("acme/app", "main")).toBe(false)
    ghSays("protection")
    const was = process.env.SPELL_EPIC_GH
    process.env.SPELL_EPIC_GH = join(TEMP, "no-such-gh")
    try {
      const report = await init(app).init({ noRemote: true, dryRun: true })
      expect(report.protection).toEqual({ action: "off", on: false })
    } finally {
      process.env.SPELL_EPIC_GH = was
    }
  })

  test("gh logged out:  pushed, and the exact commands printed", async () => {
    const { app } = clone()
    ghSays("logged-out", "x")
    const report = await init(app).init({ noRemote: true, protectedBase: true, commit: true })
    expect(report.commit).toMatchObject({ push: "pushed", pullRequestError: "gh isn't logged in to GitHub" })
    expect(lines(report).join("\n")).toMatch(/gh pr create --base main --head epic-setup --fill/)
    ghSays("logged-out")
  })

  test("--dry-run and --no-commit change nothing;  a config saying false stays false, and says so", async () => {
    const { app } = clone()
    const dry = await init(app).init({ noRemote: true, protectedBase: true, commit: true, dryRun: true })
    expect(dry.commit?.action).toBe("would branch")
    expect(git(app, "branch", "--list", "epic-setup")).toBe("")
    expect(existsSync(join(app, ".gitignore"))).toBe(false)

    mkdirSync(join(app, ".epic"))
    writeFileSync(join(app, EpicConfig.FILE), '{ "baseBranchProtected": false }\n')
    ghSays("rules", '[{"type":"pull_request"}]')
    const kept = await init(app).init({ noRemote: true })
    expect(kept.protection.action).toBe("says off")
    expect(new EpicConfig(app).baseBranchProtected).toBe(false)
    expect(lines(kept).join("\n")).toMatch(/says baseBranchProtected false:  epic init --protected-base turns it on/)
    ghSays("rules")
    // no `commit`:  --no-commit's way;  the flag's key is written, nothing committed
    await init(app).init({ noRemote: true, protectedBase: true })
    expect(new EpicConfig(app).baseBranchProtected).toBe(true)
    expect(git(app, "branch", "--list", "epic-setup")).toBe("")
  })

  test("no setting:  a refused push keeps today's commit, says the fix;  rerunning with the flag takes the commit back", async () => {
    const { app } = clone()
    const report = await init(app).init({ noRemote: true, commit: true })
    expect(report.commit).toMatchObject({ action: "committed", push: "failed" })
    expect(RepoInit.commitResultLines(report.commit!).join("\n")).toMatch(/epic init --protected-base/)
    expect(git(app, "rev-list", "--count", "origin/main..main")).toBe("1")

    const again = await init(app).init({ noRemote: true, protectedBase: true, commit: true })
    expect(again.commit).toMatchObject({ action: "on branch", push: "pushed" })
    expect(git(app, "rev-list", "--count", "origin/main..main")).toBe("0")
    expect(git(app, "status", "--porcelain")).toBe("")
    expect(git(app, "show", `epic-setup:${EpicConfig.FILE}`)).toMatch(/"baseBranchProtected": true/)
  })

  test("run again with its pull request open:  still not on main, the branch reused", async () => {
    const { app } = clone()
    await init(app).init({ noRemote: true, protectedBase: true, commit: true })
    const tip = git(app, "rev-parse", "epic-setup")
    const again = await init(app).init({ noRemote: true, commit: true })
    expect(again.protection).toEqual({ action: "config", on: true })
    expect(again.commit).toMatchObject({ action: "on branch", push: "pushed" })
    expect(git(app, "rev-parse", "epic-setup")).toBe(tip)
    expect(git(app, "rev-list", "--count", "origin/main..main")).toBe("0")
    expect(git(app, "status", "--porcelain")).toBe("")
  })
})

describe("what lands on the base branch, once it takes only pull requests", () => {
  /** A set-up repo, the setting on and committed, with branch `seo` one commit ahead, in a worktree. */
  function setUp() {
    const repo = clone()
    const { app } = repo
    mkdirSync(join(app, ".epic"))
    writeFileSync(join(app, EpicConfig.FILE), '{ "baseBranchProtected": true, "contentFolder": "../epics" }\n')
    git(app, "add", "-A")
    git(app, "commit", "-q", "-m", "setup")
    repo.refuse(false)
    git(app, "push", "-q")
    repo.refuse(true)
    const worktree = join(dirname(app), "wt", "seo")
    mkdirSync(dirname(worktree), { recursive: true })
    git(app, "worktree", "add", "-q", "-b", "seo", worktree, "main")
    writeFileSync(join(worktree, "seo.txt"), "work\n")
    git(worktree, "add", "-A")
    git(worktree, "commit", "-q", "-m", "P1:  the work")
    return { ...repo, worktree }
  }

  /** The commit a merged pull request made on GitHub's `main`, by way of a second clone. */
  function githubMerges({ origin, refuse }: { origin: string; refuse: (on: boolean) => void }, file: string) {
    const other = join(dirname(origin), `other-${++count}`)
    git(TEMP, "clone", "-q", `file://${origin}`, other)
    writeFileSync(join(other, file), "merged\n")
    git(other, "add", "-A")
    git(other, "commit", "-q", "-m", "PR merged")
    refuse(false)
    git(other, "push", "-q")
    refuse(true)
  }

  test("epic merge refuses, in one line, and moves nothing", () => {
    const { app, worktree } = setUp()
    const head = git(app, "rev-parse", "main")
    expect(() => Requests.merge("seo", worktree)).toThrow(
      /^merge:  main takes only pull requests here .*nothing merged$/
    )
    expect(git(app, "rev-parse", "main")).toBe(head)
  })

  test("merge-main fast-forwards local main from origin first, and says so", () => {
    const repo = setUp()
    githubMerges(repo, "pr.txt")
    const report = new MainMerge({ root: repo.worktree, generators: [], snapshotUpdate: null, rename: [] }).run()
    expect(report.result).toBe("merged")
    expect(report.baseCatchUp).toMatch(/fast-forwarded from origin \(1 commit/)
    expect(existsSync(join(repo.worktree, "pr.txt"))).toBe(true)
    expect(existsSync(join(repo.app, "pr.txt"))).toBe(true)
  })

  test("a new worktree is cut from main fast-forwarded from origin:  the worktree hook, with its line", () => {
    const repo = setUp()
    githubMerges(repo, "pr.txt")
    const made = spawnSync(process.execPath, [HOOK, "create"], {
      input: JSON.stringify({ name: "fresh", cwd: repo.app }),
      encoding: "utf8",
      env: { ...process.env, CLAUDE_CONFIG_DIR: join(TEMP, "claude") }
    })
    expect(made.status).toBe(0)
    expect(made.stderr).toMatch(/local main fast-forwarded from origin/)
    expect(existsSync(join(made.stdout.trim(), "pr.txt"))).toBe(true)
  })

  test("BaseBranch.catchUp():  never over changes, a local commit or a dead remote;  says so each time", () => {
    const repo = setUp()
    const { app, origin } = repo
    expect(BaseBranch.catchUp(app, "main")).toEqual({ action: "current", line: "" })

    githubMerges(repo, "one.txt")
    writeFileSync(join(app, "README.md"), "changed\n")
    const dirty = BaseBranch.catchUp(app, "main")
    expect(dirty.action).toBe("dirty")
    expect(existsSync(join(app, "one.txt"))).toBe(false)
    git(app, "checkout", "--", "README.md")
    expect(BaseBranch.catchUp(app, "main").action).toBe("fast-forwarded")
    expect(existsSync(join(app, "one.txt"))).toBe(true)

    githubMerges(repo, "two.txt")
    git(app, "commit", "-q", "--allow-empty", "-m", "local")
    const diverged = BaseBranch.catchUp(app, "main")
    expect(diverged.action).toBe("diverged")
    expect(diverged.line).toMatch(/going on from local main/)
    git(app, "reset", "-q", "--hard", "origin/main")

    git(app, "commit", "-q", "--allow-empty", "-m", "local")
    expect(BaseBranch.catchUp(app, "main").action).toBe("ahead")
    git(app, "reset", "-q", "--hard", "HEAD~1")

    rmSync(origin, { recursive: true })
    const offline = BaseBranch.catchUp(app, "main")
    expect(offline.action).toBe("offline")
    expect(offline.line).toMatch(/couldn't reach origin/)
  })

  test("BaseBranch.catchUp():  main not checked out there, moved all the same", () => {
    const repo = setUp()
    git(repo.app, "switch", "-q", "--detach")
    githubMerges(repo, "pr.txt")
    expect(BaseBranch.catchUp(repo.app, "main").action).toBe("fast-forwarded")
    expect(git(repo.app, "rev-parse", "main")).toBe(git(repo.app, "rev-parse", "origin/main"))
  })

  test("remove --branches:  a squash-merged pull request counts as merged;  unmerged work always stays", () => {
    const { app, worktree } = setUp()
    git(worktree, "push", "-q", "-u", "origin", "seo")
    const tip = git(app, "rev-parse", "seo")
    const merged = JSON.stringify([{ number: 9, url: "u", headRefOid: tip }])

    // pushed, no merged pull request:  -d would pass it (its upstream has it), and it must not
    expect(Worktrees.deleteBranch(app, "seo")).toMatch(/kept branch seo:  not in main/)
    // a merged pull request of an OLDER commit:  a commit since then keeps the branch
    ghSays("merged", JSON.stringify([{ number: 8, url: "u", headRefOid: git(app, "rev-parse", "main") }]))
    expect(Worktrees.deleteBranch(app, "seo")).toMatch(/kept branch seo/)
    // gh can't say
    ghSays("merged", "oops")
    expect(Worktrees.deleteBranch(app, "seo")).toMatch(/kept branch seo/)
    expect(git(app, "branch", "--list", "seo")).toMatch(/seo/)

    ghSays("merged", merged)
    git(app, "worktree", "remove", worktree)
    expect(Worktrees.deleteBranch(app, "seo")).toBe("deleted branch seo (pull request #9 merged)")
    expect(git(app, "branch", "--list", "seo")).toBe("")
    ghSays("merged")
  })
})

/** `git <args>` in `cwd`, trimmed. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}
