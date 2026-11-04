import { readTypeScript } from "spell/util/node/typescript"

import type { ImportStatement, MappedRepo } from "./map.types"

/**
 * Reading imports, and finding the file a package-name import means:  what graphify can't do for our repos.
 * - graphify links `./Peer` imports itself, but every other import of ours is by package name
 *   (`spell/util/node/json5`, `spell/ui/components/ui-button/UIButton`), which it leaves unresolved.
 * - Imports read by the kit's TypeScript reader (`readTypeScript()`, oxc's own list):
 *   about a millisecond a file, and never an import inside a string or comment.
 */

/**
 * Every import and re-export statement of `text`, the source of `file`, in order.
 * - `file`:  only its extension matters, `.ts` or `.tsx` ...;  default TypeScript
 * - `import { a, type B, c as d } from "m"`:  names `a`, `B`, `c` (local `d`)
 * - `import * as X from "m"`, `export * as X from "m"`:  one namespace name, `X`
 * - `import X from "m"`:  the default export, `default` (local `X`)
 * - `export * from "m"`, `import "m"`:  no names
 * - Dynamic `import("m")` is left out.
 */
export function importsOf(text: string, file = MODULE_FILE): ImportStatement[] {
  return readTypeScript(file, text)
    .imports.filter((statement) => statement.kind !== "dynamic")
    .map(({ from, names, start }) => ({
      from,
      names: names.map(({ name, local, namespace }) => ({ name, local, ...(namespace && { namespace }) })),
      line: lineAt(text, start)
    }))
}

/** What `importsOf()` calls a text it isn't told the file of:  TypeScript. */
const MODULE_FILE = "module.ts"

/**
 * The file a package-name import means, relative to the checkout's root:  `spell/util/node/json5` =>
 * `src/util/node/json5.ts`;  `spell/ui/components/ui-button` => `ui/src/components/ui-button/index.tsx`.
 * - `exists`:  whether a file is there, relative to the checkout's root
 * - the shapes tried are the package's `exports` (the kit's `AGENTS.md`, "Imports across repos"):  `.ts`, `.tsx`,
 *   a folder's `index.ts` / `index.tsx`, or the name as written
 * - `undefined`:  not one of `repos`' packages (a library, `./Peer`), or no file there
 */
export function moduleFileFor(
  from: string,
  repos: MappedRepo[],
  exists: (path: string) => boolean
): string | undefined {
  // the longest name first:  `spell/ui/x` is the ui folder's, not the kit's `src/ui/x`
  const repo = [...repos]
    .sort((a, b) => b.packageName.length - a.packageName.length)
    .find((each) => from === each.packageName || from.startsWith(`${each.packageName}/`))
  if (!repo) return undefined
  const rest = from.slice(repo.packageName.length + 1).replace(/\.tsx?$/, "")
  const base = [repo.folder, "src", rest].filter(Boolean).join("/")
  const tries = rest ? [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`, base] : INDEXES(base)
  return tries.find(exists)
}

/** A bare symbol name from a graphify label:  `readJSON5File()` => `readJSON5File`, `.getAt()` => `getAt`. */
export function bareName(label: string): string {
  return label.replace(/^\./, "").replace(/\(\)$/, "")
}

/** A package's own index files, for an import of its bare name (`spell-brand`). */
const INDEXES = (base: string) => [`${base}/index.ts`, `${base}/index.tsx`]

/** The line `index` is on in `text`, from 1. */
function lineAt(text: string, index: number): number {
  let line = 1
  for (let at = text.indexOf("\n"); at !== -1 && at < index; at = text.indexOf("\n", at + 1)) line++
  return line
}
