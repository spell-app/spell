import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"

import { FileLock } from "spell/server/FileLock"
import { Git } from "spell/server/Git"
import { RealPath } from "spell/server/RealPath"
import type { SRV } from "spell/server"
import { CLI } from "spell/cli"
import { EpicConfig } from "spell/epic/config/EpicConfig"

import {
  EXIT,
  EpicCommandError,
  parseVerbArgs,
  stringFlag,
  type LinkReport,
  type MigrateReport,
  type SharedConfig,
  type SharedStatus
} from "./command.types"
import { EpicCheckout } from "./EpicCheckout"
import { SharedMigration } from "./SharedMigration"

/****************
 * ### `Shared`
 * `epic shared <verb> ...`:  SHARED CONTENT (epic `shared-content`).
 *
 * - Docs pages, saga sets and the agents' logs live ONCE, in a content repo beside the main checkout
 *   (`../spell-app.epics`, `EpicConfig`'s `contentFolder`).
 * - The tools and page servers read the pages there, never through a link (epic `epic-eject` P12).
 * - A checkout links in at its root only the folders its config names (`EpicConfig`'s `sharedFolders`):
 *   spell-app's `agents`;  the default, from before P12:  `epics`, `guides`, `pages`, `brand`, `goals`, `sagas`, `agents`.
 *   - not `templates` since epic `epic-eject` T11:  they're spell-epic's;  `link` removes a link the manifest dropped
 *     (`unlinkDropped()`)
 * - So every worktree sees every edit at once, and none of it is merged.
 * - The verbs (`run()`):
 *   - `status [--json]` (default):  each checkout's links, and the shared repo's uncommitted files and last commit
 *   - `init [--import]`:  create the shared repo;  `--import` copies THIS checkout's folders in (the cutover, once)
 *   - `link [--all]`:  link this checkout's folders (`--all`:  every checkout)
 *     - a real folder is replaced only when it matches the shared one exactly
 *     - a link to a shared folder the manifest no longer names is removed (`unlinkDropped()`)
 *     - and, worktrees beside the repo, ONE link in their folder to the content folder (`linkContentBeside()`)
 *   - `commit [--session <id>] [--quiet]`:  commit whatever changed in the shared repo (the `Stop` hook, every turn)
 *     - one commit per epic / guide / folder (`commit()`)
 *   - `migrate <worktree> [--dry-run]`:  move a worktree cut before the cutover onto the shared content
 *     (`SharedMigration`);  stops, writing nothing, on a conflict
 *   - NOT `rename` and `repair` (epic `repo-split` Q45):  the content folder's one rename (epic `epic-eject` P8) and
 *     the old monorepo's page moves (`relocate.js`) are done
 * - `ui`:  Spell UI's hand-written docs pages (claude-design P6);
 *   their bundle and data stay in each branch's `packages/ui/site/`
 * - the manifest:  the root `package.json`'s `"shared"` (`configOf()`)
 * - where the shared repo and the worktrees are:
 *   the repo's `.epic/config.json5` (`EpicConfig`:  `contentFolder`, `worktreesFolder`)
 * - only FOLDERS are linked:  Claude's Edit refuses to write through a link to a file
 * - NOTE:  `SPELL_SHARED_DIR` points every verb at another shared repo (a scratch one, in tests)
 ****************/
export class Shared {
  /** the manifest:  STATIC for the object's life */
  readonly config: SharedConfig

  /** the checkout the verbs act on (`link`, `init --import`):  the caller's */
  readonly checkout: string

  /**
   * - `checkout`:  default the nearest checkout from the current folder of a repo set up for epics
   * - `config`:  default `checkout`'s manifest (`configOf()`)
   */
  constructor({ checkout = EpicCheckout.nearest(), config }: SharedProps = {}) {
    this.checkout = checkout
    this.config = config ?? Shared.configOf(checkout)
  }

  ////////////////
  // ## The verbs
  ////////////////

