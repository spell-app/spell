// spell ui rename: leave this file (its docstrings quote the renames merge-main makes, old names on purpose)
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { basename, dirname, join, matchesGlob, relative, resolve, sep } from "node:path"

import { Git } from "spell/server/Git"
import { EpicConfig } from "spell/epic/config/EpicConfig"

import { EXIT, EpicCommandError, type Generator, type MergeMainReport, type SnapshotReview } from "./command.types"
import { StrayFiles } from "./StrayFiles"

/**
 * A Vitest snapshot file:  its test is `<dir>/../<name>` less `.snap`.
 * - Under `tests/<package>/`, where each package's tests live (epic `people-and-orgs` P10;  in every repo since epic
 *   `repo-split`:  `tests/markdown/` in spell-parser, `tests/util/` in the kit);
 *   or under `packages/`, for a branch from before that move.
 */
const SNAPSHOTS = ["tests/*/**/__snapshots__/*.snap", "packages/*/**/__snapshots__/*.snap"]

/** Is `file` a Vitest snapshot file -- see `SNAPSHOTS`? */
const isSnapshot = (file: string) => SNAPSHOTS.some((glob) => matchesGlob(file, glob))

/**
 * The command that updates the snapshots of `tests` (relative to their package), run in the package.
 * - `--update` AFTER the files:  it takes an optional value, so before them it swallows the first one
 */
const SNAPSHOT_UPDATE = (tests: string[]) => ["yarn", "vp", "test", "run", ...tests, "--update"]

/** The lockfiles, at a checkout's root, whose change means the merged packages need installing. */
const LOCKFILES = ["yarn.lock", "package-lock.json", "pnpm-lock.yaml", "bun.lock"]

/** The kit's own program, from its root:  where the rename step runs (`renameOldNames()`). */
const KIT_PROGRAM = "bin/spell.mjs"

/** The rename step's command, from the kit's root, the files appended:  `spell ui rename --write`. */
const RENAME = ["node", KIT_PROGRAM, "ui", "rename", "--write"]

/** The rename step's own commit, in each repo it changed. */
const RENAME_MESSAGE = "merge-main:  old Spell UI names renamed (spell ui rename)"

/****************
 * ### `MainMerge`
 * `epic worktree merge-main`:  merge `main` into this checkout's branch,
 * REGENERATING every generated file both sides changed instead of merging it.
 * - `/isolate done`, `/unpark` and `/wait-for` use it.
 * - Why:  a generated file (a bundle, a snapshot) is a function of BOTH branches' source.
 *   So neither side's copy, and no line merge of the two, is right:  its generator, run on the merged source, is.
 * - The root `.gitattributes` marks the same files `merge=binary`, so git never interleaves two versions:
 *   it keeps ours and marks the file conflicted.
 *   `-diff` and `linguist-generated` there keep them out of diffs and PRs.
 * - "Both sides changed", not just "conflicted":
 *   a bundle with hashed chunk names leaves each side's chunks behind in a clean merge,
 *   and only its generator, which clears the folder, removes them.
 * - Generated output one side no longer commits:
 *   a file `main` changed, or in conflict, that the merged `.gitignore` ignores and one side's tree lacks,
 *   leaves the index and stays on disk (`untracked`).
 *   - e.g. the bundles the page server builds since 2026-10-07 (`spell bundle`)
 * - Snapshots are regenerated with `vp test run --update`, then each entry is compared to both sides:
 *   one NEITHER side had is new behaviour nobody reviewed, so it's reported (`review`), never hidden.
 * - Any OTHER file in conflict stops it mid-merge:
 *   Claude resolves those, `git add`s them, and runs it again with `--continue`.
 * - A merge (or fast-forward) that changed a lockfile runs the checkout's install command after it (`reinstall()`).
 * - Then, in a Spell kit, Spell UI's old names the branch still writes are renamed, and committed on their own
 *   (`renameOldNames()`, epic `epic-engine` I143):  `runAll()` runs it once every repo is merged.
 * - Node built-ins and git only:  no spell imported.  The rename step RUNS the kit's `spell`, never loads it.
 ****************/
export class MainMerge {
  /** the checkout whose branch `main` merges into:  STATIC for the object's life */
  readonly root: string

