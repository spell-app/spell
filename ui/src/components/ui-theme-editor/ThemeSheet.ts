import { UI, type UIT } from "spell-ui/core"
import { EDITS_SHEET, GLASS_THEMES, WALLPAPER_THEME, type ThemeEditorText } from "./UIThemeEditor.types"

/****************
 * ### `ThemeSheet`
 * A theme's choices (`UIT.ThemeChoices`) as a STYLESHEET:  tokens on `:root`, in `@layer ui.app`,
 * for a page that has the base theme applied.
 * - `ui.app`, not `ui.theme`:  a later layer wins however the sheets arrive.
 *   In `ui.theme` a page's own `<style>` lost to the base theme the runtime adopts after it.
 *
 * - What `<ui-theme-editor>` shows in its CSS section, copies, applies to the page and keeps (`SavedTheme`):
 *   ONE text for all four, so the copied sheet gives exactly the look the preview shows.
 * - A DELTA on its base theme, as a Fomantic theme is on `classic`:
 *   each choice left out keeps the base's own;  the sheet's first comment names the base to apply first.
 * - Every colour is a `light-dark()` pair, or worked out from one with relative colours (`oklch(from ...)`),
 *   so one sheet serves both schemes, and a `ui-dark` subtree shows its dark side.
 * - A few tokens belong to some bases:
 *   - the glass (`--glass-surface*`, `--glass-blur`), written only on a glass theme (`GLASS_THEMES`)
 *   - the wallpaper (`--glass-wallpaper`), written only on Fruity (`WALLPAPER_THEME`)
 * - Pure but for `applyToPage()` / `putOnPage()`, which go through the runtime (`UI.styles`, `UI.themes`).
 ****************/
export class ThemeSheet {
  /** The choices it's made from. */
  readonly choices: UIT.ThemeChoices

  /** Its comments' words:  the editor's texts, in its language. */
  private readonly text: ThemeEditorText

  constructor({ choices, text }: ThemeSheetProps) {
    this.choices = choices
    this.text = text
  }

  ////////////////
  // ## The sheet
  ////////////////

  /** Its file's path:  `themes/<name>.css`, the name lower case, runs of anything else a dash. */
  get fileName(): string {
    const slug = this.choices.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    return `themes/${slug || "theme"}.css`
  }

  /** Something is changed:  a choice besides the name and the base. */
  get hasChanges(): boolean {
    return this.groups.some((group) => group.declarations.length)
  }

  /** The stylesheet's text:  two comments, then the declarations of every group with any, on `:root`. */
  get css(): string {
    const { base } = this.choices
    const head = `/* ${this.fileName} -- ${this.text("sheetMade")}\n   ${this.text("sheetBase", { base })} */\n`
    const groups = this.groups.filter((group) => group.declarations.length)
    if (!groups.length) return `${head}/* ${this.text("sheetEmpty", { base })} */\n`
    const body = groups
      .map(
        (group) =>
          `    /* ${group.title} */\n` + group.declarations.map(([name, value]) => `    ${name}: ${value};`).join("\n")
      )
      .join("\n\n")
    return `${head}@layer ui.app {\n  :root {\n${body}\n  }\n}\n`
  }

  /** Its declarations, by the editor's bands:  Color, Type, Shape (an empty group:  nothing changed there). */
  get groups(): readonly ThemeSheetGroup[] {
    return [
      { title: this.text("color"), declarations: this.colorDeclarations },
      { title: this.text("type"), declarations: this.typeDeclarations },
      { title: this.text("shape"), declarations: this.shapeDeclarations }
    ]
  }

  ////////////////
  // ## Declarations
  ////////////////

  /** Primary, secondary and background. */
  private get colorDeclarations(): Declaration[] {
    const { primary, secondary, background, base } = this.choices
    const declarations: Declaration[] = []
    if (primary) {
      declarations.push(
        ...ThemeSheet.hueRoles("primary", primary),
        ["--ui-primary-text", PRIMARY_TEXT],
        ["--ui-primary-header", PRIMARY_HEADER],
        ["--ui-primary-background", PRIMARY_BACKGROUND],
        ["--ui-highlight", "color-mix(in oklab, var(--ui-primary) 16%, transparent)"],
        ["--ui-focus-color", "var(--ui-primary)"],
        ["--ui-focus-border", PRIMARY_FOCUS_BORDER],
        ["--ui-menu-active-background", "color-mix(in oklab, var(--ui-primary) 14%, transparent)"],
        ["--ui-menu-active-color", "var(--ui-primary-text)"]
      )
    }
    if (secondary) declarations.push(...ThemeSheet.hueRoles("secondary", secondary))
    if (background) {
      declarations.push([
        "--ui-background",
        `light-dark(oklch(from var(--ui-${background}-on-light) 0.965 min(c, 0.025) h), ` +
          `oklch(from var(--ui-${background}-on-dark) 0.17 min(c, 0.03) h))`
      ])
      if (base === WALLPAPER_THEME) declarations.push(["--glass-wallpaper", ThemeSheet.wallpaper(background)])
    }
    return declarations
  }

