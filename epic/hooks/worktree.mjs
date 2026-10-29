#!/usr/bin/env node
/**
 * Claude Code's `WorktreeCreate` / `WorktreeRemove` hooks (the plugin's `hooks/hooks.json`):
 * `worktree.mjs create|remove`, the hook's JSON on stdin.
 * They replace Claude's own git worktree logic, for `EnterWorktree`, `claude -w` and agents' `isolation: "worktree"`.
 * - In EVERY repo, since the plugin is installed for the machine:  in a repo `epic init` never set up
 *   (`EpicConfig.ofSetUp()`), they do what Claude Code does by itself ("A repo not set up", below).
 *
 * ## Why a hook
 * - Where sessions are saved:
 *   - a session in a worktree Claude made itself is saved under the WORKTREE's folder,
 *     so it drops out of the VS Code Claude panel's list (which shows one folder's sessions),
 *     and is orphaned if it never leaves
 *   - a session in a worktree a hook made stays saved where it started:
 *     the repo root, which every window lists (`src/window.mjs`)
 *   - checked with CLI 2.1.287
 * - Names agree:  worktree `../<repo>.worktrees/<name>`, branch `<name>` (Claude's own adds `worktree-`).
 * - Branches from the LOCAL base branch (unpushed work included), not `origin/main`.
 * - The folders and the branch come from the repo's `.epic/config.json5` (`EpicConfig`):
 *   `worktreesFolder`, `baseBranch`, `contentFolder`;  a key left out, the repo's own (`EpicConfig.defaultsFor()`).
 *   - `worktreesFolder` BESIDE the repo since epic `epic-eject` P8:  new worktrees go there,
 *     and the old ones are still found in `.claude/worktrees` (`EpicConfig.worktreeFolder()`).
 *
 * ## create
 * - stdin `{ name, cwd, session_id, transcript_path, ... }`
 *   (CLI 2.1.287:  no branch or base field, whatever the docs say).
 * - Prints the worktree's absolute path on stdout, the ONLY thing on stdout;  progress goes to stderr.
 * - An agent's worktree (`isolation: "worktree"`, name `agent-<id>`) started by a session in worktree `<owner>`
 *   (an epic's) is named `<owner>-agent-<id>`, worktree and branch (Owen, 2026-10-05):
 *   - `git worktree list` says whose it is
 *   - `remove` and `/isolate done` know its work is safe once it's in `<owner>`'s branch
 * - REFUSES `<name>` when it's an epic worked in ANOTHER repo (`EpicRepo.elsewhere()`, epic `epic-engine` I47):
 *   the hook fails with one line saying where it's worked, and how to get there (`epic window launch <name>`).
 *   - Why:  repos share one content folder, so `/epic resume epic-engine` in spell-app's window found spell-epic's
 *     epic page, and `EnterWorktree` made `spell-app.worktrees/epic-engine`, whose `spell-epic` link then took its
 *     edits into spell-epic's MAIN checkout.
 *   - before reusing one:  a stray worktree of that name made before is refused too
 *   - an agent's worktree never is
 * - Reuses worktree `<name>` when it's already one, in either place, and branch `<name>` when it exists.
 * - Then, for a NEW worktree, in this order:
 *   0. makes what its tracked links point at beside it (`linkOutside()`, epic `epic-engine` I13):
 *      a relative link that leaves the repo finds its target beside the main checkout, but not from a worktree
 *      one folder deeper (e.g. a tracked `.dep -> ../dep`;  spell-epic's old `.spell-app -> ../spell-app` was one,
 *      until epic `epic-engine` P10 made it a plain workspace of the top `spell` install)
 *      - the missing target is made as a link to what main's link finds:  `../<repo>.worktrees/dep` -> `../dep`,
 *        ONE link every worktree there shares
 *      - in a multi-repo top's epic worktree each repo's siblings are its siblings there too, so it finds nothing
 *        to make
 *      - nothing in the worktree changes, so git sees nothing;  a link it can't make is a warning
 *   1. links the shared content in (this plugin's `epic shared link`, epic `shared-content`),
 *      when the shared repo exists:  a failure there is a warning, never a failed hook
 *      - worktrees beside the repo:  that also makes the worktrees' folder's ONE link to the content folder,
 *        `spell-app.worktrees/spell-app.epics` (`Shared.linkContentBeside()`, epic `epic-eject` T31), so the docs'
 *        `../spell-app.epics/...` links resolve from a worktree as from the main checkout
 *   2. `linkSessionFolders` on:  links the worktree's saved-session folder to the main checkout's (`SessionFolders`),
 *      before any session saves there;  a folder it can't link is a warning
 *   3. `installOnCreate` on:  runs `installCommand` in it (`installTimeout` seconds at most),
 *      so nothing opens the worktree without its packages (I2).
 *      A failure FAILS the hook, saying how to carry on:  the worktree stays
 *   4. then in each of its `extraInstalls` (epic `epic-engine` I65):  the folders that are yarn projects of their own,
 *      outside the one install (`epic/vscode`, `app/vscode`:  the extensions), so the linting of them
 *      finds their packages
 *      - `installCommand` again, in that folder, `installTimeout` seconds at most
 *      - a failure, or a folder that isn't there, is a WARNING, saying what to run:  the worktree works without it
 * - Each new worktree's checkout patches (`Worktree.patch()`, epic `epic-engine` P17):  on a branch made from `main`
 *   just now, only remembered as had;  on a branch that was there already, applied, as `epic worktree patch` would
 * - The hook's own time limit is in `hooks/hooks.json` (900s):  more than any install's.
 *
 * ## A multi-repo top (epic `epic-engine` P10, repo-split's Q9 A)
 * - When the repo is a MULTI-REPO TOP, or a child repo of one (`EpicConfig.top`:  the top's `.epic/config.json5`
 *   names its child repos, `"repos": "repos.json5"`), an epic's worktree is the top's, `<worktreesFolder>/<name>/`:
 *   - `create`:  `git worktree add` of the TOP first, then of EVERY child repo cloned in the top's main checkout,
 *     inside it at the same folder names (`EpicConfig.repoCheckouts()`), ALL on branch `<name>` (each from its own
 *     `baseBranch`, or its branch `<name>` when there);  stdout is the TOP's worktree
 *     - one that's there already is reused, and a child cloned since is added
 *     - the shared links once (the top's), the session-folder links for the top's worktree and each child's (all to
 *       the main TOP checkout's folder:  every session saved under `~/www/spell`'s), then ONE install, at the top,
 *       and one in each of the top's `extraInstalls` (`epic/vscode` ...)
 *   - `remove`:  the worktree_path may be the top's worktree or any child's in it.  Every repo is checked FIRST
 *     (uncommitted changes, commits its base branch lacks):  any one kept keeps them all.  Then the servers stop
 *     (once, for the whole folder), each child's worktree and branch go, then the top's
 * - A single repo (no `repos`, other people's setups):  everything above, as before.
 *
 * ## The kit after repo-split's P20 · One Repo (epic-engine's P49)
 * - ONE repo:  its `repos` file lists only PEERS (`"peer": true`, spell-brand), so an epic's worktree is the kit's
 *   alone, made as a single repo's;  a peer is never part of it (Q50 D).
 * - Run in a PEER (spell-brand, whose settings say `{ "top": "../spell" }`):  its lone worktree, in its own
 *   `../spell-brand.worktrees/<name>/`, then its own install;  the content folder and windows are the kit's.
 * - `create` copies the main checkout's `page-server.local.json5` (the outside projects the page server serves,
 *   spell-brand's Brand tab) into a new worktree, its paths made absolute:  it's git-ignored, so a worktree lacks it.
 * - `create` reusing a branch cut BEFORE P20:  the kit's worktree only;  an old clone (`oldLayout.oldClones`,
 *   `~/www/spell.old/`) that still has the branch is named, with how to cross it over.
 * - `remove` of an OLD-LAYOUT worktree (a worktree of an old child repo still inside, `spell-ui/` ...:
 *   `EpicConfig.foundCheckouts()`):  KEPT while one holds commits of its own, not crossed over
 *   (`EpicConfig.leftBehind()`);  else each is removed first, from its old clone.
 *
 * ## A repo not set up (epic `epic-friend` P6)
 * - No `.epic/config.json5`:  NOT an epic repo, so nothing of the above, and no default of Spell's.
 *   - Before P6 it ran the above with Spell's defaults, cut from a branch named `main`:
 *     in a repo whose branch is called something else, every Claude Code worktree failed (`invalid reference: main`).
 * - `create`:  Claude Code's own plain worktree (`createPlain()`):
 *   - `.claude/worktrees/<name>`, on a new branch `worktree-<name>` (or that branch, when it's there)
 *   - cut from the remote's default branch (`origin/HEAD`), else what's checked out
 *   - no links, no install, no renaming an agent's worktree
 * - `remove`:  the worktree, and its branch when nothing would be lost (`removePlain()`)
 *
 * ## remove
 * - stdin `{ worktree_path, cwd, ... }`.
 * - Runs on `ExitWorktree` `remove` (only with `discard_changes: true`), at session exit, and when an agent finishes.
 * - Never loses work:  the worktree is KEPT (exit 1 with the reason;  Claude shows stderr) when it has
 *   uncommitted changes, or its branch has commits `main` lacks.
 * - Otherwise stops the worktree's servers FIRST (its page server, the editor's vite:  `CheckoutServers.stop()`,
 *   epic `epic-engine` I53), then removes the worktree and deletes its branch.
 *   - Why:  nothing else ever stopped them, once their folder was gone.
 *   - a server that won't stop is a warning:  the removal goes on
 * - An agent's `<owner>-agent-<id>` counts as merged when its commits are in `main` OR in branch `<owner>`.
 * - Then removes the worktree's saved-session link, if it IS a link to the main checkout's folder.
 */