  /** the generated outputs and their commands (tests pass their own) */
  readonly generators: Generator[]

  /** the command that updates the snapshots of `tests` */
  readonly snapshotUpdate: (tests: string[]) => string[]

  /** the command that installs the packages, as words;  `[]`:  none */
  readonly install: string[]

  /** the rename step's command, as words, the files appended;  `[]`:  no step */
  readonly rename: string[]

  /** where the rename step runs:  the kit's root, holding `bin/spell.mjs`;  `undefined`:  no kit, no step */
  readonly kitRoot: string | undefined

  /**
   * - `root`:  the checkout (a worktree, usually)
   * - `generators`:  default the checkout's own list (`generatorsOf()`)
   * - `snapshotUpdate`:  default `yarn vp test run <tests> --update`
   * - `install`:  default the checkout's `installCommand` (`.epic/config.json5`;  `yarn install`)
   * - `rename`:  default `node bin/spell.mjs ui rename --write`
   * - `kitRoot`:  default the nearest folder at or above `root` with `bin/spell.mjs` (`kitRootOf()`):
   *   the merged checkout's own kit, so a worktree's child repo uses its worktree's kit, never main's
   */
  constructor({
    root,
    generators,
    snapshotUpdate = SNAPSHOT_UPDATE,
    install,
    rename = RENAME,
    kitRoot
  }: MainMergeProps) {
    this.root = root
    this.generators = generators ?? MainMerge.generatorsOf(root)
    this.snapshotUpdate = snapshotUpdate
    this.install = install ?? EpicConfig.of(root).installCommand.split(/\s+/).filter(Boolean)
    this.rename = rename
    this.kitRoot = kitRoot ?? MainMerge.kitRootOf(root)
  }

  /**
   * Move aside what a build or test run left uncommitted in `root` (`StrayFiles`), so the merge can start.
   * - Why (Owen, 2026-10-25, epic `epic-engine` I124):  "if `people.lib.ts` etc are generated, YOU SHOULD DITCH THEM
   *   AUTOMATICALLY"
   * - into `ditched/<time>/<repo>/` in the epic home, never deleted
   * - throws `EpicCommandError`, naming them, when someone's changes are among them:  nothing moved
   */
  private ditchStrays(): Pick<MergeMainReport, "ditched" | "ditchedTo"> {
    const stray = new StrayFiles(this.root, this.generators)
    const handMade = stray.handMade.filter((file) => file.tracked)
    if (handMade.length) {
      const list = handMade.map(({ path }) => `\n  ${path}`).join("")
      throw new EpicCommandError(`merge-main:  uncommitted changes;  commit them first${list}`)
    }
    const folder = join(StrayFiles.folderFor(), basename(this.root))
    return { ditched: stray.ditch({ folder, ditch: false }), ditchedTo: folder }
  }