  /** Run `epic shared <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, SWITCHES)
    const [verb = "status", name] = positional
    const { config, checkout } = this
    switch (verb) {
      case "status": {
        const status = this.status()
        if (flags.json) CLI.out(JSON.stringify(status, null, 2))
        else for (const line of statusLines(status)) CLI.out(line)
        return status.checkouts.every((each) => each.links.every((link) => link.state === "ok")) ? EXIT.OK : EXIT.ERRORS
      }
      case "init": {
        const done = this.init({ importFrom: flags.import ? checkout : undefined })
        CLI.out(`${config.dir}:  ${done}`)
        if (done !== "exists") this.linkAll([checkout])
        return EXIT.OK
      }
      case "link": {
        const reports = this.linkAll(flags.all ? this.checkouts() : [checkout])
        return reports.some((report) => report.action === "diverged") ? EXIT.ERRORS : EXIT.OK
      }
      case "commit": {
        const session = stringFlag(flags.session)
        const shas = this.commit({ session, checkout })
        if (!flags.quiet) CLI.out(shas.length ? `committed ${shas.join(", ")}` : "nothing to commit")
        return EXIT.OK
      }
      case "migrate": {
        if (!name) throw new EpicCommandError("migrate:  which worktree?")
        const worktree = config.worktrees.map((folder) => join(folder, name)).find((each) => existsSync(each))
        if (!worktree || !existsSync(join(worktree, ".git")))
          throw new EpicCommandError(`no worktree ${name} in ${config.worktrees.join(" or ")}`)
        const dryRun = Boolean(flags.dryRun)
        const report = new SharedMigration({ worktree, config }).run({ dryRun })
        if (flags.json)
          CLI.out(JSON.stringify({ ...report, folds: report.folds.map(({ text: _text, ...each }) => each) }, null, 2))
        else for (const line of migrateLines(report, dryRun)) CLI.out(line)
        return report.conflicts.length ? EXIT.ERRORS : EXIT.OK
      }
      default:
        throw new EpicCommandError(`unknown verb '${verb}':  status, init, link, commit or migrate`)
    }
  }

  /** Link each of `checkouts`, printing a line per link that wasn't already right;  every report. */
  private linkAll(checkouts: string[]): LinkReport[] {
    const all: LinkReport[] = []
    const beside = this.linkContentBeside()
    if (beside) {
      all.push(beside)
      if (beside.action !== "ok") CLI.out(`${resolve(this.config.main, beside.path)}:  ${beside.action}`)
    }
    for (const checkout of checkouts) {
      // each checkout's OWN links:  a branch from before the reorg (claude-design P4) still links `packages/docs/content`
      const engine = this.linkEngine(checkout)
      const { links } = Shared.configOf(checkout)
      const reports = [
        ...this.link(checkout, links),
        ...this.unlinkDropped(checkout, links),
        ...(engine ? [engine] : [])
      ]
      for (const report of reports) {
        all.push(report)
        if (report.action !== "ok") CLI.out(`${checkout}/${report.path}:  ${report.action}`)
      }
    }
    return all
  }

  ////////////////
  // ## Checkouts and their links
  ////////////////

  /**
   * The main checkout, then every worktree in each of `config.worktrees` (a folder with a `.git` file):
   * the new place's, then the old place's, each sorted.
   */
  checkouts(): string[] {
    const { main, worktrees: places } = this.config
    const worktrees = places.flatMap((trees) =>
      existsSync(trees)
        ? readdirSync(trees, { withFileTypes: true })
            .filter((entry) => entry.isDirectory() && existsSync(join(trees, entry.name, ".git")))
            .map((entry) => join(trees, entry.name))
            .sort()
        : []
    )
    return [main, ...worktrees]
  }

