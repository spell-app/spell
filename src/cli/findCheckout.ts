import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { findUp } from "spell/util/node/findUp"
import { REPOS_FILE } from "spell/server/kitFolders"

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
  return findUp(from, marker) ?? fallback
}

/**
 * The kit's own file at its root, which no folder of it has:  `findCheckout(KIT_MARKER)` is the nearest kit.
 * - the kit's `REPOS_FILE` (`spell/server/kitFolders`), named once (epic `coherence` P29)
 */
export const KIT_MARKER = REPOS_FILE
