import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** The kit `spell` runs from:  this file is in its `src/cli/`. */
export const KIT_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")

/**
 * The checkout to work on:  the nearest folder from `from` (default the current one) up that holds `marker`, a
 * path relative to a checkout's root, e.g. `repos.json5` (the kit's) or `vscode/package.json` (spell-app's);
 * else `fallback` (default the kit `spell` runs from).
 * - Why:  `spell` is usually linked to the MAIN checkout (`yarn cli:install`), but in an epic's worktree the files
 *   to read or edit are the worktree's.  Every repo tool finds its checkout this way.
 */
export function findCheckout(marker: string, from = process.cwd(), fallback = KIT_ROOT): string {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (existsSync(join(dir, marker))) return dir
    if (dirname(dir) === dir) return fallback
  }
}

/** The kit's own file at its root, which no child repo has:  `findCheckout(KIT_MARKER)` is the nearest kit. */
export const KIT_MARKER = "repos.json5"
