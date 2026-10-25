/**
 * `yarn gen:icons`:  write the built-in icon packs under `src/icons/icon-packs/` (`notes/icons.md`, "Built-in packs")
 * from Font Awesome Free's own npm package, plus Fomantic-UI's icon vocabulary:
 * - `fa7-free/`:  FA's `solid/` and `regular/` SVGs, plus the brand extras (`scripts/iconExtras.ts`);  the default
 * - `fa7-brands/`:  FA's `brands/` SVGs
 * - `fomantic/`:  no SVGs;  an index whose entries point at the two folders above, named by Fomantic
 * - also `src/icons/data/search.json` (`IconSearchFile`):  Font Awesome's search terms and categories,
 *   for `<ui-icon-picker>` and the docs icon browser
 * - MUST run in a worktree while tests run elsewhere:  it deletes and rewrites every pack folder.
 * - `--search-only`:  rewrites `search.json` alone, from the same release, and leaves the packs as they are.
 *   It needs no Fomantic clone (below), so a fresh checkout can run it.
 * - The SVGs are FA's files BYTE FOR BYTE, licence comment included (FA's IP:  the attribution stays), in FA's own
 *   layout (`<style>/<name>.svg`), so a pack's `base` can point at jsDelivr's copy of the same package.
 * - Downloads (and caches under the OS temp dir, NOT the repo) the pinned package tarball, `FA_VERSION`;
 *   `SPELL_UI_FA_PACKAGE_DIR` points it at an extracted copy instead (`src/tools/environment.ts`).
 * - Reads (never writes) `reference/Fomantic-UI/src/themes/default/elements/icon.variables`, the LESS source of
 *   Fomantic's `@icon-map` family, for Fomantic's names.
 * - Each pack's `pack.js` is written by `IconPackBuilder` (`src/tools/`), which also verifies every SVG.
 * - Types here are a deliberately minimal, LOCAL re-statement of Font Awesome's metadata shape.
 */

import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { IconName } from "spell-ui/icons/IconName"
import { environment } from "spell-ui/tools/environment"
import { IconPackBuilder } from "spell-ui/tools/IconPackBuilder"
import { Terminal } from "spell/element-tools/Terminal"
import type { IconSearchFile, IconSearchFileCategory } from "spell-ui/icons"
import type { IconPackReport } from "spell-ui/tools/tools.types"
import { ICON_EXTRAS } from "./iconExtras.ts"

/****************
 * ### `IconGenerator`
 * Builds every pack under `src/icons/icon-packs/` and the docs-site search data.
 * - One method per output, so `run()` reads as a table of contents.
 * - Stateless between runs:  every method takes what it needs and returns what it built.
 * - Its `private static` helpers are STATIC because they're pure:  they read only their arguments and this module's
 *   constants.
 ****************/
class IconGenerator {
  /** `packages/ui/`. */
  private readonly packageRoot = fileURLToPath(new URL("..", import.meta.url))
  /** Where the packs go. */
  private readonly packsDir = path.join(this.packageRoot, "src/icons/icon-packs")
  /** Where the docs-site search data goes. */
  private readonly dataDir = path.join(this.packageRoot, "src/icons/data")
  /** Fomantic's icon LESS (read only). */
  private readonly fomanticVariablesPath = path.join(
    this.packageRoot,
    "reference/Fomantic-UI/src/themes/default/elements/icon.variables"
  )
  /** extracted FA package (`<dir>/package/...`), cached OUTSIDE the repo;  override with `SPELL_UI_FA_PACKAGE_DIR` */
  private readonly packageDir =
    environment.fontAwesomeDir ?? path.join(tmpdir(), `spell-ui-fontawesome-free-${FA_VERSION}`)