import { execFileSync, spawnSync } from "node:child_process"
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path"

import { Git } from "spell/server/Git"
import { CheckoutPatches } from "spell/epic/command/CheckoutPatches.ts"
import { CheckoutServers } from "spell/epic/command/CheckoutServers.ts"
import { EpicRepo } from "spell/epic/config/EpicRepo.ts"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { SessionFolders } from "spell/epic/config/SessionFolders.ts"

/** This plugin's `bin/epic`:  `hooks/` is beside `bin/`. */
const EPIC = join(dirname(import.meta.dirname), "bin", "epic")

/** The main checkout's git-ignored page server settings, copied into a new worktree (`copyLocalServer()`). */
const LOCAL_SERVER = "page-server.local.json5"

/** Allowed worktree / branch names. */
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/** Claude's name for an agent's worktree (`isolation: "worktree"`). */
const AGENT = /^agent-[0-9a-f]+$/

/** Claude Code's prefix for its own worktrees' branches:  `worktree-<name>` (`createPlain()`). */
const PLAIN_BRANCH = "worktree-"

/** An agent's worktree once prefixed:  `<owner>-agent-<id>`;  `$1` is the owner. */
const OWNED_AGENT = /^(.+)-agent-[0-9a-f]+$/

/****************
 * ### `Worktree`
 ****************/
