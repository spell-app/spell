// Import directly:  the `spell/ui/styles` barrel carries every foundation sheet as text, which the editor never needs
import { ThemeFile } from "spell/ui/styles/ThemeFile"
import type { ThemeData } from "spell/ui/styles/styles.types"
import { E, UIT } from "spell/ui/core"
import { ThemeTokens } from "./ThemeTokens"
import {
  GLASS_THEMES,
  WALLPAPER_THEME,
  type ThemeEditorText,
  type TokenEdit,
  type TokenEdits
} from "./UIThemeEditor.types"

/****************
 * ### `ThemeDraft`
 * The theme `<ui-theme-editor>` is making, as a THEME FILE (epic `debut` P24):
 * its base as `extends`, the values its Basics set, then the tokens set by hand, which win.
 * - ONE writer:  `ThemeFile` writes every sheet from it (Owen:  "ThemeFile is the ONLY writer"), so the preview,
 *   the copied file and the theme kept in the browser are one text, and say the same thing.
 *   - `css`:  the sheet worn over the base on a page (`ThemeFile.overlayCss()`), what `SavedTheme` keeps
 *   - `frameCss`:  the same, `!important`, for the framed pages, whose own sheets set tokens outside any layer;
 *     and a rule of their own for a page's own tokens (`--spell-*`), which no theme file holds
 *   - `changes`:  the theme file's JSON5, colours in hex, to copy
 * - The Basics as theme-file values (`basicsData`):  a role pointed at a hue, the primary's worked-out shades, fonts,
 *   the text size, corners, depth, the glass of a glass theme.
 * - Needs the theme files (`ThemeTokens`) to place a token and to check the file:  without them, no sheet (`""`).
 * - NEVER throws:  a value `ThemeFile` refuses (a mistyped token) warns, and the sheet is `""`.
 * - Pure:  data in, text out.
 ****************/
export class ThemeDraft {
  /** The choices it's made from. */
  readonly choices: UIT.ThemeChoices

  /** The theme files, once loaded:  where each token goes. */
  private readonly files: ThemeTokens | undefined

  /** Its comments' words:  the editor's texts, in its language. */
  private readonly text: ThemeEditorText

  /** The start of each previewed page's own tokens (`--spell-`):  those are no theme file's. */
  private readonly ownPrefixes: readonly string[]

  constructor({ choices, files, text, ownPrefixes = [] }: ThemeDraftProps) {
    this.choices = choices
    this.files = files
    this.text = text
    this.ownPrefixes = ownPrefixes
  }

  ////////////////
  // ## The file
  ////////////////

  /** Its name as a file's:  lower case, runs of anything else a dash;  `theme` when nothing's left. */
  get slug(): string {
    return (
      this.choices.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "theme"
    )
  }

  /** Its file:  `<slug>.theme.json5`. */
  get fileName(): string {
    return `${this.slug}.theme.json5`
  }

  /** Something is changed:  a Basic, or a token set by hand. */
  get hasChanges(): boolean {
    return Object.keys(this.basics).length > 0 || Object.keys(this.choices.tokens ?? {}).length > 0
  }

  /** The tokens set by hand. */
  get tokens(): TokenEdits {
    return this.choices.tokens ?? {}
  }

  /**
   * The theme file's data:  `extends` its base, the Basics' values, then the tokens set by hand (a page's own left
   * out:  `pageTokens`).
   * - A pair leaf with one half set by hand keeps the other as the base writes it.
   * - `undefined` until the theme files load.
   */
  get data(): ThemeData | undefined {
    const files = this.files
    if (!files) return undefined
    const tree: Record<string, unknown> = { title: this.choices.name, extends: this.choices.base }
    mergeInto(tree, structuredClone(this.basics))
    for (const [token, edit] of Object.entries(this.tokens)) {
      if (this.isPageToken(token)) continue
      const place = files.placeOf(token)
      const half = ThemeTokens.halfOf(place)
      if (half) {
        const pairPlace = place.slice(0, place.lastIndexOf("."))
        const pair = (getAt(tree, pairPlace) as Record<string, string> | undefined) ?? this.basePair(pairPlace)
        setAt(tree, pairPlace, { ...pair, [half]: ThemeDraft.hex(valueOf(edit, half)) })
      } else setAt(tree, place, this.fileValue(token, place, edit))
    }
    return tree as ThemeData
  }