  /** Runs the full pipeline and prints what it built;  `--search-only`:  `search.json` alone. */
  async run() {
    const metadata = await this.loadMetadata()
    if (process.argv.includes(SEARCH_ONLY)) {
      this.writeSearchFile(metadata)
      return
    }
    const byStyle = IconGenerator.byStyle(metadata)
    // NOTE: wiped first so an icon Font Awesome drops doesn't linger
    rmSync(this.packsDir, { recursive: true, force: true })

    const faAliases = IconGenerator.faAliases(metadata)
    const fomanticText = readFileSync(this.fomanticVariablesPath, "utf8")
    const fomantic = IconGenerator.fomanticNames(fomanticText, metadata, byStyle)

    const free = await this.freePack(byStyle, faAliases, fomantic.names)
    const brands = await this.brandsPack(byStyle, faAliases)
    const fomanticPack = await this.fomanticPack(fomantic.names, byStyle)

    this.writeSearchFile(metadata)

    for (const report of [free, brands, fomanticPack]) IconGenerator.print(report)
    Terminal.out(`\n  fomantic:  ${Object.keys(fomantic.names).length} names;  dropped ${fomantic.dropped.length}:`)
    Terminal.out(`    ${fomantic.dropped.join(", ")}`)
  }

  ////////////////
  // ## Font Awesome package
  ////////////////

  /**
   * FA's metadata from the pinned package (downloading and extracting its tarball first if not cached), as one
   * entry per icon with its FREE classic styles.
   * - `metadata/icon-families.json`, not the GitHub branch's `icons.json`:  names, aliases and SVGs all come from
   *   the SAME release.
   * - throws if the download fails
   */
  private async loadMetadata(): Promise<FaMetadata> {
    const families = path.join(this.packageDir, "package/metadata/icon-families.json")
    if (!existsSync(families)) {
      Terminal.err(`Downloading Font Awesome Free ${FA_VERSION} to ${this.packageDir} ...`)
      const response = await fetch(FA_TARBALL)
      if (!response.ok) {
        throw new Error(
          `IconGenerator.loadMetadata():  can't download ${FA_TARBALL} (HTTP ${response.status});  ` +
            `check the network, or set SPELL_UI_FA_PACKAGE_DIR to an extracted copy`
        )
      }
      mkdirSync(this.packageDir, { recursive: true })
      const tarball = path.join(this.packageDir, "package.tgz")
      writeFileSync(tarball, Buffer.from(await response.arrayBuffer()))
      execFileSync("tar", ["-xzf", tarball, "-C", this.packageDir])
    }
    const raw = JSON.parse(readFileSync(families, "utf8")) as Record<string, FaFamiliesEntry>
    const metadata: FaMetadata = {}
    for (const name of Object.keys(raw).sort((a, b) => a.localeCompare(b))) {
      const entry = raw[name]
      const free = (entry.familyStylesByLicense?.free ?? [])
        .filter((familyStyle) => familyStyle.family === "classic")
        .map((familyStyle) => familyStyle.style as IconStyle)
      if (free.length) metadata[name] = { unicode: entry.unicode, free, aliases: entry.aliases, search: entry.search }
    }
    return metadata
  }

  /** Copies FA's `svgs/<style>/<name>.svg` into `folder/<style>/`, unchanged. */
  private copySvgs(folder: string, style: IconStyle, names: Iterable<string>) {
    const target = path.join(folder, style)
    mkdirSync(target, { recursive: true })
    for (const name of names) {
      copyFileSync(path.join(this.packageDir, "package/svgs", style, `${name}.svg`), path.join(target, `${name}.svg`))
    }
  }

  /** Font Awesome's categories, from the same release:  its `metadata/categories.yml`. */
  private loadCategories(): FaCategory[] {
    return IconGenerator.parseCategories(
      readFileSync(path.join(this.packageDir, "package/metadata/categories.yml"), "utf8")
    )
  }

  /** Writes `src/icons/data/search.json`, and prints its size. */
  private writeSearchFile(metadata: FaMetadata) {
    const search = IconGenerator.searchFile(metadata, this.loadCategories())
    const text = JSON.stringify(search)
    mkdirSync(this.dataDir, { recursive: true })
    writeFileSync(path.join(this.dataDir, "search.json"), text)
    Terminal.out(
      `  src/icons/data/search.json:  ${Buffer.byteLength(text)} bytes;  ` +
        `${Object.keys(search.terms).length} icons' terms, ${search.categories.length} categories`
    )
  }

  ////////////////
  // ## Packs
  ////////////////

