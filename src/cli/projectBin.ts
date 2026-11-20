import { existsSync, readFileSync, realpathSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

import { checkoutOf } from "spell/server/checkout"

/**
 * The project's own npm install of a command, for a checkout's bin on the `PATH` to hand off to (epic `repo-split`
 * T71):  the `PATH`'s `spell` and `epic` are a checkout's, but a project that runs no checkout gets the version it
 * installed.
 * - `installs`:  where the command is in an install, from a project's folder, first found wins
 *   (`node_modules/spell/bin/spell.mjs`;  `node_modules/spell-epic/bin/epic`, then `node_modules/spell/epic/bin/epic`)
 * - Looks from `folder` up;  `undefined`, to run the checkout, when:
 *   - `SPELL_KIT` is set, or a `.spell/kit.json5` is found first:  the project runs a checkout (`spell local on`)
 *   - a kit checkout is found first (a `package.json` named `spell`):  its own bin decides
 *   - no install is found
 * - An install is one whose real path is in a `node_modules`:  a `portal:` or a link to a checkout isn't.
 * - Imports only node's own modules and the kit's `checkoutOf()` (node's own too), in TypeScript plain node runs:
 *   the bins load it before `tsx`.
 * - NEVER throws:  anything unreadable runs the checkout.
 */
export function projectBin(
  folder: string,
  installs: string[],
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (env.SPELL_KIT?.trim()) return undefined
  try {
    for (let dir = resolve(folder); ; dir = dirname(dir)) {
      if (kitFileAt(dir) || isKitCheckout(dir)) return undefined
      for (const install of installs) {
        const bin = join(dir, install)
        if (existsSync(bin) && realpathSync(bin).includes("/node_modules/")) return bin
      }
      if (dirname(dir) === dir) return undefined
    }
  } catch {
    return undefined
  }
}

/** A project's file naming the checkout it runs, from its root:  each person's own, never committed. */
export const KIT_FILE = ".spell/kit.json5"

/**
 * The `KIT_FILE` in folder `dir`, as a full path;  else, in a git WORKTREE, the one at the same place in its main
 * checkout (epic `repo-split` T72);  else `undefined`.
 * - Why:  the file is git-ignored, so a project's worktrees never get it;  they follow the main checkout's
 *   (`spell local on` there), as `git rev-parse --git-common-dir` finds it, with no `git` run (`checkoutOf()`)
 * - NEVER throws
 */
export function kitFileAt(dir: string): string | undefined {
  const own = join(dir, KIT_FILE)
  if (existsSync(own)) return own
  try {
    const checkout = checkoutOf(dir)
    if (!checkout?.worktree) return undefined
    const inMain = join(checkout.main, relative(checkout.root, dir), KIT_FILE)
    return existsSync(inMain) ? inMain : undefined
  } catch {
    return undefined
  }
}

/** Whether `dir` is a kit checkout's root:  its `package.json` is named `spell`. */
function isKitCheckout(dir: string): boolean {
  const manifest = join(dir, "package.json")
  return existsSync(manifest) && (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name === "spell"
}
