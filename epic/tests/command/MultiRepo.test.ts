/**
 * A MULTI-REPO top (epic `epic-engine` P10, repo-split's Q9 A), on SCRATCH git repos laid out as `~/www/spell` is
 * since epic `repo-split` P9:  the kit, `spell-kit`, checked out as `spell` (its own folders `util/`, `toolchain/`
 * ... tracked;  its `.epic/config.json5` naming its child repos through `repos.json5`), with its FIVE child repos
 * cloned inside it, each its own git repo on `main`.
 * - an epic's worktree:  `spell.worktrees/<epic>/`, a worktree of the top with one of every child inside it, all on
 *   branch `<epic>`, one install at its top, then one in each yarn project of its own (`extraInstalls`, the two
 *   `vscode/` folders;  epic `epic-engine` I65) (the worktree hook, run as Claude Code runs it)
 * - `EpicConfig` from a child:  its top, its worktree, the epic a path inside it is in
 * - `epic worktree merge-main` over every repo, `epic merge` of only the repos with commits, `epic worktree remove`
 * - the session guard and the window file, from a child repo's folder
 * - Claude Code's folder is a temp one (`CLAUDE_CONFIG_DIR`):  never the real `~/.claude`;  never a real repo.
 */
import { execFileSync, spawnSync } from "node:child_process"
import {
  existsSync,
  lstatSync,
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
import { afterAll, describe, expect, test } from "vite-plus/test"

import { MainMerge } from "$/epics/command/MainMerge"
import { Requests } from "$/epics/command/Requests"
import { WorktreeGuard } from "$/epics/command/WorktreeGuard"
import { Worktrees } from "$/epics/command/Worktrees"
import { EpicConfig } from "$/epics/config/EpicConfig"
import { SessionFolders } from "$/epics/config/SessionFolders"

/** The plugin's worktree hook, and the window script. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const HOOK = join(ROOT, "hooks", "worktree.mjs")
const WINDOW_SCRIPT = join(ROOT, "src", "window.mjs")

/** The scratch layout:  `www/spell` (the top), `www/spell.worktrees`, `www/spell.epics`;  a temp Claude folder. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "multi-repo-")))
const TOP = join(TEMP, "www", "spell")
const WORKTREES = join(TEMP, "www", "spell.worktrees")
const CONTENT = join(TEMP, "www", "spell.epics")
const CLAUDE = join(TEMP, "claude")
const CHILDREN = ["spell-lang", "spell-ui", "spell-brand", "spell-epic", "spell-app"]

/** The kit's own folders, tracked by the top (epic `repo-split` P9:  once spell-util, spell-server, spell-element). */
const KIT = ["util", "toolchain", "server", "assembler", "element"]

/** The yarn projects of their own, outside the one install:  the two extensions. */
const EXTRAS = ["spell-epic/vscode", "spell-app/vscode"]

/** git's identity and no signing, for every commit here and in the code under test (`MainMerge` commits). */
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
Object.assign(process.env, GIT_ENV, { CLAUDE_CONFIG_DIR: CLAUDE })
afterAll(() => {
  for (const key of [...Object.keys(GIT_ENV), "CLAUDE_CONFIG_DIR"])
    if (SAVED[key] === undefined) delete process.env[key]
    else process.env[key] = SAVED[key]
  rmSync(TEMP, { recursive: true, force: true })
})

////////
// The top, the kit:  its own folders and the glue, its child repos git-ignored;  `installed.txt` is what its install
// command writes
mkdirSync(join(TOP, ".epic"), { recursive: true })
git(TOP, "init", "-q", "-b", "main")
for (const name of KIT) {
  mkdirSync(join(TOP, name, "src"), { recursive: true })
  writeFileSync(join(TOP, name, "src", "index.ts"), `export const ${name} = 1\n`)
}
writeFileSync(join(TOP, ".gitignore"), "/spell-*/\n/installed.txt\n/.spell-main\nnode_modules\n")
writeFileSync(
  join(TOP, "repos.json5"),
  '// the child repos, lowest first\n{\n  "repos": [\n' +
    CHILDREN.map((name) => `    { "name": "${name}", "url": "git@x:${name}.git", "needs": [] },\n`).join("") +
    "  ]\n}\n"
)
writeFileSync(
  join(TOP, ".epic", "config.json5"),
  JSON.stringify({
    repos: "repos.json5",
    contentFolder: "../spell.epics",
    worktreesFolder: "../spell.worktrees",
    installCommand: "echo installed > installed.txt",
    installOnCreate: true,
    extraInstalls: EXTRAS,
    linkSessionFolders: true,
    sharedFolders: [],
    engineFolder: "",
    windowsFolder: "../spell.epics/windows",
    windows: { default: "spell", repoName: "spell", contentName: "spell.epics" }
  })
)
commit(TOP, "the top")
for (const name of CHILDREN) {
  const child = join(TOP, name)
  mkdirSync(child)
  git(child, "init", "-q", "-b", "main")
  writeFileSync(join(child, "README.md"), `# ${name}\n`)
  commit(child, `${name}:  first`)
}
// the extensions:  a yarn project of its own in each, its install's output git-ignored there
for (const extra of EXTRAS) {
  mkdirSync(join(TOP, extra))
  writeFileSync(join(TOP, extra, "package.json"), "{}\n")
  writeFileSync(join(TOP, extra, ".gitignore"), "installed.txt\n")
  commit(join(TOP, dirname(extra)), `${dirname(extra)}:  its extension`)
}
// spell-app keeps its own (old) config, as the real one does:  its own worktrees folder, beside it
mkdirSync(join(TOP, "spell-app", ".epic"))
writeFileSync(join(TOP, "spell-app", ".epic", "config.json5"), '{ "worktreesFolder": "../spell-app.worktrees" }')
commit(join(TOP, "spell-app"), "spell-app:  its config")
mkdirSync(join(CONTENT, "epics"), { recursive: true })
git(CONTENT, "init", "-q", "-b", "main")

describe("EpicConfig in a multi-repo top", () => {
  test("the top lists its child repos;  each child finds its top;  a single repo has none", () => {
    const top = new EpicConfig(TOP)
    expect(top.repos).toEqual(CHILDREN)
    expect(top.top).toBe(top)
    const ui = new EpicConfig(join(TOP, "spell-ui"))
    expect(ui.repos).toEqual([])
    expect(ui.top?.main).toBe(TOP)
    // a repo outside any top:  as before
    const lone = join(TEMP, "lone")
    mkdirSync(lone)
    expect(new EpicConfig(lone).top).toBeUndefined()
    expect(new EpicConfig(lone).newWorktreeFolder("seo")).toBe(join(lone, ".claude", "worktrees", "seo"))
  })

  test("every repo's checkout in an epic's worktree, the top first;  a child's own worktree inside it", () => {
    expect(new EpicConfig(join(TOP, "spell-ui")).repoCheckouts("demo")).toEqual([
      { repo: "spell", main: TOP, worktree: join(WORKTREES, "demo"), top: true },
      ...CHILDREN.map((repo) => ({ repo, main: join(TOP, repo), worktree: join(WORKTREES, "demo", repo), top: false }))
    ])
    const app = new EpicConfig(join(TOP, "spell-app"))
    expect(app.worktreesFolder).toBe(WORKTREES)
    expect(app.newWorktreeFolder("demo")).toBe(join(WORKTREES, "demo", "spell-app"))
    // its own old place still searched, for its worktrees from before
    expect(app.worktreesFolders).toContain(join(TOP, "spell-app.worktrees"))
    expect(app.worktreeNameOf(join(WORKTREES, "demo", "spell-app", "src", "x.ts"))).toBe("demo")
    expect(new EpicConfig(TOP).worktreeNameOf(join(WORKTREES, "demo", "spell-ui"))).toBe("demo")
    expect(app.values()).toMatchObject({ repos: "", top: TOP })
  })
})

describe("the worktree hook, multi-repo", () => {
  test("create:  the top's worktree, every child's inside it, all on the epic's branch;  ONE install, at the top", () => {
    const made = hook("create", { name: "demo", cwd: TOP })
    expect(made.status, made.stderr).toBe(0)
    const top = join(WORKTREES, "demo")
    expect(made.stdout).toBe(top)
    expect(git(top, "branch", "--show-current")).toBe("demo")
    for (const name of CHILDREN) {
      expect(git(join(top, name), "branch", "--show-current")).toBe("demo")
      expect(git(join(top, name), "rev-parse", "--show-toplevel")).toBe(join(top, name))
      expect(existsSync(join(top, name, "installed.txt"))).toBe(false)
    }
    expect(readFileSync(join(top, "installed.txt"), "utf8").trim()).toBe("installed")
    // and each extension's own install (I65)
    for (const extra of EXTRAS) expect(existsSync(join(top, extra, "installed.txt"))).toBe(true)
    // the top's git sees none of the child repos, and tracks the kit's own folders
    expect(git(top, "ls-files", "util")).toBe("util/src/index.ts")
    expect(git(top, "status", "--porcelain")).toBe("")
    // every session saved under the main TOP checkout's folder:  the top's worktree's and each child's are links to it
    const mains = realpathSync(SessionFolders.folderOf(TOP, CLAUDE))
    for (const folder of [top, ...CHILDREN.map((name) => join(top, name))]) {
      expect(lstatSync(SessionFolders.folderOf(folder, CLAUDE)).isSymbolicLink()).toBe(true)
      expect(realpathSync(SessionFolders.folderOf(folder, CLAUDE))).toBe(mains)
    }
  })

  test("create from a CHILD repo's main checkout, or again:  the same worktree, reused", () => {
    const again = hook("create", { name: "demo", cwd: join(TOP, "spell-ui") })
    expect(again.status, again.stderr).toBe(0)
    expect(again.stdout).toBe(join(WORKTREES, "demo"))
    expect(again.stderr).toMatch(/reusing/)
  })

  test("an agent's worktree from a session in a child's folder of the epic:  named for the epic", () => {
    const made = hook("create", { name: "agent-a1b2", cwd: join(WORKTREES, "demo", "spell-ui") })
    expect(made.status, made.stderr).toBe(0)
    expect(made.stdout).toBe(join(WORKTREES, "demo-agent-a1b2"))
    expect(git(join(made.stdout, "spell-ui"), "branch", "--show-current")).toBe("demo-agent-a1b2")
    // nothing of its own:  removed whole, children first, every branch gone
    const removed = hook("remove", { worktree_path: join(made.stdout, "spell-ui"), cwd: TOP })
    expect(removed.status, removed.stderr).toBe(0)
    expect(existsSync(made.stdout)).toBe(false)
    for (const repo of [TOP, ...CHILDREN.map((name) => join(TOP, name))])
      expect(git(repo, "branch", "--list", "demo-agent-a1b2")).toBe("")
  })

  test("remove keeps EVERY repo's worktree while any one has commits its main lacks", () => {
    const made = hook("create", { name: "keep", cwd: TOP })
    expect(made.status, made.stderr).toBe(0)
    const ui = join(made.stdout, "spell-ui")
    writeFileSync(join(ui, "kept.md"), "kept\n")
    git(ui, "add", "-A")
    git(ui, "commit", "-q", "-m", "keep:  work")
    const kept = hook("remove", { worktree_path: made.stdout, cwd: TOP })
    expect(kept.status).toBe(1)
    expect(kept.stderr).toMatch(/spell-ui's branch keep has commits main doesn't/)
    for (const name of CHILDREN) expect(existsSync(join(made.stdout, name, ".git"))).toBe(true)
  })
})

describe("an epic across two child repos and the kit:  merge-main, merge, remove", () => {
  const epic = join(WORKTREES, "demo")

  test("commits in two children and in the kit's own folders;  `repos` says which are ahead", () => {
    for (const name of ["spell-lang", "spell-app"]) {
      writeFileSync(join(epic, name, "demo.md"), `${name} demo\n`)
      git(join(epic, name), "add", "-A")
      git(join(epic, name), "commit", "-q", "-m", `demo:  ${name}`)
    }
    writeFileSync(join(epic, "util", "src", "demo.ts"), "export const demo = 1\n")
    commit(epic, "demo:  the kit's util")
    const states = new Worktrees({ main: join(TOP, "spell-app") }).repoStates("demo")
    expect(states.map(({ repo, ahead, behind, dirty }) => ({ repo, ahead, behind, dirty: dirty.length }))).toEqual([
      { repo: "spell", ahead: 1, behind: 0, dirty: 0 },
      { repo: "spell-lang", ahead: 1, behind: 0, dirty: 0 },
      { repo: "spell-ui", ahead: 0, behind: 0, dirty: 0 },
      { repo: "spell-brand", ahead: 0, behind: 0, dirty: 0 },
      { repo: "spell-epic", ahead: 0, behind: 0, dirty: 0 },
      { repo: "spell-app", ahead: 1, behind: 0, dirty: 0 }
    ])
    expect(new Worktrees({ main: TOP }).nameStatus("demo", []).ahead).toBe(3)
  })

  test("merge-main, from a child's folder:  each repo's main into its branch, the top last", () => {
    // main moves in spell-lang (another file) and in the kit (another of its folders)
    writeFileSync(join(TOP, "spell-lang", "other.md"), "other\n")
    commit(join(TOP, "spell-lang"), "spell-lang:  main moves", true)
    writeFileSync(join(TOP, "server", "src", "glue.ts"), "export const glue = 1\n")
    commit(TOP, "the kit:  main moves", true)
    const reports = MainMerge.runAll(join(epic, "spell-app"))
    expect(reports.map(({ repo, result, error }) => ({ repo, result, error }))).toEqual([
      { repo: "spell-lang", result: "merged", error: undefined },
      { repo: "spell-ui", result: "up-to-date", error: undefined },
      { repo: "spell-brand", result: "up-to-date", error: undefined },
      { repo: "spell-epic", result: "up-to-date", error: undefined },
      { repo: "spell-app", result: "up-to-date", error: undefined },
      { repo: "spell", result: "merged", error: undefined }
    ])
    expect(existsSync(join(epic, "spell-lang", "other.md"))).toBe(true)
    expect(existsSync(join(epic, "server", "src", "glue.ts"))).toBe(true)
    // the extensions' installs untouched:  git-ignored there
    for (const extra of EXTRAS) expect(existsSync(join(epic, extra, "installed.txt"))).toBe(true)
  })

  test("a single repo's merge-main:  its one report, no `repo`", () => {
    const lone = join(TEMP, "lone-merge")
    mkdirSync(lone)
    git(lone, "init", "-q", "-b", "main")
    commit(lone, "first", true)
    expect(MainMerge.runAll(lone)).toEqual([expect.not.objectContaining({ repo: expect.anything() })])
  })

  test("`epic merge`:  ONLY the three repos with commits fast-forward;  the others untouched", () => {
    const before = Object.fromEntries(
      ["spell-ui", "spell-brand", "spell-epic"].map((name) => [name, git(join(TOP, name), "rev-parse", "main")])
    )
    const merged = Requests.mergeEach("demo", TOP)
    expect(merged.map(({ repo, commits }) => ({ repo, count: commits.length }))).toEqual([
      { repo: "spell", count: 2 },
      { repo: "spell-lang", count: 2 },
      { repo: "spell-app", count: 1 }
    ])
    for (const name of [".", "spell-lang", "spell-app"])
      expect(git(join(TOP, name), "rev-parse", "main")).toBe(git(join(TOP, name), "rev-parse", "demo"))
    for (const name of ["spell-ui", "spell-brand", "spell-epic"])
      expect(git(join(TOP, name), "rev-parse", "main")).toBe(before[name])
  })

  test("`epic worktree remove demo --branches`, from a child:  every worktree and branch gone, children first", () => {
    const lines = new Worktrees({ main: join(TOP, "spell-ui") }).remove("demo", { branches: true })
    expect(lines.filter((line) => /removed /.test(line)).map((line) => line.split(":")[0])).toEqual([
      ...[...CHILDREN].reverse(),
      "spell"
    ])
    expect(existsSync(epic)).toBe(false)
    for (const repo of [TOP, ...CHILDREN.map((name) => join(TOP, name))])
      expect(git(repo, "branch", "--list", "demo")).toBe("")
    expect(lstatSync(SessionFolders.folderOf(epic, CLAUDE), { throwIfNoEntry: false })).toBeUndefined()
  })
})

describe("the session guard and the window, from a child repo", () => {
  test("a session started in a child's folder of an epic worktree:  told to enter the TOP's worktree", () => {
    const made = hook("create", { name: "guard", cwd: TOP })
    expect(made.status, made.stderr).toBe(0)
    const said = WorktreeGuard.check({ cwd: join(made.stdout, "spell-ui"), source: "startup" })
    expect(said?.hookSpecificOutput.additionalContext).toContain(`EnterWorktree with path "${made.stdout}"`)
  })

  test("an epic's window:  the main TOP checkout first (its files hidden), then the epic's worktree, then the content", () => {
    const code =
      "const { Window } = await import(process.env.WINDOW_SCRIPT);" +
      'console.log(JSON.stringify({ guard: Window.worktreeWorkspace("spell", "guard"), repo: Window.packageFolders() }))'
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
      encoding: "utf8",
      env: { ...process.env, EPIC_CHECKOUT: join(TOP, "spell-app"), WINDOW_SCRIPT }
    })
    expect(run.status, run.stderr).toBe(0)
    const { guard, repo } = JSON.parse(run.stdout)
    const ongoing = join(CONTENT, "windows", "ongoing")
    expect(
      guard.folders.map(({ path, name }: { path: string; name: string }) => [resolve(ongoing, path), name])
    ).toEqual([
      [TOP, "spell"],
      [join(WORKTREES, "guard"), "⎇ guard"],
      [CONTENT, "spell.epics"]
    ])
    expect(guard.settings["files.exclude"]["*"]).toEqual({ when: ".spell-main" })
    // every other window:  the main top checkout first
    expect(resolve(join(CONTENT, "windows"), repo[0].path)).toBe(TOP)
  })
})

/** Run the hook's `command` with `input` on stdin:  its exit status, stdout and stderr. */
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

/** Commit everything in `cwd` (`allowEmpty`:  even nothing). */
function commit(cwd: string, message: string, allowEmpty = false): void {
  git(cwd, "add", "-A")
  git(cwd, "commit", "-q", ...(allowEmpty ? ["--allow-empty"] : []), "-m", message)
}