  /**
   * `fa7-free`:  solid, regular (named `… outline`), and the brand extras.
   * - Solid first, so a name solid and regular share (`bell`) is the solid icon's.
   * - Aliases:  FA's own (`cog` -> `gear`) and our own names (`hearts` -> `heart`),
   *   with ` outline` on regular icons, plus the Fomantic extras.
   * - throws if one of our own names or a Fomantic extra isn't for an `fa7-free` icon
   */
  private async freePack(
    byStyle: Record<IconStyle, Set<string>>,
    faAliases: Map<string, string[]>,
    fomanticNames: Record<string, string>
  ): Promise<IconPackReport> {
    const folder = path.join(this.packsDir, "fa7-free")
    const extras = ICON_EXTRAS.brands.filter((name) => byStyle.brands.has(name))
    this.copySvgs(folder, "solid", byStyle.solid)
    this.copySvgs(folder, "regular", byStyle.regular)
    this.copySvgs(folder, "brands", extras)

    const ownNames: Record<string, readonly string[]> = ICON_EXTRAS.names
    for (const name of Object.keys(ownNames)) {
      if (!byStyle.solid.has(name)) {
        throw new Error(
          `IconGenerator.freePack():  "${name}" isn't a solid fa7-free icon;  ` +
            `take it out of ICON_EXTRAS.names (scripts/iconExtras.ts)`
        )
      }
    }
    const namesOf = (name: string) => [...(faAliases.get(name) ?? []), ...(ownNames[name] ?? [])]

    const aliases = new Map<string, string[]>()
    for (const name of byStyle.solid) aliases.set(`solid/${name}`, namesOf(name))
    for (const name of byStyle.regular) {
      const words = [name, ...namesOf(name)].map((word) => `${IconName.normalize(word)} outline`)
      aliases.set(`regular/${name}`, words)
    }
    for (const name of extras) aliases.set(`brands/${name}`, faAliases.get(name) ?? [])
    for (const phrase of ICON_EXTRAS.fomantic) {
      const key = fomanticNames[phrase]
      if (!key || !aliases.has(key)) {
        throw new Error(
          `IconGenerator.freePack():  Fomantic's "${phrase}" isn't an fa7-free icon;  ` +
            `take it out of ICON_EXTRAS.fomantic (scripts/iconExtras.ts)`
        )
      }
      aliases.get(key)!.push(phrase)
    }
    return new IconPackBuilder({
      folder,
      id: "fa7-free",
      label: "Font Awesome 7 Free",
      license: FA_LICENSE,
      folders: ["solid", "regular", "brands"],
      aliases: IconGenerator.compact(aliases)
    }).build()
  }

  /** `fa7-brands`:  every free brand icon, with FA's own aliases. */
  private async brandsPack(
    byStyle: Record<IconStyle, Set<string>>,
    faAliases: Map<string, string[]>
  ): Promise<IconPackReport> {
    const folder = path.join(this.packsDir, "fa7-brands")
    this.copySvgs(folder, "brands", byStyle.brands)
    const aliases = new Map([...byStyle.brands].map((name) => [`brands/${name}`, faAliases.get(name) ?? []]))
    return new IconPackBuilder({
      folder,
      id: "fa7-brands",
      label: "Font Awesome 7 Free brands",
      license: FA_LICENSE,
      aliases: IconGenerator.compact(aliases)
    }).build()
  }

  /**
   * `fomantic`:  one entry per FA icon a Fomantic name means, keyed into the sibling FA folders
   * (`../fa7-free/solid/gear`), every Fomantic name for it as an `alias`.
   * - No SVGs of its own, so a page using it with `fa7-free` fetches each file once;  it needs the FA folders
   *   deployed beside it, not their packs added.
   * - Entries solid, then regular, then brands (`IconStyles`' order), so derived names favour solid;  an alias beats
   *   a derived name anyway (`IconName.claim()`), which is how Fomantic's meaning of `shield` or `x` wins inside
   *   this pack.
   * - throws if an entry isn't a free FA icon
   */
  private async fomanticPack(
    names: Record<string, string>,
    byStyle: Record<IconStyle, Set<string>>
  ): Promise<IconPackReport> {
    const folder = path.join(this.packsDir, "fomantic")
    mkdirSync(folder, { recursive: true })
    const aliases = new Map<string, string[]>()
    for (const [phrase, target] of Object.entries(names)) {
      const [style] = target.split("/") as [IconStyle]
      const key = `../${style === "brands" ? "fa7-brands" : "fa7-free"}/${target}`
      aliases.set(key, [...(aliases.get(key) ?? []), phrase])
    }
    const keys = [...aliases.keys()].sort((a, b) => {
      const byFolder =
        IconStyles.indexOf(a.split("/")[2] as IconStyle) - IconStyles.indexOf(b.split("/")[2] as IconStyle)
      return byFolder || a.localeCompare(b)
    })
    for (const key of keys) {
      const [, , style, name] = key.split("/")
      if (!byStyle[style as IconStyle].has(name)) {
        throw new Error(
          `IconGenerator.fomanticPack():  ${key} isn't a free Font Awesome icon;  check its MANUAL_OVERRIDES entry`
        )
      }
    }
    return new IconPackBuilder({
      folder,
      id: "fomantic",
      label: "Fomantic-UI names",
      license: `${FA_LICENSE};  names from Fomantic-UI (MIT)`,
      keys,
      aliases: IconGenerator.compact(aliases)
    }).build()
  }

