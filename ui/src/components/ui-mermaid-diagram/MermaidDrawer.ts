import { E } from "spell/ui/core"
import {
  DarkTwins,
  DEFAULT_MERMAID_THEME,
  MAY_NAME_ICON,
  MermaidLookNames,
  MermaidThemeNames,
  SpellDiagramSettings,
  SpellThemeTokens,
  type MermaidLook,
  type MermaidThemeName,
  type SpellThemeScheme
} from "spell/util/diagram/MermaidThemes"
import type { MermaidEngine } from "./MermaidEngine"

/****************
 * ### `MermaidDrawer`
 * What `<ui-mermaid-diagram>` asks to draw:  loads Mermaid on first use, and turns the element's settings into
 * Mermaid's.
 * - `load()`:  the engine (`MermaidEngine`), in its own lazy chunk;  its loader is replaceable.
 * - `configFor()`:  the theme, its colours, the look, the layout and the seed, as Mermaid's settings.
 *   - `spell`:  Mermaid's `base` theme, filled from Spell UI's tokens, read from the page (`SpellThemeTokens`)
 *   - a light preset on a dark drawing:  its dark twin (`DarkTwins`)
 *   - an unknown name:  `spell`, with a warning naming the ones it knows
 * - `schemeOf()`:  whether the page around an element shows light or dark, as `light-dark()` resolves there:
 *   whatever switched it (the theme menu, the site header, the OS), it reads the outcome.
 * - Static:  the engine's load is page-wide, started once and shared by every drawing.
 ****************/
export class MermaidDrawer {
  /**
   * Imports the engine module;  read once, on the first draw.
   * - Replaceable, e.g. by a bundle that can't keep `import()`s.
   */
  static engineLoader: () => Promise<{ MermaidEngine: typeof MermaidEngine }> = () => import("./MermaidEngine")

  /** Mermaid, loaded on first use;  the import starts once. */
  @E.once static load(): Promise<typeof MermaidEngine> {
    return MermaidDrawer.engineLoader().then((module) => module.MermaidEngine)
  }

  /**
   * Mermaid's settings for a drawing:  `theme` (Spell's, or a preset) in `scheme`, `look`, `layout` and `seed`.
   * - `probe`:  an element inside the drawing, which `spell`'s tokens are read on.
   * - A setting in the diagram's own text (its front matter) still wins:  Mermaid applies it over these.
   */
  static configFor(probe: HTMLElement, { theme, scheme, look, layout, seed }: DrawSettings): Record<string, unknown> {
    const name = MermaidDrawer.knownTheme(theme)
    const config: Record<string, unknown> = {
      look: MermaidLookNames[look] ?? MermaidLookNames.classic,
      handDrawnSeed: seed,
      // a copy:  Mermaid fills in the nested objects it's given as it draws
      ...structuredClone(SpellDiagramSettings)
    }
    if (layout && layout !== AUTO) config.layout = layout
    if (name === DEFAULT_MERMAID_THEME) {
      config.theme = BASE_THEME
      config.themeVariables = MermaidDrawer.spellVariables(probe, scheme)
    } else {
      config.theme = (scheme === "dark" && DarkTwins[name]) || name
      config.darkMode = scheme === "dark"
    }
    return config
  }

  /**
   * Might `text` name an icon (`fa:fa-car`, `icon: "pack:name"`, an architecture diagram's `(pack:name)`)?
   * - Read without Mermaid:  a drawing the page server drew ahead has none, as its icons are the page's own packs.
   * - Wide on purpose (`MAY_NAME_ICON`):  a yes only means the page draws it itself.  `MermaidEngine.iconsIn()`
   *   finds the real ones.
   */
  static mayHaveIcons(text: string): boolean {
    return MAY_NAME_ICON.test(text)
  }

  /** `theme` when it's one `theme` takes;  else `spell`, with a warning naming the ones it knows. */
  private static knownTheme(theme: string | undefined): MermaidThemeName {
    if (!theme) return DEFAULT_MERMAID_THEME
    if ((MermaidThemeNames as readonly string[]).includes(theme)) return theme as MermaidThemeName
    E.Warnings.warn(
      WARNING_SOURCE,
      `no theme "${theme}";  drawing in "${DEFAULT_MERMAID_THEME}".  The themes:  ${MermaidThemeNames.join(", ")}`
    )
    return DEFAULT_MERMAID_THEME
  }

  ////////////////
  // ## Spell's colours, read from the page
  ////////////////