  /** Fonts and the text size. */
  private get typeDeclarations(): Declaration[] {
    const { headingFont, bodyFont, textSize } = this.choices
    const declarations: Declaration[] = []
    if (bodyFont) declarations.push(["--ui-font-family", FONT_STACKS[bodyFont]])
    if (headingFont) declarations.push(["--ui-font-family-heading", FONT_STACKS[headingFont]])
    if (textSize) declarations.push(["--ui-font-size", `${textSize}px`])
    return declarations
  }

  /** Corners, depth and glass. */
  private get shapeDeclarations(): Declaration[] {
    const { corners, depth, glass, base } = this.choices
    const declarations: Declaration[] = []
    if (corners) {
      const [s, m, l, xl, label] = RADII[corners]
      declarations.push(
        ["--ui-radius-s", s],
        ["--ui-radius-m", m],
        ["--ui-radius-l", l],
        ["--ui-radius", "var(--ui-radius-m)"],
        ["--ui-label-radius", label],
        ["--ui-modal-radius", xl],
        ...RADIUS_TOKENS.map(([token, size]): Declaration => [token, `var(--ui-radius-${size})`])
      )
    }
    if (depth) {
      const [raised, floating] = SHADOWS[depth]
      declarations.push(
        ["--ui-shadow-raised", raised],
        ["--ui-shadow-floating", floating],
        ["--ui-shadow-floating-hover", "var(--ui-shadow-floating)"],
        ["--ui-shadow-overlay", "var(--ui-shadow-floating)"],
        ["--ui-card-shadow", "var(--ui-shadow-raised)"],
        ["--ui-card-hover-shadow", "var(--ui-shadow-floating)"],
        ["--ui-segment-shadow", "var(--ui-shadow-raised)"]
      )
    }
    if (glass && GLASS_THEMES.includes(base)) {
      const [surface, strong, blur] = GLASS[glass]
      declarations.push(["--glass-surface", surface], ["--glass-surface-strong", strong], ["--glass-blur", blur])
    }
    return declarations
  }

  ////////////////
  // ## On the page
  ////////////////

  /**
   * Show it on the page:  its base theme applied (`UI.themes`), then this sheet on top (`EDITS_SHEET`).
   * - SIDE EFFECT:  page-wide, every element on the page follows;  replaces the sheet applied before.
   * - Calls racing:  the LAST one wins (`putOnPage()` counts too), even when an earlier base loads later.
   * - Throws a `TypeError` when the base isn't a theme (`UI.themes.apply()`).
   */
  async applyToPage(): Promise<void> {
    const call = ++ThemeSheet.calls
    const { themes, styles } = await UI.load()
    if (themes.current !== this.choices.base) await themes.apply(this.choices.base)
    if (call === ThemeSheet.calls) styles.register(EDITS_SHEET, this.css, { page: true })
  }

  /**
   * Put `css` on the page as the edited theme's sheet, at once (`""`:  none);  a pending `applyToPage()` won't land.
   * - SIDE EFFECT:  page-wide.  The runtime must be in (`UI.styles`).
   */
  static putOnPage(css: string): void {
    ThemeSheet.calls++
    UI.styles.register(EDITS_SHEET, css, { page: true })
  }

  /** Counts `applyToPage()` and `putOnPage()` calls:  only the last one's sheet lands. */
  private static calls = 0

  ////////////////
  // ## Helpers
  ////////////////

  /** Font `font`'s stack, for `font-family`:  the editor shows each font in itself. */
  static fontStack(font: UIT.ThemeFont): string {
    return FONT_STACKS[font]
  }

