/**
 * Generates `src/icons/data/*.json` from Font Awesome 7 Free's metadata plus Fomantic-UI's icon vocabulary.
 * - Run with `yarn tsx scripts/gen-icons.ts` (or `node --experimental-strip-types` / `yarn vite-node` if `tsx`
 *   is unavailable -- see `PAPERCUTS.md`).
 * - Downloads (and caches under the OS temp dir, NOT the repo) Font Awesome's `icons.json`, since it's ~6 MB
 *   and CC-BY-4.0/MIT rather than something we vendor -- see `src/icons/LICENSE.md`.
 * - Reads (never writes) `reference/Fomantic-UI/src/themes/default/elements/icon.variables`, the LESS source
 *   of Fomantic's `@icon-map` family, to derive Fomantic's OWN alias vocabulary (`setting` -> `gear`, etc).
 * - Outputs are plain JSON with no header -- comments aren't valid JSON, so the regeneration story lives in
 *   `docs/icons.md` instead.
 * - Types here are a deliberately minimal, LOCAL re-statement of Font Awesome's metadata shape:  this script
 *   runs standalone via `tsx`, outside the `$/*` alias graph `tsconfig.json` sets up for `src/`, so it can't
 *   import `$/icons` types without its own module resolution setup.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

////////////////
// ## Font Awesome metadata shape
////////////////

/** One `svg.<style>` entry in Font Awesome's `icons.json` -- `path` is an array only for duotone (not free). */
type FaSvgStyle = {
  width: number
  height: number
  path: string | string[]
}

/** One icon's entry in Font Awesome's `icons.json`, trimmed to the fields this script reads. */
type FaIconEntry = {
  unicode: string
  free?: string[]
  aliases?: {
    names?: string[]
    /** `primary` holds codepoints of icons FA merged INTO this one, e.g. `user` lists `user-large`'s `f406`. */
    unicodes?: { primary?: string[] }
  }
  search?: { terms?: string[] }
  svg: Partial<Record<IconStyle, FaSvgStyle>>
}

/** Font Awesome's `icons.json`, keyed by canonical (kebab-case) icon name. */
type FaMetadata = Record<string, FaIconEntry>

/** Mirrors `$/icons`' `IconStyle` -- kept in sync by hand since this script can't import it (see file docstring). */
type IconStyle = "solid" | "regular" | "brands"

/** Mirrors `$/icons`' `IconData` tuple. */
type IconTuple = readonly [width: number, height: number, path: string]

////////////////
// ## Generator
////////////////

/**
 * Builds every file under `src/icons/data/` from Font Awesome 7 Free + Fomantic-UI's icon vocabulary.
 * - One method per output file (plus the shared parsing steps), so `run()` reads as a table of contents.
 * - Stateless between runs:  every method takes what it needs and returns what it built, nothing is cached
 *   on `this` except the resolved filesystem paths.
 */
class IconGenerator {
  /** Font Awesome's own metadata source -- see file docstring for why it's cached outside the repo. */
  static readonly METADATA_URL = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/7.x/metadata/icons.json"

  /**
   * Byte budget per solid chunk, of the COMPACT JSON this script writes.
   * - Set well under the ~60 KB target because `yarn review`'s `oxfmt .` step reformats every generated
   *   JSON file it isn't told to skip -- and this repo's `.oxfmtrc.json` isn't ours to add an
   *   `ignorePatterns` entry to (outside this pipeline's file scope) -- see `PAPERCUTS.md`.  Each
   *   `[width, height, path]` tuple is long enough to force oxfmt to explode it across 5 lines, adding
   *   ~22 bytes/icon;  52 KB compact lands at ~57 KB once formatted, leaving margin under 60 KB either way
   *   (decimal or binary).
   * - NOTE: `.oxfmtrc.json` has since ignored `src/icons/data/`, so that margin is no longer needed --
   *   kept anyway so chunk file names don't churn.
   */
  static readonly MAX_CHUNK_BYTES = 52_000

