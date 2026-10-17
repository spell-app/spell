#!/usr/bin/env node
/**
 * Claude Code's `WorktreeCreate` / `WorktreeRemove` hooks (the plugin's `hooks/hooks.json`):  `worktree.mjs create|remove`,
 * the hook's JSON on stdin.  They replace Claude's own git worktree logic, for `EnterWorktree`, `claude -w` and
 * agents' `isolation: "worktree"`.
 *
 * ## Why a hook
 * - A session in a worktree Claude made itself is saved under the WORKTREE's folder, so it drops out of the VS Code
 *   Claude panel's list (which shows one folder's sessions) and is orphaned if it never leaves.  A session in a
 *   worktree a hook made stays saved where it started:  the repo root, which every window lists
 *   (`scripts/window.mjs`).  Checked with CLI 2.1.287.
 * - Names agree:  worktree `.claude/worktrees/<name>`, branch `<name>` (Claude's own adds `worktree-`).
 * - Branches from local `main` (unpushed work included), not `origin/main`.
 * - The folders and the branch come from the repo's `.epic/config.json5` (`EpicConfig`):  `worktreesFolder`,
 *   `baseBranch`, `contentFolder`;  the names above are their defaults.
 *   - `worktreesFolder` may be BESIDE the repo (`../spell-app.worktrees`, epic `epic-eject` P8):  new worktrees go
 *     there, and the old ones are still found in `.claude/worktrees` (`EpicConfig.worktreeFolder()`).
 *
 * ## create
 * - stdin `{ name, cwd, session_id, transcript_path, ... }`  (CLI 2.1.287:  no branch or base field, whatever the
 *   docs say).  Prints the worktree's absolute path on stdout, the ONLY thing on stdout;  progress goes to stderr.
 * - An agent's worktree (`isolation: "worktree"`, name `agent-<id>`) started by a session in worktree `<owner>` (an
 *   epic's) is named `<owner>-agent-<id>`, worktree and branch:  `git worktree list` says whose it is, and `remove`
 *   and `/isolate done` know its work is safe once it's in `<owner>`'s branch (Owen, 2026-10-05).
 * - Reuses worktree `<name>` when it's already one, in either place, and branch `<name>` when it exists.
 * - Then, for a NEW worktree, in this order:
 *   1. links the shared content in (this plugin's `epic shared link`, epic `shared-content`), when the shared repo
 *      exists:  a failure there is a warning, never a failed hook
 *   2. `linkSessionFolders` on:  links the worktree's saved-session folder to the main checkout's (`SessionFolders`),
 *      before any session saves there;  a folder it can't link is a warning
 *   3. `installOnCreate` on:  runs `installCommand` in it (`installTimeout` seconds at most), so nothing opens the
 *      worktree without its packages (I2).  A failure FAILS the hook, saying how to carry on:  the worktree stays
 * - The hook's own time limit is in `hooks/hooks.json` (900s):  more than any install's.
 *
 * ## remove
 * - stdin `{ worktree_path, cwd, ... }`.  Runs on `ExitWorktree` `remove` (only with `discard_changes: true`), at
 *   session exit, and when an agent finishes.
 * - Never loses work:  a worktree with uncommitted changes, or whose branch has commits `main` lacks, is KEPT
 *   (exit 1 with the reason;  Claude shows stderr).  Otherwise removes the worktree and deletes its branch.
 * - An agent's `<owner>-agent-<id>` counts as merged when its commits are in `main` OR in branch `<owner>`.
 * - Then removes the worktree's saved-session link, if it IS a link to the main checkout's folder.
 */
import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, realpathSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { EpicConfig } from "../packages/epics/src/config/EpicConfig.ts"
import { SessionFolders } from "../packages/epics/src/config/SessionFolders.ts"

/** This plugin's `bin/epic`:  `hooks/` is beside `bin/`. */
const EPIC = join(dirname(import.meta.dirname), "bin", "epic")

/** Allowed worktree / branch names. */
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/** Claude's name for an agent's worktree (`isolation: "worktree"`). */
const AGENT = /^agent-[0-9a-f]+$/

/** An agent's worktree once prefixed:  `<owner>-agent-<id>`;  `$1` is the owner. */
const OWNED_AGENT = /^(.+)-agent-[0-9a-f]+$/

/****************
 * ### `Worktree`
 ****************/
class Worktree {
  /** `git <args>` in `cwd`;  its trimmed stdout.  Git's own stderr goes to ours. */
  static git(cwd, ...args) {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", 2] }).trim()
  }

  /** The main checkout's folder, from anywhere inside it or one of its worktrees. */
  static root(cwd) {
    return dirname(Worktree.git(cwd, "rev-parse", "--path-format=absolute", "--git-common-dir"))
  }

