/**
 * Generates `src/icons/glyphs/<style>/<name>.js` (one ES module per icon) and `src/icons/data/*.json` (alias
 * maps, names index, search terms) from Font Awesome 7 Free's metadata plus Fomantic-UI's icon vocabulary.
 * - Run with `yarn tsx scripts/gen-icons.ts` (or `node --experimental-strip-types` / `yarn vite-node` if `tsx`
 *   is unavailable -- see `PAPERCUTS.md`).
 * - Downloads (and caches under the OS temp dir, NOT the repo) Font Awesome's `icons.json`, since it's ~6 MB
 *   and CC-BY-4.0/MIT rather than something we vendor -- see `src/icons/LICENSE.md`.
 * - Reads (never writes) `reference/Fomantic-UI/src/themes/default/elements/icon.variables`, the LESS source
 *   of Fomantic's `@icon-map` family, to derive Fomantic's OWN alias vocabulary (`setting` -> `gear`, etc).
 * - Glyph modules are `export default [width, height, "path"]`;  the JSON has no header (comments aren't valid
 *   JSON), so the regeneration story lives in `docs/icons.md`.  Both are COMMITTED, so installs and CI need no
 *   network.
 * - Types here are a deliberately minimal, LOCAL re-statement of Font Awesome's metadata shape:  this script
 *   runs standalone via `tsx`, outside the `$/*` alias graph `tsconfig.json` sets up for `src/`, so it can't
 *   import `$/icons` types without its own module resolution setup.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
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
 * Builds every file under `src/icons/glyphs/` and `src/icons/data/` from Font Awesome 7 Free + Fomantic-UI's
 * icon vocabulary.
 * - One method per output file (plus the shared parsing steps), so `run()` reads as a table of contents.
 * - Stateless between runs:  every method takes what it needs and returns what it built, nothing is cached
 *   on `this` except the resolved filesystem paths.
 */
class IconGenerator {
  /** Font Awesome's own metadata source -- see file docstring for why it's cached outside the repo. */
  static readonly METADATA_URL = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/7.x/metadata/icons.json"

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
  private readonly glyphsDir: string
  private readonly fomanticVariablesPath: string
  private readonly metadataCachePath: string