  /**
   * Fomantic-UI class names that are genuine FA5 -> FA6+ renames Font Awesome's OWN `unicode` field can't
   * recover, because FA6 reassigned the codepoint (often to the plain ASCII character, e.g. `plus` -> `"+"`)
   * rather than keeping the legacy private-use codepoint Fomantic's LESS still references.  Each was verified
   * by hand against `icons.json` -- see `docs/icons.md`.  Keyed by the RAW (underscored) Fomantic class name.
   * - also holds a hand-picked stand-in for an icon FA dropped from Free (`vector_square`).
   */
  static readonly MANUAL_OVERRIDES: Record<string, string> = {
    cloud_download_alternate: "cloud-arrow-down",
    cloud_download: "cloud-arrow-down",
    cloud_upload_alternate: "cloud-arrow-up",
    cloud_upload: "cloud-arrow-up",
    desktop: "display",
    computer: "display",
    dashboard: "gauge",
    tachometer_alternate: "gauge",
    hospital_alternate: "hospital",
    medium_m: "medium",
    slack_hash: "slack",
    snapchat_ghost: "snapchat",
    telegram_plane: "telegram",
    font_awesome_flag: "font-awesome",
    add: "plus",
    dollar: "dollar-sign",
    usd: "dollar-sign",
    help: "question",
    warning: "exclamation",
    percentage: "percent",
    // NOTE: FA7 Free dropped `vector-square` outright -- chosen stand-in, not a rename.
    vector_square: "object-group"
  }

  /** Fomantic LESS maps to merge, in priority order (first definition of a name wins on conflict). */
  static readonly FOMANTIC_MAPS: { name: string; stripOutlineSuffix: boolean }[] = [
    { name: "icon-map", stripOutlineSuffix: false },
    { name: "icon-aliases-map", stripOutlineSuffix: false },
    { name: "icon-deprecated-map", stripOutlineSuffix: false },
    { name: "icon-outline-map", stripOutlineSuffix: true },
    { name: "icon-outline-aliases-map", stripOutlineSuffix: true },
    { name: "icon-brand-map", stripOutlineSuffix: false },
    { name: "icon-brand-aliases-map", stripOutlineSuffix: false }
  ]

  private readonly repoRoot: string
  private readonly dataDir: string
  private readonly fomanticVariablesPath: string
  private readonly metadataCachePath: string

  constructor() {
    this.repoRoot = fileURLToPath(new URL("..", import.meta.url))
    this.dataDir = path.join(this.repoRoot, "src/icons/data")
    this.fomanticVariablesPath = path.join(
      this.repoRoot,
      "reference/Fomantic-UI/src/themes/default/elements/icon.variables"
    )
    // NOTE: cached OUTSIDE the repo (OS temp dir) -- 6 MB of upstream metadata we don't vendor or commit.
    // Override with `FA_METADATA_PATH` to point at an already-downloaded copy (e.g. in a scratchpad).
    this.metadataCachePath = process.env.FA_METADATA_PATH ?? path.join(tmpdir(), "spell-ui-fa7-icons.json")
  }

  /** Runs the full pipeline and prints the size / alias report the task asks for. */
  async run() {
    mkdirSync(this.dataDir, { recursive: true })

    const metadata = await this.loadMetadata()
    const freeNames = new Set(Object.keys(metadata).filter((name) => (metadata[name].free?.length ?? 0) > 0))

    const solid = this.buildStyleData(metadata, "solid")
    const regular = this.buildStyleData(metadata, "regular")
    const brands = this.buildStyleData(metadata, "brands")

    const { index: solidIndex, chunks: solidChunks } = this.chunkSolid(solid)
    this.removeStaleChunks(Object.keys(solidChunks))
    const solidReport = this.writeJson("solid.json", solidIndex)
    const chunkReports = Object.entries(solidChunks).map(([file, data]) => this.writeJson(`${file}.json`, data))
    const regularReport = this.writeJson("regular.json", regular)
    const brandsReport = this.writeJson("brands.json", brands)

    const faAliases = this.buildFaAliases(metadata)
    const faAliasesReport = this.writeJson("aliases.json", faAliases)

    const fomanticText = readFileSync(this.fomanticVariablesPath, "utf8")
    const fomanticResult = this.buildFomanticAliases(fomanticText, metadata, freeNames)
    const fomanticReport = this.writeJson("fomantic-aliases.json", fomanticResult.aliases)

    const search = this.buildSearchIndex(metadata)
    const searchReport = search ? this.writeJson("search.json", search.terms) : undefined

    this.report({
      chunkReports,
      solidReport,
      regularReport,
      brandsReport,
      faAliasesReport,
      fomanticReport,
      searchReport,
      searchSkippedBytes: search ? undefined : this.searchIndexBytes(metadata),
      fomanticResult
    })
  }

