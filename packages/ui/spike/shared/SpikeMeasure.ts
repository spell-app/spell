/// <reference types="node" />

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import { gzipSync } from "node:zlib"
import { transform } from "esbuild"
import type { InlineConfig, Plugin, Rolldown, UserConfig } from "vite"

import type {
  Bucket,
  ChunkSize,
  FamilyNeeds,
  MeasureChecks,
  MeasureResults,
  OwnKind,
  OwnSize,
  Scenario,
  ScenarioName,
  SharedEntry,
  SharedSize,
  Size,
  SpikeConfig
} from "./shared.types.ts"

/**
 * Bundle measurer shared by every spike, so the numbers are comparable:  same build, same buckets, same units.
 * - Builds the spike's library IN MEMORY (`write: false`) with its own Vite config, entries overridden to the
 *   shared entries (`core`, and e.g. `forms`) + one per family, and attributes every emitted module to a bucket
 *   (`SpikeConfig.groups`).
 * - Sizes:  esbuild `transform({ minify: true })`, then gzip level 9;  kB = 1000 bytes.  Each tier is minified
 *   and gzipped ON ITS OWN, as a page fetches them as separate files, so a scenario is a sum of tiers.
 * - Tiers:
 *   - `library` -- the peer set AS USED:  exactly the bindings `dist/` imports from each peer specifier, bundled
 *     ONCE and tree-shaken (it's external in the build);  what the scenarios add
 *   - `libraryFull` -- every export of the peer set (`peerEntry` bundled as is), for comparison
 *   - `shared[name]` -- each shared entry:  `core` (element core + foundation JS), e.g. `forms`
 *   - `own[family]` -- that family's classes + `<name>.css` + vocabulary + native fallback
 *   - lazy chunks (`UIRuntime`, icon data) listed apart
 *   - `standalone` -- each family built ALONE with the library bundled:  the old per-family way, for comparison
 * - Scenarios add, per family, only the shared entries its chunk actually imports (`families`):  a page with a
 *   button pays for `core`, a page with a dropdown for `core` + `forms`.
 * - Also checks `dist/`'s structure (`MeasureChecks`):  every family imports core, no shared-entry / library
 *   code elsewhere, nothing unattributed.
 * - `yarn measure` in a spike:  `await new SpikeMeasure(config).write()`.
 */
export class SpikeMeasure {
  /** what the report says the numbers mean */
  static readonly UNITS = "bytes;  min = esbuild minify, gzip = gzip level 9 of min;  kB = 1000 bytes"

  readonly config: SpikeConfig
  /** the spike's Vite config file, loaded once */
  private fileConfig: Promise<UserConfig> | undefined

  constructor(config: SpikeConfig) {
    this.config = config
  }

  ////////////////
  // ## Run
  ////////////////

  /** Measure, print a summary, write `measure-results.json` in the spike root;  resolves with the results. */
  async write(file = "measure-results.json"): Promise<MeasureResults> {
    const results = await this.measure()
    writeFileSync(join(this.config.root, file), `${JSON.stringify(results, null, 2)}\n`)
    const kB = (bytes: number) => (bytes / 1000).toFixed(2)
    const shared = Object.entries(results.shared ?? {}).map(([name, size]) => `${name} ${kB(size.gzip)}`)
    const full = results.libraryFull ? ` (full ${kB(results.libraryFull.gzip)})` : ""
    console.log(`${this.config.name}:  library ${kB(results.library.gzip)}${full}  ${shared.join("  ")} kB`)
    for (const [family, own] of Object.entries(results.own)) {
      console.log(`  own ${family} ${kB(own.gzip)} kB  (+ ${results.families?.[family]?.shared.join(" + ")})`)
    }
    for (const [name, scenario] of Object.entries(results.scenarios)) console.log(`  ${name}:  ${kB(scenario.gzip)} kB`)
    const failed = Object.entries(results.checks).filter(([, value]) => (value as string[]).length)
    for (const [check, ids] of failed) console.warn(`  CHECK ${check}:`, ids)
    return results
  }

