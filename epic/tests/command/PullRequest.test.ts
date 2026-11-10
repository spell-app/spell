/**
 * `epic pr` on throwaway repos:  a bare repo for `origin`, a stand-in `gh` named by `$SPELL_EPIC_GH`, which logs its
 * arguments;  GitLab's path is unit-tested in `tests/config/CodeHost.test.ts`, and runs through `glab` the same way.
 */
import { execFileSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { PullRequest } from "spell/epic/command/PullRequest"
import { RepoInit } from "spell/epic/command/RepoInit"

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "epic-pr-")))
const before = { ...process.env }
process.env.SPELL_EPIC_HOME = join(TEMP, "epic-home")
process.env.GIT_CONFIG_GLOBAL = join(TEMP, "gitconfig")
process.env.GIT_CONFIG_NOSYSTEM = "1"
writeFileSync(
  join(TEMP, "gitconfig"),
  "[user]\n  name = Ana\n  email = a@a\n[commit]\n  gpgsign = false\n[init]\n  defaultBranch = main\n"
)
afterAll(() => {
  for (const key of ["SPELL_EPIC_HOME", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "SPELL_EPIC_GH"])
    if (before[key] === undefined) delete process.env[key]
    else process.env[key] = before[key]
  rmSync(TEMP, { recursive: true, force: true })
})

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
const LOG = join(TEMP, "gh.log")

/** A repo with `origin` a bare repo, its `feat` branch one commit ahead, and a stand-in `gh`. */
function repo(name: string, open = "[]"): string {
  const remote = join(TEMP, `${name}.git`)
  git(TEMP, "init", "-q", "--bare", "-b", "main", remote)
  const app = join(TEMP, name)
  git(TEMP, "clone", "-q", remote, app)
  writeFileSync(join(app, "f"), "x")
  git(app, "add", "f")
  git(app, "commit", "-q", "-m", "base")
  git(app, "push", "-q", "origin", "HEAD:main")
  git(app, "fetch", "-q", "origin")
  git(app, "switch", "-qc", "feat")
  writeFileSync(join(app, "g"), "y")
  git(app, "add", "g")
  git(app, "commit", "-q", "-m", "feat:  add g")
  git(app, "switch", "-q", "main")
  git(app, "branch", "--set-upstream-to=origin/main", "main")
  const gh = join(TEMP, `gh-${name}`)
  writeFileSync(
    gh,
    `#!/bin/sh\necho "$*" >> "${LOG}"\ncase "$1 $2" in\n  "--version "*) ;;\n  "auth status") ;;\n  "pr list") echo '${open}' ;;\n  "pr create") echo "https://github.com/a/b/pull/9" ;;\nesac\n`
  )
  chmodSync(gh, 0o755)
  process.env.SPELL_EPIC_GH = gh
  return app
}

/** `epic pr <args>` in `main`:  the exit code and what it printed. */
async function pr(main: string, ...args: string[]): Promise<{ code: number; lines: string[] }> {
  const lines: string[] = []
  const code = await new PullRequest({ main, print: (line) => lines.push(line) }).run(args)
  return { code, lines }
}

beforeEach(() => rmSync(LOG, { force: true }))

describe("epic pr, on GitHub", () => {
  test("pushes and opens one, with --title and --body-file", async () => {
    const app = repo("opens")
    writeFileSync(join(TEMP, "body"), "the body")
    const { code, lines } = await pr(app, "feat", "--title", "Add g", "--body-file", join(TEMP, "body"))
    expect(code).toBe(0)
    expect(lines).toEqual(["Pull request opened:  https://github.com/a/b/pull/9"])
    expect(readFileSync(LOG, "utf8")).toMatch(/pr create --base main --head feat --title Add g --body the body/)
    expect(git(app, "ls-remote", "origin", "feat")).toContain(git(app, "rev-parse", "feat"))
  })

  test("one open already:  its address, and that the push updated it", async () => {
    const { lines, code } = await pr(repo("already", '[{"url":"https://github.com/a/b/pull/3"}]'), "feat")
    expect(code).toBe(0)
    expect(lines).toEqual(["Pull request open already:  https://github.com/a/b/pull/3", "The push updated it."])
    expect(readFileSync(LOG, "utf8")).not.toMatch(/pr create/)
  })

  test("refuses a branch that isn't there, the base branch, nothing ahead", async () => {
    const app = repo("refuses")
    git(app, "branch", "empty", "main")
    await expect(pr(app)).rejects.toThrow(/name the branch/)
    await expect(pr(app, "nope")).rejects.toThrow(/no branch nope/)
    await expect(pr(app, "main")).rejects.toThrow(/is the base branch/)
    await expect(pr(app, "empty")).rejects.toThrow(/nothing ahead of main/)
  })

  test("gh missing:  the branch pushed anyway, and what to run", async () => {
    const app = repo("missing")
    process.env.SPELL_EPIC_GH = join(TEMP, "no-such-gh")
    const { code, lines } = await pr(app, "feat")
    expect(code).toBe(1)
    expect(lines.join("\n")).toMatch(/feat is pushed;  no pull request opened:  GitHub's command, gh, isn't installed/)
    expect(lines.join("\n")).toMatch(/gh pr create --base main --head feat --fill/)
  })
})

describe("epic init:  where the code is hosted", () => {
  /** A repo whose `origin` is `address`, with no config. */
  function repoAt(address: string): string {
    const app = mkdtempSync(join(TEMP, "host-"))
    git(app, "init", "-q")
    git(app, "remote", "add", "origin", address)
    return app
  }

  test("--host wins;  a gitlab host;  no remote is GitHub;  an unknown one is assumed, and says so", async () => {
    const lab = repoAt("git@gitlab.example.com:a/b.git")
    expect(await RepoInit.codeHostChoice({ main: lab, ask: false })).toMatchObject({
      kind: "gitlab",
      source: "address"
    })
    expect(await RepoInit.codeHostChoice({ main: lab, host: "github", ask: false })).toMatchObject({
      kind: "github",
      source: "flag"
    })
    const none = mkdtempSync(join(TEMP, "no-remote-"))
    git(none, "init", "-q")
    expect(await RepoInit.codeHostChoice({ main: none, ask: false })).toMatchObject({
      kind: "github",
      source: "default"
    })
    const unknown = repoAt("git@git.acme.com:a/b.git")
    expect(await RepoInit.codeHostChoice({ main: unknown, ask: false })).toMatchObject({
      kind: "github",
      source: "assumed",
      host: "git.acme.com"
    })
  })
})