class Worktree {
  /**
   * `git <args>` in `cwd`;  its trimmed stdout.
   * - throws a `GitError` with git's own words when it fails
   * - no time limit:  `worktree add` checks out a whole tree
   */
  static git(cwd, ...args) {
    return Git.mustRun(args, cwd, { timeout: 0 })
  }

  /** The main checkout's folder, from anywhere inside it or one of its worktrees;  `cwd` itself outside git. */
  static root(cwd) {
    return Git.mainRoot(cwd)
  }

  /**
   * Whether `path` holds a live checkout to reuse:  its `.git` there, and, for a worktree's `.git` FILE, the git folder
   * it names there too.
   * - throws for a DEAD one (epic `epic-engine` r15):  a folder left from a removed worktree, its git folder gone;
   *   reused, it would make a broken worktree.  Never deleted here:  it may hold work.
   */
  static isLive(path) {
    const dotGit = join(path, ".git")
    if (!existsSync(dotGit)) return false
    if (lstatSync(dotGit).isDirectory()) return true
    const gitdir = /^gitdir:\s*(.+)$/m.exec(readFileSync(dotGit, "utf8"))?.[1]?.trim()
    if (gitdir && existsSync(resolve(path, gitdir))) return true
    throw new Error(
      `${path} is left from a removed worktree (its git folder ${gitdir ?? "?"} is gone):  ` +
        `move it aside or delete it, then try again`
    )
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

  /**
   * `create`:  make (or reuse) worktree `<name>` on branch `<name>`;  returns its path.
   * - a repo not set up for epics:  Claude Code's own plain worktree (`createPlain()`)
   */
  static create({ name, cwd }) {
    if (!NAME.test(name ?? "")) throw new Error(`worktree name must match ${NAME}:  got "${name}"`)
    const root = Worktree.root(cwd)
    const config = EpicConfig.ofSetUp(root)
    if (!config) return Worktree.createPlain(name, root)
    const owner = AGENT.test(name) ? Worktree.owner(config, cwd) : ""
    if (owner) name = `${owner}-${name}`
    // ANOTHER repo's epic:  never a worktree of its name here, even one made before (epic `epic-engine` I47)
    const home = owner || AGENT.test(name) ? undefined : EpicRepo.elsewhere(name, root)
    if (home) throw new Error(EpicRepo.refusal(home))
    // a multi-repo top (epic `epic-engine` P10):  the top's worktree, with every child repo's inside it
    if (config.top) return Worktree.createAll(name, config.top)
    // where it is (either place), else the new place
    const path = config.worktreeFolder(name)
    if (Worktree.isLive(path)) {
      console.error(`worktree hook:  reusing ${path}`)
      return path
    }
    const reused = Worktree.hasBranch(root, name)
    const args = reused ? [path, name] : ["-b", name, path, config.baseBranch]
    console.error(`worktree hook:  git worktree add ${args.join(" ")}`)
    mkdirSync(dirname(path), { recursive: true })
    Worktree.git(root, "worktree", "add", "--quiet", ...args)
    Worktree.patch(path, reused)
    Worktree.linkOutside(path, root)
    Worktree.copyLocalServer(path, root)
    if (reused) Worktree.sayOldClones(name, config)
    Worktree.linkShared(path, config)
    if (config.linkSessionFolders) Worktree.linkSessions(path, root)
    // `installCommand: ""`:  a repo with nothing to install
    if (config.installOnCreate && config.installCommand) Worktree.installAll(path, config)
    return path
  }

  /**
   * `create` in a repo NOT set up for epics (no `.epic/config.json5`):  the worktree Claude Code makes by itself.
   * - `.claude/worktrees/<name>` in the main checkout (`EpicConfig.CLAUDE_WORKTREES`), reused when it's there
   * - on branch `worktree-<name>`, new, from the remote's default branch (`origin/HEAD`), else from what's checked out;
   *   that branch itself when it's there already
   * - nothing else:  no shared links, session links or install;  an agent's worktree keeps its own name
   */
  static createPlain(name, root) {
    const path = join(root, EpicConfig.CLAUDE_WORKTREES, name)
    if (Worktree.isLive(path)) {
      console.error(`worktree hook:  reusing ${path}`)
      return path
    }
    const branch = `${PLAIN_BRANCH}${name}`
    const base = Git.run(["rev-parse", "--verify", "--quiet", "refs/remotes/origin/HEAD"], root).ok
      ? "origin/HEAD"
      : "HEAD"
    const args = Worktree.hasBranch(root, branch) ? [path, branch] : ["-b", branch, path, base]
    console.error(`worktree hook:  not an epic repo:  git worktree add ${args.join(" ")}`)
    mkdirSync(dirname(path), { recursive: true })
    Worktree.git(root, "worktree", "add", "--quiet", ...args)
    return path
  }

  /**
   * `create` for a MULTI-REPO top `top` (its config):  epic `name`'s worktree of the top, then of every child repo
   * inside it, all on branch `name`;  returns the top's worktree.
   * - each from its own `baseBranch`, or its branch `name` when it has one;  one that's there is reused
   * - then, when anything was made:  the shared links (the top's), the session-folder links (each new worktree's
   *   folder to the main top checkout's), ONE install at the top
   */
  static createAll(name, top) {
    if (!existsSync(join(top.main, ".git")))
      throw new Error(`the top repo ${top.main} isn't a git repo:  \`git init\` it first (it lists child repos)`)
    const checkouts = top.repoCheckouts(name)
    const made = []
    for (const { repo, main, worktree } of checkouts) {
      if (Worktree.isLive(worktree)) {
        console.error(`worktree hook:  reusing ${worktree}`)
        continue
      }
      const base = new EpicConfig(main).baseBranch
      const reused = Worktree.hasBranch(main, name)
      const args = reused ? [worktree, name] : ["-b", name, worktree, base]
      console.error(`worktree hook:  ${repo}:  git worktree add ${args.join(" ")}`)
      mkdirSync(dirname(worktree), { recursive: true })
      Worktree.git(main, "worktree", "add", "--quiet", ...args)
      Worktree.patch(worktree, reused)
      Worktree.linkOutside(worktree, main)
      made.push(worktree)
    }
    const path = checkouts[0].worktree
    if (!made.length) return path
    Worktree.linkShared(path, top)
    if (top.linkSessionFolders) for (const each of made) Worktree.linkSessions(each, top.main)
    if (top.installOnCreate && top.installCommand) Worktree.installAll(path, top)
    return path
  }

  /**
   * Copy main checkout `root`'s `page-server.local.json5` into new worktree `path`, its `projects` made absolute
   * (epic-engine's P49):  the outside projects the page server serves (spell-brand's Brand tab, Q49), which a
   * worktree lacks, the file being git-ignored.
   * - nothing when main has none, or the worktree has one already;  a file that won't read or write is a warning
   */
  static copyLocalServer(path, root) {
    const from = join(root, LOCAL_SERVER)
    const to = join(path, LOCAL_SERVER)
    if (!existsSync(from) || existsSync(to)) return
    try {
      const data = EpicConfig.parse(readFileSync(from, "utf8"), from)
      const projects = Array.isArray(data?.projects) ? data.projects : []
      const absolute = {
        ...data,
        projects: projects.map((each) => (typeof each === "string" ? resolve(root, each) : each))
      }
      const said = `// Copied from ${from} by the worktree hook, its projects made absolute:  the main checkout's own.\n`
      writeFileSync(to, `${said}${JSON.stringify(absolute, null, 2)}\n`)
      console.error(`worktree hook:  ${LOCAL_SERVER} copied from the main checkout`)
    } catch (error) {
      console.error(`worktree hook:  ${LOCAL_SERVER} not copied (${error.message})`)
    }
  }

  /**
   * Reusing branch `name` in a repo that absorbed its child repos (repo-split's P20 · One Repo, `oldLayout`):
   * say which old clones (`oldLayout.oldClones`) still have a branch `name`, and how to cross it over.
   * - their work isn't in the kit's branch until it crosses;  the hook makes the kit's worktree alone, never theirs
   */
  static sayOldClones(name, config) {
    const { oldClones, carryOn } = config.oldLayout
    if (!oldClones) return
    const folder = resolve(config.main, oldClones)
    let clones = []
    try {
      clones = readdirSync(folder).filter((repo) => existsSync(join(folder, repo, ".git")))
    } catch {
      return
    }
    const holding = clones.filter(
      (repo) =>
        spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${name}`], { cwd: join(folder, repo) })
          .status === 0
    )
    if (!holding.length) return
    console.error(
      `worktree hook:  branch ${name} was cut before the one repo:  ${holding.join(", ")} in ${folder} still ` +
        `${holding.length > 1 ? "have" : "has"} a branch ${name}.  To cross it over, check each out inside the worktree ` +
        `(\`git -C ${join(folder, holding[0])} worktree add <worktree>/${holding[0]} ${name}\`), then ` +
        `\`epic worktree merge-main\` there (it runs \`${carryOn || "the carry-on command"}\`)`
    )
  }

  /**
   * Give new worktree `path` its repo's checkout patches (`CheckoutPatches`, epic `epic-engine` P17).
   * - `reused`:  on a branch that was there already, maybe behind `main`:  patched as any checkout is
   * - else made from `main` just now, so it has what they fix:  each only remembered as had, nothing run
   * - its child repos are patched as each is made (`createAll()`)
   * - a failure is a warning:  the worktree works, and the next session start patches it
   */
  static patch(path, reused) {
    if (!reused) return CheckoutPatches.markApplied(path)
    const report = new CheckoutPatches().patch(path)
    for (const line of CheckoutPatches.lines([report], path)) console.error(`worktree hook:  patch:  ${line}`)
  }

  /**
   * Make what worktree `path`'s tracked links point at OUTSIDE it, where it's missing:
   * a link there to what the main checkout's same link finds (epic `epic-engine` I13, see the header).
   * - only a relative link that leaves the worktree, is dangling in it, and resolves in `root`
   * - never replaces anything:  a path that's there already (even a broken link) is left alone
   * - nor makes a folder:  the link goes only where its folder is (the worktrees' folder, beside the worktree)
   * - a link it can't make is a warning
   */
  static linkOutside(path, root) {
    const tracked = Worktree.git(path, "ls-files", "-s")
      .split("\n")
      .filter((line) => line.startsWith("120000 "))
      .map((line) => line.slice(line.indexOf("\t") + 1))
    for (const name of tracked) {
      const link = join(path, name)
      try {
        const target = readlinkSync(link)
        const at = resolve(dirname(link), target)
        const inside = at === path || at.startsWith(`${path}/`)
        const mains = join(root, name)
        if (isAbsolute(target) || inside || existsSync(link) || lstatSync(at, { throwIfNoEntry: false })) continue
        if (!existsSync(mains)) continue
        symlinkSync(relative(dirname(at), realpathSync(mains)), at)
        console.error(`worktree hook:  ${name}'s target linked:  ${at} -> ${realpathSync(mains)}`)
      } catch (error) {
        console.error(
          `worktree hook:  ${name} finds nothing from here, and its target couldn't be linked (${error.message})`
        )
      }
    }
  }

  /**
   * Link the shared content into worktree `path`:  this plugin's `epic shared link`, run in the worktree.
   * - and the worktrees' folder's link to the content folder, when it's beside the repo (`linkContentBeside()`)
   * - only when the shared repo exists (`contentFolder` in `.epic/config.json5`):
   *   before the cutover (epic `shared-content`) there's nothing to link
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
   * Link worktree `path`'s saved-session folder to main checkout `root`'s (`SessionFolders.link()`),
   * so its sessions save where every window's Claude panel looks (epic `epic-eject` Q4).
   * - a folder it can't link is a warning
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
   * Install worktree `path`:  `installCommand` at its root (`install()`), then in each of its `extraInstalls`
   * (`installExtra()`, epic `epic-engine` I65).
   */
  static installAll(path, config) {
    Worktree.install(path, config)
    for (const folder of config.extraInstalls) Worktree.installExtra(path, folder, config)
  }

  /**
   * Run the repo's `installCommand` in worktree `path`, in a shell, `installTimeout` seconds at most.
   * - its output goes to stderr (stdout is the worktree's path)
   * - throws, saying how to carry on, when it fails or runs out of time:  the worktree is kept, made and linked
   */
  static install(path, config) {
    const command = config.installCommand
    const why = Worktree.run(command, path, config)
    if (!why) return
    throw new Error(
      `\`${command}\` failed in ${path}:  ${why}.  The worktree is made:  run \`${command}\` there by hand, ` +
        `then EnterWorktree with name "${basename(path)}" (never its path:  Claude Code would ask)`
    )
  }

  /**
   * Run the repo's `installCommand` in `folder` of worktree `path`, a yarn project of its own (`extraInstalls`).
   * - a folder that isn't there (a child repo not cloned), or an install that fails:  a warning saying what to run,
   *   never a failed hook (the worktree works;  only what needs that folder's packages doesn't, its linting)
   */
  static installExtra(path, folder, config) {
    const command = config.installCommand
    const cwd = join(path, folder)
    if (!existsSync(join(cwd, "package.json"))) {
      console.error(`worktree hook:  extraInstalls:  ${folder} isn't in ${path} (no package.json there):  skipped`)
      return
    }
    const why = Worktree.run(command, cwd, config)
    if (why)
      console.error(
        `worktree hook:  \`${command}\` failed in ${cwd}:  ${why}.  Its packages are missing:  run \`${command}\` ` +
          "there by hand"
      )
  }

  /**
   * Run `command` in folder `cwd`, in a shell, `installTimeout` seconds at most, its output on stderr (stdout is the
   * worktree's path):  why it failed, or `""`.
   */
  static run(command, cwd, config) {
    console.error(`worktree hook:  ${command} in ${cwd}`)
    const run = spawnSync(command, {
      cwd,
      shell: true,
      stdio: ["ignore", 2, 2],
      timeout: config.installTimeout * 1000
    })
    return run.error?.code === "ETIMEDOUT" || run.signal
      ? `stopped after ${config.installTimeout}s (installTimeout in .epic/config.json5)`
      : run.error
        ? run.error.message
        : run.status !== 0
          ? `exit ${run.status}`
          : ""
  }

  /**
   * The branch all of `branch`'s commits are in, else `""`:
   * - the base branch (`main`)
   * - else, for an agent's `<owner>-agent-<id>`, branch `<owner>`
   */
  static mergedInto(root, branch) {
    const owner = branch.match(OWNED_AGENT)?.[1]
    const intos = [new EpicConfig(root).baseBranch, ...(owner && Worktree.hasBranch(root, owner) ? [owner] : [])]
    return intos.find((into) => Worktree.git(root, "rev-list", "--count", `${into}..${branch}`) === "0") ?? ""
  }

  /**
   * `remove`:  remove the worktree and its branch, unless that would lose work;  returns what happened.
   * - its servers stopped first (`CheckoutServers.stop()`), once it's sure to go
   */
  static remove({ worktree_path: path }) {
    path = resolve(path)
    if (!existsSync(path)) return `${path} is already gone`
    // the session folder's name is made from the real path, as `create` had it from git
    path = realpathSync(path)
    const root = Worktree.root(path)
    const config = new EpicConfig(root)
    if (!config.isSetUp) return Worktree.removePlain(path, root)
    // a multi-repo top's epic worktree, or a child's in it (epic `epic-engine` P10):  every repo's
    const name = config.top?.worktreeNameOf(path)
    if (name) return Worktree.removeAll(name, config.top)
    const base = config.baseBranch
    const branch = Worktree.git(path, "branch", "--show-current")
    if (Worktree.git(path, "status", "--porcelain")) throw new Error(`kept ${path}:  it has uncommitted changes`)
    // an OLD-LAYOUT worktree (epic-engine's P49):  a child checkout inside still holding work of its own keeps it
    const said = config.leftBehindSaid(path, config.leftBehind(path))
    if (said) throw new Error(`kept ${path}:  ${said}`)
    const found = config.oldCheckouts(path)
    for (const each of found)
      if (Worktree.git(each.worktree, "status", "--porcelain"))
        throw new Error(`kept ${path}:  ${each.repo} (${each.worktree}) has uncommitted changes`)
    const into = branch && Worktree.mergedInto(root, branch)
    if (branch && !into) {
      const owner = branch.match(OWNED_AGENT)?.[1]
      throw new Error(`kept ${path}:  branch ${branch} has commits ${owner ?? base} doesn't;  merge it first`)
    }
    const servers = Worktree.stopServers(path)
    // the old child checkouts first:  they're inside it
    for (const each of found) Worktree.git(each.main, "worktree", "remove", each.worktree)
    Worktree.git(root, "worktree", "remove", path)
    // `-d` checks against the base branch only:  in its owner's branch alone (checked above) needs `-D`
    if (branch) Worktree.git(root, "branch", into === base ? "-d" : "-D", branch)
    const unlinked = SessionFolders.unlink(path, root).action === "removed" ? ", and its session-folder link" : ""
    return `removed ${path}${branch ? ` and branch ${branch}` : ""}${unlinked}${servers}`
  }

  /**
   * `remove` for epic `name`'s worktree of MULTI-REPO top `top`:  every repo's, the children first, then the top's.
   * - checks every repo FIRST:  uncommitted changes, or commits its base branch (or an agent's owner) lacks, in ANY
   *   repo keep them ALL (throws, naming the repo)
   * - then stops the servers in the whole folder, once
   */
  static removeAll(name, top) {
    const checkouts = top.repoCheckouts(name).filter(({ worktree }) => existsSync(join(worktree, ".git")))
    const branches = new Map()
    for (const { repo, main, worktree } of checkouts) {
      const branch = Worktree.git(worktree, "branch", "--show-current")
      if (Worktree.git(worktree, "status", "--porcelain"))
        throw new Error(`kept ${checkouts[0].worktree}:  ${repo} (${worktree}) has uncommitted changes`)
      const into = branch && Worktree.mergedInto(main, branch)
      if (branch && !into) {
        const owner = branch.match(OWNED_AGENT)?.[1] ?? new EpicConfig(main).baseBranch
        throw new Error(
          `kept ${checkouts[0].worktree}:  ${repo}'s branch ${branch} has commits ${owner} doesn't;  merge it first`
        )
      }
      branches.set(worktree, { branch, into, base: new EpicConfig(main).baseBranch })
    }
    const path = checkouts[0]?.worktree ?? join(top.worktreesFolder, name)
    const servers = Worktree.stopServers(path)
    const removed = []
    for (const { repo, main, worktree } of [...checkouts.slice(1).reverse(), ...checkouts.slice(0, 1)]) {
      const { branch, into, base } = branches.get(worktree)
      Worktree.git(main, "worktree", "remove", worktree)
      if (branch) Worktree.git(main, "branch", into === base ? "-d" : "-D", branch)
      SessionFolders.unlink(worktree, top.main)
      removed.push(repo)
    }
    return `removed ${path} (${removed.join(", ")}) and branch ${name} in each${servers}`
  }

  /**
   * `remove` in a repo NOT set up for epics:  worktree `path` (`createPlain()`'s), and its branch.
   * - never loses work:  a worktree with uncommitted changes is kept (throws);  a branch with commits the checked-out
   *   branch lacks is kept, and said
   */
  static removePlain(path, root) {
    if (Worktree.git(path, "status", "--porcelain")) throw new Error(`kept ${path}:  it has uncommitted changes`)
    const branch = Worktree.git(path, "branch", "--show-current")
    Worktree.git(root, "worktree", "remove", path)
    if (!branch) return `removed ${path}`
    const deleted = Git.run(["branch", "-d", branch], root).ok
    return `removed ${path}${deleted ? ` and branch ${branch}` : `;  kept branch ${branch}:  it has commits not merged`}`
  }

  /** Stop checkout `path`'s servers (`CheckoutServers.stop()`):  `", stopped ..."` for the report, or `""`;  never throws. */
  static stopServers(path) {
    try {
      const said = CheckoutServers.said(CheckoutServers.stop(path))
      return said && `;  ${said}`
    } catch (error) {
      console.error(`worktree hook:  ${path}'s servers not stopped (${error.message});  \`epic server prune\` later`)
      return ""
    }
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