  /**
   * Whether the theme being made sets `token`:  by hand, or through a Basic (its `basicsData`).
   * - `false` until the theme files load:  they say where a token goes.
   */
  sets(token: string): boolean {
    if (this.tokens[token]) return true
    const files = this.files
    if (!files) return false
    const place = files.placeOf(token)
    const at = ThemeTokens.halfOf(place) ? place.slice(0, place.lastIndexOf(".")) : place
    return getAt(this.basics, at) !== undefined
  }

  /** `basicsData`, worked out once:  a draft never changes. */
  private get basics(): Record<string, unknown> {
    this.basicsCache ??= this.basicsData
    return this.basicsCache
  }

  /** `basics`, once worked out. */
  private basicsCache: Record<string, unknown> | undefined

  ////////////////
  // ## The sheets
  ////////////////

  /** The sheet worn over the base on a page:  its first comment names it and its base.  `""`:  not yet. */
  get css(): string {
    return this.sheet({ important: false })
  }

  /** The sheet laid over a framed page:  `css`'s values `!important`, then the pages' own tokens.  `""`:  none. */
  get frameCss(): string {
    if (!this.hasChanges) return ""
    return [this.sheet({ important: true, comments: false }), this.pageCss].filter(Boolean).join("\n")
  }

  /** The theme file's text, to copy:  JSON5, colours in hex;  the pages' own tokens after it, as their rule. */
  get changes(): string {
    const data = this.data
    if (!data) return ""
    const head = [
      `// ${this.fileName}:  ${this.text("fileMade", { base: this.choices.base })}`,
      `// ${this.text("fileMerge", { base: this.choices.base })}`
    ]
    const page = this.pageCss
    return `${head.join("\n")}\n${JSON.stringify(data, undefined, 2)}\n${page ? `\n${page}` : ""}`
  }

  /** `ThemeFile`'s sheet of the draft, `important` or not;  `""` while the files load, or when the file is refused. */
  private sheet({ important, comments = true }: { important: boolean; comments?: boolean }): string {
    const data = this.data
    if (!data) return ""
    const { base } = this.choices
    try {
      return new ThemeFile({
        name: this.slug,
        data,
        themes: this.files!.themes,
        palettes: this.files!.palettes
      }).overlayCss({
        important,
        comments: comments ? [`${this.fileName} -- ${this.text("sheetMade")}`, this.text("sheetBase", { base })] : []
      })
    } catch (error) {
      E.Warnings.warn("<ui-theme-editor>", "the theme file was refused", error)
      return ""
    }
  }

  /** The pages' own tokens set by hand, as a rule on `:root`, `!important`;  `""`:  none. */
  private get pageCss(): string {
    const lines = Object.entries(this.tokens)
      .filter(([token]) => this.isPageToken(token))
      .map(([token, edit]) => {
        const value = "both" in edit ? edit.both : `light-dark(${valueOf(edit, "light")}, ${valueOf(edit, "dark")})`
        return `  ${token}: ${ThemeDraft.hex(value)} !important;`
      })
    return lines.length ? `/* ${this.text("pageOwnSheet")} */\n:root {\n${lines.join("\n")}\n}\n` : ""
  }

  /** Whether `token` is a previewed page's own (`--spell-*`), which no theme file holds. */
  private isPageToken(token: string): boolean {
    return this.ownPrefixes.some((prefix) => token.startsWith(prefix))
  }

  /**
   * `token`'s edit as a value for its place in the file:  one value, or a `{ light, dark }` pair whose untouched half
   * is the base's own (as its file writes it, else as what it extends sets it).
   */
  private fileValue(token: string, place: string, edit: TokenEdit): unknown {
    if ("both" in edit) return ThemeDraft.hex(edit.both)
    const files = this.files!
    const written = files.writtenIn(this.choices.base, place)
    const half = (scheme: "light" | "dark") => {
      const tuned = edit[scheme]
      if (tuned !== undefined) return ThemeDraft.hex(tuned)
      if (ThemeFile.isPair(written)) return written[scheme]
      if (written !== undefined) return written
      const inherited = files.valueIn(this.choices.base, token)
      if (inherited !== undefined) return files.asWritten(ThemeTokens.forScheme(inherited, scheme))
      return ThemeDraft.hex((edit.light ?? edit.dark)!)
    }
    return { light: half("light"), dark: half("dark") }
  }

