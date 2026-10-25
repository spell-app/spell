import { spawnSync } from "node:child_process"
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { checkoutOf } from "spell/server/checkout"
import { FileLock } from "spell/server/FileLock"
import { Git } from "spell/server/Git"
import { RealPath } from "spell/server/RealPath"
import { EpicConfig, type CheckoutPatch } from "spell-epic/config/EpicConfig.ts"

import type { PatchReport } from "./command.types.ts"

/** what a checkout remembers having had, in its own git folder:  `{ "applied": { "<id>": "<when>" } }` */
const STAMP = "epic-patches.json"

/**
 * held while a checkout is being patched, in its own git folder, as `epic-patches.lock` (`FileLock`'s):
 * a second run (two sessions starting) skips it
 */
const LOCK = "epic-patches"

/** a lock older than this was left by a run that died:  taken over */
const LOCK_STALE_MS = 10 * 60 * 1000

/** how long a git run here may take:  the session-start hook runs this */
const GIT_TIMEOUT_MS = 5000

/** how long a `run` patch's command may take */
const RUN_TIMEOUT_MS = 10 * 60 * 1000

/** the line above the patches' entries in a repo's `info/exclude` */
const EXCLUDE_HEADER = "# epic checkout patches:  untracked copies of files main tracks (epic worktree patch)"

/****************
 * ### `CheckoutPatches`
 * `epic worktree patch [--all] [--dry-run]`:  gives each checkout the fixes its repo lists in `"checkoutPatches"`
 * (`.epic/config.json5`), so a fix to how a checkout is SET UP reaches every one at once (epic `epic-engine` P17).
 * - e.g. the kit's `.ignore`, which lets VS Code's Open File see the child repos' files:  committed on `main`, it
 *   reached a worktree only when that worktree's branch merged `main`, and Owen couldn't find `Card.spell` until then.
 * - The list is read from the MAIN checkout's file (`EpicConfig`), so a worktree however far behind gets today's.
 * - A patch (`CheckoutPatch`):
 *   - `copy`:  `main`'s copy of a file, put in each checkout that doesn't TRACK it
 *     - git-excluded there (its repo's `info/exclude`, shared by all its worktrees):  `git status` stays clean, and git
 *       overwrites an excluded file when the branch's merge of `main` brings the tracked one
 *     - a checkout that tracks it (merged `main` already, or `main` itself) skips it:  the patch retires by itself
 *     - checked every time, cheap:  a copy that drifted from `main`'s is copied again
 *   - `run`:  a command, run ONCE in each checkout's root, remembered in the checkout's git folder (`STAMP`)
 * - The checkouts:  the one this runs in, or (`--all`) `main` and every worktree of the repo.
 *   A multi-repo top's:  each child repo's checkout inside it too, with the child's own patches.
 * - Who runs it:  the session-start hook (`behind-main.mjs`, in the background), the worktree hook as it reuses an old
 *   branch, and people, `--all` right after adding a patch.
 * - NEVER throws for one checkout:  its failure is in its report, and the rest go on.
 * - Its position:  node's own modules and `EpicConfig` by path, so plain `node` loads it (the hooks);  NEVER an alias,
 *   an `enum` or a parameter property.
 ****************/
export class CheckoutPatches {
  /** whether to only say what would be done:  STATIC for the object's life */
  readonly dryRun: boolean

  /** - `dryRun`:  only report what's pending (default off) */
  constructor({ dryRun = false }: { dryRun?: boolean } = {}) {
    this.dryRun = dryRun
  }

  ////////////////
  // ## Which checkouts
  ////////////////

  /**
   * The checkouts `path` is in:  its git checkout, and when that's a multi-repo top's (or a child repo inside one),
   * the top's checkout and every child repo's inside it.  Real paths, the top first.
   * - outside git:  `[]`
   */
  static checkoutsAt(path: string): string[] {
    let root = toplevel(path)
    if (!root) return []
    const parent = toplevel(dirname(root))
    if (parent && isTop(parent)) root = parent
    return withChildren(root)
  }