  /**
   * Reads Font Awesome's `icons.json`, downloading it to `metadataCachePath` first if it's not there yet.
   * - A plain `fetch()` + `writeFileSync()` -- no retry/backoff, this is a one-off dev-time script.
   */
  private async loadMetadata(): Promise<FaMetadata> {
    if (!existsSync(this.metadataCachePath)) {
      console.log(`Downloading Font Awesome metadata to ${this.metadataCachePath} ...`)
      const response = await fetch(IconGenerator.METADATA_URL)
      if (!response.ok) throw new Error(`Failed to download ${IconGenerator.METADATA_URL}: ${response.status}`)
      writeFileSync(this.metadataCachePath, await response.text())
    }
    return JSON.parse(readFileSync(this.metadataCachePath, "utf8")) as FaMetadata
  }

  ////////////////
  // ## Per-style icon data
  ////////////////

  /** `{ name: [width, height, path] }` for every icon free in `style`, sorted by name for deterministic output. */
  private buildStyleData(metadata: FaMetadata, style: IconStyle): Record<string, IconTuple> {
    const data: Record<string, IconTuple> = {}
    const names = Object.keys(metadata).sort((a, b) => a.localeCompare(b))
    for (const name of names) {
      const entry = metadata[name]
      if (!entry.free?.includes(style)) continue
      const svg = entry.svg[style]
      if (!svg) continue
      const path = Array.isArray(svg.path) ? svg.path.join(" ") : svg.path
      data[name] = [svg.width, svg.height, path]
    }
    return data
  }

  /**
   * Splits `solid` (the ~1400-icon style) into ~60 KB chunks, grouped by name so a chunk covers a contiguous
   * alphabetic range (`solid-a-c`, `solid-co-cu`, ...) -- `Icons.get()` only ever fetches the one chunk a
   * lookup needs.
   * - Packs greedily in sorted order rather than by whole first-letter groups:  several single letters
   *   (`b`, `c`, `f`, `h`, `p`, `s`) hold enough icons on their own to blow the 60 KB budget, so a chunk
   *   boundary sometimes falls mid-letter -- the label then uses a 2-character prefix instead of 1.
   * - Returns both the chunk contents (to write) and the `{ name: chunkFile }` index (`solid.json`).
   */
  private chunkSolid(data: Record<string, IconTuple>) {
    const names = Object.keys(data)
    const groups: string[][] = []
    let current: string[] = []
    let currentBytes = 2 // "{}"
    for (const name of names) {
      const entryBytes = JSON.stringify(name).length + 1 + JSON.stringify(data[name]).length + 1
      if (current.length > 0 && currentBytes + entryBytes > IconGenerator.MAX_CHUNK_BYTES) {
        groups.push(current)
        current = []
        currentBytes = 2
      }
      current.push(name)
      currentBytes += entryBytes
    }
    if (current.length > 0) groups.push(current)

    const chunks: Record<string, Record<string, IconTuple>> = {}
    const index: Record<string, string> = {}
    const usedLabels = new Set<string>()
    for (const group of groups) {
      let label = `solid-${IconGenerator.chunkLabel(group)}`
      let suffix = 2
      while (usedLabels.has(label)) label = `solid-${IconGenerator.chunkLabel(group)}-${suffix++}`
      usedLabels.add(label)
      chunks[label] = Object.fromEntries(group.map((name) => [name, data[name]]))
      for (const name of group) index[name] = label
    }
    return { index, chunks }
  }

  /**
   * Deletes any existing `solid-*.json` chunk file NOT in `currentChunkFiles` -- chunk boundaries (and so
   * file names) shift between runs as Font Awesome adds/removes icons, and a stale chunk left on disk would
   * otherwise sit there unreferenced by `solid.json` forever, never cleaned up on its own.
   */
  private removeStaleChunks(currentChunkFiles: string[]) {
    const keep = new Set(currentChunkFiles.map((file) => `${file}.json`))
    for (const entry of readdirSync(this.dataDir)) {
      if (/^solid-.*\.json$/.test(entry) && !keep.has(entry)) unlinkSync(path.join(this.dataDir, entry))
    }
  }

  /** First/last name of a sorted chunk group -> a short alphabetic range label, e.g. `a-c`, `co`, `co-cu`. */
  private static chunkLabel(names: string[]) {
    const first = names[0]
    const last = names[names.length - 1]
    if (first[0] !== last[0]) return `${first[0]}-${last[0]}`
    const firstTwo = first.slice(0, 2)
    const lastTwo = last.slice(0, 2)
    return firstTwo === lastTwo ? firstTwo : `${firstTwo}-${lastTwo}`
  }