  /** The base's own `{ light, dark }` at pair place `place` (`text.ink`), each half's value as it ends up. */
  private basePair(place: string): { light: string; dark: string } {
    const files = this.files!
    const written = files.writtenIn(this.choices.base, place)
    if (ThemeFile.isPair(written)) return { light: String(written.light), dark: String(written.dark) }
    const tokenOf = (half: "light" | "dark") =>
      [...Object.keys(this.tokens), ...pairTokensOf(place)].find((token) => files.placeOf(token) === `${place}.${half}`)
    const value = (half: "light" | "dark") => {
      const token = tokenOf(half)
      return (token && files.valueIn(this.choices.base, token)) || "initial"
    }
    return { light: value("light"), dark: value("dark") }
  }

  ////////////////
  // ## The Basics
  ////////////////

  /** The values the Basics set, in the theme file's groups:  `{}` when none is chosen. */
  get basicsData(): Record<string, unknown> {
    const { primary, secondary, background, headingFont, bodyFont, textSize, corners, depth, glass, base } =
      this.choices
    const data: Record<string, unknown> = {}
    if (primary) {
      setAt(data, "brand.primary", {
        ...hueRole(primary),
        text: PRIMARY_TEXT,
        header: PRIMARY_HEADER,
        background: PRIMARY_BACKGROUND
      })
      setAt(data, "surfaces.highlight", "color-mix(in oklab, {brand.primary.color} 16%, transparent)")
      setAt(data, "brand.focus.color", "{brand.primary.color}")
      // links in it too (epic `debut` P23:  a tint's primary is "buttons, links, selection, focus"), as `colors.css`
      // works them out, over a theme that set its own
      setAt(data, "brand.link", { color: "{brand.primary.text}", hover: LINK_HOVER })
      setAt(data, "brand.focus.border", PRIMARY_FOCUS_BORDER)
      setAt(data, "components.menu.active-background", "color-mix(in oklab, {brand.primary.color} 14%, transparent)")
      setAt(data, "components.menu.active-color", "{brand.primary.text}")
    }
    if (secondary) setAt(data, "brand.secondary", hueRole(secondary))
    if (background) {
      setAt(data, "surfaces.page", {
        light: `oklch(from var(--ui-${background}-on-light) 0.965 min(c, 0.025) h)`,
        dark: `oklch(from var(--ui-${background}-on-dark) 0.17 min(c, 0.03) h)`
      })
      // the page behind everything a soft gradient of the hue (epic `debut` P23);  a wallpaper theme its washes
      if (base === WALLPAPER_THEME) setAt(data, "own.glass-wallpaper", ThemeDraft.wallpaper(background))
      else setAt(data, "surfaces.wallpaper", ThemeDraft.gradient(background))
    }
    if (bodyFont) setAt(data, "typography.family.body", FONT_STACKS[bodyFont])
    if (headingFont) setAt(data, "typography.family.heading", FONT_STACKS[headingFont])
    if (textSize) setAt(data, "typography.size", `${textSize}px`)
    if (corners) {
      const [s, m, l, modal, label] = RADII[corners]
      setAt(data, "radii", { default: "{radii.m}", s, m, l })
      setAt(data, "components.label.radius", label)
      setAt(data, "components.modal.radius", modal)
      for (const [family, size] of RADIUS_FAMILIES) setAt(data, `components.${family}.radius`, `{radii.${size}}`)
    }
    if (depth) {
      const [raised, floating] = SHADOWS[depth]
      setAt(data, "shadows.raised", raised)
      setAt(data, "shadows.floating", floating)
      setAt(data, "shadows.floating-hover", "{shadows.floating}")
      setAt(data, "shadows.overlay", "{shadows.floating}")
      setAt(data, "components.card.shadow", "{shadows.raised}")
      setAt(data, "components.card.hover-shadow", "{shadows.floating}")
      setAt(data, "components.segment.shadow", "{shadows.raised}")
    }
    if (glass && GLASS_THEMES.includes(base)) {
      const [surface, strong, blur] = GLASS[glass]
      setAt(data, "own.glass-surface", surface)
      setAt(data, "own.glass-surface-strong", strong)
      setAt(data, "own.glass-blur", blur)
    }
    return data
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * The corners choice a theme's own radii are (`s`, `m`, `l` as its files write them);  `undefined`:  none.
   * - So the editor marks the theme's own as one of its choices (Owen:  "Theme's own" says what the value is).
   */
  static cornersOf(radii: { s?: string; m?: string; l?: string }): UIT.ThemeCorner | undefined {
    return UIT.ThemeCorners.find((corner) => {
      const [s, m, l] = RADII[corner]
      return same(radii.s, s) && same(radii.m, m) && same(radii.l, l)
    })
  }

  /** The depth choice a theme's own shadows are (raised, floating);  `undefined`:  none. */
  static depthOf(raised?: string, floating?: string): UIT.ThemeDepth | undefined {
    return UIT.ThemeDepths.find((depth) => same(raised, SHADOWS[depth][0]) && same(floating, SHADOWS[depth][1]))
  }

  /** The glass choice a theme's own glass is (its surface, strong surface, blur);  `undefined`:  none. */
  static glassOf(surface?: string, strong?: string, blur?: string): UIT.ThemeGlass | undefined {
    return UIT.ThemeGlasses.find((glass) => {
      const [a, b, c] = GLASS[glass]
      return same(surface, a) && same(strong, b) && same(blur, c)
    })
  }

  /** Font `font`'s stack, for `font-family`:  the editor shows each font in itself. */
  static fontStack(font: UIT.ThemeFont): string {
    return FONT_STACKS[font].replace(POINTER, (_, place: string) => `var(--ui-font-family-${place.split(".").at(-1)})`)
  }

  /**
   * `value` with every plain `rgb()` / `rgba()` written as hex (`ThemeFile.hexOf()`):
   * `rgb(255 255 255 / 0.5)` => `#ffffff80`;  anything else as it is.
   */
  static hex(value: string): string {
    return value.replace(RGB, (...match) => {
      const [whole, red, green, blue, alpha] = match as string[]
      const fraction = alpha === undefined ? undefined : alpha.endsWith("%") ? parseFloat(alpha) / 100 : Number(alpha)
      const exec = Object.assign([whole, red, green, blue, fraction === undefined ? undefined : String(fraction)], {
        index: 0,
        input: whole
      }) as unknown as RegExpExecArray
      const hex = ThemeFile.hexOf(exec)
      return fraction === 1 ? hex.slice(0, 7) : hex
    })
  }

  /**
   * The page in `hue`, as a soft gradient, light into deep:  a pale wash of the hue at the top, a deeper one at the
   * foot;  in dark, deep into a little lighter (epic `debut` P23, Owen:  "how hard would it be to do the tint as a
   * gradient?").
   * - `GRADIENT_ENDS`:  each end's lightness and most chroma;  the page's text is checked at both
   *   (`colors.contrast.test.ts`).
   */
  static gradient(hue: UIT.ThemeHue): string {
    const end = ({ light, dark }: (typeof GRADIENT_ENDS)[number]) =>
      `light-dark(oklch(from var(--ui-${hue}-on-light) ${light[0]} min(c, ${light[1]}) h), ` +
      `oklch(from var(--ui-${hue}-on-dark) ${dark[0]} min(c, ${dark[1]}) h))`
    return `linear-gradient(${GRADIENT_ENDS.map(end).join(", ")})`
  }

  /**
   * A TINT of theme `base` in `hue`, as the sheet worn over it (epic `debut` P23):  the Basics' Primary and Background,
   * both `hue`, as `ThemeFile` writes a theme worn over its base (`overlayCss()`).
   * - The theme menu's tints (`ThemePreference`);  a tint is a theme-editor sheet with two choices made.
   * - NEVER throws:  a value `ThemeFile` refuses warns, and the sheet is `""`.
   */
  static tintCss(base: string, hue: UIT.ThemeHue): string {
    const draft = new ThemeDraft({
      choices: { name: base, base, primary: hue, background: hue },
      files: undefined,
      text: () => ""
    })
    try {
      // a wallpaper theme's own token (`glass-wallpaper`) is the theme it builds on's:  `ThemeFile` asks
      const themes = { [WALLPAPER_THEME]: { extends: GLASS_THEMES[0] } }
      return new ThemeFile({ name: base, data: { ...draft.basicsData, extends: base }, themes }).overlayCss()
    } catch (error) {
      E.Warnings.warn("ThemeDraft", `can't tint ${base} ${hue}`, error)
      return ""
    }
  }

  /** A glass theme's wallpaper in `hue`:  three soft washes, the hue and its two neighbours on the wheel. */
  private static wallpaper(hue: UIT.ThemeHue): string {
    const wash = (turn: number, light: number, dark: number) =>
      `light-dark(oklch(from var(--ui-${hue}-on-light) ${light} min(c, 0.09) calc(h + ${turn})), ` +
      `oklch(from var(--ui-${hue}-on-dark) ${dark} min(c, 0.11) calc(h + ${turn})))`
    return (
      `radial-gradient(at 12% 18%, ${wash(0, 0.84, 0.36)} 0, transparent 46%), ` +
      `radial-gradient(at 88% 10%, ${wash(40, 0.9, 0.33)} 0, transparent 42%), ` +
      `radial-gradient(at 72% 92%, ${wash(-40, 0.88, 0.32)} 0, transparent 46%)`
    )
  }
}

/** What `new ThemeDraft()` takes. */
export type ThemeDraftProps = {
  /** the choices it's made from */
  choices: UIT.ThemeChoices
  /** the theme files, once loaded */
  files: ThemeTokens | undefined
  /** its comments' words:  the editor's texts */
  text: ThemeEditorText
  /** the start of each previewed page's own tokens (`--spell-`) */
  ownPrefixes?: readonly string[]
}

/** Whether CSS text `a` is `b`, but for spaces and case. */
function same(a: string | undefined, b: string): boolean {
  return a !== undefined && a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase()
}

/** `edit`'s value for `scheme`:  its own, else the other half's. */
function valueOf(edit: TokenEdit, scheme: "light" | "dark"): string {
  return "both" in edit ? edit.both : (edit[scheme] ?? edit[scheme === "light" ? "dark" : "light"])!
}

/** The page gradient's two ends, top then foot:  each scheme's OKLCH lightness and most chroma (`gradient()`). */
const GRADIENT_ENDS = [
  { light: [0.975, 0.02], dark: [0.15, 0.025] },
  { light: [0.935, 0.045], dark: [0.225, 0.05] }
] as const

/** The tokens that point a role at hue `hue`:  the colour, and the text on it, in both schemes. */
function hueRole(hue: UIT.ThemeHue): Record<string, string> {
  return {
    color: `{hues.${hue}.color}`,
    inverted: `{hues.${hue}.inverted}`,
    on: `{hues.${hue}.on}`,
    "inverted-on": `{hues.${hue}.inverted-on}`
  }
}

/** The two tokens of the tree's pair leaf at `place` (`text.ink`):  `--ui-ink-on-light`, `--ui-ink-on-dark`. */
function pairTokensOf(place: string): string[] {
  const leaf = place.split(".").at(-1)!
  const role = leaf === "ink" ? "ink" : place.split(".").at(-2)!
  return [`--ui-${role}-on-light`, `--ui-${role}-on-dark`]
}

/** The value at dotted `path` in `tree`;  `undefined` when there's none. */
function getAt(tree: Record<string, unknown>, path: string): unknown {
  let node: unknown = tree
  for (const key of path.split(".")) node = ThemeFile.isGroup(node) ? node[key] : undefined
  return node
}

/** Set `value` at dotted `path` in `tree`, making groups on the way. */
function setAt(tree: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".")
  let node = tree
  for (const key of keys.slice(0, -1)) {
    if (!ThemeFile.isGroup(node[key])) node[key] = {}
    node = node[key] as Record<string, unknown>
  }
  node[keys.at(-1)!] = value
}

