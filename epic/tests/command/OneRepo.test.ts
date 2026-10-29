/**
 * The kit after epic `repo-split` P20 · One Repo (epic `epic-engine` P49), on SCRATCH git repos laid out as `~/www` is:
 * - `www/spell`:  the kit, ONE repo, its `repos.json5` listing only a PEER (`"peer": true`, spell-brand), its settings
 *   naming that file and how an old-layout worktree crosses over (`oldLayout`)
 * - `www/spell-brand`:  the peer, its own git repo, its settings `{ "top": "../spell" }` alone (Q51 A)
 * - `www/spell.old/spell-ui`:  an old child repo's clone, moved aside (Q41 B)
 * - the worktree hook, run as Claude Code runs it;  `epic worktree remove`, `merge-main` and `epic merge`
 * - Claude Code's folder is a temp one (`CLAUDE_CONFIG_DIR`):  never the real `~/.claude`;  never a real repo.
 */
import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { MainMerge } from "spell/epic/command/MainMerge"
import { Requests } from "spell/epic/command/Requests"
import { Worktrees } from "spell/epic/command/Worktrees"
import { EpicConfig } from "spell/epic/config/EpicConfig"

/** The plugin's worktree hook. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const HOOK = join(ROOT, "hooks", "worktree.mjs")

/** The scratch layout. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "one-repo-")))
const WWW = join(TEMP, "www")
const KIT = join(WWW, "spell")
const BRAND = join(WWW, "spell-brand")
const OLD_UI = join(WWW, "spell.old", "spell-ui")
const CONTENT = join(WWW, "spell.epics")
const CLAUDE = join(TEMP, "claude")

/** git's identity and no signing, for every commit here and in the code under test. */
const GIT_ENV = {
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@t",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@t",
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "commit.gpgsign",
  GIT_CONFIG_VALUE_0: "false"
}
const SAVED = { ...process.env }
Object.assign(process.env, GIT_ENV, { CLAUDE_CONFIG_DIR: CLAUDE, SPELL_EPIC_HOME: join(TEMP, "home") })
afterAll(() => {
  for (const key of [...Object.keys(GIT_ENV), "CLAUDE_CONFIG_DIR", "SPELL_EPIC_HOME"])
    if (SAVED[key] === undefined) delete process.env[key]
    else process.env[key] = SAVED[key]
  rmSync(TEMP, { recursive: true, force: true })
})

////////
// The kit:  its folders (`ui/` ...), its peer listed, the old child repos' folders git-ignored;  its carry-on command
// a stub that leaves `carried.txt`
mkdirSync(join(KIT, ".epic"), { recursive: true })
git(KIT, "init", "-q", "-b", "main")
mkdirSync(join(KIT, "ui", "src"), { recursive: true })
writeFileSync(join(KIT, "ui", "src", "index.ts"), "export const ui = 1\n")
writeFileSync(join(KIT, ".gitignore"), "/spell-*/\n/installed.txt\n/carried.txt\n/page-server.local.json5\n")
writeFileSync(
  join(KIT, "repos.json5"),
  '{ "repos": [{ "name": "spell-brand", "url": "git@x:spell-brand.git", "path": "../spell-brand", "peer": true }] }\n'
)
writeFileSync(
  join(KIT, ".epic", "config.json5"),
  JSON.stringify({
    repos: "repos.json5",
    contentFolder: "../spell.epics",
    worktreesFolder: "../spell.worktrees",
    installCommand: "echo installed > installed.txt",
    installOnCreate: true,
    linkSessionFolders: false,
    sharedFolders: [],
    engineFolder: "",
    windowsFolder: "../spell.epics/windows",
    windows: { default: "spell", repoName: "spell", contentName: "spell.epics" },
    oldLayout: { carryOn: "touch carried.txt", commitMaps: "tools/one-repo", oldClones: "../spell.old" }
  })
)
commit(KIT, "the kit")
writeFileSync(join(KIT, "page-server.local.json5"), '{ "projects": ["../spell-brand"] }\n')

// The peer:  its own repo and install, its settings naming the kit
mkdirSync(join(BRAND, ".epic"), { recursive: true })
git(BRAND, "init", "-q", "-b", "main")
writeFileSync(join(BRAND, ".epic", "config.json5"), '{ "top": "../spell", "installCommand": "" }\n')
writeFileSync(join(BRAND, ".gitignore"), "node_modules\n")
commit(BRAND, "spell-brand")

