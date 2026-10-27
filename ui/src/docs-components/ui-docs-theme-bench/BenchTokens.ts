// Import directly:  the `spell-ui/styles` barrel carries every foundation sheet as text, which the bench never needs
import { ThemeFile } from "spell-ui/styles/ThemeFile"
import { themeTree } from "spell-ui/styles/styles.en"
import type { ThemeData, ThemeLeaf, ThemeTree } from "spell-ui/styles/styles.types"

/****************
 * ### `BenchTokens`
 * The tokens the theme bench tunes, and every theme's value for each, from Spell's theme files.
 * - The files:  `<name>.theme.json5` and `palettes/<name>.palette.json5` in Spell UI's themes folder, read as they
 *   are built into the site's bundle (a lazy chunk each), parsed with json5, and worked out by `ThemeFile`, as
 *   `yarn gen:styles` does:  so a value here is the value the theme's sheet sets.
 * - The tokens, in the theme tree's groups (epic `debut` P18), what makes the theme itself first, then the page's chrome:
 *   - `own`:  the theme's private tokens (its glass), those of the theme shown and what it builds on
 *   - `surfaces`:  the page, panels, bars
 *   - `components.bar`, `components.menu`, `components.section`:  every name ANY theme sets there
 *     (the bars, the page tabs, the section titles)
 *   - `radii`, `shadows`, `borders`:  the few the chrome reads
 *   - `components.docs-nav`:  the docs' side column
 *   - `editor`:  what the editor app's own sheet declares (`--spell-*`), which no theme file holds
 * - Data, no DOM:  `BenchEdits` turns tunings into sheets and theme-file text.
 ****************/
export class BenchTokens {
  /** Every theme file, parsed, by name. */
  readonly themes: Readonly<Record<string, ThemeData>>

  /** Every palette file, parsed, by name. */
  readonly palettes: Readonly<Record<string, ThemeData>>

  constructor({ themes, palettes }: { themes: Record<string, ThemeData>; palettes: Record<string, ThemeData> }) {
    this.themes = themes
    this.palettes = palettes
  }

