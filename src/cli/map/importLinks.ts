import type { ImportStatement, MappedRepo } from "./map.types"

/**
 * Reading imports, and finding the file a package-name import means:  what graphify can't do for our repos.
 * - graphify links `./Peer` imports itself, but every other import of ours is by package name
 *   (`spell/util/node/json5`, `spell-ui/components/ui-button/UIButton`), which it leaves unresolved.
 * - Plain text, no TypeScript:  fast over 3,000 files, and wrong only on an import inside a string or comment.
 */

/**
 * Every import and re-export statement of `text`, in order.
 * - `import { a, type B, c as d } from "m"`:  names `a`, `B`, `c` (local `d`)
 * - `import * as X from "m"`, `export * as X from "m"`:  one namespace name, `X`
 * - `import X from "m"`:  the default export, `default` (local `X`)
 * - `export * from "m"`, `import "m"`:  no names
 * - Dynamic `import("m")` is left out.
 */
export function importsOf(text: string): ImportStatement[] {
  const found: ImportStatement[] = []
  for (const match of text.matchAll(IMPORT)) {
    const [, clause = "", from] = match
    found.push({ from: from!, names: namesOf(clause.trim()), line: lineAt(text, match.index ?? 0) })
  }
  return found
}

/**
 * The file a package-name import means, relative to the checkout's root:  `spell/util/node/json5` =>
 * `src/util/node/json5.ts`;  `spell-ui/components/ui-button` => `spell-ui/src/components/ui-button/index.tsx`.
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
  const repo = repos.find((each) => from === each.packageName || from.startsWith(`${each.packageName}/`))
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

/**
 * `import ... from "m"`, `export ... from "m"` and `import "m"`:  the clause, then the module.
 * - The clause takes no `;`, quote, `=` or parenthesis, so `export const a = "x"` and a function's body never match.
 */
const IMPORT = /^[ \t]*(?:import|export)\s+(?:type\s+)?(?:([^;"'`=()]*?)\s+from\s+)?["']([^"']+)["']/gm

/** A package's own index files, for an import of its bare name (`spell-brand`). */
const INDEXES = (base: string) => [`${base}/index.ts`, `${base}/index.tsx`]

/** The names an import clause takes:  `{ a, type B, c as d }`, `* as X`, `X`, `X, { a }`. */
function namesOf(clause: string): ImportStatement["names"] {
  if (!clause || clause === "*") return []
  const names: ImportStatement["names"] = []
  const star = /^\*\s+as\s+(\w+)/.exec(clause)
  if (star) return [{ name: star[1]!, local: star[1]!, namespace: true }]
  const braces = /\{([^}]*)\}/.exec(clause)
  const head = clause
    .replace(/\{[^}]*\}/, "")
    .replace(/,/g, " ")
    .trim()
  if (head && /^\w+$/.test(head)) names.push({ name: "default", local: head })
  for (const part of braces?.[1]?.split(",") ?? []) {
    const [name, local] = part
      .replace(/^\s*type\s+/, "")
      .trim()
      .split(/\s+as\s+/)
    if (name) names.push({ name, local: local ?? name })
  }
  return names
}

/** The line `index` is on in `text`, from 1. */
function lineAt(text: string, index: number): number {
  let line = 1
  for (let at = text.indexOf("\n"); at !== -1 && at < index; at = text.indexOf("\n", at + 1)) line++
  return line
}