  /** Whether `branch` exists. */
  static hasBranch(root, branch) {
    try {
      Worktree.git(root, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`)
      return true
    } catch {
      return false
    }
  }

  /** The worktree `cwd` is in, in either place (`EpicConfig.worktreeNameOf()`):  its name, else `""` (the main checkout). */
  static owner(config, cwd) {
    // real paths:  git gives `root` with symlinks resolved (`/tmp` -> `/private/tmp`)
    return config.worktreeNameOf(realpathSync(cwd)) ?? ""
  }

  /** `create`:  make (or reuse) worktree `<name>` on branch `<name>`;  returns its path. */
  static create({ name, cwd }) {
    if (!NAME.test(name ?? "")) throw new Error(`worktree name must match ${NAME}:  got "${name}"`)
    const root = Worktree.root(cwd)
    const config = new EpicConfig(root)
    const owner = AGENT.test(name) ? Worktree.owner(config, cwd) : ""
    if (owner) name = `${owner}-${name}`
    // where it is (either place), else the new place
    const path = config.worktreeFolder(name)
    if (existsSync(join(path, ".git"))) {
      console.error(`worktree hook:  reusing ${path}`)
      return path
    }
    const args = Worktree.hasBranch(root, name) ? [path, name] : ["-b", name, path, config.baseBranch]
    console.error(`worktree hook:  git worktree add ${args.join(" ")}`)
    mkdirSync(dirname(path), { recursive: true })
    Worktree.git(root, "worktree", "add", "--quiet", ...args)
    Worktree.linkShared(path, config)
    if (config.linkSessionFolders) Worktree.linkSessions(path, root)
    if (config.installOnCreate) Worktree.install(path, config)
    return path
  }

  /**
   * Link the shared content into worktree `path`:  this plugin's `epic shared link`, run in the worktree.
   * - only when the shared repo exists (`contentFolder` in `.epic/config.json5`):  before the cutover there's nothing
   *   to link
   * - its output goes to stderr (stdout is the worktree's path);  a failure is a warning
   */
  static linkShared(path, config) {
    if (!existsSync(join(config.contentFolder, ".git"))) return
    try {
      execFileSync(process.execPath, [EPIC, "shared", "link"], {
        cwd: path,
        stdio: ["ignore", 2, 2]
      })
    } catch (error) {
      console.error(
        `worktree hook:  shared content not linked (${error.message.split("\n")[0]});  run \`epic shared link\``
      )
    }
  }

  /**
   * Link worktree `path`'s saved-session folder to main checkout `root`'s (`SessionFolders.link()`), so its sessions
   * save where every window's Claude panel looks (epic `epic-eject` Q4);  a folder it can't link is a warning.
   */
  static linkSessions(path, root) {
    try {
      const { action, folder, why } = SessionFolders.link(path, root)
      if (action === "kept") console.error(`worktree hook:  ${folder} not linked to main's:  ${why}`)
      else console.error(`worktree hook:  session folder ${action}:  ${folder}`)
    } catch (error) {
      console.error(`worktree hook:  session folder not linked (${error.message})`)
    }
  }

  /**
   * Run the repo's `installCommand` in worktree `path`, in a shell, `installTimeout` seconds at most;  its output to
   * stderr (stdout is the worktree's path).
   * - throws, saying how to carry on, when it fails or runs out of time:  the worktree is kept, made and linked
   */
  static install(path, config) {
    const command = config.installCommand
    console.error(`worktree hook:  ${command} in ${path}`)
    const run = spawnSync(command, {
      cwd: path,
      shell: true,
      stdio: ["ignore", 2, 2],
      timeout: config.installTimeout * 1000
    })
    const why =
      run.error?.code === "ETIMEDOUT" || run.signal
        ? `stopped after ${config.installTimeout}s (installTimeout in .epic/config.json5)`
        : run.error
          ? run.error.message
          : run.status !== 0
            ? `exit ${run.status}`
            : ""
    if (!why) return
    throw new Error(
      `\`${command}\` failed in ${path}:  ${why}.  The worktree is made:  run \`${command}\` there by hand, ` +
        `then EnterWorktree with path "${path}"`
    )
  }

  /**
   * The branch all of `branch`'s commits are in:  the base branch (`main`), else (an agent's `<owner>-agent-<id>`)
   * `<owner>`;  else `""`.
   */
  static mergedInto(root, branch) {
    const owner = branch.match(OWNED_AGENT)?.[1]
    const intos = [new EpicConfig(root).baseBranch, ...(owner && Worktree.hasBranch(root, owner) ? [owner] : [])]
    return intos.find((into) => Worktree.git(root, "rev-list", "--count", `${into}..${branch}`) === "0") ?? ""
  }

  /** `remove`:  remove the worktree and its branch, unless that would lose work;  returns what happened. */
  static remove({ worktree_path: path }) {
    path = resolve(path)
    if (!existsSync(path)) return `${path} is already gone`
    // the session folder's name is made from the real path, as `create` had it from git
    path = realpathSync(path)
    const root = Worktree.root(path)
    const base = new EpicConfig(root).baseBranch
    const branch = Worktree.git(path, "branch", "--show-current")
    if (Worktree.git(path, "status", "--porcelain")) throw new Error(`kept ${path}:  it has uncommitted changes`)
    const into = branch && Worktree.mergedInto(root, branch)
    if (branch && !into) {
      const owner = branch.match(OWNED_AGENT)?.[1]
      throw new Error(`kept ${path}:  branch ${branch} has commits ${owner ?? base} doesn't;  merge it first`)
    }
    Worktree.git(root, "worktree", "remove", path)
    // `-d` checks against the base branch only:  in its owner's branch alone (checked above) needs `-D`
    if (branch) Worktree.git(root, "branch", into === base ? "-d" : "-D", branch)
    const unlinked = SessionFolders.unlink(path, root).action === "removed" ? ", and its session-folder link" : ""
    return `removed ${path}${branch ? ` and branch ${branch}` : ""}${unlinked}`
  }
}

let input = ""
for await (const chunk of process.stdin) input += chunk
try {
  const data = JSON.parse(input)
  const command = process.argv[2]
  if (command === "create") console.log(Worktree.create(data))
  else if (command === "remove") console.error(`worktree hook:  ${Worktree.remove(data)}`)
  else throw new Error(`usage:  worktree.mjs create|remove  (got "${command}")`)
} catch (error) {
  console.error(`worktree hook:  ${error.message}`)
  process.exit(1)
}
