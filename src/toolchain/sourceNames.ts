import { existsSync, readFileSync, realpathSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"

import type { Plugin } from "esbuild"

/****************
 * ### `sourceNames()`
 * An esbuild plugin finding our packages' names as their SOURCE files, the way Vite and `tsx` do:
 * `spell/server` => the kit's `src/server/index.ts`, `spell-epic/config/RealPath` => spell-epic's
 * `src/config/RealPath.ts`.
 *
 * ```ts
 * import { sourceNames } from "spell/toolchain/sourceNames"
 * await build({ entryPoints: [entry], bundle: true, plugins: [sourceNames()] })
 * ```
 *
 * - Why:  esbuild reads `package.json`'s `exports` as node does:  no extension added to `./src/*`, no folder's
 *   `index.ts` (epic `repo-split` I50).
 *   So by itself it can't find `spell/ui/runtime/runtime.types`, or `spell/server` (a folder).
 * - Tries `<name>.ts`, `<name>.tsx`, `<name>/index.ts`, `<name>/index.tsx`, then the name as written, under the
 *   package's `src/`;  the package's own name alone is its `src/index.ts`.
 * - A name it can't find is left to esbuild's own resolver.
 * - `packages`:  which names, default every Spell repo's (`spell`, `spell-ui` ...).
 * - Used by every direct esbuild build:  spell-epic's extension and docs bundle, Spell UI's bundle measure and static
 *   server, the brand's design bundle, spell-parser's library test.
 * - Node's modules only (esbuild's type erased):  plain `node` loads it, types stripped.
 ****************/
export function sourceNames(packages: RegExp = SPELL_PACKAGES): Plugin {
  return {
    name: "source-names",
    setup(builder) {
      builder.onResolve({ filter: packages }, ({ path, importer, resolveDir }) => {
        const file = sourceFileFor(path, importer || resolveDir || import.meta.filename)
        return file ? { path: file } : undefined
      })
    }
  }
}

/**
 * The source file of our package name `specifier`, as node finds the package from `from` (a file or folder):
 * `sourceNames()`'s lookup, by its real path;  `undefined`:  none.
 * - NEVER throws.
 */
export function sourceFileFor(specifier: string, from: string = import.meta.filename): string | undefined {
  const [, pkg = specifier, path] = PACKAGE_NAME.exec(specifier) ?? []
  const root = packageRootFor(pkg, from)
  if (!root) return undefined
  const src = join(root, "src")
  const candidates = path ? [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`, path] : ["index.ts"]
  for (const candidate of candidates) {
    const file = join(src, candidate)
    if (existsSync(file) && statSync(file).isFile()) return realpathSync(file)
  }
  return undefined
}

/**
 * The folder of package `pkg` (no sub-path), as node finds it from `from` (a file or folder):
 * by its `package.json` entry, else its `"."` entry, then up to the `package.json` named `pkg`.
 * - `undefined`:  not installed, or neither entry.  NEVER throws.
 */
export function packageRootFor(pkg: string, from: string = import.meta.filename): string | undefined {
  const manifest = resolvedFile(`${pkg}/package.json`, from)
  if (manifest) return dirname(manifest)
  const file = resolvedFile(pkg, from)
  if (!file) return undefined
  for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) {
    const found = join(dir, "package.json")
    if (!existsSync(found)) continue
    try {
      if ((JSON.parse(readFileSync(found, "utf8")) as { name?: string }).name === pkg) return dir
    } catch {
      return undefined
    }
  }
  return undefined
}

/**
 * The file `specifier` names (`spell/server/page/cli.ts`), by its real path, as node's resolver finds it from
 * `from` (a file or folder);  `undefined`:  not found.  NEVER throws.
 */
export function resolvedFile(specifier: string, from: string = import.meta.filename): string | undefined {
  const base = existsSync(from) && statSync(from).isDirectory() ? join(from, "package.json") : from
  try {
    return realpathSync(createRequire(pathToFileURL(base)).resolve(specifier))
  } catch {
    return undefined
  }
}

/** Every Spell repo's package name, and the names under it:  `sourceNames()`' default. */
const SPELL_PACKAGES = /^spell(?:-(?:parser|ui|brand|epic|app))?(?:\/.*)?$/

/** A package name, scoped or not (1), and the path after it (2). */
const PACKAGE_NAME = /^((?:@[^/]+\/)?[^/]+)(?:\/(.+))?$/