  ////////////////
  // ## Pure helpers
  ////////////////

  /** Free icon names per style, sorted. */
  private static byStyle(metadata: FaMetadata): Record<IconStyle, Set<string>> {
    const byStyle: Record<IconStyle, Set<string>> = { solid: new Set(), regular: new Set(), brands: new Set() }
    for (const [name, entry] of Object.entries(metadata)) for (const style of entry.free) byStyle[style].add(name)
    return byStyle
  }

  /** `alias` values for the builder:  none dropped, one as a string, several as a list. */
  private static compact(aliases: Map<string, string[]>): Record<string, string | string[]> {
    const compact: Record<string, string | string[]> = {}
    for (const [key, words] of aliases) {
      const unique = [...new Set(words.map(IconName.normalize))]
      if (unique.length) compact[key] = unique.length === 1 ? unique[0] : unique
    }
    return compact
  }

  /** Font Awesome's OWN alias names per icon (`gear` -> `["cog"]`), for free icons. */
  private static faAliases(metadata: FaMetadata): Map<string, string[]> {
    const aliases = new Map<string, string[]>()
    for (const [name, entry] of Object.entries(metadata)) {
      const names = entry.aliases?.names ?? []
      if (names.length) aliases.set(name, names.map(IconName.normalize))
    }
    return aliases
  }

  /**
   * Fomantic's WHOLE icon vocabulary, as Fomantic spells it -> `"<style>/<FA7 name>"`:  `bell` -> `solid/bell`,
   * `bell outline` -> `regular/bell`, `github` -> `brands/github`.
   * - Style from the LESS map the name came from:  outline maps -> `regular` only;  brand maps -> `brands`,
   *   else `solid`;  other maps -> `solid`, else `brands`.  First map to define a name wins.
   * - NOTE:  not just the map's own style -- Fomantic's deprecated map holds brand icons too (`linkedin in`).
   * - Dropped (and reported):  a name that doesn't resolve, or whose FA7 icon isn't free in any of its styles.
   */
  private static fomanticNames(text: string, metadata: FaMetadata, byStyle: Record<IconStyle, Set<string>>) {
    const freeNames = new Set(Object.keys(metadata))
    const codeToName = IconGenerator.codeIndex(metadata)
    const names: Record<string, string> = {}
    const dropped: string[] = []
    for (const { name: mapName, stripOutlineSuffix } of FOMANTIC_MAPS) {
      const styles: IconStyle[] = stripOutlineSuffix
        ? ["regular"]
        : mapName.startsWith("icon-brand")
          ? ["brands", "solid"]
          : ["solid", "brands"]
      for (const [key, hex] of IconGenerator.parseLessMap(text, mapName)) {
        const phrase = key.replace(/_/g, " ")
        if (phrase in names) continue
        const baseKey = stripOutlineSuffix ? key.replace(/_outline$/, "") : key
        const canonical = IconGenerator.resolveFomantic(baseKey, hex, codeToName, freeNames)
        const style = canonical ? styles.find((candidate) => byStyle[candidate].has(canonical)) : undefined
        if (style) names[phrase] = `${style}/${canonical}`
        else dropped.push(phrase)
      }
    }
    return { names, dropped }
  }

  /**
   * Font Awesome codepoint -> FA7 name, for matching Fomantic's FA5 codepoints.
   * - Top-level `unicode` first, then `aliases.unicodes.primary` (codepoints of icons FA merged in).
   */
  private static codeIndex(metadata: FaMetadata): Map<string, string> {
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
    return codeToName
  }

