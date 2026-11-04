/**
 * The nearest folder up that holds something:  `findUp()`, the ONE walk up the folders (epic `coherence` P29).
 * - A checkout (`.git`), the kit (its `repos.json5`), a package (`package.json`), an install (`yarn.lock`), a project,
 *   a `node_modules` holding a tool:  each is `findUp(from, marker)`, or a test of the folder.
 * - NODE ONLY:  it looks at the disk.
 * - `spell/util/node/findUp`;  plain `node` loads it too, as `spell/util/node/findUp.ts`:  it imports nothing of ours
 */
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

/**
 * The nearest folder at or above `from` that holds `marker`, or that `marker(folder)` says yes to;
 * `undefined` when none does, up to the disk's root.
 * - `marker` as a string:  a path from the folder (`.git`, `package.json`, `node_modules/.bin/tsc`), there in any form
 * - `from` itself is looked at first;  it needn't exist (a page not made yet):  the folders above it are still looked at
 * - links not followed:  the folder comes back spelled as `from` was, made absolute
 * - NEVER throws, unless `marker()` does
 */
export function findUp(from: string, marker: string | ((folder: string) => unknown)): string | undefined {
  const holds = typeof marker === "string" ? (folder: string) => existsSync(join(folder, marker)) : marker
  for (let folder = resolve(from); ; folder = dirname(folder)) {
    if (holds(folder)) return folder
    if (dirname(folder) === folder) return undefined
  }
}
