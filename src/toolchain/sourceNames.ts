import { existsSync, readFileSync, realpathSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"

import type { Plugin } from "esbuild"

import { findUp } from "spell/util/node/findUp"

/****************
 * ### `sourceNames()`
 * An esbuild plugin finding our packages' names as their SOURCE files, the way Vite and `tsx` do:
 * `spell/server` => the kit's `src/server/index.ts`, `spell/epic/config/RealPath` => its epic folder's
 * `epic/src/config/RealPath.ts` (a folder of the package, its `workspaces`:  epic `repo-split` P20).
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
  const { src, rest } = codeOf(root, path)
  const candidates = rest ? [`${rest}.ts`, `${rest}.tsx`, `${rest}/index.ts`, `${rest}/index.tsx`, rest] : ["index.ts"]
  for (const candidate of candidates) {
    const file = join(src, candidate)
    if (existsSync(file) && statSync(file).isFile()) return realpathSync(file)
  }
  return undefined
}

/**
 * The FOLDER our package name `specifier` names, by its real path, as node finds the package from `from` (a file or
 * folder):  the ONE way a tool finds a package's folder (epic `coherence` P29, I22).
 * - the package alone (`spell-ui`, `spell`):  its root, `packageRootFor()`
 * - a sub-path:  that folder of its code, as `sourceFileFor()` finds a file:  `spell/server` is the kit's `src/server`,
 *   `spell/parser/py` its parser folder's `parser/src/py` (a folder of the kit, its `workspaces`)
 * - the published `spell` (its `"spell": { "folders" }`, no `src/`):  under `dist/`, `spell/parser/py` => `dist/parser/py`
 * - says nothing of whether that folder is there;  `undefined`:  the package isn't installed.  NEVER throws.
 */
export function packageFolderFor(specifier: string, from: string = import.meta.filename): string | undefined {
  const [, pkg = specifier, path] = PACKAGE_NAME.exec(specifier) ?? []
  const root = packageRootFor(pkg, from)
  if (!root || !path) return root
  const { src, rest } = codeOf(root, path)
  return rest ? join(src, rest) : src
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
  return findUp(dirname(file), (dir) => (manifestOf(dir) as { name?: unknown }).name === pkg)
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

/**
 * Where sub-path `path` of the package at `root` is:  its code folder (`src`) and the path left under it.
 * - a folder of the package (its `workspaces`, epic `repo-split` P20):  `spell/ui/core` is `ui/src/core.ts`
 * - the published `spell` (`"spell": { "folders" }`):  every folder's code built into `dist/<folder>/`, the kit's into
 *   `dist/` (epic `repo-split` P22)
 */
function codeOf(root: string, path = ""): { src: string; rest: string } {
  const manifest = manifestOf(root)
  const [first = "", ...more] = path.split("/")
  const folders = Array.isArray(manifest.workspaces) ? manifest.workspaces : []
  if (first && folders.includes(first)) return { src: join(root, first, "src"), rest: more.join("/") }
  if (manifest.spell?.folders) return { src: join(root, "dist"), rest: path }
  return { src: join(root, "src"), rest: path }
}

/** The `package.json` at `root`, the fields `codeOf()` reads;  `{}` when it can't be read. */
function manifestOf(root: string): { workspaces?: unknown[]; spell?: { folders?: unknown } } {
  try {
    return JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as ReturnType<typeof manifestOf>
  } catch {
    return {}
  }
}

/** Every Spell repo's package name, and the names under it:  `sourceNames()`' default. */
const SPELL_PACKAGES = /^spell(?:-(?:parser|ui|brand|epic|app))?(?:\/.*)?$/

/** A package name, scoped or not (1), and the path after it (2). */
const PACKAGE_NAME = /^((?:@[^/]+\/)?[^/]+)(?:\/(.+))?$/
