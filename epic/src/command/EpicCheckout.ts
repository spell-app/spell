import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { Git } from "spell/server/Git"
import type { SRV } from "spell/server"

import { EpicCommandError } from "./command.types"

/** A repo's epic config, from its main checkout:  `EpicConfig.FILE`, spelled out to keep this file's imports small. */
const CONFIG_FILE = ".epic/config.json5"

/****************
 * ### `EpicCheckout`
 * Finding the checkouts the `epic` command works with:  the caller's (`nearest()`), and the one this code is in
 * (`CODE_ROOT`).
 * - All `static`:  no state, one service every verb group shares (WWOD §8 › "Singleton services are classes").
 * - Running git, and a checkout's main checkout:  the kit's `Git` (`spell/server/Git`);  `mustGit()` for a verb.
 *   Before epic `coherence` P7 this was spell-epic's own `Git`, which ran git too.
 ****************/
export class EpicCheckout {
  /**
   * The checkout to work on:  the nearest folder from `from` (default the current one) up that either
   * - is a checkout of a repo set up for epics (its main checkout has `.epic/config.json5`:  `isEpicRepo()`)
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
  static nearest({ marker, from = process.cwd() }: { marker?: string; from?: string } = {}): string {
    for (let dir = resolve(from); ; dir = dirname(dir)) {
      if ((marker && existsSync(join(dir, marker))) || EpicCheckout.isEpicRepo(dir)) return dir
      if (dirname(dir) === dir) return EpicCheckout.CODE_ROOT
    }
  }

  /**
   * Whether folder `dir` is the root of a checkout (it has a `.git`, folder or file)
   * whose MAIN checkout has `.epic/config.json5`:  a repo `epic init` set up.
   */
  static isEpicRepo(dir: string): boolean {
    if (!existsSync(join(dir, ".git"))) return false
    return existsSync(join(Git.mainRoot(dir), CONFIG_FILE))
  }

  /**
   * `Git.mustRun()` for a verb:  git's output, trimmed;  its failure an `EpicCommandError`, so `epic` prints the
   * message (`git <args> failed in <cwd>:  <git's words>`) rather than a stack.
   */
  static mustGit(args: string[], cwd: string, options?: SRV.GitOptions): string {
    try {
      return Git.mustRun(args, cwd, options)
    } catch (error) {
      throw new EpicCommandError((error as Error).message)
    }
  }

  /**
   * The checkout this code is in:  `src/command/` is two folders down.
   * - static:  where the running `epic`'s own copy of every tool is (`EpicTools`)
   */
  static readonly CODE_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")
}