  /**
   * What `path` (a manifest link) is in `checkout`:
   * - `ok`:  a link to the shared folder
   * - `tracked`:  still in this checkout's git (a branch before the cutover:  `epic shared migrate`)
   * - `missing`:  nothing there
   * - `real`:  a real folder (a fresh clone, or git wrote one over the link)
   * - `dangling`:  a link to nothing
   * - `elsewhere`:  a link to some other folder
   */
  linkState(checkout: string, path: string): LinkReport["state"] {
    if (Git.run(["ls-files", "--", path], checkout).out) return "tracked"
    const at = join(checkout, path)
    const stat = lstatSync(at, { throwIfNoEntry: false })
    if (!stat) return "missing"
    if (!stat.isSymbolicLink()) return "real"
    if (!existsSync(at)) return "dangling"
    return RealPath.of(at) === RealPath.of(join(this.config.dir, path)) ? "ok" : "elsewhere"
  }

  /**
   * Every checkout's links and the shared repo's state:  `epic shared status`.
   * - each checkout's links from its OWN manifest (`configOf()`):
   *   a branch from before the reorg links `packages/docs/content`, a newer one the root folders
   * - `peer.dirty`:  changed files not committed yet
   * - `peer.last`:  `<sha> <when> <subject>`
   */
  status(): SharedStatus {
    const { config } = this
    const isRepo = existsSync(join(config.dir, ".git"))
    return {
      dir: config.dir,
      exists: existsSync(config.dir),
      isRepo,
      dirty: isRepo ? Git.run(["status", "--porcelain"], config.dir).out.split("\n").filter(Boolean).length : 0,
      last: isRepo ? Git.run(["log", "-1", "--format=%h %cr %s"], config.dir).out : "",
      checkouts: this.checkouts().map((checkout) => ({
        checkout: relative(config.main, checkout) || ".",
        links: (manifest(checkout).links ?? config.links).map((path) => ({
          path,
          state: this.linkState(checkout, path)
        }))
      }))
    }
  }

  /**
   * Make checkout `checkout`'s links point at the shared folders;  what it did, per link.
   * - `links`:  which ones;  default the manifest's
   * - done:
   *   - `ok`:  already
   *   - `linked`:  made (missing, dangling or pointing elsewhere)
   *   - `replaced`:  a real folder identical to the shared one, swapped for the link
   * - left alone, with the reason:
   *   - `tracked`:  migrate first
   *   - `diverged`:  a real folder that differs (NEVER overwrites the shared copy)
   *   - `no-shared`:  the shared repo has no such folder
   * - SIDE EFFECT:  removes old links and identical real folders, writes links (relative targets)
   */
  link(checkout: string, links = this.config.links): LinkReport[] {
    return links.map((path) => {
      const state = this.linkState(checkout, path)
      const at = join(checkout, path)
      const target = join(this.config.dir, path)
      if (state === "ok" || state === "tracked") return { path, state, action: state }
      if (!existsSync(target)) return { path, state, action: "no-shared" }
      if (state === "real") {
        if (!sameTree(at, target)) return { path, state, action: "diverged" }
        rmSync(at, { recursive: true, force: true })
      } else if (state !== "missing") rmSync(at, { force: true })
      mkdirSync(dirname(at), { recursive: true })
      symlinkSync(relative(dirname(at), target), at)
      return { path, state, action: state === "real" ? "replaced" : "linked" }
    })
  }

  /**
   * Remove checkout `checkout`'s links to shared folders its manifest no longer names (`links`):  what it removed,
   * each `{ path, state: "dropped", action: "unlinked" }`.
   * - e.g. `templates`, once the templates were spell-epic's (epic `epic-eject` T11):  a checkout that merged that
   *   change drops the link at its next `epic shared link` (`--all`:  every checkout)
   * - only a LINK at the checkout's root to the content folder's folder of the same name (`<dir>/<name>`), there
   *   or not (a dangling one too, once the content folder dropped it):  never a real folder or file, never a link
   *   elsewhere (the engine's, `epic`)
   * - a checkout whose own manifest still names it (an older branch) keeps it:  `links` is that checkout's
   * - SIDE EFFECT:  removes the links
   */
  unlinkDropped(checkout: string, links = this.config.links): LinkReport[] {
    const named = new Set(links)
    const content = RealPath.of(this.config.dir)
    const dropped: LinkReport[] = []
    for (const entry of readdirSync(checkout, { withFileTypes: true })) {
      if (!entry.isSymbolicLink() || named.has(entry.name)) continue
      const at = join(checkout, entry.name)
      const target = resolve(checkout, readlinkSync(at))
      if (basename(target) !== entry.name || RealPath.of(dirname(target)) !== content) continue
      rmSync(at, { force: true })
      dropped.push({ path: entry.name, state: "dropped", action: "unlinked" })
    }
    return dropped
  }

