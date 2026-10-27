// Import directly:  the `spell/ui/styles` barrel carries every foundation sheet as text, which the editor never needs
import { ThemeFile } from "spell/ui/styles/ThemeFile"
import { themeTree } from "spell/ui/styles/styles.en"
import type { ThemeData, ThemeLeaf, ThemeTree } from "spell/ui/styles/styles.types"

/****************
 * ### `ThemeTokens`
 * Every token a theme sets, and every theme's value for each, from Spell's theme files:
 * what `<ui-theme-editor>`'s token tree shows, and how it writes a token back into a theme file.
 * - The files:  `<name>.theme.json5` and `palettes/<name>.palette.json5` in Spell UI's themes folder, read as they
 *   are built into the bundle (a lazy chunk each), parsed with json5, and worked out by `ThemeFile`, as
 *   `yarn gen:styles` does:  so a value here is the value the theme's sheet sets.
 * - The tokens, in groups, the theme itself first (Owen:  "the themes own" should be at the top):
 *   - `own`:  the theme's private tokens (its glass), those of the theme shown and what it builds on
 *   - then every top group of the theme tree, in its order (`themeTree`:  typography ... motion)
 *   - `components`:  every family's own tokens that ANY theme sets (the bars, page tabs, section titles ...)
 *   - and, for each previewed page with tokens of its own (`ownPrefix`), those it declares:  `page.<id>`
 * - A pair leaf of the tree (`text > ink`, a hue's `base`) is two tokens, each at its half:  `text.ink.light`.
 * - Data, no DOM:  `ThemeDraft` turns a theme being made into its file and sheets.
 ****************/
export class ThemeTokens {
  /** Every theme file, parsed, by name. */
  readonly themes: Readonly<Record<string, ThemeData>>

  /** Every palette file, parsed, by name. */
  readonly palettes: Readonly<Record<string, ThemeData>>

  constructor({ themes, palettes }: { themes: Record<string, ThemeData>; palettes: Record<string, ThemeData> }) {
    this.themes = themes
    this.palettes = palettes
  }