/** Merge `from` into `into`, group by group:  a value in `from` replaces what's there. */
function mergeInto(into: Record<string, unknown>, from: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(from)) {
    if (ThemeFile.isGroup(value) && !ThemeFile.isPair(value) && ThemeFile.isGroup(into[key])) {
      mergeInto(into[key] as Record<string, unknown>, value)
    } else into[key] = ThemeFile.isGroup(value) && !ThemeFile.isPair(value) ? structuredClone(value) : value
  }
}

/** The primary colour's text:  `colors.css`' recipe (a theme may have replaced it with a fixed colour). */
const PRIMARY_TEXT = {
  light: "oklch(from {brand.primary.color} min(l, 0.5) c h)",
  dark: "oklch(from {brand.primary.color} max(l, 0.78) c h)"
}

/** A link's hover:  `colors.css`' recipe, from the link's colour. */
const LINK_HOVER = {
  light: "oklch(from {brand.link.color} calc(l - 0.1) calc(c * 1.2) h)",
  dark: "oklch(from {brand.link.color} calc(l + 0.08) c h)"
}

/** The primary colour's headers:  `colors.css`' recipe. */
const PRIMARY_HEADER = {
  light: "oklch(from {brand.primary.color} min(l, 0.45) c h)",
  dark: "oklch(from {brand.primary.color} max(l, 0.85) c h)"
}