  /**
   * Link the engine, the epic tooling's folder, into checkout `checkout` at its root, as `epic` (`ENGINE_LINK`):
   * `engineFolder` in the repo's `.epic/config.json5` (epic `epic-eject` I5).  What it did, as `link()` reports it:
   * - `ok`:  already;  `linked`:  made (missing, dangling or pointing elsewhere)
   * - `real`, left alone (`action` `diverged`):  a real folder or file there, never removed
   *   (the kit's own `epic/`, since repo-split's P20 · One Repo:  the kit's `engineFolder` is `""` anyway)
   * - `undefined`:  nothing to link
   *   - no `engineFolder`, or no such folder
   *   - a checkout whose git doesn't ignore `epic`:  it has no use for the link, and would show it as a new file
   * - Why a link:  a repo that reaches the engine's code or its page server's route modules by a path from its root,
   *   from the main checkout and every worktree alike (spell-app's did, as `spell-epic`, until repo-split's P20)
   * - SIDE EFFECT:  writes the link (a relative target)
   */
  linkEngine(checkout: string): LinkReport | undefined {
    const engine = new EpicConfig(this.config.main).engineFolder
    if (!engine || !existsSync(engine)) return undefined
    if (!Git.run(["check-ignore", "-q", "--no-index", ENGINE_LINK], checkout).ok) return undefined
    const at = join(checkout, ENGINE_LINK)
    const stat = lstatSync(at, { throwIfNoEntry: false })
    const path = ENGINE_LINK
    if (stat && !stat.isSymbolicLink()) return { path, state: "real", action: "diverged" }
    if (stat && existsSync(at) && RealPath.of(at) === RealPath.of(engine)) return { path, state: "ok", action: "ok" }
    const state = !stat ? "missing" : existsSync(at) ? "elsewhere" : "dangling"
    if (stat) rmSync(at, { force: true })
    symlinkSync(relative(checkout, engine), at)
    return { path, state, action: "linked" }
  }

  /**
   * Link the content folder into the worktrees' folder, when that's BESIDE the repo (epic `epic-eject` T31):
   * `<worktreesFolder>/<content folder's name>` -> the content folder, e.g.
   * `spell-app.worktrees/spell-app.epics -> ../spell-app.epics`.
   * - why:  the repo's tracked docs link shared pages at the content folder's real place, written from the MAIN
   *   checkout (`../spell-app.epics/guides/changelog.html` from its root);  from a worktree beside the repo the same
   *   text climbs out of the worktree into the worktrees' folder, and lands here
   * - ONE link for every worktree:  `epic shared link` makes it, and the worktree hook runs that for each new one
   * - what it did, as `link()` reports it, its `path` from the main checkout (`../spell-app.worktrees/spell-app.epics`):
   *   - `ok`:  already;  `linked`:  made (missing, dangling or pointing elsewhere)
   *   - `real`, left alone (`action` `diverged`):  a real folder or file there (a worktree of that name), never removed
   * - `undefined`:  nothing to link
   *   - the worktrees' folder inside the checkout (`.claude/worktrees`), or not made yet;  no content folder
   *   - the content folder not where the docs' text leads from a worktree's root (it isn't beside the main checkout)
   * - SIDE EFFECT:  writes the link (a relative target)
   */
  linkContentBeside(): LinkReport | undefined {
    const { main, dir: content } = this.config
    const epic = new EpicConfig(main)
    const trees = epic.worktreesFolder
    if (!epic.isOutside(trees) || !existsSync(trees) || !existsSync(content)) return undefined
    // where the docs' text, written from the main checkout's root, leads from a worktree's root
    const at = resolve(trees, "<worktree>", relative(main, content))
    if (dirname(at) !== trees) return undefined
    const path = relative(main, at)
    const stat = lstatSync(at, { throwIfNoEntry: false })
    if (stat && !stat.isSymbolicLink()) return { path, state: "real", action: "diverged" }
    if (stat && existsSync(at) && RealPath.of(at) === RealPath.of(content)) return { path, state: "ok", action: "ok" }
    const state = !stat ? "missing" : existsSync(at) ? "elsewhere" : "dangling"
    if (stat) rmSync(at, { force: true })
    symlinkSync(relative(trees, content), at)
    return { path, state, action: "linked" }
  }