  constructor() {
    this.repoRoot = fileURLToPath(new URL("..", import.meta.url))
    this.dataDir = path.join(this.repoRoot, "src/icons/data")
    this.glyphsDir = path.join(this.repoRoot, "src/icons/glyphs")
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
    // NOTE: wiped first so an icon Font Awesome drops doesn't linger as a stale module.
    rmSync(this.glyphsDir, { recursive: true, force: true })

    const metadata = await this.loadMetadata()
    const freeNames = new Set(Object.keys(metadata).filter((name) => (metadata[name].free?.length ?? 0) > 0))

    const STYLES = ["solid", "regular", "brands"] as const
    const solid = this.buildStyleData(metadata, "solid")
    const regular = this.buildStyleData(metadata, "regular")
    const brands = this.buildStyleData(metadata, "brands")

    const glyphReports = [solid, regular, brands].map((data, i) => this.writeGlyphs(STYLES[i], data))
    const namesReport = this.writeJson("names.json", {
      solid: Object.keys(solid),
      regular: Object.keys(regular),
      brands: Object.keys(brands)
    })

    const faAliases = this.buildFaAliases(metadata)
    const faAliasesReport = this.writeJson("aliases.json", faAliases)

    const fomanticText = readFileSync(this.fomanticVariablesPath, "utf8")
    const fomanticResult = this.buildFomanticAliases(fomanticText, metadata, freeNames)
    const { aliases: fomanticAliases, clashes: fomanticClashes } = this.splitFomanticClashes(
      fomanticResult.aliases,
      freeNames,
      faAliases
    )
    const fomanticReport = this.writeJson("fomantic-aliases.json", fomanticAliases)
    const clashesReport = this.writeJson("fomantic-clashes.json", fomanticClashes)

    const search = this.buildSearchIndex(metadata)
    const searchReport = search ? this.writeJson("search.json", search.terms) : undefined

    this.report({
      glyphReports,
      namesReport,
      faAliasesReport,
      fomanticReport,
      clashesReport,
      fomanticClashes,
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
   * Writes one `<style>/<name>.js` module per icon:  `export default [width, height, "path"]`.
   * - Compact and header-free (a licence comment per file would add ~200 B x 2000);  attribution lives in
   *   `src/icons/LICENSE.md`.
   * - Names are Font Awesome's kebab-case slugs, so they're safe as file names and as URL segments.
   */
  private writeGlyphs(style: IconStyle, data: Record<string, IconTuple>) {
    const directory = path.join(this.glyphsDir, style)
    mkdirSync(directory, { recursive: true })
    let bytes = 0
    for (const [name, tuple] of Object.entries(data)) {
      const text = `export default ${JSON.stringify(tuple)}\n`
      writeFileSync(path.join(directory, `${name}.js`), text)
      bytes += Buffer.byteLength(text)
    }
    return { style, count: Object.keys(data).length, bytes }
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

  /**
   * Splits Fomantic's aliases into the ones that are safe by default and the CLASHES:  Fomantic phrases
   * whose dashed form is ALREADY a Font Awesome name or alias for a DIFFERENT icon (`x`, `warning`,
   * `sign in`, `desktop` ...).
   * - Font Awesome wins a clash by default, so clashes go to their own file, which `Icons` consults only
   *   when the page opts in with `<html ui-icon-names="fomantic">` -- see `docs/icons.md`.
   * - Dashed form, because `Icons` treats spaces and dashes alike:  `sign in` ~== `sign-in`.
   */
  private splitFomanticClashes(
    fomantic: Record<string, string>,
    freeNames: Set<string>,
    faAliases: Record<string, string>
  ) {
    const aliases: Record<string, string> = {}
    const clashes: Record<string, string> = {}
    for (const [phrase, target] of Object.entries(fomantic)) {
      const dashed = phrase.replace(/ /g, "-")
      const faMeaning = faAliases[dashed] ?? (freeNames.has(dashed) ? dashed : undefined)
      if (faMeaning && faMeaning !== target) clashes[phrase] = target
      else aliases[phrase] = target
    }
    return { aliases, clashes }
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

  /** Solid-only `name -> search terms`, capped at 5 terms/icon to fit the 100 KB budget -- see `docs/icons.md`. */
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

  /** Prints the file-size table + alias-resolution counts. */
  private report(args: {
    glyphReports: { style: string; count: number; bytes: number }[]
    namesReport: { file: string; bytes: number }
    faAliasesReport: { file: string; bytes: number }
    fomanticReport: { file: string; bytes: number }
    clashesReport: { file: string; bytes: number }
    fomanticClashes: Record<string, string>
    searchReport: { file: string; bytes: number } | undefined
    searchSkippedBytes: number | undefined
    fomanticResult: ReturnType<IconGenerator["buildFomanticAliases"]>
  }) {
    const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`
    console.log("\n== Icon data written ==")
    for (const glyph of args.glyphReports) {
      console.log(`  glyphs/${glyph.style}/: ${glyph.count} modules, ${kb(glyph.bytes)}`)
    }
    for (const report of [args.namesReport, args.faAliasesReport, args.fomanticReport, args.clashesReport]) {
      console.log(`  ${report.file}: ${kb(report.bytes)}`)
    }
    if (args.searchReport) console.log(`  ${args.searchReport.file}: ${kb(args.searchReport.bytes)}`)
    else console.log(`  search.json: SKIPPED (uncapped would be ${kb(args.searchSkippedBytes ?? 0)}, over 100 KB)`)

    const r = args.fomanticResult
    console.log("\n== Fomantic alias resolution ==")
    console.log(`  merged Fomantic class names: ${r.mergedCount}`)
    console.log(
      `  resolved: ${r.resolvedCount} (${r.identicalCount} identical, ${Object.keys(r.aliases).length} aliased,`
    )
    console.log(`            ${r.overrideCount} via MANUAL_OVERRIDES, ${r.nameFallbackCount} via name fallback)`)
    console.log(`  unresolved: ${r.unresolved.length}`)
    for (const u of r.unresolved) console.log(`    - "${u.phrase}" (\\${u.hex})`)
    const clashes = Object.keys(args.fomanticClashes)
    console.log(`  clashing with a Font Awesome name (opt-in only): ${clashes.length}`)
    console.log(`    ${clashes.join(", ")}`)
  }
}

await new IconGenerator().run()
