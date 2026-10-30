import { THEME_APPLIED_EVENT } from "spell/ui/components/components.types"
import type { Styles } from "./Styles"

/****************
 * ### `Themes`
 * The theme sheets (`src/styles/themes/*.css`), loaded on demand, and the one switch that applies them, as
 * `UI.themes`:  `await UI.load()`, then `UI.themes.apply("merlot")`.
 * - In the runtime's lazy chunk (`UIRuntime` builds it), beside `UI.styles`, the registry it applies into.  Never in
 *   `spell/ui/styles`, which stays pure data:  code there needed Rolldown's helpers in a chunk `core` doesn't load, so
 *   every page fetched a `rolldown-runtime-<hash>.js` (epic `wwod-spell-ui`, I13).
 * - Registry:  a LITERAL `import.meta.glob()` of the themes folder (`THEME_LOADERS`), so a new `<name>.css` there is a
 *   theme with no edit anywhere.  Lazy:  each sheet is its own chunk, loaded the first time it's applied.
 *   - The folder's TOP level only:  Fomantic's 23 themes and their fonts are archived in `themes/archive/`
 *     (epic `debut` P17), in no bundle and no test, kept only to copy from.
 * - Every theme is a DELTA on Fomantic's default look, which is our `classic.css`.  So applying a theme
 *   registers TWO sheets, `classic` then the theme, both `@layer ui.theme`:  the theme wins ties by order.
 * - Both go on the page AND into every component shadow root (`UI.styles.register(..., { page, shadow })`):
 *   - tokens on `:root` reach components by inheritance either way
 *   - the theme's class-grammar overrides (`.ui.button { ... }`) only reach component markup from INSIDE the root
 * - Sheets in the folder that are NOT themes a menu lists:
 *   - `classic`:  the base every Fomantic theme sits on;  `apply("classic")` applies it alone
 *   - `dark`:  a colour SCHEME, not a look;  switch it with `color-scheme` / `ui-dark` / `<ui-root theme>`, on top
 *     of any theme.  `apply("dark")` throws.
 *   - `spell`, `glass`, `fruity`, `merlot`, `paper`, `midnight`, `crisp`, `pop` and `matrix`:
 *     OUR OWN themes (`own`), the ONE set every place lists (epic `debut` P17):
 *     - `spell`:  the Spell brand, as Claude Design draws it
 *     - `glass`:  macOS's look today, translucent glass surfaces on a solid page
 *     - `fruity`:  Glass on a pastel wallpaper (it extends `glass`:  its sheet imports `glass.css`)
 *     - `merlot`:  a code studio in wine reds, flat panels a step off the page
 *     - `paper`, `midnight`, `crisp` and `pop` (epic `debut` P20):  warm and bookish, dark and glowing, high
 *       contrast (text at 7:1), playful stickers
 *     - `matrix`:  a dark ops console, a mint accent, its labels in the monospace (Owen, 2026-10-26)
 *     - applied exactly like a Fomantic theme (on `classic`), but a picker lists them apart
 *     - written as DATA (epic `debut` P18):  each a theme file, `<name>.theme.json5`, its values in the theme tree's
 *       nested groups;  its sheet here is GENERATED from it (`ThemeFile`, `yarn gen:styles`), so this class still
 *       reads only sheets
 *     - a theme kept under an old name (`studio`, `spell-brand`):  `RENAMED`
 * - Registry names in `UI.styles` (`slots`):  `classic` (the base), `theme` (the current theme) and `tint` (a tint
 *   worn over it, epic `debut` P23).  ONE of each, so switching replaces its text in place.
 ****************/
export class Themes {
  /**
   * Old theme name => its name now, for a theme remembered under the old one (`ThemePreference`, `SavedTheme`).
   * - `studio` became `merlot`, and `spell-brand` folded into `spell` (epic `debut` P17, J94).
   * - A remembered name in neither `own` nor here (`classic`, a Fomantic theme):  the place's own default.
   */
  static readonly RENAMED: Readonly<Record<string, string>> = { studio: "merlot", "spell-brand": "spell" }

  /** the base sheet every Fomantic theme is applied on top of */
  readonly base = BASE

  /** our own themes (not Fomantic ports), in a picker's order:  applied like one */
  readonly own: readonly string[] = [
    // a Spell admin's Save into Spell UI adds a theme between the markers (epic `debut` P25):  keep them
    // own:start
    "spell",
    "glass",
    "fruity",
    "merlot",
    "paper",
    "midnight",
    "crisp",
    "pop",
    "matrix"
    // own:end
  ]