/** The primary colour's tinted background:  `colors.css`' recipe. */
const PRIMARY_BACKGROUND = {
  light: "oklch(from {brand.primary.color} 0.96 calc(c * 0.25) h)",
  dark: "oklch(from {brand.primary.color} 0.28 calc(c * 0.35) h)"
}

/** A focused field's border:  `colors.css`' recipe. */
const PRIMARY_FOCUS_BORDER = {
  light: "oklch(from {brand.primary.color} calc(l + 0.18) calc(c * 0.5) h)",
  dark: "oklch(from {brand.primary.color} calc(l - 0.1) calc(c * 0.7) h)"
}

/**
 * Each font's stack:  the platform's own faces first, nothing to download.
 * - Rounded and Palatino are Spell UI's own stacks, the tokens every theme may read (epic `debut` P20, J77)
 */
const FONT_STACKS: Readonly<Record<UIT.ThemeFont, string>> = {
  system: '-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Noto Sans", Ubuntu, Cantarell, sans-serif',
  rounded: "{typography.family.rounded}",
  serif: "{typography.family.serif}",
  georgia: 'Georgia, "DejaVu Serif", "Noto Serif", serif',
  humanist: 'Optima, Candara, "Noto Sans", "Segoe UI", sans-serif',
  verdana: 'Verdana, "DejaVu Sans", "Bitstream Vera Sans", sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace'
}