  ////////////////
  // ## The shared repo
  ////////////////

  /**
   * Create the shared repo at `config.dir`:  `epic shared init`.  Returns what it did.
   * - already a git repo:  `exists`, nothing done
   * - `importFrom` (a checkout):  copies its folders for every link in, and commits `Import from spell-app <sha>`
   * - else an empty repo with the link folders, so a fresh clone can link and start
   * - always:  `.gitignore` (locks, temp files, scratch details pages, the window files) and a `README.md`
   */
  init({ importFrom }: { importFrom?: string } = {}): string {
    const { config } = this
    if (existsSync(join(config.dir, ".git"))) return "exists"
    mkdirSync(config.dir, { recursive: true })
    gitOrThrow(["init", "-q"], config.dir)
    writeFileSync(join(config.dir, ".gitignore"), GITIGNORE)
    writeFileSync(join(config.dir, "README.md"), readme(config))
    for (const path of config.links) {
      const from = importFrom && join(importFrom, path)
      if (from && existsSync(from)) {
        cpSync(RealPath.of(from), join(config.dir, path), {
          recursive: true,
          filter: (source) => !LITTER.has(basename(source))
        })
      } else {
        // a file in each, so git keeps the folder:  a fresh clone of the content repo can link it at once
        mkdirSync(join(config.dir, path), { recursive: true })
        writeFileSync(join(config.dir, path, ".gitkeep"), "")
      }
    }
    gitOrThrow(["add", "-A"], config.dir)
    const sha = importFrom ? Git.run(["rev-parse", "--short", "HEAD"], importFrom).out : ""
    const message = importFrom ? `Import from ${basename(importFrom)} ${sha}`.trim() : "Shared content:  empty"
    gitOrThrow(["-c", "commit.gpgsign=false", "commit", "-q", "--allow-empty", "-m", message], config.dir)
    return importFrom ? "imported" : "created"
  }

  /** The shared repo's remote (`origin`):  its address, `""` for none or no repo yet. */
  get remote(): string {
    const { dir } = this.config
    return existsSync(join(dir, ".git")) ? (Git.out(["remote", "get-url", "origin"], dir) ?? "") : ""
  }

  /**
   * Clone the shared repo from `address` into `config.dir`, which isn't there yet:  a later person's `epic init`
   * (epic `epic-friend` P4).  Git's words when it failed (offline, no access), else `undefined`.
   * - plain git:  no `gh`
   * - SIDE EFFECT:  makes the folder, and the folder above it
   */
  clone(address: string): string | undefined {
    const { dir } = this.config
    mkdirSync(dirname(dir), { recursive: true })
    const run = Git.run(["clone", "-q", address, dir], dirname(dir), { timeout: NETWORK_WAIT })
    return run.ok ? undefined : run.err || `exit ${run.code}`
  }

  /**
   * Make `address` the shared repo's remote (`origin`) and push its branch there, tracking it:  the first person's
   * `epic init` (epic `epic-friend` P4).  Git's words when the push failed, else `undefined`.
   * - throws `EpicCommandError` when git can't set the remote
   * - SIDE EFFECT:  `git remote add` (or `set-url`) and `git push -u origin HEAD` in the shared repo
   */
  publish(address: string): string | undefined {
    const { dir } = this.config
    gitOrThrow(["remote", this.remote ? "set-url" : "add", "origin", address], dir)
    const push = Git.run(["push", "-q", "-u", "origin", "HEAD"], dir, { timeout: NETWORK_WAIT })
    return push.ok ? undefined : push.err || `exit ${push.code}`
  }

