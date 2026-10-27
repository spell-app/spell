import { join } from "node:path"
import { pathToFileURL } from "node:url"

import { packageRootFor } from "spell/toolchain/sourceNames"

/****************
 * ### `packageDir()`
 * The folder of package `name` (its `package.json`'s), by its REAL path, as Node's resolver finds it from `from`:  a
 * workspace of the top `spell` install, wherever that put it (epic `epic-engine` P10).
 *
 * ```js
 * packageDir("spell-ui")                       // => "/Users/owen/www/spell/spell-ui"
 * packageDir("spell/server")                   // => "/Users/owen/www/spell/src/server"
 * packageDir("spell-app", checkout)            // => "<checkout>/spell-app", from that checkout's install
 * ```
 *
 * - Never a sibling named by hand (`../spell-ui`, `.spell-app/packages/ui`):  spell-epic's other repos are packages,
 *   found as node finds them.
 * - `from`:  a file or folder to resolve from (default this file, so spell-epic's own dependencies);  a folder:  as if
 *   from a file in it.
 * - Found by the kit's `packageRootFor()` (`spell/toolchain/sourceNames`):
 *   by the package's `package.json` entry (every repo's `exports` names it);  a package without one, by its `"."`
 *   entry, resolved, then up to the `package.json` named `name`.
 * - A package's sub-path (`packageDir("spell/server")`):  that folder under the package's `src/`, where the name
 *   points (every repo's code is one `src/`, its names the paths under it:  epic `repo-split` P14).
 * - `undefined` when it can't be found:  not installed, or neither entry.
 * - Node's modules only:  plain `node` loads it (`bundle-spell-ui.js`), types stripped.
 ****************/
export function packageDir(name: string, from: string = import.meta.filename): string | undefined {
  const [, pkg = name, sub] = /^((?:@[^/]+\/)?[^/]+)(?:\/(.+))?$/.exec(name) ?? []
  const dir = packageRootFor(pkg, from)
  return dir && sub ? join(dir, "src", sub) : dir
}

/**
 * `node --import` loaders for a child that runs TypeScript, as resolved from `from` (default spell-epic's own
 * install), each a file URL;  `[]` when `tsx` isn't installed:
 * - `tsx`'s ESM loader:  every repo's files run by their package names, no alias hook (epic `repo-split` P14)
 *
 * ```js
 * spawnSync(process.execPath, [...tsxImports(), "src/tools/notes.ts", ...args])
 * ```
 */
export function tsxImports(from: string = import.meta.filename): string[] {
  const tsx = packageDir("tsx", from)
  return tsx ? ["--import", pathToFileURL(join(tsx, "dist", "loader.mjs")).href] : []
}

/** The kit's package names, newest first:  `spell` since epic `repo-split` P17 (Q54), `spell-kit` in a checkout from before. */
export const KIT_PACKAGES = ["spell", "spell-kit"]

/**
 * The folder of the first of `names` installed, as `packageDir()` finds it from `from`;  `undefined`:  none is.
 * - The kit by either name, `firstPackageDir(KIT_PACKAGES, checkout)`:  the main checkout's tools run against every
 *   worktree, and one cut before the rename installs `spell-kit`.
 */
export function firstPackageDir(names: string[], from?: string): string | undefined {
  for (const name of names) {
    const dir = packageDir(name, from)
    if (dir) return dir
  }
  return undefined
}
