/// <reference types="node" />

/**
 * Bundle breakdown for `REPORT.md`:  builds the library in memory (same config as `yarn build`) and reports
 * - every chunk, raw / gzip, as emitted (Vite's lib-mode ES output keeps whitespace)
 * - the same chunks fully minified (esbuild `minify`), since that's what an app bundler would ship
 * - each component family ALONE (a build with just its entry):  the entry chunk plus its STATIC imports,
 *   minus the lazily-loaded `UIRuntime` chunk and icon data, and its own modules (classes, sheet, vocabulary)
 * - "ui-button + ui-dropdown" and "all components":  the same closure over several entries of one build
 * - a per-module breakdown of those closures (lit, spike elements, foundation, CSS, icon alias maps)
 * `yarn measure`;  writes `measure-results.json`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"
import { transform } from "esbuild"
import { build, type Rolldown } from "vite"

import { COMPONENTS } from "./vite.config.ts"

/** Group name of the icon alias JSON `Icons.ts` imports statically (icon data, excluded from component cost). */
const ALIAS_MAPS = "icon alias maps (static JSON)"

/** Absolute path of the spike's `src/`. */
const SPIKE = fileURLToPath(new URL("./src", import.meta.url))

const all = await measure()
const entries = COMPONENTS.map((name) => `${name}.js`)
const alone: Record<string, unknown> = {}
for (const name of COMPONENTS) {
  const single = await measure({ [name]: `${SPIKE}/components/${name}/index.ts` })
  const closure = await single.closure([`${name}.js`])
  const modules = await single.modules([`${name}.js`])
  alone[name] = { ...closure, files: undefined, own: own(name, modules) }
}
const report: Record<string, unknown> = {
  chunks: all.chunks,
  "each component alone (single-entry build)": alone,
  "ui-button + ui-dropdown": all.closure(["button.js", "dropdown.js"]),
  "all components": all.closure(entries),
  "modules, ui-button alone": (await measure({ button: `${SPIKE}/components/button/index.ts` })).modules(["button.js"]),
  "modules, all components": all.modules(entries)
}
for (const [key, value] of Object.entries(report)) report[key] = await value
console.log(JSON.stringify(report, null, 2))
writeFileSync("measure-results.json", JSON.stringify(report, null, 2))

/** Build `entries` (default:  the config's) in memory;  helpers over its chunks. */
async function measure(entries?: Record<string, string>) {
  const result = (await build({
    configFile: "vite.config.ts",
    logLevel: "silent",
    build: { write: false, ...(entries ? { lib: { entry: entries, formats: ["es"] } } : {}) }
  })) as Rolldown.RolldownOutput | Rolldown.RolldownOutput[]
  const output = (Array.isArray(result) ? result[0]! : result).output.filter(
    (item): item is Rolldown.OutputChunk => item.type === "chunk"
  )
  const byName = new Map(output.map((chunk) => [chunk.fileName, chunk]))
  const chunks = Promise.all(
    output.map(async (chunk) => ({
      file: chunk.fileName,
      raw: chunk.code.length,
      gzip: gzip(chunk.code),
      minGzip: gzip(await minify(chunk.code)),
      lazy: isLazy(chunk.fileName)
    }))
  )
  return {
    chunks,
    closure: (files: string[]) => closure(byName, files),
    modules: (files: string[]) => breakdown(byName, files)
  }
}

/** Entry chunks + static imports, minus lazy chunks:  total gzip as emitted and minified. */
async function closure(byName: Map<string, Rolldown.OutputChunk>, entries: string[]) {
  const files = new Set<string>()
  const visit = (file: string) => {
    if (files.has(file) || isLazy(file)) return
    files.add(file)
    for (const imported of byName.get(file)?.imports ?? []) visit(imported)
  }
  entries.forEach(visit)
  const code = [...files].map((file) => byName.get(file)!.code)
  const minified = await Promise.all(code.map(minify))
  const groups = await breakdown(byName, entries)
  const aliasMaps = groups[ALIAS_MAPS]?.minGzip ?? 0
  const minGzip = minified.reduce((sum, text) => sum + gzip(text), 0)
  return {
    files: [...files],
    gzip: code.reduce((sum, text) => sum + gzip(text), 0),
    minGzip,
    minGzipWithoutIconAliasMaps: minGzip - aliasMaps
  }
}

/** Minified size per module group across the static closure of `entries`. */
async function breakdown(byName: Map<string, Rolldown.OutputChunk>, entries: string[]) {
  const groups = new Map<string, string[]>()
  const seen = new Set<string>()
  const visit = (file: string) => {
    if (seen.has(file) || isLazy(file)) return
    seen.add(file)
    const chunk = byName.get(file)!
    for (const [id, module] of Object.entries(chunk.modules)) {
      const group = groupOf(id)
      groups.set(group, [...(groups.get(group) ?? []), module.code ?? ""])
    }
    chunk.imports.forEach(visit)
  }
  entries.forEach(visit)
  const rows: Record<string, { min: number; minGzip: number }> = {}
  for (const [group, code] of groups) {
    const minified = await minify(code.join("\n"))
    rows[group] = { min: minified.length, minGzip: gzip(minified) }
  }
  return rows
}

/**
 * A component's OWN cost:  min+gz of its spike classes, its sheet and its vocabulary, each gzipped alone
 * (so the sum overstates a little).
 */
function own(name: string, modules: Record<string, { min: number; minGzip: number }>) {
  const mine = [`spike ${name}`, `css: ${name}.css`, `vocabulary: ${name}`]
  const rows = Object.fromEntries(Object.entries(modules).filter(([group]) => mine.includes(group)))
  return { ...rows, total: Object.values(rows).reduce((sum, row) => sum + row.minGzip, 0) }
}

/** Which bucket a module id belongs to. */
function groupOf(id: string): string {
  if (/node_modules\/(lit|lit-html|lit-element|@lit)\//.test(id)) return "lit"
  if (id.includes("/spike/lit/src/elements/")) return "spike elements (UIElement, ContentPart ...)"
  const component = /\/spike\/lit\/src\/components\/(\w+)\//.exec(id)?.[1]
  if (component) return `spike ${component}`
  if (/\.css/.test(id)) return `css: ${id.split("/").pop()!.split("?")[0]}`
  if (id.includes("/src/icons/data/")) return ALIAS_MAPS
  if (id.includes("/src/icons/")) return "foundation: $/icons (Icons.ts)"
  const vocabulary = /\/src\/components\/(\w+)\/\w+\.vocabulary/.exec(id)?.[1]
  if (vocabulary) return `vocabulary: ${vocabulary}`
  if (id.includes("/src/components/")) return "foundation: components.types"
  const folder = /\/src\/(\w+)\//.exec(id)?.[1]
  return folder ? `foundation: $/${folder}` : id
}

/** Lazily-loaded chunks:  the runtime and icon data. */
function isLazy(file: string) {
  return /^(UIRuntime|solid|regular|brands|search)[-.]/.test(file)
}

function gzip(text: string) {
  return gzipSync(text, { level: 9 }).length
}

async function minify(code: string) {
  return (await transform(code, { minify: true, format: "esm", loader: "js" })).code
}
