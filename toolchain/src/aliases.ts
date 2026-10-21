import { existsSync, statSync } from "node:fs"
import { registerHooks } from "node:module"
import { dirname } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { aliasesOf, repoOf, resolveAlias, type Alias } from "./aliasTable.ts"

/****************
 * ### `$/` aliases at run time, by the IMPORTING file's repo (epic `repo-split` I12)
 * Import this once, AFTER `tsx` is registered, and every `$/name/...` import resolves through the alias table of the
 * repo the importing file is in.
 *
 * ```js
 * register({ tsconfig })                        // tsx, from `tsx/esm/api`
 * await import("spell-kit/toolchain/aliases")  // then this
 * ```
 * ```sh
 * tsx --import spell-kit/toolchain/aliases scripts/site-data.ts
 * node --import tsx --import spell-kit/toolchain/aliases src/page/cli.ts serve
 * ```
 *
 * - Why:  `tsx` reads ONE `tsconfig`, the one it's given (or the current folder's), for every file it runs.  A program
 *   that runs several repos' source (spell-app's CLI runs spell-lang's, the page server spell-epic's) then meets
 *   `$/server/...` in spell-server's files with spell-app's table, which hasn't got it:  `Cannot find package '$'`.
 *   Each repo's table holds only its own names (epic `repo-split` P8, J46).
 * - How:  a node resolve hook (`module.registerHooks()`, in this thread).
 *   - Registered last, it runs first:  a `$/` specifier never reaches `tsx`'s own table.
 *   - The importing file's repo:  the nearest `tsconfig.base.json` with `paths` above it (`repoOf()`), read once each.
 *   - The target as `tsc` finds it:  as written, or with `.ts`, `.tsx`, `.mts`, `.js`, `.mjs`, or as a folder's
 *     `index`;  then handed on, as a file URL, to `tsx` and node.
 *   - Anything else (no `$/`, no repo, no match) goes on as it came:  the error is node's own.
 * - Vite and Vitest don't need it:  their `resolve.tsconfigPaths` already uses the tsconfig nearest the importing file.
 * - NOTE: plain `node` loads this file as is (types stripped), so:  node's modules and `json5` only.
 ****************/

/** The alias table of each repo met so far, by its root;  `null`:  a folder in no repo. */
const TABLES = new Map<string, Alias[] | null>()

/** The extensions tried after a target as written, in order. */
const EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"]

/** The alias table for files in folder `dir`:  its repo's, or `null` outside every repo. */
function tableFor(dir: string): Alias[] | null {
  let repo: string
  try {
    repo = repoOf(dir)
  } catch {
    return null
  }
  if (!TABLES.has(repo)) TABLES.set(repo, aliasesOf(repo))
  return TABLES.get(repo)!
}

/** The file `$/` specifier `specifier` names, imported from file `parent`;  `undefined`:  none. */
export function aliasedFile(specifier: string, parent: string): string | undefined {
  const table = tableFor(dirname(parent))
  const target = table && resolveAlias(specifier, table)
  if (!target) return undefined
  return EXTENSIONS.map((ending) => `${target}${ending}`).find((file) => existsSync(file) && statSync(file).isFile())
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("$/") && context.parentURL?.startsWith("file:")) {
      const file = aliasedFile(specifier, fileURLToPath(context.parentURL))
      if (file) return nextResolve(pathToFileURL(file).href, context)
    }
    return nextResolve(specifier, context)
  }
})