  /**
   * Commit whatever changed in the shared repo:  `epic shared commit`, run by the `Stop` hook after every turn.
   * - ONE commit per group of files (`Shared.group()`)
   *   - any session's turn sweeps up every session's pending edits,
   *     so the message says WHAT changed (`auto: epic seo`), never whose turn it was
   * - returns the new commits' short shas, in order;  `[]` when nothing changed
   * - one at a time:  `<dir>/.git/spell-shared-commit.lock`, waited for up to 30s
   *   (never skipped:  the other session's changes would sit uncommitted until someone's next turn)
   * - a git `index.lock` older than 2 minutes is a crashed git's:  removed
   * - the index is reset first (nobody stages here by hand;  a crashed run may have left some),
   *   then ONE `git status` pass
   *   - a rename is two paths:  the new one in its group, the deletion in the old one's
   * - message `auto: <group>`, trailers `Turn-end:` and `Session:`
   *   - `Turn-end:`  the checkout whose turn ended, `main` or the worktree's name:  NOT the author
   * - SIDE EFFECT:  `git add` / `git commit` in the shared repo, by pathspec (never `-A`)
   */
  commit({ session, checkout }: { session?: string; checkout?: string } = {}): string[] {
    const { config } = this
    if (!existsSync(join(config.dir, ".git"))) return []
    const lock = join(config.dir, ".git", "spell-shared-commit")
    return FileLock.run(
      lock,
      () => {
        const indexLock = join(config.dir, ".git", "index.lock")
        if (existsSync(indexLock) && Date.now() - statSync(indexLock).mtimeMs > STALE)
          rmSync(indexLock, { force: true })
        gitOrThrow(["reset", "-q"], config.dir)
        // `Object.groupBy()` needs lib `es2024`;  ours is older
        const groups: Record<string, string[]> = {}
        for (const path of pendingPaths(config.dir)) (groups[Shared.group(path)] ??= []).push(path)
        const trailers = [checkout && `Turn-end: ${checkoutName(config, checkout)}`, session && `Session: ${session}`]
        const footer = trailers.filter(Boolean).join("\n")
        return Object.keys(groups)
          .sort()
          .map((group) => {
            gitOrThrow(["--literal-pathspecs", "add", "--pathspec-from-file=-", "--pathspec-file-nul"], config.dir, {
              input: groups[group]!.join("\0")
            })
            const message = `auto: ${group}${footer ? `\n\n${footer}` : ""}`
            gitOrThrow(["-c", "commit.gpgsign=false", "commit", "-q", "-m", message], config.dir)
            return Git.run(["rev-parse", "--short", "HEAD"], config.dir).out
          })
      },
      { wait: LOCK_WAIT, stale: STALE }
    )
  }

  ////////////////
  // ## Statics:  the manifest, commit groups
  ////////////////

  /**
   * The shared-content manifest of checkout `root` (any checkout).
   * - `dir`:  `contentFolder` in the repo's `.epic/config.json5` (the MAIN checkout's)
   *   - `SPELL_SHARED_DIR` overrides it (tests, a scratch repo)
   *   - it was `"shared": { "dir" }` in the main checkout's `package.json` until epic `epic-eject` P4
   * - `worktrees`:  where `checkouts()` finds the worktrees
   *   - `worktreesFolder` in the same file, and the old place while it's moved (`worktreesFolders`)
   * - `links`:  `"shared": { "links" }` in `root`'s OWN `package.json` (else the main one's),
   *   else `sharedFolders` in `.epic/config.json5`
   *   - which folders a checkout links is its branch's business in spell-app (the reorg changed them, claude-design P4)
   *   - a repo set up by `epic init` has no `package.json` block, only the config
   * - static:  made before there's a `Shared` to hold it
   */
  static configOf(root = Git.mainRoot()): SharedConfig {
    const main = Git.mainRoot(root)
    const epic = new EpicConfig(main)
    const mine = manifest(root)
    const theirs = manifest(main)
    const dir = process.env.SPELL_SHARED_DIR ?? epic.contentFolder
    return {
      main,
      dir: resolve(dir),
      worktrees: epic.worktreesFolders,
      links: mine.links ?? theirs.links ?? epic.sharedFolders
    }
  }