  /**
   * Merge the base branch into `root`'s branch;  what it did (`MergeMainReport`).
   * - `mode`:  `start` (default) merges;  `continue` finishes a merge it stopped on other conflicts
   * - throws `EpicCommandError` for a merge that can't start or go on, saying what to do
   */
  run(mode: "start" | "continue" = "start"): MergeMainReport {
    const { root, generators, snapshotUpdate } = this
    const branch = Git.out(["branch", "--show-current"], root) ?? ""
    if (!branch) throw new EpicCommandError("merge-main:  not on a branch;  check out the worktree's branch first")
    // the branch merged in:  the repo's base branch (`.epic/config.json5`)
    const upstream = EpicConfig.of(root).baseBranch
    const report: MergeMainReport = {
      branch,
      result: "merged",
      conflicts: [],
      untracked: [],
      regenerated: [],
      review: [],
      unstaged: []
    }

    const merging = Git.run(["rev-parse", "-q", "--verify", "MERGE_HEAD"], root).ok
    // ours, before the merge:  to see whether it changed a lockfile
    const before = Git.out(["rev-parse", "HEAD"], root) ?? ""
    if (mode === "continue") {
      if (!merging) throw new EpicCommandError("merge-main --continue:  no merge in progress")
    } else {
      if (merging)
        throw new EpicCommandError("merge-main:  a merge is in progress;  `--continue` it, or `git merge --abort`")
      if (Git.out(["status", "--porcelain", "--untracked-files=no"], root)) Object.assign(report, this.ditchStrays())
      if (Git.run(["merge-base", "--is-ancestor", upstream, "HEAD"], root).ok)
        return { ...report, result: "up-to-date" }
      if (Git.run(["merge-base", "--is-ancestor", "HEAD", upstream], root).ok) {
        mustGit(root, ["merge", "--ff-only", upstream])
        return { ...report, result: "fast-forward", ...this.reinstall(before) }
      }
      // Exits 1 on conflicts, which is fine:  MERGE_HEAD says it started
      const merge = Git.run(
        ["merge", "--no-commit", "--no-ff", "-m", `Merge ${upstream} into ${branch}`, upstream],
        root
      )
      if (!Git.run(["rev-parse", "-q", "--verify", "MERGE_HEAD"], root).ok) {
        throw new EpicCommandError(
          `merge-main:  \`git merge ${upstream}\` failed:  ${merge.err || merge.out}`,
          EXIT.ERRORS
        )
      }
    }

    ////////
    // Generated output one side no longer commits (the page server's bundles, since 2026-10-07):
    // a file `main` changed or in conflict, that the merged `.gitignore` ignores and ONE side's tree lacks,
    // leaves the index, kept on disk.
    // (A file both sides track, though ignored, stays.)
    // ONLY `.gitignore`s, never this machine's `.git/info/exclude`:  a file listed there was untracked by every merge
    // (the kit's `.ignore`, epic `epic-engine` P17, dropped from `main` twice)
    const base = Git.out(["merge-base", "HEAD", "MERGE_HEAD"], root) ?? ""
    const conflicted = Git.lines(["diff", "--name-only", "--diff-filter=U"], root)
    const theirs = Git.lines(["diff", "--name-only", base, "MERGE_HEAD"], root)
    const ignored = new Set(
      Git.lines(["ls-files", "--cached", "--ignored", "--exclude-per-directory=.gitignore"], root)
    )
    const dropped = [...new Set([...conflicted, ...theirs])].filter((file) => ignored.has(file))
    const [inOurs, inTheirs] = [inTree(root, "HEAD", dropped), inTree(root, "MERGE_HEAD", dropped)]
    report.untracked = dropped.filter((file) => !(inOurs.has(file) && inTheirs.has(file))).sort()
    if (report.untracked.length) mustGit(root, ["rm", "-q", "--cached", "--", ...report.untracked])
    const unmerged = conflicted.filter((file) => !report.untracked.includes(file))

    ////////
    // What to regenerate:  every generated file conflicted or changed on both sides;
    // anything else conflicted stops it
    const ours = new Set(Git.lines(["diff", "--name-only", base, "HEAD"], root))
    const touched = [...new Set([...unmerged, ...theirs.filter((file) => !report.untracked.includes(file))])]
    const candidates = touched.filter((file) => unmerged.includes(file) || ours.has(file))
    const plan = MainMerge.generatorsFor(candidates, generators, snapshotUpdate, root)
    const planned = new Set(plan.flatMap((step) => step.files))
    report.conflicts = unmerged.filter((file) => !planned.has(file))
    if (report.conflicts.length) return { ...report, result: "conflicts" }

    ////////
    // Regenerate, in table order, staging what each one wrote
    for (const { generator, files } of plan) {
      for (const file of files) {
        // Ours, without conflict markers, for a tool that reads its old output;
        // yarn reads (and resolves) the markers
        if (unmerged.includes(file) && file !== "yarn.lock") Git.run(["checkout", "--ours", "--", file], root)
      }
      const run = spawnSync(generator.run[0], generator.run.slice(1), {
        cwd: join(root, generator.cwd),
        stdio: ["ignore", 2, 2]
      })
      if (run.status !== 0) {
        throw new EpicCommandError(
          `merge-main:  \`${generator.run.join(" ")}\` (in ${generator.cwd}) failed;  the merge is still in progress:  ` +
            "fix it, then `epic worktree merge-main --continue`, or `git merge --abort`",
          EXIT.ERRORS
        )
      }
      const written = changedFiles(root).filter((file) => matchesAny(file, generator.outputs))
      const staged = [...new Set([...files.filter((file) => unmerged.includes(file)), ...written])].sort()
      if (staged.length) mustGit(root, ["add", "-A", "--", ...staged])
      report.regenerated.push({ name: generator.name, files: staged })
    }

    ////////
    // Commit, then say what a person should look at
    const left = Git.lines(["diff", "--name-only", "--diff-filter=U"], root)
    if (left.length) throw new EpicCommandError(`merge-main:  still unmerged:  ${left.join(", ")}`, EXIT.ERRORS)
    report.review = reviewSnapshots(
      root,
      report.regenerated.flatMap((step) => step.files)
    )
    report.unstaged = changedFiles(root)
    mustGit(root, ["commit", "--no-edit"])
    return { ...report, ...this.reinstall(before) }
  }