  /** The tokens that point a role (`primary`) at a hue:  the colour, and the text on it, in both schemes. */
  private static hueRoles(role: string, hue: UIT.ThemeHue): Declaration[] {
    return [
      [`--ui-${role}`, `var(--ui-${hue})`],
      [`--ui-${role}-inverted`, `var(--ui-${hue}-inverted)`],
      [`--ui-${role}-on`, `var(--ui-${hue}-on)`],
      [`--ui-${role}-inverted-on`, `var(--ui-${hue}-inverted-on)`]
    ]
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

/** What `new ThemeSheet()` takes. */
export type ThemeSheetProps = {
  /** the choices it's made from */
  choices: UIT.ThemeChoices
  /** its comments' words:  the editor's texts */
  text: ThemeEditorText
}

/** One commented group of a sheet's declarations. */
export type ThemeSheetGroup = {
  /** its comment:  the editor's band, `Color` */
  readonly title: string
  /** its custom properties, each `[name, value]` */
  readonly declarations: readonly Declaration[]
}

/** One custom property:  `[name, value]`. */
type Declaration = readonly [string, string]

/** The primary colour's text:  `colors.css`' recipe (a theme may have replaced it with a fixed colour). */
const PRIMARY_TEXT =
  "light-dark(oklch(from var(--ui-primary) min(l, 0.5) c h), oklch(from var(--ui-primary) max(l, 0.78) c h))"

/** The primary colour's headers:  `colors.css`' recipe. */
const PRIMARY_HEADER =
  "light-dark(oklch(from var(--ui-primary) min(l, 0.45) c h), oklch(from var(--ui-primary) max(l, 0.85) c h))"

/** The primary colour's tinted background:  `colors.css`' recipe. */
const PRIMARY_BACKGROUND =
  "light-dark(oklch(from var(--ui-primary) 0.96 calc(c * 0.25) h), " +
  "oklch(from var(--ui-primary) 0.28 calc(c * 0.35) h))"

/** A focused field's border:  `colors.css`' recipe. */
const PRIMARY_FOCUS_BORDER =
  "light-dark(oklch(from var(--ui-primary) calc(l + 0.18) calc(c * 0.5) h), " +
  "oklch(from var(--ui-primary) calc(l - 0.1) calc(c * 0.7) h))"

/** Each font's stack:  the platform's own faces first, nothing to download. */
const FONT_STACKS: Readonly<Record<UIT.ThemeFont, string>> = {
  system: '-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Noto Sans", Ubuntu, Cantarell, sans-serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT", "Varela Round", Quicksand, Nunito, system-ui, sans-serif',
  serif: 'Palatino, "Palatino Linotype", "Book Antiqua", P052, "URW Palladio L", serif',
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

/** The families' radius tokens, each on the radius step it takes. */
const RADIUS_TOKENS: readonly (readonly [string, "s" | "m" | "l"])[] = [
  ["--ui-button-radius", "s"],
  ["--ui-input-radius", "m"],
  ["--ui-dropdown-radius", "m"],
  ["--ui-menu-radius", "m"],
  ["--ui-message-radius", "m"],
  ["--ui-popup-radius", "m"],
  ["--ui-card-radius", "l"],
  ["--ui-segment-radius", "l"],
  ["--ui-section-radius", "l"],
  ["--ui-panel-radius", "l"],
  ["--ui-toast-radius", "l"]
]

/** Each depth's shadows:  `[raised (cards), floating (menus, popups)]`, both schemes in each. */
const SHADOWS: Readonly<Record<UIT.ThemeDepth, readonly [string, string]>> = {
  flat: [
    "0 0 0 1px light-dark(#0000000f, #ffffff14)",
    "0 0 0 1px light-dark(#00000014, #ffffff1a), " +
      "0 4px 12px light-dark(#00000014, #00000059)"
  ],
  soft: [
    "0 1px 2px light-dark(#281e500f, #00000040), " +
      "0 8px 30px light-dark(#281e501f, #00000059)",
    "0 2px 4px light-dark(#281e500f, #0000004d), " +
      "0 16px 40px light-dark(#281e5029, #00000073)"
  ],
  lifted: [
    "0 2px 4px light-dark(#281e5014, #0000004d), " +
      "0 14px 40px light-dark(#281e5033, #00000080)",
    "0 4px 8px light-dark(#281e501a, #00000059), " +
      "0 28px 64px light-dark(#281e5042, #00000099)"
  ]
}

/** Each glass choice:  `[surface, strong surface, what's behind it]`;  `frosted` is the glass themes' own. */
const GLASS: Readonly<Record<UIT.ThemeGlass, readonly [string, string, string]>> = {
  clear: [
    "light-dark(#ffffff40, #26243047)",
    "light-dark(#ffffff66, #1e1c2666)",
    "blur(18px) saturate(1.8)"
  ],
  frosted: [
    "light-dark(#ffffff73, #26243073)",
    "light-dark(#ffffff9e, #1e1c2694)",
    "blur(28px) saturate(1.7)"
  ],
  solid: [
    "light-dark(#ffffffe6, #262430eb)",
    "light-dark(#fffffff7, #1e1c26f7)",
    "none"
  ]
}