  ////////////////
  // ## Alias maps
  ////////////////

  /** Font Awesome's OWN alias names (`aliases.names`, e.g. `cog` -> `gear`) -> canonical FA7 name. */
  private buildFaAliases(metadata: FaMetadata): Record<string, string> {
    const aliases: Record<string, string> = {}
    const names = Object.keys(metadata).sort((a, b) => a.localeCompare(b))
    for (const name of names) {
      const entry = metadata[name]
      if (!entry.free?.length) continue
      for (const alias of entry.aliases?.names ?? []) aliases[alias] = name
    }
    return aliases
  }

  /**
   * Fomantic's class-name vocabulary -> canonical FA7 name, for every Fomantic name that doesn't already
   * equal its FA7 name.
   * - Matches by UNICODE CODEPOINT:  Fomantic's LESS maps are Font Awesome 5 class names pointing at FA5's
   *   private-use codepoints, which usually still identify the same icon in FA7's `unicode` field --
   *   or in `aliases.unicodes.primary`, where FA7 keeps the codepoints of icons it merged into another
   *   (`user-large` -> `user`).  Top-level `unicode` wins when both claim a codepoint.
   * - `MANUAL_OVERRIDES` win over the codepoint match;  failing both, falls back to treating
   *   the kebab-cased Fomantic name as already-correct
   *   (covers FA6 remapping a handful of "keyboard symbol" icons, like `asterisk`, onto their literal ASCII
   *   character -- codepoint matching can't follow that, but the NAME didn't change).
   * - Whatever's left after both is reported as unresolved rather than guessed at.
   */
  private buildFomanticAliases(text: string, metadata: FaMetadata, freeNames: Set<string>) {
    const merged = new Map<string, string>()
    for (const { name, stripOutlineSuffix } of IconGenerator.FOMANTIC_MAPS) {
      for (const [key, hex] of IconGenerator.parseLessMap(text, name)) {
        const finalKey = stripOutlineSuffix ? key.replace(/_outline$/, "") : key
        if (!merged.has(finalKey)) merged.set(finalKey, hex)
      }
    }

    const codeToName = new Map<string, string>()
    for (const [name, entry] of Object.entries(metadata)) {
      const code = entry.unicode?.toLowerCase()
      if (code && !codeToName.has(code)) codeToName.set(code, name)
    }
    // NOTE: second pass, so a merged-in codepoint never shadows an icon that still OWNS it.
    for (const [name, entry] of Object.entries(metadata)) {
      for (const code of entry.aliases?.unicodes?.primary ?? []) {
        if (!codeToName.has(code.toLowerCase())) codeToName.set(code.toLowerCase(), name)
      }
    }

    const aliases: Record<string, string> = {}
    const unresolved: { phrase: string; hex: string }[] = []
    let identicalCount = 0
    let overrideCount = 0
    let nameFallbackCount = 0
    for (const [key, hex] of merged) {
      const phrase = key.replace(/_/g, " ")
      const kebab = phrase.replace(/ /g, "-")
      let canonical: string | undefined
      if (key in IconGenerator.MANUAL_OVERRIDES) {
        canonical = IconGenerator.MANUAL_OVERRIDES[key]
        overrideCount++
      } else {
        const byCode = codeToName.get(hex)
        if (byCode && freeNames.has(byCode)) canonical = byCode
        else if (freeNames.has(kebab)) {
          canonical = kebab
          nameFallbackCount++
        }
      }
      if (!canonical) {
        unresolved.push({ phrase, hex })
        continue
      }
      if (kebab === canonical) identicalCount++
      else aliases[phrase] = canonical
    }

    return {
      aliases,
      mergedCount: merged.size,
      resolvedCount: merged.size - unresolved.length,
      identicalCount,
      overrideCount,
      nameFallbackCount,
      unresolved
    }
  }

  /** Parses one `@<mapName>: { key: "\\hex"; ... };` LESS map into `[underscored key, lowercase hex]` pairs. */
  private static parseLessMap(text: string, mapName: string): [string, string][] {
    const body = new RegExp(`@${mapName}:\\s*\\{([^}]*)\\}`, "s").exec(text)?.[1]
    if (!body) return []
    return [...body.matchAll(/(\w+):\s*"\\([0-9a-fA-F]{4,6})"/g)].map((match) => [match[1], match[2].toLowerCase()])
  }