  /**
   * Install the merged packages when the merge changed a lockfile (epic `epic-engine` I77):  `install`, at the root.
   * - Why:  a merge brought in main's `yarn.lock` (Solid rc.17) while rc.13 stayed installed;  the packs built here came
   *   out on the old Solid, and main's pack check went red
   * - `before`:  the branch's commit before the merge
   * - `{}` when no lockfile changed, or there's no install command
   * - NEVER throws:  the merge is committed;  a failed install is reported (`installed.ok`), to run by hand
   */
  private reinstall(before: string): Pick<MergeMainReport, "installed"> {
    const { root, install } = this
    const lockfiles = before ? Git.lines(["diff", "--name-only", before, "HEAD", "--", ...LOCKFILES], root) : []
    if (!lockfiles.length || !install.length) return {}
    const run = spawnSync(install[0]!, install.slice(1), { cwd: root, stdio: ["ignore", 2, 2] })
    return { installed: { command: install.join(" "), lockfiles, ok: run.status === 0 } }
  }

  /**
   * `epic worktree merge-main`, from checkout `root`:  a report per repo.
   * - a single repo:  `root`'s merge alone (`run()`), its errors thrown as before
   * - in an epic's worktree of a MULTI-REPO top (`EpicConfig.top`, epic `epic-engine` P10), from its top or any child
   *   repo's folder in it:  EVERY repo's, each its own base branch into its `<epic>` branch, the child repos lowest
   *   first (`repos`' order), the top last;  `repo` in each report
   *   - one that can't merge (uncommitted changes, a generator failing) has `error`, and the others go on:
   *     each says clearly whether it merged (repo-split's C5)
   *   - `continue`:  only the repos with a merge in progress
   * - `make`:  the merge of one checkout (tests pass their own generators)
   */
  static runAll(
    root: string,
    mode: "start" | "continue" = "start",
    make: (root: string) => MainMerge = (root) => new MainMerge({ root })
  ): MergeMainReport[] {
    const top = EpicConfig.of(root).top
    const epic = top?.worktreeNameOf(root)
    if (!top || !epic) {
      const merge = make(root)
      const report = merge.run(mode)
      return [report.result === "merged" ? { ...report, ...merge.renameOldNames() } : report]
    }
    const checkouts = top.repoCheckouts(epic).filter(({ worktree }) => existsSync(join(worktree, ".git")))
    const merged: { merge: MainMerge; report: MergeMainReport }[] = []
    for (const { repo, worktree } of [...checkouts.slice(1), ...checkouts.slice(0, 1)]) {
      if (mode === "continue" && !Git.run(["rev-parse", "-q", "--verify", "MERGE_HEAD"], worktree).ok) continue
      const merge = make(worktree)
      try {
        merged.push({ merge, report: { ...merge.run(mode), repo } })
      } catch (error) {
        const branch = Git.out(["branch", "--show-current"], worktree) ?? ""
        merged.push({ merge, report: { ...emptyReport(branch), repo, error: (error as Error).message } })
      }
    }
    if (mode === "continue" && !merged.length)
      throw new EpicCommandError("merge-main --continue:  no merge in progress")
    // Renamed once EVERY repo is merged:  the kit's `spell` and Spell UI's old names are the merged ones then
    return merged.map(({ merge, report }) =>
      report.result === "merged" && !report.error ? { ...report, ...merge.renameOldNames() } : report
    )
  }