  /**
   * Mermaid's theme variables for `spell`, each read from its Spell UI token on `probe`, as `scheme` resolves it.
   * - SIDE EFFECT:  sets `probe`'s `color-scheme` and `color` while it reads, then clears them.
   */
  private static spellVariables(probe: HTMLElement, scheme: SpellThemeScheme): Record<string, string | boolean> {
    const variables: Record<string, string | boolean> = { darkMode: scheme === "dark" }
    probe.style.colorScheme = scheme
    const style = getComputedStyle(probe)
    for (const [variable, token] of Object.entries(SpellThemeTokens)) {
      if (variable === FONT_VARIABLE) {
        const font = style.getPropertyValue(token).trim()
        if (font) variables[variable] = font
        continue
      }
      probe.style.color = `var(${token})`
      const color = MermaidDrawer.plainColor(getComputedStyle(probe).color)
      if (color) variables[variable] = color
    }
    probe.style.color = ""
    probe.style.colorScheme = ""
    return variables
  }

  /**
   * The text style of `document`'s `<body>`, as Mermaid measures a drawing's labels in it:  it draws in a box it adds
   * there, so a label's width depends on the page's font, size and spacing.
   * - Part of a drawing's `look` (`lookOf()`):  one drawn on the page server is shown only on a page whose text is
   *   the same, or its labels could be cut short.
   */
  static bodyTextOf(document: Document): Record<string, string> {
    const style = getComputedStyle(document.body)
    return Object.fromEntries(BODY_TEXT.map((name) => [name, style.getPropertyValue(name)]))
  }

  /**
   * What a drawing depends on besides its text and settings, as one hash:  Mermaid's settings (its colours, read from
   * the page) and the page's text style (`bodyTextOf()`).
   * - The page server's drawings carry it (`data.look`):  an element shows one only when its own is the same.
   */
  static lookOf(config: Record<string, unknown>, bodyText: Record<string, string>): string {
    return E.stableHash({ config, bodyText })
  }

  /**
   * Is the page around `probe` showing dark?  What `light-dark()` resolves to there, whatever set it.
   * - SIDE EFFECT:  sets `probe`'s `color` while it reads, then clears it.
   */
  static schemeOf(probe: HTMLElement): SpellThemeScheme {
    probe.style.colorScheme = ""
    probe.style.color = SCHEME_PROBE
    const isDark = MermaidDrawer.plainColor(getComputedStyle(probe).color) === DARK_SIDE
    probe.style.color = ""
    return isDark ? "dark" : "light"
  }

  /**
   * `color`, any CSS colour the browser computed (`oklch(...)`, `color(srgb ...)`), as `#rrggbb` or `rgba()`:
   * Mermaid's colour maths reads only those.
   * - Painted onto a one-pixel canvas and read back:  the browser converts, and fits it into sRGB.
   * - `undefined` where there's no canvas.
   */
  private static plainColor(color: string): string | undefined {
    const pixel = MermaidDrawer.pixel
    if (!pixel) return undefined
    pixel.clearRect(0, 0, 1, 1)
    pixel.fillStyle = color
    pixel.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data
    if (a < OPAQUE) return `rgba(${r}, ${g}, ${b}, ${(a / OPAQUE).toFixed(3)})`
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`
  }

  /** The one-pixel canvas colours are read on, made on first use;  `undefined` without a canvas. */
  @E.lazy private static get pixel(): CanvasRenderingContext2D | undefined {
    if (typeof document === "undefined") return undefined
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    return canvas.getContext("2d", { willReadFrequently: true }) ?? undefined
  }
}

/** What the element draws with, from its attributes and the reader's picks. */
export type DrawSettings = {
  /** `theme`, as given:  checked here */
  theme: string | undefined
  /** light or dark, settled:  the `scheme` asked for, else the page's */
  scheme: SpellThemeScheme
  /** `look` */
  look: MermaidLook
  /** `layout`;  `auto` leaves Mermaid's choice */
  layout: string | undefined
  /** `seed`, for `hand-drawn` */
  seed: number
}

/** The `<body>` styles a label's size depends on (`MermaidDrawer.bodyTextOf()`). */
const BODY_TEXT = ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-rendering"]

/** `layout`'s value that leaves Mermaid's own choice. */
const AUTO = "auto"

/** Mermaid's theme whose colours can be set:  what `spell` is built on. */
const BASE_THEME = "base"

/** The one theme variable that's no colour:  read as the token's text. */
const FONT_VARIABLE = "fontFamily"

/** A colour that is black on a light page and white on a dark one. */
const SCHEME_PROBE = "light-dark(#000000, #ffffff)"

/** What `SCHEME_PROBE` reads as on a dark page. */
const DARK_SIDE = "#ffffff"

/** A canvas pixel's alpha when it's fully opaque. */
const OPAQUE = 255

/** `Warnings` source of this class's warnings. */
const WARNING_SOURCE = "<ui-mermaid-diagram>"