  /** Build, bucket and size everything. */
  async measure(): Promise<MeasureResults> {
    const { config } = this
    const families = Object.keys(config.entries)
    const sharedEntries = this.sharedEntries()
    const output = await this.build(this.entries())
    const chunks = output.filter((item): item is Rolldown.OutputChunk => item.type === "chunk")
    const lazyFiles = SpikeMeasure.lazyFiles(chunks)
    const sharedChunks = new Map<string, Rolldown.OutputChunk>()
    for (const { name } of sharedEntries) {
      const chunk = chunks.find((item) => item.isEntry && item.name === name)
      if (!chunk) throw new Error(`SpikeMeasure:  the build emitted no \`${name}\` entry chunk`)
      sharedChunks.set(name, chunk)
    }
    const core = sharedChunks.get(sharedEntries[0]!.name)!

    const byBucket = new Map<Bucket, string[]>()
    const checks: MeasureChecks = {
      entriesMissingCore: [],
      coreOutsideCore: [],
      libraryBundled: [],
      lazyInEager: [],
      unattributed: [],
      peersMissing: []
    }
    for (const chunk of chunks) {
      const lazy = lazyFiles.has(chunk.fileName)
      for (const [id, module] of Object.entries(chunk.modules)) {
        const code = module.code ?? ""
        if (!code.trim()) continue
        const bucket = this.bucket(id)
        byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), code])
        const shared = bucket.startsWith("shared:") ? sharedChunks.get(bucket.slice("shared:".length)) : undefined
        if (bucket.startsWith("shared:") && chunk !== shared) checks.coreOutsideCore.push(id)
        if (bucket === "library") checks.libraryBundled.push(id)
        if ((bucket === "runtime" || bucket === "icons") && !lazy) checks.lazyInEager.push(id)
        if (bucket === "other") checks.unattributed.push(id)
      }
    }
    for (const family of families) {
      const entry = chunks.find((chunk) => chunk.isEntry && chunk.name === family)
      if (!entry?.imports.includes(core.fileName)) checks.entriesMissingCore.push(family)
    }

    const size = (bucket: Bucket) => this.size(byBucket.get(bucket) ?? [])
    const own: Record<string, OwnSize> = {}
    for (const family of families) {
      const kinds = {} as Record<OwnKind, Size>
      const all: string[] = []
      for (const kind of ["classes", "css", "vocabulary", "fallback"] as const) {
        const code = byBucket.get(`own:${family}:${kind}`) ?? []
        all.push(...code)
        kinds[kind] = await this.size(code)
      }
      own[family] = { ...(await this.size(all)), ...kinds, modules: [] }
    }
    for (const chunk of chunks) {
      for (const id of Object.keys(chunk.modules)) {
        const match = /^own:([^:]+):/.exec(this.bucket(id))
        if (match && own[match[1]!]) own[match[1]!]!.modules.push(SpikeMeasure.shortId(id))
      }
    }

    const peers = await this.library(SpikeMeasure.importedBindings(chunks.map((chunk) => chunk.code)))
    const library = peers.used
    const files = new Set(chunks.map((chunk) => chunk.fileName))
    const external = new Set(chunks.flatMap((chunk) => chunk.imports).filter((specifier) => !files.has(specifier)))
    checks.peersMissing = [...external].filter((specifier) => !library.specifiers.includes(specifier)).sort()
    const shared: Record<string, SharedSize> = {}
    for (const { name, entry, description } of sharedEntries) {
      shared[name] = { ...(await size(`shared:${name}`)), entry, ...(description ? { description } : {}) }
    }
    const needs = this.families(chunks, sharedChunks, library, shared, own)
    const results: MeasureResults = {
      spike: config.name,
      date: new Date().toISOString().slice(0, 10),
      units: SpikeMeasure.UNITS,
      versions: this.versions(library.specifiers),
      library,
      libraryFull: peers.full,
      core: { min: shared[sharedEntries[0]!.name]!.min, gzip: shared[sharedEntries[0]!.name]!.gzip },
      shared,
      own,
      families: needs,
      scenarios: this.scenarios(library, shared, own, needs),
      standalone: await this.standalone(),
      lazy: { runtime: await size("runtime"), icons: await size("icons") },
      chunks: await Promise.all(
        chunks.map(async (chunk): Promise<ChunkSize> => ({
          file: chunk.fileName,
          lazy: lazyFiles.has(chunk.fileName),
          imports: chunk.imports,
          ...(await this.size([chunk.code]))
        }))
      ),
      checks
    }
    return results
  }

  ////////////////
  // ## Builds
  ////////////////

  /**
   * A build of the spike's library, in memory, with exactly `entry` as its lib entries.
   * - The spike's config file is loaded ONCE and passed with `configFile: false`:  passing the file plus inline
   *   overrides would `mergeConfig()` them, which UNIONS `lib.entry` objects instead of replacing them.
   * - `bundlePeers` drops `external`, for the standalone builds.
   */
  private async build(
    entry: Record<string, string>,
    bundlePeers = false
  ): Promise<(Rolldown.OutputChunk | Rolldown.OutputAsset)[]> {
    const { config } = this
    this.fileConfig ??= this.loadFileConfig()
    const file = await this.fileConfig
    const lib = typeof file.build?.lib === "object" ? file.build.lib : {}
    const inline = {
      ...file,
      root: config.root,
      configFile: false,
      logLevel: "silent",
      build: {
        ...file.build,
        write: false,
        lib: {
          ...lib,
          entry: Object.fromEntries(Object.entries(entry).map(([name, path]) => [name, this.path(path)])),
          formats: ["es"]
        },
        rolldownOptions: { ...file.build?.rolldownOptions, ...(bundlePeers ? { external: undefined } : {}) }
      }
    } satisfies InlineConfig
    const result = (await config.vite.build(inline)) as Rolldown.RolldownOutput | Rolldown.RolldownOutput[]
    return (Array.isArray(result) ? result[0]! : result).output
  }

  /** The spike's Vite config file, as its default export resolves for `vite build`. */
  private async loadFileConfig(): Promise<UserConfig> {
    const { config } = this
    const file = this.path(config.configFile ?? "vite.config.ts")
    const loaded = await config.vite.loadConfigFromFile({ command: "build", mode: "production" }, file, config.root)
    if (!loaded) throw new Error(`SpikeMeasure:  can't load ${file}`)
    return loaded.config as UserConfig
  }

  /** The measured build's entries:  the shared ones + one per family. */
  private entries(): Record<string, string> {
    const shared = this.sharedEntries().map(({ name, entry }) => [name, entry])
    return { ...Object.fromEntries(shared), ...this.config.entries }
  }

  /**
   * `config.shared`, or the one-entry shorthand `coreEntry`.
   * - Throws when neither is given.
   */
  sharedEntries(): SharedEntry[] {
    const { shared, coreEntry } = this.config
    if (shared?.length) return shared
    if (coreEntry) return [{ name: "core", entry: coreEntry }]
    throw new Error("SpikeMeasure:  the spike config needs `shared` (or `coreEntry`)")
  }

  /**
   * `config.groups(id)`, with `core` normalized to the first shared entry's bucket (`shared:core`), so a spike
   * with one entry can keep returning `core`.
   */
  private bucket(id: string): Bucket {
    const bucket = this.config.groups(id)
    return bucket === "core" ? `shared:${this.sharedEntries()[0]!.name}` : bucket
  }

  /**
   * STANDALONE cost:  each family built alone with the library BUNDLED (tree-shaken), eager chunks only -- the
   * pre-shared-runtime way of measuring ("alone"), kept for comparison.  Plus `all families` in one build.
   * - Each eager chunk is minified and gzipped on its own and summed, as a page fetches them.
   */
  private async standalone(): Promise<Record<string, Size>> {
    const sizes: Record<string, Size> = {}
    const builds: [string, Record<string, string>][] = [
      ...Object.entries(this.config.entries).map(([family, file]): [string, Record<string, string>] => [
        family,
        { [family]: file }
      ]),
      ["all families", this.config.entries]
    ]
    for (const [name, entry] of builds) {
      const chunks = (await this.build(entry, true)).filter(
        (item): item is Rolldown.OutputChunk => item.type === "chunk"
      )
      const lazy = SpikeMeasure.lazyFiles(chunks)
      const eager = await Promise.all(
        chunks.filter((chunk) => !lazy.has(chunk.fileName)).map((chunk) => this.size([chunk.code]))
      )
      sizes[name] = eager.reduce((sum, size) => ({ min: sum.min + size.min, gzip: sum.gzip + size.gzip }), {
        min: 0,
        gzip: 0
      })
    }
    return sizes
  }

  /**
   * The peer set, twice:  `used` -- only `bindings` (what `dist/` imports), tree-shaken;  `full` -- `peerEntry`
   * as is, every export.  Both bundled once, nothing external, no config file (plain JS packages).
   * - `define` pins `process.env.NODE_ENV` to production, as an app bundler would.
   * - `dedupe` on every peer package, as `PeerVendor` does:  a linked peer would otherwise bring its own copy of
   *   the others.
   * - A specifier in `peerEntry` that `dist/` never imports costs nothing in `used`.
   */
  private async library(bindings: Record<string, string[]>): Promise<{
    used: Size & { specifiers: string[]; bindings: Record<string, string[]> }
    full: Size
  }> {
    const specifiers = SpikeMeasure.specifiers(this.path(this.config.peerEntry))
    const used = Object.fromEntries(specifiers.filter((spec) => bindings[spec]).map((spec) => [spec, bindings[spec]!]))
    const { plugin, entry } = SpikeMeasure.virtualEntries({ used: SpikeMeasure.reexports(used) })
    return {
      used: { ...(await this.bundlePeers(specifiers, entry.used!, [plugin])), specifiers, bindings: used },
      full: await this.bundlePeers(specifiers, this.path(this.config.peerEntry))
    }
  }

  /** `entry` bundled with every peer package deduped, then sized (min + gzip). */
  private async bundlePeers(specifiers: string[], entry: string, plugins: Plugin[] = []): Promise<Size> {
    const { config } = this
    const result = (await config.vite.build({
      root: config.root,
      configFile: false,
      logLevel: "silent",
      plugins,
      resolve: { dedupe: [...new Set(specifiers.map((specifier) => SpikeMeasure.packageOf(specifier)))] },
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      build: {
        write: false,
        minify: false,
        lib: { entry: { peers: entry }, formats: ["es"] },
        rolldownOptions: { preserveEntrySignatures: "allow-extension" }
      }
    } satisfies InlineConfig)) as Rolldown.RolldownOutput | Rolldown.RolldownOutput[]
    const code = (Array.isArray(result) ? result[0]! : result).output
      .filter((item): item is Rolldown.OutputChunk => item.type === "chunk")
      .map((chunk) => chunk.code)
    return this.size(code)
  }

  ////////////////
  // ## Sizes, scenarios
  ////////////////

  /** min + gzip of `code` joined into one file. */
  private async size(code: string[]): Promise<Size> {
    if (!code.length) return { min: 0, gzip: 0 }
    const minified = (await transform(code.join("\n"), { minify: true, format: "esm", loader: "js" })).code
    return { min: minified.length, gzip: gzipSync(minified, { level: 9 }).length }
  }

  /**
   * Per family:  the shared entries its chunk statically reaches (directly, or through a sibling family's chunk),
   * and the cost of a page with only that family.
   */
  private families(
    chunks: Rolldown.OutputChunk[],
    sharedChunks: Map<string, Rolldown.OutputChunk>,
    library: Size,
    shared: Record<string, SharedSize>,
    own: Record<string, OwnSize>
  ): Record<string, FamilyNeeds> {
    const needs: Record<string, FamilyNeeds> = {}
    for (const family of Object.keys(this.config.entries)) {
      const entry = chunks.find((chunk) => chunk.isEntry && chunk.name === family)
      const reached = entry ? SpikeMeasure.staticClosure(chunks, [entry.fileName]) : new Set<string>()
      const names = [...sharedChunks].filter(([, chunk]) => reached.has(chunk.fileName)).map(([name]) => name)
      const page = library.gzip + names.reduce((sum, name) => sum + shared[name]!.gzip, 0) + (own[family]?.gzip ?? 0)
      needs[family] = { shared: names, page }
    }
    return needs
  }

  /**
   * The three scenarios, as sums of tiers;  shared entries only where a family in the scenario imports them.
   * - `page with one button` -- library + what `pageFamily` imports + its own
   * - `all families` -- library + every shared entry any family imports + every own
   * - `app already ships the library` -- the same without the library
   */
  private scenarios(
    library: Size,
    shared: Record<string, SharedSize>,
    own: Record<string, OwnSize>,
    needs: Record<string, FamilyNeeds>
  ): Record<ScenarioName, Scenario> {
    const page = this.config.pageFamily ?? "button"
    const families = Object.keys(own)
    const sum = (parts: string[]) =>
      parts.reduce((total, part) => {
        if (part === "library") return total + library.gzip
        if (part.startsWith("own:")) return total + (own[part.slice("own:".length)]?.gzip ?? 0)
        return total + (shared[part]?.gzip ?? 0)
      }, 0)
    const scenario = (parts: string[]): Scenario => ({ parts, gzip: sum(parts) })
    const used = new Set(families.flatMap((family) => needs[family]?.shared ?? []))
    const allShared = Object.keys(shared).filter((name) => used.has(name))
    const allOwn = families.map((family) => `own:${family}`)
    return {
      "page with one button": scenario(["library", ...(needs[page]?.shared ?? []), `own:${page}`]),
      "all families": scenario(["library", ...allShared, ...allOwn]),
      "app already ships the library": scenario([...allShared, ...allOwn])
    }
  }

  /** Installed version of each peer package, plus the measuring toolchain. */
  private versions(specifiers: string[]): Record<string, string> {
    const packages = new Set(specifiers.map((specifier) => SpikeMeasure.packageOf(specifier)))
    const versions: Record<string, string> = {}
    for (const name of packages) {
      const file = join(this.config.root, "node_modules", name, "package.json")
      if (existsSync(file)) versions[name] = (JSON.parse(readFileSync(file, "utf8")) as { version: string }).version
    }
    versions.vite = this.config.vite.version
    return versions
  }

  /** `file` resolved against the spike root. */
  private path(file: string): string {
    return isAbsolute(file) ? file : join(this.config.root, file)
  }

  ////////////////
  // ## Static helpers
  ////////////////

  /**
   * Default bucket for a module of the SHARED foundation (`<repo>/src/...`), for a spike's `groups` to fall back
   * on after classifying its own files;  `undefined` for anything else (spike files included).
   * - `components/<name>/<name>.css` => `own:<name>:css`;  `<name>.vocabulary.*` => `own:<name>:vocabulary`;
   *   `<name>.fallback.ts` => `own:<name>:fallback` (the family's native fallback)
   * - icon data (`icons/data/*.json`) => `icons`, but its loader table `icons/data/index.ts` is eager => `core`
   * - runtime services (everything in `runtime/` except the eager
   *   loader `load.ts` and `runtime.types.ts`) and the foundation sheets (`styles/`) => `runtime`
   * - any other `src/` module (incl. `\0` virtual helpers) => `core`
   * - NOTE: `family` maps a foundation component folder to the spike family that owns it, when they differ
   *   (they don't today).
   */
  static foundationBucket(id: string, family = (name: string) => name): Bucket | undefined {
    if (id.startsWith("\0")) return "core"
    if (id.includes("/spike/")) return undefined
    const src = /\/src\/(.+)$/.exec(id.split("?")[0]!)?.[1]
    if (!src) return undefined
    const component = /^components\/([\w-]+)\/([\w-]+)\.(css|vocabulary\.\w+\.ts|fallback\.ts)$/.exec(src)
    if (component) {
      const kind = component[3] === "css" ? "css" : component[3] === "fallback.ts" ? "fallback" : "vocabulary"
      return `own:${family(component[1]!)}:${kind}`
    }
    if (src === "icons/data/index.ts") return "core"
    if (src.startsWith("icons/data/")) return "icons"
    if (src.startsWith("runtime/") && !/^runtime\/(load|runtime\.types)\.ts$/.test(src)) return "runtime"
    if (src.startsWith("styles/")) return "runtime"
    return "core"
  }

  /** Peer specifiers `peerEntry` re-exports (`export * as x from "<spec>"`), in file order. */
  static specifiers(peerEntry: string): string[] {
    const text = readFileSync(peerEntry, "utf8")
    return [...text.matchAll(/^export \* as \w+ from "([^"]+)"/gm)].map((match) => match[1]!)
  }

  /**
   * Bindings each module in `code` imports (or re-exports) from a BARE specifier, merged and sorted:
   * `import { a as x, b } from "lit"` => `{ lit: ["a", "b"] }`.
   * - A namespace (`import * as x`, `export *`) => `"*"`;  a default import => `"default"`.
   * - Reads the emitted ES module statements (Rolldown prints plain `import ... from "..."`);  relative and
   *   absolute URLs (sibling chunks) are skipped, as are bare side-effect imports (`import "x"`:  no bindings).
   */
  static importedBindings(code: string[]): Record<string, string[]> {
    const found = new Map<string, Set<string>>()
    const pattern = /(?:^|[;\n}])\s*(import|export)\s*([^"';]*?)\s*from\s*["']([^"']+)["']/g
    for (const text of code) {
      for (const [, , clause, specifier] of text.matchAll(pattern)) {
        if (/^[./]|^[a-z]+:/.test(specifier!)) continue
        const names = found.get(specifier!) ?? new Set<string>()
        found.set(specifier!, names)
        if (clause!.includes("*")) names.add("*")
        const braces = /\{([^}]*)\}/.exec(clause!)?.[1]
        for (const item of braces?.split(",") ?? []) if (item.trim()) names.add(item.trim().split(/\s+/)[0]!)
        if (/^[\w$]+\s*(,|$)/.test(clause!.trim())) names.add("default")
      }
    }
    return Object.fromEntries(
      [...found].sort(([a], [b]) => a.localeCompare(b)).map(([spec, names]) => [spec, [...names].sort()])
    )
  }

  /**
   * One module re-exporting `bindings` of every specifier under unique names (`p0_0` ...), so a bundle keeps
   * exactly those;  a `"*"` specifier is re-exported whole (`export * as p0`).
   */
  static reexports(bindings: Record<string, string[]>): string {
    return Object.entries(bindings)
      .map(([specifier, names], index) => {
        const from = JSON.stringify(specifier)
        if (names.includes("*")) return `export * as p${index} from ${from}`
        return `export { ${names.map((name, i) => `${name} as p${index}_${i}`).join(", ")} } from ${from}`
      })
      .join("\n")
  }

  /**
   * Lib entries whose SOURCE is inline, since a lib entry must be a module id:  a plugin serving `sources[name]`,
   * and the matching `lib.entry` map (`name` => virtual id).
   * - NOTE: lib mode resolves entries against `root` first, so the marker is searched, not matched as a prefix.
   */
  static virtualEntries(sources: Record<string, string>): { plugin: Plugin; entry: Record<string, string> } {
    const plugin: Plugin = {
      name: "spell-virtual-entries",
      resolveId: (id) => (id.includes(VIRTUAL) ? `\0${id.slice(id.indexOf(VIRTUAL))}` : undefined),
      load: (id) => (id.startsWith(`\0${VIRTUAL}`) ? sources[id.slice(VIRTUAL.length + 1)] : undefined)
    }
    return { plugin, entry: Object.fromEntries(Object.keys(sources).map((name) => [name, `${VIRTUAL}${name}`])) }
  }

  /** npm package of a specifier:  `lit/decorators.js` => `lit`, `@solidjs/web` => `@solidjs/web`. */
  static packageOf(specifier: string): string {
    const parts = specifier.split("/")
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!
  }

  /** Chunks only reachable through dynamic `import()`:  everything outside the entries' static closure. */
  static lazyFiles(chunks: Rolldown.OutputChunk[]): Set<string> {
    const entries = chunks.filter((chunk) => chunk.isEntry).map((chunk) => chunk.fileName)
    const eager = SpikeMeasure.staticClosure(chunks, entries)
    return new Set(chunks.map((chunk) => chunk.fileName).filter((file) => !eager.has(file)))
  }

  /** Files of `start` and every chunk they statically import, transitively (external specifiers left out). */
  static staticClosure(chunks: Rolldown.OutputChunk[], start: string[]): Set<string> {
    const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
    const reached = new Set<string>()
    for (const file of start) visit(file)
    return reached

    /** Mark `file` and its static imports reached. */
    function visit(file: string) {
      if (reached.has(file) || !byName.has(file)) return
      reached.add(file)
      for (const imported of byName.get(file)!.imports) visit(imported)
    }
  }

  /** Module id without the repo prefix, for the JSON. */
  static shortId(id: string): string {
    return id.replace(/^.*?\/(src|spike)\//, "$1/").split("?")[0]!
  }
}

/** Prefix of `SpikeMeasure.virtualEntries()` module ids. */
const VIRTUAL = "spell-virtual:"