  /**
   * Rewrite the old Spell UI names the branch still writes (`<ui-docs-toc>` => `<ui-toc>`), after a merge:
   * `spell ui rename --write` over its files, from the kit's root, committed on their own (epic `epic-engine` I143).
   * - Why (Owen's pick on epic `epic-engine` Q27):  a branch cut before a rename keeps writing the old tag, which then
   *   draws an empty box where an example was
   * - its files:  the branch's diff against the base branch, ON THE MERGED TREE (`renameFiles()`):
   *   the files the branch added or changed, which `main`'s own rename sweep never saw;
   *   NOT the merge's diff (`main`'s changes), which `main` already swept
   * - committed as ONE commit of its own (`RENAME_MESSAGE`):  a tool's rewrite, reviewable apart from the merge;
   *   only the files it rewrote, so nothing generated goes in
   * - call after `run()` returned `merged`:  HEAD is the merge commit
   * - `{}` when there's no kit (`kitRoot`), nothing to read, or nothing renamed
   * - NEVER throws:  the merge is committed;  a kit with no `ui rename` (older), or a failure, is one line
   *   (`renameSkipped`)
   */
  renameOldNames(): Pick<MergeMainReport, "renamed" | "renameSkipped"> {
    const { root, rename, kitRoot } = this
    if (!rename.length || !kitRoot) return {}
    const command = rename.slice(0, 4).join(" ")
    try {
      const files = this.renameFiles()
      if (!files.length) return {}
      const run = spawnSync(rename[0]!, [...rename.slice(1), ...files.map((file) => join(root, file))], {
        cwd: kitRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024
      })
      if (run.status !== 0) {
        const why = lastLine(`${run.stderr ?? ""}\n${run.stdout ?? ""}`) || run.error?.message || `exit ${run.status}`
        return { renameSkipped: `\`${command}\` failed, nothing renamed:  ${why}` }
      }
      // What it left for a person (a value it can't see):  passed on
      if (run.stderr) process.stderr.write(run.stderr)
      const listed = new Set(files)
      const renamed = renamedFiles(run.stdout)
        .map((each) => ({ ...each, path: relative(root, resolve(kitRoot, each.file)) }))
        .filter(({ path }) => listed.has(path))
      if (!renamed.length) return {}
      const paths = renamed.map(({ path }) => path)
      const commit = Git.run(["commit", "-q", "-m", RENAME_MESSAGE, "--", ...paths], root)
      if (!commit.ok) return { renameSkipped: `renamed, NOT committed (\`git commit\`:  ${lastLine(commit.err)})` }
      return { renamed: renamed.map(({ file, renames }) => ({ file, renames })) }
    } catch (error) {
      return { renameSkipped: `\`${command}\` failed, nothing renamed:  ${(error as Error).message}` }
    }
  }

  /**
   * The files the rename step reads:  what the merged branch differs from the base branch in (`HEAD^2..HEAD`).
   * - left out:  deleted files, generated ones (the generators' outputs, snapshots), and anything reached through a
   *   link out of the checkout:  the shared content folder is NEVER touched
   */
  private renameFiles(): string[] {
    const { root, generators } = this
    const realRoot = realpathSync(root)
    const generated = generators.flatMap((generator) => generator.outputs)
    return Git.lines(["diff", "--name-only", "--diff-filter=d", "HEAD^2", "HEAD"], root).filter((file) => {
      if (isSnapshot(file) || matchesAny(file, generated)) return false
      const path = join(root, file)
      return existsSync(path) && realpathSync(path).startsWith(realRoot + sep)
    })
  }

  /**
   * The kit's root for checkout `root`:  the nearest folder at or above it holding `bin/spell.mjs`;
   * `undefined` outside a Spell kit (a repo using the epic tooling alone), so no rename step
   */
  static kitRootOf(root: string): string | undefined {
    for (let folder = resolve(root); ; folder = dirname(folder)) {
      if (existsSync(join(folder, KIT_PROGRAM))) return folder
      if (dirname(folder) === folder) return undefined
    }
  }