  /**
   * `main` and every worktree of the repo `path` is in, each with its child repos when it's a multi-repo top's;  then
   * each child repo's worktrees that aren't inside one of those (an old layout's).  Real paths, no duplicates.
   */
  static allCheckouts(path: string): string[] {
    const [top] = CheckoutPatches.checkoutsAt(path)
    if (!top) return []
    const found = worktreesOf(top).flatMap(withChildren)
    for (const child of found.slice()) for (const each of worktreesOf(child)) found.push(each)
    return [...new Set(found.map((each) => RealPath.of(each)))].filter((each) => existsSync(each))
  }

  ////////////////
  // ## Patching
  ////////////////

  /** `patch()` each of `checkouts`, in order:  one report each. */
  patchAll(checkouts: string[]): PatchReport[] {
    return checkouts.map((checkout) => this.patch(checkout))
  }

  /**
   * Give `checkout` the patches of its repo's MAIN checkout it doesn't have yet;  what it did (`PatchReport`).
   * - another run patching it right now (its lock):  `busy`, nothing done
   * - NEVER throws:  a patch that fails is in `failed`, and the next one still goes
   */
  patch(checkout: string): PatchReport {
    const report: PatchReport = { checkout, applied: [], failed: [] }
    let patches: CheckoutPatch[]
    let main: string
    try {
      const config = EpicConfig.of(checkout)
      patches = config.checkoutPatches
      main = config.main
    } catch (error) {
      report.failed.push({ id: "config", error: (error as Error).message })
      return report
    }
    if (!patches.length) return report
    const gitDir = Git.out(["rev-parse", "--path-format=absolute", "--git-dir"], checkout, { timeout: GIT_TIMEOUT_MS })
    if (!gitDir) {
      report.failed.push({ id: "git", error: "not a git checkout" })
      return report
    }
    const patchAll = () => {
      const stamp = readStamp(gitDir)
      for (const patch of patches) {
        try {
          const did = [
            ...(patch.copy ? this.copy(patch.copy, { checkout, main }) : []),
            ...(patch.run && !stamp.applied[patch.id] ? this.run(patch.run, checkout) : [])
          ]
          if (did.length) report.applied.push({ id: patch.id, did })
          if (!this.dryRun && (did.length || patch.copy)) stamp.applied[patch.id] ??= new Date().toISOString()
        } catch (error) {
          report.failed.push({ id: patch.id, error: (error as Error).message })
        }
      }
      if (!this.dryRun) writeFileSync(join(gitDir, STAMP), `${JSON.stringify(stamp, null, 2)}\n`)
      return report
    }
    if (this.dryRun) return patchAll()
    const done = FileLock.runOnce(join(gitDir, LOCK), patchAll, { stale: LOCK_STALE_MS })
    return done === FileLock.HELD ? { ...report, busy: true } : done
  }

  /**
   * Remember every `run` patch as had in `checkout`, without running it:  a NEW worktree, made from `main` now, already
   * has what they fix (the worktree hook).
   * - NEVER throws
   */
  static markApplied(checkout: string): void {
    try {
      const gitDir = Git.out(["rev-parse", "--path-format=absolute", "--git-dir"], checkout, {
        timeout: GIT_TIMEOUT_MS
      })
      if (!gitDir) return
      const stamp = readStamp(gitDir)
      const now = new Date().toISOString()
      for (const patch of EpicConfig.of(checkout).checkoutPatches) stamp.applied[patch.id] ??= now
      writeFileSync(join(gitDir, STAMP), `${JSON.stringify(stamp, null, 2)}\n`)
    } catch {
      // best effort:  the next run patches it
    }
  }

  /**
   * Copy patch `file` (from the repo's root) from `main` into `checkout`, unless `checkout` tracks it or already has
   * the same;  what it did, `[]` for nothing.
   * - excluded in the repo that owns the file's folder (a child repo's, for a path inside one)
   * - throws when `main` has no such file
   */
  private copy(file: string, { checkout, main }: { checkout: string; main: string }): string[] {
    if (RealPath.of(checkout) === RealPath.of(main)) return []
    if (Git.run(["ls-files", "--error-unmatch", "--", file], checkout, { timeout: GIT_TIMEOUT_MS }).ok) return []
    const source = join(main, file)
    if (!existsSync(source)) throw new Error(`main has no ${file} to copy`)
    const target = join(checkout, file)
    const same = existsSync(target) && readFileSync(target).equals(readFileSync(source))
    const excluded = this.dryRun || exclude(target)
    if (same) return excluded === "added" ? [`excluded ${file}`] : []
    if (this.dryRun) return [`would copy ${file}`]
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(source, target)
    return [`copied ${file} from main`]
  }