  /**
   * The FA7 name for one Fomantic class name (`key`, underscored) and its FA5 codepoint, or `undefined`.
   * - `MANUAL_OVERRIDES`, then the codepoint, then the kebab-cased name itself.
   */
  private static resolveFomantic(
    key: string,
    hex: string,
    codeToName: Map<string, string>,
    freeNames: Set<string>
  ): string | undefined {
    if (key in MANUAL_OVERRIDES) return MANUAL_OVERRIDES[key]
    const byCode = codeToName.get(hex)
    if (byCode && freeNames.has(byCode)) return byCode
    const kebab = key.replace(/_/g, "-")
    return freeNames.has(kebab) ? kebab : undefined
  }

  /** Parses one `@<mapName>: { key: "\\hex"; ... };` LESS map into `[underscored key, lowercase hex]` pairs. */
  private static parseLessMap(text: string, mapName: string): [string, string][] {
    const body = new RegExp(`@${mapName}:\\s*\\{([^}]*)\\}`, "s").exec(text)?.[1]
    if (!body) return []
    return [...body.matchAll(/(\w+):\s*"\\([0-9a-fA-F]{4,6})"/g)].map((match) => [match[1], match[2].toLowerCase()])
  }

  /**
   * `search.json`'s content (`IconSearchFile`):  search terms by file name, and the categories.
   * - Terms:  every solid icon's, and every icon a category lists (a few brands:  `youtube` is in Film + Video),
   *   capped at `SEARCH_TERMS_CAP` each;  an empty list for one with none, so each category's icons are keys.
   * - Categories:  only their FREE icons, and only those with any;  each icon as a place in the terms' key list,
   *   written as the gap from the one before (`IconSearchFileCategory`).
   * - throws past `SEARCH_BUDGET`, rather than silently shipping a heavier picker
   */
  private static searchFile(metadata: FaMetadata, categories: readonly FaCategory[]): IconSearchFile {
    const listed = new Set(categories.flatMap((category) => category.icons).filter((name) => name in metadata))
    const terms: Record<string, string[]> = {}
    for (const [name, entry] of Object.entries(metadata)) {
      if (!entry.free.includes("solid") && !listed.has(name)) continue
      const list = entry.search?.terms?.slice(0, SEARCH_TERMS_CAP) ?? []
      if (list.length || listed.has(name)) terms[name] = list
    }
    // the places as the READER will see them:  `Object.keys()` of the parsed file, which puts `0` ... `9` first
    const placeOf = new Map(Object.keys(terms).map((name, place) => [name, place]))
    const written: IconSearchFileCategory[] = []
    for (const { id, label, icons } of categories) {
      const places = icons.flatMap((name) => placeOf.get(name) ?? []).sort((a, b) => a - b)
      if (places.length) written.push({ id, label, icons: places.map((place, at) => place - (places[at - 1] ?? 0)) })
    }
    const file: IconSearchFile = { terms, categories: written }
    const bytes = Buffer.byteLength(JSON.stringify(file))
    if (bytes > SEARCH_BUDGET) {
      throw new Error(
        `IconGenerator.searchFile():  search.json would be ${bytes} bytes, over its ${SEARCH_BUDGET} budget;  ` +
          `lower SEARCH_TERMS_CAP`
      )
    }
    return file
  }

  /**
   * Font Awesome's `categories.yml`, read line by line:  it's always the same four kinds of line,
   * so this needs no YAML library.
   * - `<id>:`, then `  icons:`, its icons as `    - <name>`, then `  label: <label>`
   * - a value YAML would misread is quoted:  `- 'n'`, `- '0'`
   * - throws on any other line, rather than drop a category silently
   */
  private static parseCategories(text: string): FaCategory[] {
    const categories: FaCategory[] = []
    for (const line of text.split("\n")) {
      const category = categories.at(-1)
      const [, id] = /^([a-z0-9-]+):$/.exec(line) ?? []
      const [, icon] = /^ {4}- (.+)$/.exec(line) ?? []
      const [, label] = /^ {2}label: (.+)$/.exec(line) ?? []
      if (id) categories.push({ id, label: id, icons: [] })
      else if (icon && category) category.icons.push(IconGenerator.unquote(icon))
      else if (label && category) category.label = IconGenerator.unquote(label)
      else if (line.trim() && line !== "  icons:") {
        throw new Error(`IconGenerator.parseCategories():  can't read categories.yml's line "${line}"`)
      }
    }
    return categories
  }

