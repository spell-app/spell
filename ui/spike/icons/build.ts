/**
 * Generates everything the experiment serves into `dist/`:
 * - `dist/icons/<style>/<name>.js`   candidate 2, one ES module per icon, from Font Awesome 7 metadata
 * - `dist/svg/<style>/<name>.svg`    candidate 3, copied byte-for-byte from `@fortawesome/fontawesome-free`
 * - `dist/a/*.js`, `dist/b/*.js`     the four `x-icon-*` elements, bundled twice (b = a second app on the same page)
 * - `dist/build-info.json`           what `measure.ts` needs to attribute files (data chunks, versions, counts)
 * Run with `yarn build`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "vite"

import { ICONS, SOURCE } from "./icon-list.ts"

/** Package root. */
const HERE = fileURLToPath(new URL("./", import.meta.url))
/** Font Awesome styles Free ships. */
const STYLES = ["solid", "regular", "brands"] as const

/** Font Awesome metadata entry, trimmed to what this script reads (same shape `scripts/gen-icons.ts` reads). */
type FaMetadata = Record<
  string,
  { free?: string[]; svg: Record<string, { width: number; height: number; path: string | string[] }> }
>

/** The four-candidate asset builder. */
export class ExperimentBuild {
  private readonly dist = path.join(HERE, "dist")
  private readonly fa = path.join(HERE, "node_modules/@fortawesome/fontawesome-free")

  async run(): Promise<void> {
    rmSync(this.dist, { recursive: true, force: true })
    mkdirSync(this.dist, { recursive: true })
    const metadata = await this.loadMetadata()
    const modules = this.writeModules(metadata)
    const svgs = this.copySvgs()
    const chunks: string[] = []
    for (const copy of ["a", "b"]) chunks.push(...(await this.bundle(copy)))
    this.checkList(metadata)
    const info = {
      fontAwesome: JSON.parse(readFileSync(path.join(this.fa, "package.json"), "utf8")).version as string,
      modules,
      svgs,
      dataChunks: [...new Set(chunks)].sort()
    }
    writeFileSync(path.join(this.dist, "build-info.json"), JSON.stringify(info, null, 2))
    console.log(
      `built:  FA ${info.fontAwesome}, ${modules.total} modules, ${svgs.total} svgs, ${info.dataChunks.length} data chunks`
    )
  }

  /**
   * Font Awesome `icons.json`:  `gen-icons.ts`'s cache if present, else the copy inside the npm package (same
   * version), else downloaded to that cache path.  Never written into the repo.
   */
  private async loadMetadata(): Promise<FaMetadata> {
    const cache = process.env.FA_METADATA_PATH ?? path.join(tmpdir(), "spell-ui-fa7-icons.json")
    const packaged = path.join(this.fa, "metadata/icons.json")
    const source = existsSync(cache) ? cache : existsSync(packaged) ? packaged : undefined
    if (source) return JSON.parse(readFileSync(source, "utf8")) as FaMetadata
    const url = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/7.x/metadata/icons.json"
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url}: ${response.status}`)
    const text = await response.text()
    writeFileSync(cache, text)
    return JSON.parse(text) as FaMetadata
  }

  /** Candidate 2:  `export default [w, h, "path"]` per free icon, same selection rule as `buildStyleData()`. */
  private writeModules(metadata: FaMetadata): { total: number } & Record<string, number> {
    const counts: Record<string, number> = {}
    let total = 0
    for (const style of STYLES) {
      const directory = path.join(this.dist, "icons", style)
      mkdirSync(directory, { recursive: true })
      counts[style] = 0
      for (const [name, entry] of Object.entries(metadata)) {
        const svg = entry.svg[style]
        if (!entry.free?.includes(style) || !svg) continue
        const data = Array.isArray(svg.path) ? svg.path.join(" ") : svg.path
        writeFileSync(
          path.join(directory, `${name}.js`),
          `export default ${JSON.stringify([svg.width, svg.height, data])}\n`
        )
        counts[style]!++
        total++
      }
    }
    return { total, ...counts }
  }

  /** Candidate 3:  every `svgs/<style>/*.svg` the npm package ships, untouched (comment included). */
  private copySvgs(): { total: number } & Record<string, number> {
    const counts: Record<string, number> = {}
    let total = 0
    for (const style of STYLES) {
      const from = path.join(this.fa, "svgs", style)
      const to = path.join(this.dist, "svg", style)
      mkdirSync(to, { recursive: true })
      const files = readdirSync(from).filter((file) => file.endsWith(".svg"))
      for (const file of files) copyFileSync(path.join(from, file), path.join(to, file))
      counts[style] = files.length
      total += files.length
    }
    return { total, ...counts }
  }

  /** Fails loudly if a listed icon has no module or SVG (a rename in a newer Font Awesome). */
  private checkList(metadata: FaMetadata): void {
    for (const icon of ICONS) {
      const free = metadata[icon.name]?.free ?? []
      if (!free.includes(icon.variant)) throw new Error(`icon list: ${icon.name} is not free in ${icon.variant}`)
      for (const file of [`icons/${icon.variant}/${icon.name}.js`, `svg/${icon.variant}/${icon.name}.svg`]) {
        if (!existsSync(path.join(this.dist, file))) throw new Error(`icon list: missing ${file}`)
      }
    }
  }

  /**
   * One Vite library build of all four elements into `dist/<copy>/`.
   * - `b` gets the tag suffix `-b`, so both copies can share a page (each a separate app with its own state).
   * - Returns the chunk files generated from `src/icons/data/*.json` (`today`'s data), relative to `dist/`.
   */
  private async bundle(copy: string): Promise<string[]> {
    const input = Object.fromEntries(
      Object.entries(SOURCE).map(([id, file]) => [id, path.join(HERE, "src", `${file}.ts`)])
    )
    const result = await build({
      root: HERE,
      configFile: false,
      logLevel: "warn",
      publicDir: false,
      resolve: { alias: [{ find: /^\$\//, replacement: path.resolve(HERE, "../../src") + "/" }] },
      define: { __SUFFIX__: JSON.stringify(copy === "a" ? "" : `-${copy}`) },
      build: {
        outDir: path.join(this.dist, copy),
        emptyOutDir: false,
        target: "es2023",
        lib: { entry: input, formats: ["es"], fileName: (_format, name) => `${name}.js` },
        rolldownOptions: { output: { chunkFileNames: "chunks/[name]-[hash].js" } }
      }
    })
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((item) => ("output" in item ? item.output : []))
    return outputs
      .filter((item) => item.type === "chunk" && item.moduleIds.some((id) => id.includes("/src/icons/data/")))
      .map((item) => `${copy}/${item.fileName}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await new ExperimentBuild().run()
