import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"

import JSON5 from "json5"

/**
 * A repo's `$/` alias table, as its tools read it (epic `repo-split` I12):  `tsconfig.base.json` at the repo's root,
 * its `compilerOptions.paths`.
 * - Each repo has its own, for inside it only (epic `repo-split` P8, J46);  another repo's package goes by its npm name.
 * - Read by `Declarations` (rewriting a package's `.d.ts` files) and `aliases.ts` (`$/` imports under `tsx` / node, by
 *   the IMPORTING file's repo).
 * - Node runs this file as is (types stripped):  node's modules and `json5` only.
 */

/** One `$/` alias of a repo's table. */
export type Alias = {
  /** as written, `$/parser/*` */
  pattern: string
  /** its target, absolute:  `<repo>/parser/src/*` */
  target: string
  /** the package the target is in, its folder */
  package: string
}

/**
 * The repo root holding `dir`:  the nearest folder up whose `tsconfig.base.json` has `paths`.
 * - Throws when there's none.
 */
export function repoOf(dir: string): string {
  for (let at = dir; ; at = dirname(at)) {
    const base = join(at, "tsconfig.base.json")
    if (existsSync(base) && readJson5<TsConfig>(base).compilerOptions?.paths) return at
    if (dirname(at) === at) throw new Error(`spell-types:  no tsconfig.base.json with paths above ${dir}`)
  }
}

/** The `$/` aliases of the repo at `repo`, each with its absolute target and its package. */
export function aliasesOf(repo: string): Alias[] {
  const paths = readJson5<TsConfig>(join(repo, "tsconfig.base.json")).compilerOptions?.paths ?? {}
  return Object.entries(paths)
    .filter(([pattern]) => pattern.startsWith("$/"))
    .map(([pattern, [target = ""]]) => {
      const absolute = resolve(repo, target)
      return { pattern, target: absolute, package: packageOf(absolute, repo) }
    })
}

/** The folder of the package `file` is in:  its nearest `package.json`, no higher than `repo`. */
function packageOf(file: string, repo: string): string {
  for (let at = dirname(file); isInside(at, repo) || at === repo; at = dirname(at))
    if (existsSync(join(at, "package.json"))) return at
  return repo
}

/**
 * `specifier`'s target through `aliases`, as TypeScript picks it:  an exact pattern, else the `*` pattern with the
 * longest prefix;  `undefined` when none matches.
 */
export function resolveAlias(specifier: string, aliases: Alias[]): string | undefined {
  const exact = aliases.find((alias) => alias.pattern === specifier)
  if (exact) return exact.target
  const star = aliases
    .filter((alias) => alias.pattern.endsWith("*") && specifier.startsWith(alias.pattern.slice(0, -1)))
    .sort((a, b) => b.pattern.length - a.pattern.length)[0]
  return star && star.target.replace("*", specifier.slice(star.pattern.length - 1))
}

/** Is `path` inside folder `dir` (not `dir` itself)? */
export function isInside(path: string, dir: string): boolean {
  const inside = relative(dir, path)
  return Boolean(inside) && !inside.startsWith("..") && !inside.startsWith(sep)
}

/** A JSON5 file's value. */
export function readJson5<T>(file: string): T {
  return JSON5.parse(readFileSync(file, "utf8")) as T
}

/** What this file reads of a `tsconfig.json`. */
type TsConfig = { compilerOptions?: { paths?: Record<string, string[]> } }