  /**
   * Run patch command `command` in `checkout`'s root;  what it did.
   * - throws with its output's last line when it fails or takes longer than `RUN_TIMEOUT_MS`
   */
  private run(command: string, checkout: string): string[] {
    if (this.dryRun) return [`would run ${command}`]
    const ran = spawnSync(command, { cwd: checkout, shell: true, encoding: "utf8", timeout: RUN_TIMEOUT_MS })
    if (ran.status !== 0) {
      const last = `${ran.stderr ?? ""}${ran.stdout ?? ""}`.trim().split("\n").pop()
      throw new Error(`\`${command}\` failed${ran.error ? `:  ${ran.error.message}` : last ? `:  ${last}` : ""}`)
    }
    return [`ran ${command}`]
  }

  /** `epic worktree patch`'s report, for a person:  a line per checkout, its path from `from`. */
  static lines(reports: PatchReport[], from = process.cwd()): string[] {
    return reports.flatMap(({ checkout, applied, failed, busy }) => {
      const name = relative(from, checkout) || "."
      if (busy) return [`${name}:  being patched by another run;  skipped`]
      if (!applied.length && !failed.length) return [`${name}:  nothing left`]
      return [
        ...applied.map(({ id, did }) => `${name}:  ${id}:  ${did.join(", ")}`),
        ...failed.map(({ id, error }) => `${name}:  ${id}:  FAILED:  ${error}`)
      ]
    })
  }
}

////////////////
// ## Helpers
////////////////

/** The git checkout `path` is in, its real path;  `""` outside git, or when `path` isn't there. */
function toplevel(path: string): string {
  const root = existsSync(path) ? checkoutOf(path)?.root : undefined
  return root ? RealPath.of(root) : ""
}

/** Whether checkout `root` is a multi-repo top's:  its config lists child repos. */
function isTop(root: string): boolean {
  try {
    return EpicConfig.of(root).repos.length > 0
  } catch {
    return false
  }
}

/** `root`, then each child repo checked out inside it when it's a multi-repo top's (its config's `repos`). */
function withChildren(root: string): string[] {
  let repos: string[] = []
  try {
    repos = EpicConfig.of(root).repos
  } catch {
    // a config that won't read:  the checkout alone
  }
  return [root, ...repos.map((repo) => join(root, repo)).filter((child) => existsSync(join(child, ".git")))]
}

/** Every checkout of the repo `checkout` is in:  `git worktree list`, the main checkout first. */
function worktreesOf(checkout: string): string[] {
  return Git.lines(["worktree", "list", "--porcelain"], checkout, { timeout: GIT_TIMEOUT_MS })
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length))
}

/**
 * Make sure `target`'s path is in its repo's `info/exclude` (the common git folder:  every worktree reads it);
 * `"added"` when it wasn't, else `"there"`.
 * - the repo:  the one owning `target`'s folder (a child repo's, for a path inside one)
 */
function exclude(target: string): "added" | "there" {
  let folder = dirname(target)
  while (!existsSync(folder)) folder = dirname(folder)
  const checkout = checkoutOf(folder)
  if (!checkout) throw new Error(`${folder} isn't in a git checkout`)
  const line = `/${relative(RealPath.of(checkout.root), RealPath.of(target)).split("\\").join("/")}`
  // the common git folder:  the main checkout's `.git`
  const file = join(checkout.main, ".git", "info", "exclude")
  const text = existsSync(file) ? readFileSync(file, "utf8") : ""
  if (text.split("\n").includes(line)) return "there"
  mkdirSync(dirname(file), { recursive: true })
  const header = text.includes(EXCLUDE_HEADER) ? "" : `${text && !text.endsWith("\n") ? "\n" : ""}${EXCLUDE_HEADER}\n`
  appendFileSync(file, `${header}${line}\n`)
  return "added"
}

/** The stamp in git folder `gitDir`:  the patches its checkout has had. */
function readStamp(gitDir: string): { applied: Record<string, string> } {
  try {
    const data = JSON.parse(readFileSync(join(gitDir, STAMP), "utf8")) as { applied?: Record<string, string> }
    return { applied: { ...data.applied } }
  } catch {
    return { applied: {} }
  }
}