  /**
   * The theme files as the site's bundle holds them, parsed.
   * - Rejects with json5's `SyntaxError` on a file that won't read.
   */
  static async load(): Promise<BenchTokens> {
    const { default: JSON5 } = await import("json5")
    const parse = async (loaders: Record<string, () => Promise<string>>) =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(loaders).map(async ([path, load]) => [nameOf(path), JSON5.parse(await load()) as ThemeData])
        )
      ) as Record<string, ThemeData>
    const [themes, palettes] = await Promise.all([parse(THEME_FILES), parse(PALETTE_FILES)])
    return new BenchTokens({ themes, palettes })
  }

  /** `value` with every `light-dark(a, b)` in it replaced by its half for `scheme`:  what that scheme shows. */
  static forScheme(value: string, scheme: "light" | "dark"): string {
    return pickScheme(value, scheme)
  }

  /** The themes with a file, A-Z. */
  get names(): string[] {
    return Object.keys(this.themes).sort()
  }

  ////////////////
  // ## The groups
  ////////////////

  /**
   * The groups shown for `theme`, in order, each its tokens.
   * - `editorTokens`:  what the editor app's sheet declares (`--spell-*`), as it said;  none:  no editor group.
   * - A group with no token is left out.
   */
  groupsFor(theme: string, editorTokens: readonly string[] = []): BenchGroup[] {
    const groups: BenchGroup[] = [
      // first:  what makes each theme itself (Owen:  "the themes own" should be at the top)
      { place: OWN, tokens: this.ownTokens(theme) },
      { place: "surfaces", tokens: leavesOf(themeTree.surfaces) },
      ...CHROME_FAMILIES.map((family) => ({ place: `${COMPONENTS}.${family}`, tokens: this.familyTokens(family) })),
      ...TREE_PICKS.map(({ place, names }) => ({ place, tokens: names.map((name) => this.treeToken(place, name)) })),
      { place: `${COMPONENTS}.${DOCS_NAV}`, tokens: this.familyTokens(DOCS_NAV) },
      { place: EDITOR, tokens: [...editorTokens].filter((token) => token.startsWith(EDITOR_PREFIX)).sort(byName) }
    ]
    return groups.filter((group) => group.tokens.length)
  }

  /**
   * `token`'s path in its group `place`, by its name's parts:  the tree the bench shows (`BenchTree`).
   * - `--ui-menu-segmented-background` in `components.menu`:  `["segmented", "background"]`
   * - `--glass-blur` in `own`:  `["glass", "blur"]`;  `--ui-radius-l` in `radii`:  `["l"]`
   * - the editor's own, which no theme file places:  `--spell-accent-x` => `["accent", "x"]`
   */
  pathOf(token: string, place: string): string[] {
    if (token.startsWith(EDITOR_PREFIX)) return token.slice(EDITOR_PREFIX.length).split("-")
    const where = this.placeOf(token)
    const rest = where.startsWith(`${place}.`) ? where.slice(place.length + 1) : where.slice(where.lastIndexOf(".") + 1)
    return rest.split(/[.-]/).filter(Boolean)
  }

  /** Where `token` lives in a theme file:  `surfaces.panel`, `components.menu.radius`, `own.glass-blur`, `editor`. */
  placeOf(token: string): string {
    const place = TREE_PLACES.get(token)
    if (place) return place
    if (token.startsWith(EDITOR_PREFIX)) return EDITOR
    const family = CHROME_FAMILIES.concat(DOCS_NAV).find((name) => token.startsWith(`--ui-${name}-`))
    if (family) return `${COMPONENTS}.${family}.${token.slice(`--ui-${family}-`.length)}`
    return `${OWN}.${token.slice(2)}`
  }

  ////////////////
  // ## Values
  ////////////////

  /**
   * `theme`'s value for `token`, as its sheet sets it (what it extends and its palette included):
   * CSS text, a pointer written as `var()`;  `undefined`:  the theme leaves it to the base theme (`classic`).
   * - throws a `TypeError` on a mistake in the theme's files (`ThemeFile`)
   */
  valueIn(theme: string, token: string): string | undefined {
    return this.valuesOf(theme).get(token)
  }

  /**
   * CSS text as a theme file writes it:  each `var(--x)` of a token in a theme file's groups as its pointer,
   * `{surfaces.panel}`;  any other `var()` as it is.
   */
  asWritten(text: string): string {
    return text.replace(PLAIN_VAR, (whole, token: string) => {
      const place = this.placeOf(token)
      return place === EDITOR ? whole : `{${place}}`
    })
  }

  /**
   * `theme`'s value for `token` as its OWN file writes it:  a value, a `{group.name}` pointer, or a `{ light, dark }`
   * pair;  `undefined` when its file doesn't set it (what it extends may).
   */
  writtenIn(theme: string, token: string): unknown {
    const data = this.themes[theme]
    if (!data) return undefined
    const path = this.placeOf(token).split(".")
    let node: unknown = data
    for (const key of path) node = isGroup(node) ? node[key] : undefined
    return node
  }

  /** Every token `theme` ends with, and its value:  worked out once per theme. */
  private valuesOf(theme: string): Map<string, string> {
    let values = this.cache.get(theme)
    if (!values) {
      const data = this.themes[theme]
      values = data
        ? new ThemeFile({ name: theme, data, themes: this.themes, palettes: this.palettes }).values()
        : new Map<string, string>()
      this.cache.set(theme, values)
    }
    return values
  }

  /** Each theme's values, as worked out. */
  private readonly cache = new Map<string, Map<string, string>>()

  ////////////////
  // ## Tokens of a group
  ////////////////

  /** Every token any theme sets for family `family`, in name order (`byName()`). */
  private familyTokens(family: string): string[] {
    const names = new Set<string>()
    for (const data of Object.values(this.themes)) {
      const tokens = data.components?.[family]
      if (tokens) for (const name of Object.keys(tokens)) names.add(`--ui-${family}-${name}`)
    }
    return [...names].sort(byName)
  }

  /** The private tokens of `theme` and the themes it builds on, in name order (`byName()`). */
  private ownTokens(theme: string): string[] {
    const names = new Set<string>()
    for (let name: string | undefined = theme, hops = 0; name && hops <= MAX_DEPTH; hops++) {
      const data: ThemeData | undefined = this.themes[name]
      for (const own of Object.keys(data?.own ?? {})) names.add(`--${own}`)
      name = data?.extends
    }
    return [...names].sort(byName)
  }

  /** The token at `place` + `name` in the theme tree:  `radii` + `l` => `--ui-radius-l`. */
  private treeToken(place: string, name: string): string {
    const leaf = (themeTree as ThemeTree)[place] as ThemeTree
    return leaf[name] as string
  }
}

/** A group of tokens the bench shows:  its place in a theme file, and its tokens in order. */
export type BenchGroup = {
  /** `surfaces`, `components.menu`, `own`, `editor` */
  place: string
  tokens: readonly string[]
}