  /** where a checkout lists its generated files:  `<root>/.epic/generators.json5` (epic `epic-eject` T4) */
  static readonly GENERATORS_FILE = ".epic/generators.json5"

  /**
   * The generated outputs checkout `root` lists, IN ORDER (a later one may read an earlier one's output):
   * its `.epic/generators.json5`, `{ "generators": [{ name, outputs, cwd, run }, ...] }`.
   * - the checkout's OWN file, not the main checkout's:
   *   a branch that adds a generated file lists it, and its own merge knows it
   * - no file:  none, so only snapshots are regenerated
   * - Why a file:  the epic code is every repo's, and the generators are one repo's own
   *   (spell-app's bundles, its packs ...);  `spell pack create` adds a pack's line
   * - throws `SyntaxError` on a file that won't read, `TypeError` on an entry of the wrong shape:  each names the file
   */
  static generatorsOf(root: string): Generator[] {
    const file = join(root, MainMerge.GENERATORS_FILE)
    if (!existsSync(file)) return []
    const data = EpicConfig.parse(readFileSync(file, "utf8"), file) as { generators?: unknown }
    const list = data?.generators
    if (!Array.isArray(list)) throw new TypeError(`MainMerge:  ${file} must hold { "generators": [...] }`)
    return list.map((entry, index) => {
      const { name, outputs, cwd, run } = (entry ?? {}) as Record<string, unknown>
      const strings = (value: unknown) =>
        Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string")
      if (typeof name !== "string" || typeof cwd !== "string" || !strings(outputs) || !strings(run))
        throw new TypeError(
          `MainMerge:  ${file}'s generator ${index + 1} must be { "name": "...", "outputs": [...], "cwd": "...", "run": [...] }`
        )
      return { name, outputs: outputs as string[], cwd, run: run as string[] }
    })
  }

  /**
   * The generators `files` need, in run order, each with the files it covers:
   * `generators`' (a checkout's list, `generatorsOf()`), then one snapshot update per package.
   * - a file no generator covers isn't in any step
   * - `root`:  the checkout, where each snapshot's package folder is looked for (`packageFolder()`);  left out,
   *   `packages/<name>`
   * - static:  pure, but for looking in `root`
   */
  static generatorsFor(
    files: string[],
    generators: Generator[],
    snapshotUpdate = SNAPSHOT_UPDATE,
    root?: string
  ): { generator: Generator; files: string[] }[] {
    const steps = generators
      .map((generator) => ({ generator, files: files.filter((file) => matchesAny(file, generator.outputs)) }))
      .filter((step) => step.files.length)
    // By package, run in its folder (a snapshot under `tests/<name>/` is package `<name>`'s):  one run each
    const snapshots = new Map<string, string[]>()
    for (const snap of files.filter(isSnapshot)) {
      const cwd = MainMerge.packageFolder(snap.split("/")[1]!, root)
      snapshots.set(cwd, [...(snapshots.get(cwd) ?? []), snap])
    }
    for (const [cwd, snaps] of snapshots) {
      // each test's path from the package:  `src/x.test.ts`, `../../tests/<name>/src/x.test.ts`, `../tests/<name>/...`
      const tests = snaps.map((snap) => relative(cwd, join(dirname(dirname(snap)), basename(snap, ".snap"))))
      const name = `${cwd === "." ? "root" : basename(cwd)} snapshots`
      const generator = { name, outputs: snaps, cwd, run: snapshotUpdate(tests) }
      steps.push({ generator, files: snaps })
    }
    return steps
  }

  /**
   * Package `name`'s folder in checkout `root`, from its root:  where its snapshots are updated (its own
   * `vitest.config.ts`).
   * - `packages/<name>`:  a repo laid out as spell-app was, one workspace per folder of `packages/` (and left out
   *   `root`)
   * - `<name>`:  a repo that's ONE package, its parts folders at its root (epic `repo-split` P9 and P11:  the kit's
   *   `util/`, spell-parser's `markdown/`, spell-app's `lsp/`), when there's no `packages/<name>` but a `<name>`
   * - `.`, the repo's root, when neither is there
   */
  static packageFolder(name: string, root?: string): string {
    const old = `packages/${name}`
    if (!root || existsSync(join(root, old))) return old
    return existsSync(join(root, name)) ? name : "."
  }