// An old child repo's clone, moved aside
mkdirSync(OLD_UI, { recursive: true })
git(OLD_UI, "init", "-q", "-b", "main")
writeFileSync(join(OLD_UI, "README.md"), "# spell-ui\n")
commit(OLD_UI, "spell-ui:  first")

mkdirSync(join(CONTENT, "epics"), { recursive: true })
git(CONTENT, "init", "-q", "-b", "main")

describe("EpicConfig:  the kit and its peer", () => {
  test("the kit lists its peer, never as a repo of its worktrees", () => {
    const kit = new EpicConfig(KIT)
    expect(kit.peers).toEqual([{ name: "spell-brand", main: BRAND }])
    expect(kit.repos).toEqual([])
    expect(kit.top).toBeUndefined()
    expect(kit.repoCheckouts("e1").map(({ repo }) => repo)).toEqual(["spell"])
  })

  test("the peer takes the kit's content folder and windows, and keeps its own worktrees", () => {
    const brand = new EpicConfig(BRAND)
    expect(brand.kit?.main).toBe(KIT)
    expect(brand.contentFolder).toBe(CONTENT)
    expect(brand.newWindowsFolder).toBe(join(CONTENT, "windows"))
    expect(brand.windows.repoName).toBe("spell")
    expect(brand.worktreesFolder).toBe(join(WWW, "spell-brand.worktrees"))
    expect(brand.installCommand).toBe("")
  })

  test("a repo naming the kit as its top that the kit doesn't list:  said, and still read", () => {
    const other = join(WWW, "other")
    mkdirSync(join(other, ".epic"), { recursive: true })
    git(other, "init", "-q", "-b", "main")
    writeFileSync(join(other, ".epic", "config.json5"), '{ "top": "../spell" }\n')
    const said = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    try {
      expect(new EpicConfig(other).contentFolder).toBe(CONTENT)
      expect(said.mock.calls.map(([text]) => String(text)).join("")).toMatch(/doesn't name it a peer/)
    } finally {
      said.mockRestore()
    }
  })
})

// each test runs the hook, a node process or two:  slow when every test file runs at once
describe("the worktree hook in the kit and in its peer", { timeout: 30_000 }, () => {
  test("in the kit:  the kit's worktree alone, the local page server settings copied, absolute;  then removed", () => {
    const made = hook("create", { name: "e1", cwd: KIT })
    expect(made.status, made.stderr).toBe(0)
    const path = join(WWW, "spell.worktrees", "e1")
    expect(made.stdout).toBe(path)
    expect(existsSync(join(path, "spell-brand"))).toBe(false)
    const local = readFileSync(join(path, "page-server.local.json5"), "utf8")
    expect(EpicConfig.parse(local)).toEqual({ projects: [BRAND] })
    const removed = hook("remove", { worktree_path: path, cwd: KIT })
    expect(removed.status, removed.stderr).toBe(0)
    expect(existsSync(path)).toBe(false)
  })

  test("in the peer:  its lone worktree, in its own worktrees folder;  `/worktrees` lists it from the kit", () => {
    const made = hook("create", { name: "b1", cwd: BRAND })
    expect(made.status, made.stderr).toBe(0)
    const path = join(WWW, "spell-brand.worktrees", "b1")
    expect(made.stdout).toBe(path)
    expect(existsSync(join(WWW, "spell.worktrees", "b1"))).toBe(false)
    const named = new Worktrees({ main: KIT }).named()
    expect(named).toContainEqual({ name: "b1", path, branch: "b1", main: BRAND })
    const removed = hook("remove", { worktree_path: path, cwd: BRAND })
    expect(removed.status, removed.stderr).toBe(0)
    expect(existsSync(path)).toBe(false)
  })

  test("reusing a branch cut before the one repo:  the kit's alone, naming the old clone that has it", () => {
    git(KIT, "branch", "e2")
    git(OLD_UI, "branch", "e2")
    const made = hook("create", { name: "e2", cwd: KIT })
    expect(made.status, made.stderr).toBe(0)
    expect(made.stderr).toMatch(/spell-ui in .*spell\.old still has a branch e2/)
    expect(existsSync(join(made.stdout, "spell-ui"))).toBe(false)
    expect(hook("remove", { worktree_path: made.stdout, cwd: KIT }).status).toBe(0)
  })
})

describe("an OLD-LAYOUT worktree:  an old child checkout inside", { timeout: 30_000 }, () => {
  const path = join(WWW, "spell.worktrees", "old1")
  const inside = join(path, "spell-ui")

  test("found, paired with its old clone;  it holds work, so it's left behind", () => {
    git(KIT, "worktree", "add", "-q", "-b", "old1", path, "main")
    git(OLD_UI, "worktree", "add", "-q", "-b", "old1", inside, "main")
    writeFileSync(join(inside, "work.md"), "work\n")
    commit(inside, "spell-ui:  work of its own")
    const kit = new EpicConfig(KIT)
    expect(kit.repoCheckouts("old1").map(({ repo, main, found }) => ({ repo, main, found }))).toEqual([
      { repo: "spell", main: KIT, found: undefined },
      { repo: "spell-ui", main: OLD_UI, found: true }
    ])
    expect(kit.leftBehind(path).map(({ repo }) => repo)).toEqual(["spell-ui"])
  })

  test("removal refuses it, even forced;  so does the hook", () => {
    expect(() => new Worktrees({ main: KIT }).remove("old1", { force: true })).toThrow(
      /spell-ui inside .* commits of its own/
    )
    const removed = hook("remove", { worktree_path: path, cwd: KIT })
    expect(removed.status).toBe(1)
    expect(removed.stderr).toMatch(/kept .*spell-ui inside/)
    expect(existsSync(inside)).toBe(true)
  })

  test("`epic merge` refuses it, naming the carry-on", () => {
    writeFileSync(join(path, "kit.md"), "kit\n")
    commit(path, "the kit's branch moves")
    expect(() => Requests.mergeEach("old1", KIT)).toThrow(/spell-ui .*`touch carried\.txt/)
    expect(git(KIT, "rev-parse", "main")).not.toBe(git(KIT, "rev-parse", "old1"))
  })

  test("merge-main runs the carry-on after merging main", () => {
    writeFileSync(join(KIT, "ui", "src", "more.ts"), "export const more = 1\n")
    commit(KIT, "main moves")
    const [report] = MainMerge.runAll(path)
    expect(report).toMatchObject({
      result: "merged",
      carriedOn: { command: "touch carried.txt", repos: ["spell-ui"], ok: true }
    })
    expect(existsSync(join(path, "carried.txt"))).toBe(true)
  })

  test("crossed (its tip in a commit map):  nothing left behind, and removal takes the old checkout first", () => {
    const tip = git(inside, "rev-parse", "HEAD")
    mkdirSync(join(path, "tools", "one-repo"), { recursive: true })
    writeFileSync(join(path, "tools", "one-repo", "commit-map-ui-old1.txt"), `${tip} 0123456789\n`)
    commit(path, "the carry-on's commit map")
    const kit = new EpicConfig(KIT)
    expect(kit.leftBehind(path)).toEqual([])
    const [report] = MainMerge.runAll(path)
    expect(report?.carriedOn).toBeUndefined()
    rmSync(join(path, "carried.txt"))
    const lines = new Worktrees({ main: KIT }).remove("old1")
    expect(lines.join("\n")).toMatch(/spell-ui:  removed/)
    expect(existsSync(path)).toBe(false)
    expect(git(OLD_UI, "worktree", "list")).not.toMatch(/old1/)
  })
})

/** Run the worktree hook as Claude Code does:  its JSON on stdin. */
function hook(command: "create" | "remove", input: Record<string, unknown>) {
  const run = spawnSync(process.execPath, [HOOK, command], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, ...GIT_ENV, CLAUDE_CONFIG_DIR: CLAUDE }
  })
  return { status: run.status, stdout: run.stdout.trim(), stderr: run.stderr }
}

/** `git <args>` in `cwd`:  its trimmed stdout. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...GIT_ENV } }).trim()
}

/** Commit everything in `cwd`. */
function commit(cwd: string, message: string): void {
  git(cwd, "add", "-A")
  git(cwd, "commit", "-q", "-m", message)
}