  /**
   * The theme files as the bundle holds them, parsed.
   * - Rejects with json5's `SyntaxError` on a file that won't read.
   */
  static async load(): Promise<ThemeTokens> {
    const { default: JSON5 } = await import("json5")
    const parse = async (loaders: Record<string, () => Promise<string>>) =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(loaders).map(async ([path, load]) => [nameOf(path), JSON5.parse(await load()) as ThemeData])
        )
      ) as Record<string, ThemeData>
    const [themes, palettes] = await Promise.all([parse(THEME_FILES), parse(PALETTE_FILES)])
    return new ThemeTokens({ themes, palettes })
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
   * - `pageTokens`:  each previewed page's own tokens, as it declared them, by its id;  its group is `page.<id>`.
   * - A group with no token is left out.
   */
  groupsFor(theme: string, pageTokens: Readonly<Record<string, readonly string[]>> = {}): TokenGroup[] {
    const groups: TokenGroup[] = [
      // first:  what makes each theme itself (Owen:  "the themes own" should be at the top)
      { place: OWN, tokens: this.ownTokens(theme) },
      ...Object.entries(themeTree as ThemeTree).map(([place, node]) => ({ place, tokens: tokensUnder(node) })),
      { place: COMPONENTS, tokens: this.componentTokens() },
      ...Object.entries(pageTokens).map(([id, tokens]) => ({
        place: `${PAGE}.${id}`,
        tokens: [...tokens].sort(byName)
      }))
    ]
    return groups.filter((group) => group.tokens.length)
  }

  /**
   * `token`'s path in its group `place`, by its place's parts:  the tree the editor shows (`TokenTree`).
   * - `--ui-menu-segmented-background` in `components`:  `["menu", "segmented", "background"]`
   * - `--glass-blur` in `own`:  `["glass", "blur"]`;  `--ui-ink-on-light` in `text`:  `["ink", "light"]`
   * - a page's own (`page.editor`, `--spell-`):  `--spell-accent-x` => `["accent", "x"]`
   */
  pathOf(token: string, place: string): string[] {
    if (place.startsWith(`${PAGE}.`)) return token.replace(/^--[a-z]+-/, "").split("-")
    const where = this.placeOf(token)
    const rest = where.startsWith(`${place}.`) ? where.slice(place.length + 1) : where.slice(where.lastIndexOf(".") + 1)
    return rest.split(/[.-]/).filter(Boolean)
  }

  /**
   * Where `token` lives in a theme file:  `surfaces.panel`, `text.ink.light` (a pair's half),
   * `components.menu.radius`, `own.glass-blur`.
   * - A token no theme file places (a page's own) is `own.<its name>`:  `ThemeDraft` keeps those apart first.
   */
  placeOf(token: string): string {
    const place = TREE_PLACES.get(token)
    if (place) return place
    const family = this.families.find((name) => token.startsWith(`--ui-${name}-`))
    if (family) return `${COMPONENTS}.${family}.${token.slice(`--ui-${family}-`.length)}`
    return `${OWN}.${token.slice(2)}`
  }

  /** Whether `token` is one half of a pair leaf of the tree:  its place ends in `.light` / `.dark`. */
  static halfOf(place: string): "light" | "dark" | undefined {
    const half = place.slice(place.lastIndexOf(".") + 1)
    return PAIR_PLACES.has(place.slice(0, place.lastIndexOf("."))) && (half === "light" || half === "dark")
      ? half
      : undefined
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
   * `{surfaces.panel}`;  any other `var()` as it is (a pair's half has no pointer:  `{text.ink}` is both).
   */
  asWritten(text: string): string {
    return text.replace(PLAIN_VAR, (whole, token: string) => {
      const place = TREE_PLACES.get(token)
      if (place) return ThemeTokens.halfOf(place) ? whole : `{${place}}`
      const family = this.families.find((name) => token.startsWith(`--ui-${name}-`))
      return family ? `{${this.placeOf(token)}}` : whole
    })
  }

  /**
   * `theme`'s value at `place` as its OWN file writes it:  a value, a `{group.name}` pointer, or a `{ light, dark }`
   * pair;  `undefined` when its file doesn't set it (what it extends may).
   */
  writtenIn(theme: string, place: string): unknown {
    let node: unknown = this.themes[theme]
    for (const key of place.split(".")) node = ThemeFile.isGroup(node) ? node[key] : undefined
    return node
  }

  ////////////////
  // ## Where a value comes from
  ////////////////

  /**
   * Where `theme`'s value of `token` comes from, and what it is, as the files write it (Owen's marks, epic `debut`
   * P24):
   * - `setBy`:  the file that sets it, nearest first:  the theme's own, its palette, then what it extends, in turn;
   *   `undefined`:  none does, Spell UI's own foundation gives it
   * - `written`:  the value as that file writes it, for `scheme` (a pair's half)
   * - `kind`:  `pointer` (`{group.name}` alone:  the same value as that token), `derived` (a formula over others:
   *   `color-mix()`, `oklch(from ...)`, `calc()`), or `plain`
   * - `pointer`:  a pointer's place (`own.matrix-page`)
   */
  sourceOf(theme: string, token: string, scheme: "light" | "dark"): TokenSource {
    const place = this.placeOf(token)
    const half = ThemeTokens.halfOf(place)
    for (const file of this.chainOf(theme)) {
      let written: unknown = this.writtenAt(file.data, half ? place.slice(0, place.lastIndexOf(".")) : place)
      if (written === undefined) continue
      if (ThemeFile.isPair(written)) written = written[half ?? scheme]
      if (typeof written !== "string" && typeof written !== "number") continue
      const text = String(written)
      const pointer = POINTER_ALONE.exec(text)?.[1]
      const kind: TokenSource["kind"] = pointer ? "pointer" : FORMULA.test(text) ? "derived" : "plain"
      return { setBy: file.name, written: text, kind, pointer }
    }
    return { kind: "plain" }
  }

  /** The token at a theme file's place (`surfaces.panel` => `--ui-surface`, `own.x` => `--x`);  `undefined`:  none. */
  tokenAt(place: string): string | undefined {
    const [head, ...rest] = place.split(".")
    if (head === OWN && rest.length === 1) return `--${rest[0]}`
    if (head === COMPONENTS && rest.length === 2) return `--ui-${rest[0]}-${rest[1]}`
    return TOKENS_AT.get(place)
  }

  /** The files that give `theme` its values, nearest first:  itself, its palette, then what it extends, in turn. */
  private chainOf(theme: string): { name: string; data: ThemeData }[] {
    const chain: { name: string; data: ThemeData }[] = []
    for (let name: string | undefined = theme, hops = 0; name && hops <= MAX_DEPTH; hops++) {
      const data: ThemeData | undefined = this.themes[name]
      if (!data) break
      chain.push({ name, data })
      if (data.palette && this.palettes[data.palette])
        chain.push({ name: data.palette, data: this.palettes[data.palette]! })
      name = data.extends
    }
    return chain
  }

  /** What `data` writes at `place`;  `undefined` when it doesn't. */
  private writtenAt(data: ThemeData, place: string): unknown {
    let node: unknown = data
    for (const key of place.split(".")) node = ThemeFile.isGroup(node) ? node[key] : undefined
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

  /** Every family any theme sets tokens of, longest name first (so `docs-nav` wins over `docs`). */
  private get families(): string[] {
    this.familyNames ??= [
      ...new Set(Object.values(this.themes).flatMap((data) => Object.keys(data.components ?? {})))
    ].sort((a, b) => b.length - a.length)
    return this.familyNames
  }

  /** `families`, once worked out. */
  private familyNames: string[] | undefined

  /** Every token any theme sets for any family, in name order (`byName()`). */
  private componentTokens(): string[] {
    const names = new Set<string>()
    for (const data of Object.values(this.themes)) {
      for (const [family, tokens] of Object.entries(data.components ?? {})) {
        for (const name of Object.keys(tokens ?? {})) names.add(`--ui-${family}-${name}`)
      }
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
}

/** Where a theme's value of a token comes from (`ThemeTokens.sourceOf()`). */
export type TokenSource = {
  /** the file that sets it:  a theme's or a palette's name;  `undefined`:  Spell UI's own foundation */
  setBy?: string
  /** the value as that file writes it */
  written?: string
  /** a pointer (`{group.name}` alone), a formula over other tokens, or a plain value */
  kind: "plain" | "pointer" | "derived"
  /** a pointer's place:  `own.matrix-page` */
  pointer?: string
}

/** A group of tokens the editor shows:  its place in a theme file (`surfaces`, `own`, `page.editor`), its tokens. */
export type TokenGroup = {
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

/** Every token under `node` of the theme tree, in the tree's order:  a pair leaf's two, light first. */
function tokensUnder(node: ThemeLeaf | ThemeTree): string[] {
  if (typeof node === "string") return [node]
  if (ThemeFile.isTokenPair(node)) return [node.light, node.dark]
  return Object.values(node).flatMap((child) => tokensUnder(child as ThemeLeaf | ThemeTree))
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

/** The tree's pair leaves, by place (`text.ink`). */
const PAIR_PLACES = new Set<string>()

/** Token => its place in the theme tree:  `--ui-surface` => `surfaces.panel`;  a pair's half, `text.ink.light`. */
const TREE_PLACES: ReadonlyMap<string, string> = (() => {
  const places = new Map<string, string>()
  const walk = (tree: ThemeTree, path: string[]) => {
    for (const [key, node] of Object.entries(tree)) {
      const place = [...path, key].join(".")
      if (typeof node === "string") places.set(node, place)
      else if (ThemeFile.isTokenPair(node)) {
        PAIR_PLACES.add(place)
        places.set(node.light, `${place}.light`)
        places.set(node.dark, `${place}.dark`)
      } else walk(node as ThemeTree, [...path, key])
    }
  }
  walk(themeTree as ThemeTree, [])
  return places
})()

/** Place => its token:  `surfaces.panel` => `--ui-surface` (a pair's half too:  `text.ink.light`). */
const TOKENS_AT: ReadonlyMap<string, string> = new Map([...TREE_PLACES].map(([token, place]) => [place, token]))

/** A value that's a pointer alone:  `{own.matrix-page}`;  its place. */
const POINTER_ALONE = /^\{([\w.-]+)\}$/

/** A value worked out from other tokens. */
const FORMULA = /\{[\w.-]+\}|var\(|color-mix\(|\bfrom\b|calc\(/

/** The open group of a family's own tokens. */
const COMPONENTS = "components"

/** The open group of a theme's private tokens. */
const OWN = "own"

/** The groups of a previewed page's own tokens:  `page.<id>`. */
const PAGE = "page"

/** How deep `extends` is followed. */
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