////////////////
// ## Helpers
////////////////

/** A theme file's name from its path:  `../../styles/themes/glass.theme.json5` => `glass`. */
function nameOf(path: string): string {
  return path.replace(/^.*\//, "").replace(/\.(?:theme|palette)\.json5$/, "")
}

/** A group's own tokens, single ones only (a pair's two are for the hues, never the chrome). */
function leavesOf(group: ThemeTree): string[] {
  return Object.values(group).filter((leaf): leaf is string => typeof leaf === "string")
}

/** `text` with every `light-dark(a, b)` replaced by its half for `scheme`;  nested ones too. */
function pickScheme(text: string, scheme: "light" | "dark"): string {
  let out = text
  for (let at = out.indexOf(LIGHT_DARK); at >= 0; at = out.indexOf(LIGHT_DARK)) {
    const open = at + LIGHT_DARK.length
    const [light, dark, end] = splitPair(out, open)
    if (end < 0) break
    out = out.slice(0, at) + (scheme === "light" ? light : dark).trim() + out.slice(end + 1)
  }
  return out
}

/**
 * The two arguments of the function call whose `(` is just before `open`, split at its top-level comma,
 * and the index of its `)`;  -1 for one that never closes.
 */
function splitPair(text: string, open: number): [string, string, number] {
  let depth = 0
  let comma = -1
  for (let index = open; index < text.length; index++) {
    const char = text[index]
    if (char === "(") depth++
    else if (char === ")") {
      if (depth === 0) {
        if (comma < 0) return [text.slice(open, index), text.slice(open, index), index]
        return [text.slice(open, comma), text.slice(comma + 1, index), index]
      }
      depth--
    } else if (char === "," && depth === 0 && comma < 0) comma = index
  }
  return ["", "", -1]
}

/**
 * Names in order, their numbers as numbers (Owen:  "these should sort as numbers"):
 * `--spell-brand-25` before `--spell-brand-100`.
 */
function byName(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true })
}

/** Whether `value` is a plain object. */
function isGroup(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Token => its place in the theme tree (`--ui-surface` => `surfaces.panel`). */
const TREE_PLACES: ReadonlyMap<string, string> = (() => {
  const places = new Map<string, string>()
  const walk = (tree: ThemeTree, path: string[]) => {
    for (const [key, node] of Object.entries(tree)) {
      if (typeof node === "string") places.set(node, [...path, key].join("."))
      else if (!ThemeFile.isLeaf(node as ThemeLeaf | ThemeTree)) walk(node as ThemeTree, [...path, key])
    }
  }
  walk(themeTree as ThemeTree, [])
  return places
})()

/** The open group of a family's own tokens. */
const COMPONENTS = "components"

/** The open group of a theme's private tokens. */
const OWN = "own"

/** The editor app's own tokens' group. */
const EDITOR = "editor"

/** How the editor app's own tokens start. */
const EDITOR_PREFIX = "--spell-"

/** The families whose tokens draw the page's chrome:  bars, page tabs, section titles. */
const CHROME_FAMILIES = ["bar", "menu", "section"]

/** The docs' side column's family. */
const DOCS_NAV = "docs-nav"

/** The tree's groups the chrome reads a few names of. */
const TREE_PICKS: readonly { place: string; names: readonly string[] }[] = [
  { place: "radii", names: ["default", "s", "m", "l"] },
  { place: "shadows", names: ["subtle", "raised", "floating"] },
  { place: "borders", names: ["color", "strong", "internal"] }
]

/** How deep pointers and `extends` are followed. */
const MAX_DEPTH = 12

/** A `var()` with no fallback:  its token. */
const PLAIN_VAR = /var\(\s*(--[\w-]+)\s*\)/g

/** `light-dark(`, as it starts. */
const LIGHT_DARK = "light-dark("

/**
 * Every theme file and palette file, as text, each loaded the first time it's read.
 * - NOTE:  `import.meta.glob()` MUST stay a literal call:  Vite rewrites it at build time.
 * - Relative, as `Themes`' glob is:  a glob takes no package name.
 */
const THEME_FILES: Record<string, () => Promise<string>> = import.meta.glob<string>(
  "../../styles/themes/*.theme.json5",
  { query: "?raw", import: "default" }
)
const PALETTE_FILES: Record<string, () => Promise<string>> = import.meta.glob<string>(
  "../../styles/themes/palettes/*.palette.json5",
  { query: "?raw", import: "default" }
)