  /** A YAML scalar without its quotes:  `'n'` => `n`. */
  private static unquote(value: string): string {
    return value.replace(/^(["'])(.*)\1$/, "$2")
  }

  /** One pack's summary line, and any icon left without a name. */
  private static print(report: IconPackReport) {
    Terminal.out(`  ${path.relative(process.cwd(), report.index)}:  ${report.count} icons`)
    if (report.unreachable.length) Terminal.out(`    no name of their own:  ${report.unreachable.join(", ")}`)
  }
}

////////////////
// ## Constants
////////////////

/** Font Awesome Free release the packs are built from (and `notes/icons.md`'s jsDelivr URLs name). */
const FA_VERSION = "7.3.1"

/** Its npm tarball. */
const FA_TARBALL = `https://registry.npmjs.org/@fortawesome/fontawesome-free/-/fontawesome-free-${FA_VERSION}.tgz`

/** Licence line in the FA packs' indexes. */
const FA_LICENSE = `Font Awesome Free ${FA_VERSION} by @fontawesome - https://fontawesome.com (Icons: CC BY 4.0)`

/**
 * Fomantic-UI class names that are genuine FA5 -> FA6+ renames Font Awesome's OWN `unicode` field can't
 * recover, because FA6 reassigned the codepoint (often to the plain ASCII character, e.g. `plus` -> `"+"`)
 * rather than keeping the legacy private-use codepoint Fomantic's LESS still references.  Each was verified
 * by hand against the metadata -- see `notes/icons.md`.  Keyed by the RAW (underscored) Fomantic class name.
 * - also holds a hand-picked stand-in for an icon FA dropped from Free (`vector_square`).
 */
const MANUAL_OVERRIDES: Record<string, string> = {
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
const FOMANTIC_MAPS: { name: string; stripOutlineSuffix: boolean }[] = [
  { name: "icon-map", stripOutlineSuffix: false },
  { name: "icon-aliases-map", stripOutlineSuffix: false },
  { name: "icon-deprecated-map", stripOutlineSuffix: false },
  { name: "icon-outline-map", stripOutlineSuffix: true },
  { name: "icon-outline-aliases-map", stripOutlineSuffix: true },
  { name: "icon-brand-map", stripOutlineSuffix: false },
  { name: "icon-brand-aliases-map", stripOutlineSuffix: false }
]

/** Search terms kept per icon, to fit `search.json`'s budget -- see `notes/icons.md`. */
const SEARCH_TERMS_CAP = 5

/**
 * `search.json`'s size budget, in bytes (115 KB):  its terms ~100 KB, its categories ~15 KB.
 * - A picker loads it as it opens, so it stays one file, and small.
 */
const SEARCH_BUDGET = 115_000

/** The flag that writes `search.json` alone (`run()`). */
const SEARCH_ONLY = "--search-only"

////////////////
// ## Font Awesome metadata shape
////////////////

/** One icon's entry in `metadata/icon-families.json`, trimmed to the fields this script reads. */
type FaFamiliesEntry = {
  unicode: string
  aliases?: {
    names?: string[]
    /** `primary` holds codepoints of icons FA merged INTO this one, e.g. `user` lists `user-large`'s `f406`. */
    unicodes?: { primary?: string[] }
  }
  search?: { terms?: string[] }
  familyStylesByLicense?: { free?: { family: string; style: string }[] }
}

/** One icon as this script uses it:  its codepoints, aliases, search terms and FREE classic styles. */
type FaIconEntry = {
  unicode: string
  free: IconStyle[]
  aliases?: FaFamiliesEntry["aliases"]
  search?: FaFamiliesEntry["search"]
}

/** Font Awesome metadata, keyed by canonical (kebab-case) icon name. */
type FaMetadata = Record<string, FaIconEntry>

/** One category of `metadata/categories.yml`:  its id, its label, and its icons' names, Pro ones too. */
type FaCategory = { id: string; label: string; icons: string[] }

/**
 * The Font Awesome Free styles, and the folders their SVGs live in.
 * - In entry order:  the `fomantic` pack lists solid, then regular, then brands.
 */
const IconStyles = ["solid", "regular", "brands"] as const
/** One of `IconStyles`. */
type IconStyle = (typeof IconStyles)[number]

await new IconGenerator().run()
