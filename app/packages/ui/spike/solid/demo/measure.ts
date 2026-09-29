/**
 * Bundle table for `REPORT.md`:  gzip (zlib level 9) of every chunk `yarn build` emitted, and the cost of each
 * library entry = its STATIC import closure, with Solid (`solid-runtime`), the `UI` runtime and icon data
 * listed apart.
 * - Run after `yarn build`:  `yarn measure`.  Prints JSON and writes `.cache/bundle.json`.
 * - Static closure:  `import … from "./x.js"` / `import "./x.js"` edges between emitted chunks;  dynamic
 *   `import()`s (the runtime, icon data) are not followed.
 */

import { gzipSync } from "node:zlib"
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const DIST = `${ROOT}dist/`
const ENTRIES = ["button", "dropdown", "icon", "label", "parts", "divider", "segment", "container"]

/** gzip kB and raw kB per emitted file. */
const sizes = new Map<string, { kB: number; gz: number }>()
/** Static imports per emitted file. */
const edges = new Map<string, string[]>()
for (const file of readdirSync(DIST).filter((name) => name.endsWith(".js"))) {
  const code = readFileSync(DIST + file)
  sizes.set(file, { kB: round(code.length / 1000), gz: round(gzipSync(code, { level: 9 }).length / 1000) })
  const text = code.toString()
  const imports = [...text.matchAll(/(?:^|[;\n}])\s*import\s*(?:[^"'()]*?from\s*)?["']\.\/([^"']+)["']/g)]
  edges.set(file, [...new Set(imports.map((match) => match[1]!))])
}

const RUNTIME = /^solid-runtime-/
const entries: Record<string, unknown> = {}
const all = new Set<string>()
for (const entry of ENTRIES) {
  const closure = closureOf(`${entry}.js`)
  for (const file of closure) all.add(file)
  entries[entry] = summarize(closure)
}

const result = {
  chunks: Object.fromEntries([...sizes].sort((a, b) => b[1].gz - a[1].gz)),
  entries,
  batch1: summarize(new Set([...all].filter((file) => !/^(button|dropdown)/.test(file)))),
  all: summarize(all)
}
mkdirSync(`${ROOT}.cache`, { recursive: true })
writeFileSync(`${ROOT}.cache/bundle.json`, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))

/** Every file `file` loads statically, itself included. */
function closureOf(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen
  seen.add(file)
  for (const next of edges.get(file) ?? []) closureOf(next, seen)
  return seen
}

/** gzip totals of `files`, with and without Solid. */
function summarize(files: Set<string>) {
  let gz = 0
  let solid = 0
  for (const file of files) {
    const size = sizes.get(file)?.gz ?? 0
    if (RUNTIME.test(file)) solid += size
    else gz += size
  }
  return { files: [...files].sort(), gzWithoutSolid: round(gz), solid: round(solid), gzTotal: round(gz + solid) }
}

/** Two decimals. */
function round(value: number) {
  return Math.round(value * 100) / 100
}
