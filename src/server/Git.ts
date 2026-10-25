import { spawnSync } from "node:child_process"
import { dirname } from "node:path"

// By its file, with its `.ts`:  plain `node` loads this file (above)
import { GitError, type GitOptions, type GitResult } from "./server.types.ts"

/****************
 * ### `Git`
 * Running `git`, for every tool in every repo:  its output, its lines, or a throw.
 *
 * ```ts
 * Git.run(["status", "--porcelain"], root)        // => { ok, out, err, code }:  NEVER throws
 * Git.out(["rev-parse", "HEAD"], root)            // => "9bc821d..." or undefined when it failed
 * Git.lines(["ls-files"], root)                   // => ["README.md", ...], [] when it failed
 * Git.mustRun(["merge", "--ff-only", "x"], root)  // => its output;  throws a `GitError`
 * Git.mainRoot(root)                              // => the MAIN checkout of the repo holding `root`
 * ```
 *
 * - All `static`:  no state (WWOD §8 › "Singleton services are classes").
 * - Finding a checkout WITHOUT running git (a worktree's `.git` file, git's common dir):  `checkoutOf()`.
 * - Its position:  node's own modules only, so plain `node` loads it by its own name, `spell/server/Git`
 *   (an entry of its own in the kit's `exports`:  the hooks, `EpicConfig`).
 *   NEVER an `enum`, a parameter property or an import of `spell/server`'s barrel.
 * - From spell-epic's `Git` (epic `coherence` P7), which ~20 tools copied as a raw `spawnSync("git", ...)`.
 ****************/
export class Git {
  /**
   * Run `git <args>` in `cwd`:  `{ ok, out, err, code }`.
   * - NEVER throws:  a missing `git` or a failing command is `ok: false`
   */
  static run(
    args: string[],
    cwd = process.cwd(),
    { input, timeout = TIMEOUT, env, trim = true }: GitOptions = {}
  ): GitResult {
    const run = spawnSync("git", args, { cwd, input, env, encoding: "utf8", timeout, maxBuffer: MAX_BUFFER })
    const out = run.stdout ?? ""
    return {
      ok: run.status === 0,
      out: trim ? out.trim() : out,
      err: (run.stderr ?? String(run.error ?? "")).trim(),
      code: run.status ?? -1
    }
  }

  /** Git's output, trimmed;  `undefined` when it fails.  NEVER throws. */
  static out(args: string[], cwd = process.cwd(), options?: GitOptions): string | undefined {
    const run = Git.run(args, cwd, options)
    return run.ok ? run.out : undefined
  }

  /** Git's output, a line each, empty lines dropped;  `[]` when it fails.  NEVER throws. */
  static lines(args: string[], cwd = process.cwd(), options?: GitOptions): string[] {
    return (Git.out(args, cwd, options) ?? "").split("\n").filter(Boolean)
  }

  /**
   * Git's output (trimmed, unless `trim: false`).
   * - throws a `GitError` when it fails:  `git <args> failed in <cwd>:  <git's words>`
   */
  static mustRun(args: string[], cwd = process.cwd(), options?: GitOptions): string {
    const run = Git.run(args, cwd, options)
    if (run.ok) return run.out
    const why = run.err || run.out.trim() || `exit ${run.code}`
    throw new GitError(`git ${args.join(" ")} failed in ${cwd}:  ${why}`, { cause: run })
  }

  /**
   * The MAIN checkout of the repo holding `cwd`, so a worktree counts as its repo;  else `cwd` itself.
   * - `git rev-parse --git-common-dir` is the main checkout's `.git`, from any worktree
   * - without running git:  `checkoutOf(cwd)?.main`
   */
  static mainRoot(cwd = process.cwd()): string {
    const common = Git.out(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd)
    return common ? dirname(common) : cwd
  }
}

/** Longest a git run may take, ms:  a hung one (a lock, a prompt) never holds a tool up for good. */
const TIMEOUT = 15_000

/** Most output kept, bytes:  `git log` of a big repo is well past node's 1MB default. */
const MAX_BUFFER = 64 * 1024 * 1024