  /**
   * The commit group of shared-repo path `path` (`commit()`):  what the commit's message names.
   * - `epics/<name>/...`:  `epic <name>`
   * - `sagas/<id>/...`:  `saga <id>`
   * - `goals/<set>/...`:  `goals/<set>`
   * - a file right under any of those (`sagas/sagas.json5`):  the folder (`sagas`)
   * - `guides/<x>`, `<x>` a folder or a file:  `guides/<x>`
   * - the other shared folders (`pages`, `ui`, `brand`, `agents`;  `templates`, before epic `epic-eject` T11):  the folder
   * - anything else (the repo's own files, old-path links):  `other`
   * - static:  pure
   */
  static group(path: string): string {
    const [top = "", next, ...rest] = path.split("/")
    const inFolder = rest.length > 0
    if (top === "epics") return inFolder ? `epic ${next}` : top
    if (top === "sagas") return inFolder ? `saga ${next}` : top
    if (top === "goals") return inFolder ? `goals/${next}` : top
    if (top === "guides") return next ? `guides/${next}` : top
    return next && WHOLE_FOLDERS.has(top) ? top : "other"
  }
}

/** What `new Shared()` takes:  see its constructor. */
export type SharedProps = { checkout?: string; config?: SharedConfig }

/** The flags of `epic shared` that take no value. */
const SWITCHES = ["json", "import", "all", "quiet", "dryRun"]

/**
 * The engine's link at a checkout's root (`linkEngine()`):  `engineFolder` in `.epic/config.json5`.
 * - `epic`, the engine's folder's name since repo-split's P20 · One Repo (epic `epic-engine` P49);  `spell-epic` before
 */
export const ENGINE_LINK = "epic"

/** Never compared or copied:  OS litter. */
const LITTER = new Set([".DS_Store"])

/** How long `commit()` waits for another session's commit, ms. */
const LOCK_WAIT = 30_000

/** A lock or git index lock older than this is a crashed holder's, ms. */
const STALE = 120_000

/** How long one git command may take in the shared repo, ms. */
const GIT_WAIT = 30_000

/** How long a clone or a push of the shared repo may take, ms:  over the network. */
const NETWORK_WAIT = 120_000

/** Shared folders committed as one group each (`Shared.group()`). */
const WHOLE_FOLDERS = new Set(["pages", "templates", "ui", "brand", "agents"])

/** The shared repo's `.gitignore`. */
const GITIGNORE = `# written by \`epic shared init\`
*.lock
*.tmp
.DS_Store
.server.json
.server.log
# /details scratch pages and their answers:  never committed
pages/details/
# /epic review inboxes:  a review's pending marks, never committed
epics/*/*.inbox.json*
# comments on docs pages (\`<page>.inbox.json5\`, epic airplane P11):  waiting work, never committed
guides/**/*.inbox.json*
pages/**/*.inbox.json*
epics/**/*.inbox.json*
# a saga page's review inbox (\`sagas/<id>/<id>.inbox.json5\`, epic epic-workflow P15)
sagas/**/*.inbox.json*
# an epic's running agents (\`epic agents\`):  what's running now, never committed;  \`.json\` before P21
epics/*/agents.json
epics/*/agents.json5
# VS Code's window files (\`epic window\`, epic epic-eject P13):  each machine's own, never committed
/windows/
`

/** The `"shared"` field of checkout `root`'s `package.json`;  `{}` without one. */
function manifest(root: string): Partial<{ links: string[] }> {
  try {
    return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).shared ?? {}
  } catch {
    return {}
  }
}