  /**
   * A Vitest `.snap` file's entries:  `exports[`<key>`] = <value>;`, by key.
   * - each entry starts a line with `exports[`;  a value's own lines never do (Vitest escapes its backticks)
   * - static:  pure
   */
  static snapshotEntries(text: string): Map<string, string> {
    const entries = new Map<string, string>()
    for (const chunk of text.split(/^(?=exports\[`)/m).slice(1)) {
      const match = /^exports\[`((?:\\.|[^`\\])*)`\] = ([\s\S]*?);?\s*$/.exec(chunk)
      if (match) entries.set(match[1], match[2])
    }
    return entries
  }
}

/** What `new MainMerge()` takes:  see its constructor. */
export type MainMergeProps = {
  root: string
  generators?: Generator[]
  snapshotUpdate?: (tests: string[]) => string[]
  install?: string[]
  rename?: string[]
  kitRoot?: string
}

/**
 * `spell ui rename`'s report, its lines `<file>:  <rename>;  <rename> (x4)`, as each file and its renames,
 * every one with its count:  `<ui-docs-example> => <ui-example> (4)`.
 * - the total line (`rewrote 5 old names in 2 files`) has no `:  `, so it's left out
 */
function renamedFiles(out: string): { file: string; renames: string[] }[] {
  return out.split("\n").flatMap((line) => {
    const match = /^(.+?):  (.+)$/.exec(line.trimEnd())
    if (!match) return []
    const renames = match[2]!.split(";  ").map((rename) => {
      const counted = /^(.*) \(x(\d+)\)$/.exec(rename)
      return counted ? `${counted[1]} (${counted[2]})` : `${rename} (1)`
    })
    return [{ file: match[1]!, renames }]
  })
}

/** The last line of `text` with something on it. */
function lastLine(text: string): string {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) ?? ""
  )
}

/**
 * Each regenerated snapshot's entries whose value NEITHER side of the merge had.
 * - reads `HEAD` and `MERGE_HEAD`, so call it before committing
 */
function reviewSnapshots(root: string, files: string[]): SnapshotReview[] {
  return files
    .filter(isSnapshot)
    .map((file) => {
      const ours = MainMerge.snapshotEntries(Git.run(["show", `HEAD:${file}`], root).out)
      const theirs = MainMerge.snapshotEntries(Git.run(["show", `MERGE_HEAD:${file}`], root).out)
      const merged = MainMerge.snapshotEntries(Git.run(["show", `:${file}`], root).out)
      const keys = [...merged].filter(([key, value]) => ours.get(key) !== value && theirs.get(key) !== value)
      return { file, keys: keys.map(([key]) => key) }
    })
    .filter((review) => review.keys.length)
}

/** A report of nothing done, for branch `branch`:  `runAll()`'s for a repo that failed. */
function emptyReport(branch: string): MergeMainReport {
  return { branch, result: "up-to-date", conflicts: [], untracked: [], regenerated: [], review: [], unstaged: [] }
}

/** Tracked files changed, deleted or new (not ignored) in the working tree, against the index. */
function changedFiles(root: string): string[] {
  const out = mustGit(root, ["ls-files", "-z", "--modified", "--others", "--exclude-per-directory=.gitignore"])
  return [...new Set(out.split("\0").filter(Boolean))]
}

/** Which of `files` commit `rev`'s tree has;  none asked:  none (`ls-tree` with no path lists every file). */
function inTree(root: string, rev: string, files: string[]): Set<string> {
  if (!files.length) return new Set()
  return new Set(Git.lines(["ls-tree", "-r", "--name-only", rev, "--", ...files], root))
}

/** `file` matches one of `globs`. */
function matchesAny(file: string, globs: string[]): boolean {
  return globs.some((glob) => matchesGlob(file, glob))
}

/** `git <args>`'s output;  throws a `EpicCommandError` with git's own message when it fails. */
function mustGit(root: string, args: string[]): string {
  const run = Git.run(args, root)
  if (!run.ok) throw new EpicCommandError(`merge-main:  \`git ${args.join(" ")}\` failed:  ${run.err}`, EXIT.ERRORS)
  return run.out
}