  ////////////////
  // ## Search index (optional)
  ////////////////

  /**
   * Solid-only `name -> search terms`, capped at 5 terms/icon to fit the 100 KB budget once `oxfmt` reformats
   * it (same inflation issue as `MAX_CHUNK_BYTES` -- see its docstring) -- see `docs/icons.md`.
   */
  private static readonly SEARCH_TERMS_CAP = 5

  private buildSearchIndex(metadata: FaMetadata) {
    const terms: Record<string, string[]> = {}
    for (const [name, entry] of Object.entries(metadata)) {
      if (!entry.free?.includes("solid")) continue
      const list = entry.search?.terms?.slice(0, IconGenerator.SEARCH_TERMS_CAP)
      if (list?.length) terms[name] = list
    }
    const bytes = Buffer.byteLength(JSON.stringify(terms))
    if (bytes > 100_000) return undefined
    return { terms, bytes }
  }

  /** Uncapped search-index size, for the report when `buildSearchIndex()` skips (or would have needed to). */
  private searchIndexBytes(metadata: FaMetadata) {
    const terms: Record<string, string[]> = {}
    for (const [name, entry] of Object.entries(metadata)) {
      if (entry.free?.includes("solid") && entry.search?.terms?.length) terms[name] = entry.search.terms
    }
    return Buffer.byteLength(JSON.stringify(terms))
  }

  ////////////////
  // ## Output + report
  ////////////////

  /** Writes `data` as compact JSON (no whitespace -- these are runtime data, not source) and returns its size. */
  private writeJson(file: string, data: unknown) {
    const text = JSON.stringify(data)
    writeFileSync(path.join(this.dataDir, file), text)
    return { file, bytes: Buffer.byteLength(text) }
  }

  /** Prints the file-size table + alias-resolution counts the task asks the generator to report. */
  private report(args: {
    chunkReports: { file: string; bytes: number }[]
    solidReport: { file: string; bytes: number }
    regularReport: { file: string; bytes: number }
    brandsReport: { file: string; bytes: number }
    faAliasesReport: { file: string; bytes: number }
    fomanticReport: { file: string; bytes: number }
    searchReport: { file: string; bytes: number } | undefined
    searchSkippedBytes: number | undefined
    fomanticResult: ReturnType<IconGenerator["buildFomanticAliases"]>
  }) {
    const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`
    console.log("\n== Icon data written ==")
    for (const chunk of args.chunkReports) console.log(`  ${chunk.file}: ${kb(chunk.bytes)}`)
    console.log(`  ${args.solidReport.file} (index): ${kb(args.solidReport.bytes)}`)
    console.log(`  ${args.regularReport.file}: ${kb(args.regularReport.bytes)}`)
    console.log(`  ${args.brandsReport.file}: ${kb(args.brandsReport.bytes)}`)
    console.log(`  ${args.faAliasesReport.file}: ${kb(args.faAliasesReport.bytes)}`)
    console.log(`  ${args.fomanticReport.file}: ${kb(args.fomanticReport.bytes)}`)
    if (args.searchReport) console.log(`  ${args.searchReport.file}: ${kb(args.searchReport.bytes)}`)
    else console.log(`  search.json: SKIPPED (uncapped would be ${kb(args.searchSkippedBytes ?? 0)}, over 100 KB)`)

    const oversizeChunks = args.chunkReports.filter((chunk) => chunk.bytes > 61_440)
    if (oversizeChunks.length > 0) {
      console.warn(`  WARNING: ${oversizeChunks.length} chunk(s) still exceed ~60 KB:`, oversizeChunks)
    }

    const r = args.fomanticResult
    console.log("\n== Fomantic alias resolution ==")
    console.log(`  merged Fomantic class names: ${r.mergedCount}`)
    console.log(
      `  resolved: ${r.resolvedCount} (${r.identicalCount} identical, ${Object.keys(r.aliases).length} aliased,`
    )
    console.log(`            ${r.overrideCount} via MANUAL_OVERRIDES, ${r.nameFallbackCount} via name fallback)`)
    console.log(`  unresolved: ${r.unresolved.length}`)
    for (const u of r.unresolved) console.log(`    - "${u.phrase}" (\\${u.hex})`)
  }
}

await new IconGenerator().run()
