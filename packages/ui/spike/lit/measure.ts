/// <reference types="node" />

/**
 * Bundle breakdown for `REPORT.md`:  builds the library in memory (same config as `yarn build`) and reports
 * - every chunk, raw / gzip, as emitted (Vite's lib-mode ES output keeps whitespace)
 * - the same chunks fully minified (esbuild `minify`), since that's what an app bundler would ship
 * - "ui-button alone" and "ui-button + ui-dropdown":  the entry chunks plus their STATIC imports, minus the
 *   lazily-loaded `UIRuntime` chunk and icon data
 * - a per-module breakdown of that static closure (lit, spike elements, foundation, CSS, icon alias maps)
 * `yarn measure`;  writes `measure-results.json`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"
import { transform } from "esbuild"
import { build, type Rolldown } from "vite"

/** Group name of the icon alias JSON `Icons.ts` imports statically (icon data, excluded from component cost). */
const ALIAS_MAPS = "icon alias maps (static JSON)"

/** Absolute path of the spike's `src/`. */
const SPIKE = fileURLToPath(new URL("./src", import.meta.url))

const both = await measure()
const buttonOnly = await measure({ button: `${SPIKE}/components/button/index.ts` })
const report: Record<string, unknown> = {
  chunks: both.chunks,
  "ui-button alone (button-only build)": buttonOnly.closure(["button.js"]),
  "ui-button + ui-dropdown": both.closure(["button.js", "dropdown.js"]),
  "modules, ui-button alone": buttonOnly.modules(["button.js"]),
  "modules, ui-button + ui-dropdown": both.modules(["button.js", "dropdown.js"])
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

/** Which bucket a module id belongs to. */
function groupOf(id: string): string {
  if (/node_modules\/(lit|lit-html|lit-element|@lit)\//.test(id)) return "lit"
  if (id.includes("/spike/lit/src/elements/")) return "spike elements (UIElement, FormElement ...)"
  if (id.includes("/spike/lit/src/components/button/")) return "spike button (UIButton, UIButtons, UIOr)"
  if (id.includes("/spike/lit/src/components/dropdown/")) return "spike dropdown (UIDropdown, UIItem)"
  if (/\.css/.test(id)) return `css: ${id.split("/").pop()!.split("?")[0]}`
  if (id.includes("/src/icons/data/")) return ALIAS_MAPS
  if (id.includes("/src/icons/")) return "foundation: $/icons (Icons.ts)"
  if (id.includes("/src/components/")) return "foundation: vocabularies"
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