/** Each corner choice's radii:  `[small (controls), medium (fields, menus), large (cards), modal, label]`. */
const RADII: Readonly<Record<UIT.ThemeCorner, readonly [string, string, string, string, string]>> = {
  sharp: ["3px", "4px", "6px", "8px", "3px"],
  soft: ["5px", "7px", "10px", "12px", "4px"],
  round: ["8px", "10px", "14px", "18px", "6px"],
  pill: ["9999px", "14px", "20px", "24px", "9999px"]
}

/** The families whose radius follows the corners, each on the radius step it takes. */
const RADIUS_FAMILIES: readonly (readonly [string, "s" | "m" | "l"])[] = [
  ["button", "s"],
  ["input", "m"],
  ["dropdown", "m"],
  ["menu", "m"],
  ["message", "m"],
  ["popup", "m"],
  ["card", "l"],
  ["segment", "l"],
  ["section", "l"],
  ["panel", "l"],
  ["toast", "l"]
]

/** Each depth's shadows:  `[raised (cards), floating (menus, popups)]`, both schemes in each. */
const SHADOWS: Readonly<Record<UIT.ThemeDepth, readonly [string, string]>> = {
  flat: [
    "0 0 0 1px light-dark(#0000000f, #ffffff14)",
    "0 0 0 1px light-dark(#00000014, #ffffff1a), 0 4px 12px light-dark(#00000014, #00000059)"
  ],
  soft: [
    "0 1px 2px light-dark(#281e500f, #00000040), 0 8px 30px light-dark(#281e501f, #00000059)",
    "0 2px 4px light-dark(#281e500f, #0000004d), 0 16px 40px light-dark(#281e5029, #00000073)"
  ],
  lifted: [
    "0 2px 4px light-dark(#281e5014, #0000004d), 0 14px 40px light-dark(#281e5033, #00000080)",
    "0 4px 8px light-dark(#281e501a, #00000059), 0 28px 64px light-dark(#281e5042, #00000099)"
  ]
}

/** Each glass choice:  `[surface, strong surface, what's behind it]`;  `frosted` is the glass themes' own. */
const GLASS: Readonly<Record<UIT.ThemeGlass, readonly [string, string, string]>> = {
  clear: ["light-dark(#ffffff40, #26243047)", "light-dark(#ffffff66, #1e1c2666)", "blur(18px) saturate(1.8)"],
  frosted: ["light-dark(#ffffff73, #26243073)", "light-dark(#ffffff9e, #1e1c2694)", "blur(28px) saturate(1.7)"],
  solid: ["light-dark(#ffffffe6, #262430eb)", "light-dark(#fffffff7, #1e1c26f7)", "none"]
}

/** A pointer at another leaf:  `{typography.family.rounded}`. */
const POINTER = /\{([\w.-]+)\}/g

/** A plain `rgb()` / `rgba()`, its channels whole numbers:  space or comma separated, the alpha a number or a %. */
const RGB = /rgba?\(\s*(\d+)\s*[\s,]\s*(\d+)\s*[\s,]\s*(\d+)\s*(?:[/,]\s*([\d.]+%?)\s*)?\)/g
