import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import type { GitResult } from "./command.types"

/** A repo's epic config, from its main checkout:  `EpicConfig.FILE`, spelled out to keep this file built-ins only. */
const CONFIG_FILE = ".epic/config.json5"

/****************
 * ### `Git`
 * Running `git`, and finding checkouts:  the main one, the nearest one, and the one this code is in.
 * - All `static`:  no state, one service every verb group shares (WWOD §8 › "Singleton services are classes").
 * - Node built-ins only.
 ****************/
export class Git {
  /**
   * Run `git <args>` in `cwd`:  `{ ok, out, err, code }`, output trimmed.
   * - NEVER throws:  a missing `git` or a failing command is `ok: false`
   */
  static run(args: string[], cwd = process.cwd()): GitResult {
    const run = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 15_000 })
    return {
      ok: run.status === 0,
      out: (run.stdout ?? "").trim(),
      err: (run.stderr ?? "").trim(),
      code: run.status ?? -1
    }
  }

  /**
   * The MAIN checkout of the repo holding `cwd`, so a worktree counts as the repo;  else `cwd` itself.
   * - `git rev-parse --git-common-dir` is the main checkout's `.git`, from any worktree
   */
  static mainRoot(cwd = process.cwd()): string {
    const run = Git.run(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd)
    return run.ok ? dirname(run.out) : cwd
  }

  /**
   * The checkout to work on:  the nearest folder from `from` (default the current one) up that either
   * - is a checkout of a repo set up for epics (its main checkout has `.epic/config.json5`:  `isEpicCheckout()`)
   * - or holds `marker`, when given:  a path relative to a checkout's root, e.g. `.git` for any checkout
   *
   * Else the one this code is in.
   * - Why:  the `epic` on the `PATH` is the MAIN checkout's,
   *   but in a worktree the files to read or edit are the worktree's.
   *   The DATA is the caller's;  the CODE is always this copy's (`CODE_ROOT`).
   * - The epic verbs give no marker:  the config file is what marks a repo with epics (epic `epic-eject` P9,
   *   `epic init`).
   *   - Before epic `repo-split` I45 they named the docs tools' old place in spell-app
   *     (`packages/epics/tools/plan-doc.js`), which no checkout has had since epic `epic-eject`.
   */
  static nearestCheckout({ marker, from = process.cwd() }: { marker?: string; from?: string } = {}): string {
    for (let dir = resolve(from); ; dir = dirname(dir)) {
      if ((marker && existsSync(join(dir, marker))) || Git.isEpicCheckout(dir)) return dir
      if (dirname(dir) === dir) return Git.CODE_ROOT
    }
  }

  /**
   * Whether folder `dir` is the root of a checkout (it has a `.git`, folder or file)
   * whose MAIN checkout has `.epic/config.json5`:  a repo `epic init` set up.
   */
  static isEpicCheckout(dir: string): boolean {
    if (!existsSync(join(dir, ".git"))) return false
    return existsSync(join(Git.mainRoot(dir), CONFIG_FILE))
  }

  /**
   * The checkout this code is in:  `src/command/` is two folders down.
   * - static:  where the running `epic`'s own copy of every tool is (`EpicTools`)
   */
  static readonly CODE_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")
}