  /** `UI.styles` names:  base slot and theme slot */
  readonly slots = { base: BASE, theme: "theme", tint: "tint" } as const

  /** every sheet in the folder, `classic` and `dark` included, A-Z */
  readonly sheets: readonly string[] = Object.keys(THEME_LOADERS).sort()

  /** name last passed to `apply()`, `undefined` for our own look */
  current: string | undefined

  /** the registry themes apply into:  the runtime's `UI.styles`, for the object's life */
  private readonly styles: Styles

  /** counts `apply()` calls, so a slow earlier one can't land after a later one */
  private calls = 0

  constructor({ styles }: ThemesProps) {
    this.styles = styles
  }

  /** Is `name` a sheet in the themes folder? */
  has(name: string): boolean {
    return name in THEME_LOADERS
  }

  /**
   * CSS text of sheet `name`.
   * - SIDE EFFECT:  first call loads its chunk;  the module cache makes later calls free.
   * - Throws a `TypeError` on an unknown name.
   */
  load(name: string): Promise<string> {
    const loader = THEME_LOADERS[name]
    if (!loader) {
      throw new TypeError(`Themes.load():  no sheet \`${name}\`;  pick one of:  ${this.sheets.join(", ")}`)
    }
    return loader()
  }

  /**
   * Apply theme `name` page-wide, on the page and in every component shadow root.
   * - One of `own` (or any other sheet of the folder):  `classic` + the theme.
   * - `"classic"`:  `classic` alone.
   * - `undefined` (or `""`):  neither, our own look.
   * - Concurrent calls:  the LAST one wins, even if an earlier theme's chunk arrives after it.
   * - Throws a `TypeError` on an unknown name, or `"dark"` (see the class docs).
   * - `tint`:  a tint's sheet, worn over the theme in a slot of its own, after it (epic `debut` P23, J90):
   *   so a theme and a tint picked in a row land in order;  none:  the tint taken off.
   * - SIDE EFFECT:  once its sheets are on, `UIT.THEME_APPLIED_EVENT` on `document`.
   */
  async apply(name: string | undefined, { tint = "" }: { tint?: string } = {}): Promise<void> {
    if (name === "") name = undefined
    if (name !== undefined && (!this.has(name) || name === DARK)) {
      throw new TypeError(
        `Themes.apply():  \`${name}\` isn't a theme;  pick \`${BASE}\` or one of:  ${this.own.join(", ")}`
      )
    }
    const call = ++this.calls
    this.current = name
    const base = name === undefined ? "" : await this.load(BASE)
    const theme = name === undefined || name === BASE ? "" : await this.load(name)
    if (call !== this.calls) return
    const options = { page: true, shadow: true }
    // `register()` keeps first-registration order, and the theme MUST follow the base, the tint the theme:  without
    // the base, drop the theme and the tint first, so all three go back in order
    if (!this.styles.has(this.slots.base)) {
      this.styles.register(this.slots.theme, "", options)
      this.styles.register(this.slots.tint, "", options)
    }
    this.styles.register(this.slots.base, base, options)
    this.styles.register(this.slots.theme, theme, options)
    this.styles.register(this.slots.tint, name === undefined ? "" : tint, options)
    if (typeof document !== "undefined")
      document.dispatchEvent(new CustomEvent(THEME_APPLIED_EVENT, { detail: { name } }))
  }