/** `migrate`'s lines:  each file that isn't skipped, then the verdict. */
function migrateLines(report: MigrateReport, dryRun = false): string[] {
  const changed = report.folds.filter((each) => each.action !== "skip")
  const verdict = report.conflicts.length
    ? `${report.conflicts.length} conflict(s):  nothing written;  resolve them in the shared repo or the worktree, then again`
    : report.done
      ? `migrated:  ${changed.length} file(s) into the shared repo, branch ${report.branch} untracks the shared folders`
      : dryRun
        ? `dry run:  ${changed.length} file(s) would go into the shared repo`
        : "nothing done"
  return [...changed.map((each) => `${each.action.padEnd(8)} ${each.file}`), verdict]
}

/** `status`'s table:  the shared repo, then a line per checkout with each link's state. */
function statusLines(status: SharedStatus): string[] {
  const repo = !status.exists
    ? "missing:  `epic shared init`"
    : !status.isRepo
      ? "not a git repo"
      : `${status.dirty} uncommitted, last ${status.last || "(none)"}`
  return [
    `shared repo  ${status.dir}  (${repo})`,
    ...status.checkouts.map(
      ({ checkout, links }) => `${checkout.padEnd(40)} ${links.map((link) => `${link.path} ${link.state}`).join(" · ")}`
    )
  ]
}

/**
 * Every path with a change in repo `dir`, untracked files one by one:  `git status --porcelain -z`.
 * - a rename or copy (`R` / `C`, staged only) gives both paths
 */
function pendingPaths(dir: string): string[] {
  const entries = gitOrThrow(["status", "--porcelain", "-z", "--untracked-files=all"], dir, { trim: false })
    .split("\0")
    .filter(Boolean)
  const paths: string[] = []
  for (let i = 0; i < entries.length; i++) {
    const [code, path] = [entries[i]!.slice(0, 2), entries[i]!.slice(3)]
    paths.push(path)
    if (/[RC]/.test(code)) paths.push(entries[++i]!)
  }
  return paths
}

/** `checkout`'s short name:  `main` (the main checkout), a worktree's name, else its path relative to the main one. */
function checkoutName({ main, worktrees }: SharedConfig, checkout: string): string {
  for (const folder of worktrees) {
    const inWorktrees = relative(folder, checkout)
    if (inWorktrees && !inWorktrees.startsWith("..")) return inWorktrees
  }
  return relative(main, checkout) || "main"
}

/** The shared repo's `README.md`:  named for its folder and the repo's (`spell-app-dev`, `spell-app`). */
function readme(config: SharedConfig): string {
  const repo = basename(config.main)
  return `# ${basename(config.dir)}

Shared content for \`${repo}\`:  its epic pages, sagas, guides and pages, one copy for every checkout.

- Content only:  the epic tooling (spell-epic) reads and writes it here, for \`${repo}\`, never through a link.
- Every checkout of \`${repo}\` (main and each worktree) links in only ${config.links.map((path) => `\`${path}\``).join(", ")}.
- Every Claude Code turn commits here by itself (\`epic shared commit\`).
`
}

/** Whether folders `a` and `b` hold the same files with the same bytes (OS litter aside). */
function sameTree(a: string, b: string): boolean {
  const left = files(a)
  const right = files(b)
  if (left.length !== right.length || left.some((path, i) => path !== right[i])) return false
  return left.every((path) => readFileSync(join(a, path)).equals(readFileSync(join(b, path))))
}

/** Every file under `dir`, relative, sorted;  links followed. */
function files(dir: string, prefix = ""): string[] {
  const found: string[] = []
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    if (LITTER.has(entry.name)) continue
    const path = join(prefix, entry.name)
    if (statSync(join(dir, path)).isDirectory()) found.push(...files(dir, path))
    else found.push(path)
  }
  return found.sort()
}

/** `git <args>` in the shared repo (`cwd`), `GIT_WAIT` at most;  its failure an `EpicCommandError`. */
function gitOrThrow(args: string[], cwd: string, options: SRV.GitOptions = {}): string {
  return EpicCheckout.mustGit(args, cwd, { timeout: GIT_WAIT, ...options })
}
