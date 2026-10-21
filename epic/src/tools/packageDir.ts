import { existsSync, readFileSync, realpathSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"

/****************
 * ### `packageDir()`
 * The folder of package `name` (its `package.json`'s), by its REAL path, as Node's resolver finds it from `from`:  a
 * workspace of the top `spell` install, wherever that put it (epic `epic-engine` P10).
 *
 * ```js
 * packageDir("spell-ui")                       // => "/Users/owen/www/spell/spell-ui"
 * packageDir("spell-app/page-server", checkout)    // => "<checkout>/page-server", from that checkout's install
 * ```
 *
 * - Never a sibling named by hand (`../spell-ui`, `.spell-app/packages/ui`):  spell-epic's other repos are packages,
 *   found as node finds them.
 * - `from`:  a file or folder to resolve from (default this file, so spell-epic's own dependencies);  a folder:  as if
 *   from a file in it.
 * - The package's `"."` entry, resolved (its `default`, the source), then up to the `package.json` named `name`.
 * - A package's sub-path, one of the kit's folders (`packageDir("spell-kit/server")`, epic `repo-split` P9):  that
 *   entry resolved, up to the kit's `package.json` (`spell-kit`), then the sub-path's folder in it, `<kit>/server`.
 * - `undefined` when it can't be found:  not installed, or no `"."` entry.
 * - Node's modules only:  plain `node` loads it (`bundle-spell-ui.js`), types stripped.
 ****************/
export function packageDir(name: string, from: string = import.meta.filename): string | undefined {
  const file = resolvedFile(name, from)
  if (!file) return undefined
  // a sub-path of a package, one of the kit's folders (`spell-kit/server` => `<kit>/server`, epic `repo-split` P9)
  const [, pkg = name, sub] = /^((?:@[^/]+\/)?[^/]+)(?:\/(.+))?$/.exec(name) ?? []
  for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) {
    const manifest = join(dir, "package.json")
    if (!existsSync(manifest)) continue
    try {
      if ((JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name === pkg)
        return sub ? join(dir, sub) : dir
    } catch {
      return undefined
    }
  }
  return undefined
}

/**
 * The file `specifier` names (`spell-kit/toolchain/aliases`), by its real path, as Node's resolver finds it from
 * `from` (a file or folder, as `packageDir()`'s);  `undefined`:  not found.
 */
export function resolvedFile(specifier: string, from: string = import.meta.filename): string | undefined {
  const base = existsSync(from) && statSync(from).isDirectory() ? join(from, "package.json") : from
  try {
    return realpathSync(createRequire(pathToFileURL(base)).resolve(specifier))
  } catch {
    return undefined
  }
}

/**
 * `node --import` loaders for a child that runs TypeScript from several repos, as resolved from `from` (default
 * spell-epic's own install), each a file URL;  `[]` for one not installed:
 * - `tsx`'s ESM loader, then the run-time alias hook (`spell-kit/toolchain/aliases`, epic `repo-split` I12):  every
 *   `$/` import through the importing file's own repo's table, so other repos' source (`spell-kit/server`'s own
 *   `$/server/...`) runs too
 *
 * ```js
 * spawnSync(process.execPath, [...tsxImports(), "src/tools/notes.ts", ...args])
 * ```
 */
export function tsxImports(from: string = import.meta.filename): string[] {
  const tsx = packageDir("tsx", from)
  const aliases = resolvedFile("spell-kit/toolchain/aliases", from)
  return [
    ...(tsx ? ["--import", pathToFileURL(join(tsx, "dist", "loader.mjs")).href] : []),
    ...(aliases ? ["--import", pathToFileURL(aliases).href] : [])
  ]
}