  /**
   * Theme `name`'s TOKENS, re-declared on `scope` (a selector, e.g. `.Inspector`):  CSS text for a page sheet.
   * - So one part of a page wears another theme:  its colours, fonts, sizes, radii and shadows,
   *   inherited into every element inside it, shadow roots too.
   * - What it re-declares, in this order, so later ones win as on `:root`:
   *   - the page's own `:root` tokens (the foundation sheets), but not the page's theme
   *   - `classic`, then `name`
   *   - Every `:root` rule, its selector on `scope` (`:root.ui-dark` => `:root.ui-dark .Inspector`),
   *     inside the same `@media` / `@supports` it sits in.
   *   - Why the foundation too:  its tokens are worked out from the theme's (`--ui-primary-hover` ...),
   *     and a custom property's `var()` resolves where it's declared:  on `:root`, they'd keep the page's.
   * - NOT the theme's class-grammar rules (`.ui.button { ... }`):  those go on the whole page or nowhere.
   * - NOT the scheme (`SCHEME_PROPERTIES`):  light or dark stays the page's, inherited.
   *   - The foundation's `:root { color-scheme: light dark }`, re-declared on `scope`, made it follow the OS:
   *     on a page set to dark under a light OS, the Inspector's tree read dark grey on near-black (epic `debut` I80).
   * - Throws a `TypeError` on an unknown name, as `load()`.
   */
  async scopedTokens(name: string, scope: string): Promise<string> {
    const [base, theme] = await Promise.all([this.load(BASE), this.load(name)])
    const pageTheme = [this.styles.sheet(this.slots.base), this.styles.sheet(this.slots.theme)]
    const foundation =
      typeof document === "undefined" ? [] : document.adoptedStyleSheets.filter((sheet) => !pageTheme.includes(sheet))
    const parsed = [base, theme].map((text) => {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(text)
      return sheet
    })
    return [...foundation, ...parsed].map((sheet) => rootRulesOn(sheet.cssRules, scope)).join("\n")
  }
}

/**
 * `rules`' `:root` rules, re-declared on `scope`, as CSS text:  see `Themes.scopedTokens()`.
 * - Into `@media` / `@supports` blocks, kept round what they hold;  through `@layer` blocks, dropped
 *   (on `scope` itself, a declaration beats an inherited one whatever its layer).
 * - A selector whose `:root` is followed by more of the selector (`:root :where(h1)`) isn't a token rule:  left out.
 */
function rootRulesOn(rules: CSSRuleList, scope: string): string {
  const out: string[] = []
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      const selectors = rule.selectorText
        .split(",")
        .map((selector) => selector.trim())
        .filter((selector) => ROOT_ONLY.test(selector))
      const tokens = rule.style.cssText.replace(SCHEME_DECLARATIONS, "")
      if (selectors.length && tokens.trim())
        out.push(`${selectors.map((selector) => `${selector} ${scope}`).join(", ")} { ${tokens} }`)
    } else if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
      const inner = rootRulesOn(rule.cssRules, scope)
      if (inner) out.push(`@${rule instanceof CSSMediaRule ? "media" : "supports"} ${rule.conditionText} { ${inner} }`)
    } else if (rule instanceof CSSLayerBlockRule) {
      out.push(rootRulesOn(rule.cssRules, scope))
    }
  }
  return out.filter(Boolean).join("\n")
}

/**
 * What says light or dark, left to the page by `Themes.scopedTokens()`:  a scope re-declaring them would pick its
 * own scheme (the foundation's `light dark`:  the OS's), not the one the page was set to.
 */
const SCHEME_PROPERTIES = ["color-scheme", "--ui-scheme"]
/** `SCHEME_PROPERTIES`' declarations in a rule's `cssText` (`color-scheme: light dark; `). */
const SCHEME_DECLARATIONS = new RegExp(`(?<=^|;\\s*)(?:${SCHEME_PROPERTIES.join("|")})\\s*:[^;]*;\\s*`, "g")

/** A selector that is `:root` alone, perhaps with classes or states on it (`:root.ui-dark`). */
const ROOT_ONLY = /^:root(?:[.:[][^\s>+~]*)?$/

/** What `new Themes()` takes. */
export type ThemesProps = {
  /** the registry themes apply into:  the runtime's `styles` */
  styles: Styles
}

/** The base sheet every Fomantic theme is applied on top of. */
const BASE = "classic"

/** The colour-scheme sheet:  in the folder, but no theme (`apply()` refuses it). */
const DARK = "dark"

/**
 * Sheet name (`merlot`) => loader of its CSS text (`?inline`:  Lightning CSS-processed, minified in builds).
 * - NOTE: `import.meta.glob()` MUST stay a literal call:  Vite rewrites it at build time.
 * - RELATIVE, the one `../` in `ui`'s source:  a glob takes no tsconfig alias, and a root-absolute one
 *   (`/src/...`) breaks in a build rooted elsewhere (`brand`'s).
 */
const THEME_LOADERS: Readonly<Record<string, () => Promise<string>>> = Object.fromEntries(
  Object.entries(import.meta.glob<string>("../styles/themes/*.css", { query: "?inline", import: "default" })).map(
    ([path, loader]) => [path.replace(/^.*\//, "").replace(/\.css$/, ""), loader]
  )
)
