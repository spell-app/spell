import {
  COLOR_SCHEME_CLASSES,
  COLOR_SCHEME_KEY,
  ColorSchemeNames,
  DARK_QUERY,
  OLD_COLOR_SCHEME_KEYS,
  type ColorSchemeChange,
  type ColorSchemeName
} from "./persist.types"
import { PrefStore } from "./PrefStore"

/** The query parameter a page's address says its scheme in:  `?scheme=dark`. */
const ADDRESS_PARAM = "scheme"

/** `ColorScheme.addressed` before the address is read. */
const NOT_READ = Symbol("not read")

/****************
 * ### `ColorScheme`
 * The light / dark choice a person makes once, for every Spell site:  remembered, shown on the page, and followed.
 * - Kept under ONE key (`COLOR_SCHEME_KEY`), through a `PrefStore`:  `light`, `dark`, or nothing to follow the OS.
 *   - The keys it lived under before are moved over once (`OLD_COLOR_SCHEME_KEYS`).
 * - Shown as `ui-light` / `ui-dark` on `<html>` (`COLOR_SCHEME_CLASSES`:  Spell UI's tokens follow them)
 *   AND as inline `color-scheme`:  for pages without Spell UI's sheets, and `light-dark()`.
 * - Followed:  the OS switching, and another tab choosing (`watch()`).
 * - A page's ADDRESS can say it for one visit:  `?scheme=light` or `?scheme=dark` wins over the one kept, and is never
 *   kept;  choosing one (`choose()`) drops it.  Any other value is ignored, with a warning.
 *   - So every Spell page opens in the scheme a link asks for (the theme bench's ↗;  Spell UI's `ThemePreference`
 *     reads `?theme=` beside it).
 * - Its users:
 *   - the site header on the docs, epic pages and saga pages (the kit's `SiteHeader`), a sun / moon button
 *   - Spell UI's `ThemePreference`, which keeps a theme beside it and calls following the OS `system`
 *   - the editor app's code colours (`CodeThemes`), which only read it
 * - Static only:  one per page.
 * - Safe outside a browser (a server drawing a page):  nothing chosen, the OS light, nothing applied.
 * - NEVER throws:  storage that fails is `PrefStore`'s, which logs and forgets.
 ****************/
export class ColorScheme {
  /**
   * The scheme chosen, or `undefined`:  follow the OS.
   * - The address's (`?scheme=dark`) first, for this visit, until one is chosen here.
   * - SIDE EFFECT:  while nothing's kept, moves an old key's scheme over, once (`OLD_COLOR_SCHEME_KEYS`).
   */
  static chosen(): ColorSchemeName | undefined {
    return ColorScheme.fromAddress() ?? schemeOf(PrefStore.getAt(COLOR_SCHEME_KEY)) ?? ColorScheme.moveOldKeys()
  }

  /** Remember `scheme` (`undefined`:  follow the OS again), and show it on the page (`apply()`). */
  static choose(scheme: ColorSchemeName | undefined): void {
    ColorScheme.addressed = undefined
    PrefStore.setAt(COLOR_SCHEME_KEY, scheme)
    ColorScheme.apply(scheme)
  }

  /**
   * Show `scheme` on `root` (default `<html>`):  its class (the other one off) and the same inline `color-scheme`.
   * - `undefined`:  neither, so the page's own `color-scheme` (`light dark`) follows the OS
   */
  static apply(scheme: ColorSchemeName | undefined, root?: HTMLElement): void {
    root ??= globalThis.document?.documentElement
    if (!root) return
    root.classList.toggle(COLOR_SCHEME_CLASSES.light, scheme === "light")
    root.classList.toggle(COLOR_SCHEME_CLASSES.dark, scheme === "dark")
    if (scheme) root.style.colorScheme = scheme
    else root.style.removeProperty("color-scheme")
  }

  /** Read the address's `?scheme=` again, next time it's asked for (tests, and `ThemePreference.reset()`). */
  static rereadAddress(): void {
    ColorScheme.addressed = NOT_READ
  }

  /** The address's scheme for this visit (`?scheme=`);  `NOT_READ` until first asked, `undefined`:  none, or chosen since. */
  private static addressed: ColorSchemeName | undefined | typeof NOT_READ = NOT_READ

  /** The address's scheme (`addressed`), read on first use;  a value that's neither scheme is ignored, warned. */
  private static fromAddress(): ColorSchemeName | undefined {
    if (ColorScheme.addressed !== NOT_READ) return ColorScheme.addressed
    const search = globalThis.location?.search ?? ""
    const value = new URLSearchParams(search).get(ADDRESS_PARAM) || undefined
    const scheme = schemeOf(value)
    if (value && !scheme)
      console.warn(`ColorScheme:  the address's scheme \`${value}\` is neither light nor dark;  ignored`)
    return (ColorScheme.addressed = scheme)
  }

  /** The scheme the OS asks for (`DARK_QUERY`);  `light` where there's no `matchMedia` (a server). */
  static osScheme(): ColorSchemeName {
    return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches ? "dark" : "light"
  }

  /**
   * The scheme `classes` (`<html>`'s) force, or `undefined` when neither class is on (the page follows the OS).
   * - Why:  a page may switch its own scheme (the editor app's pill), so what it SHOWS is read from `<html>`.
   */
  static forcedBy(classes: { contains(token: string): boolean }): ColorSchemeName | undefined {
    if (classes.contains(COLOR_SCHEME_CLASSES.dark)) return "dark"
    if (classes.contains(COLOR_SCHEME_CLASSES.light)) return "light"
    return undefined
  }

  /** The scheme the page shows:  what `<html>`'s classes force, else the one chosen, else the OS's. */
  static shown(): ColorSchemeName {
    const root = globalThis.document?.documentElement
    return (root && ColorScheme.forcedBy(root.classList)) ?? ColorScheme.chosen() ?? ColorScheme.osScheme()
  }

  /**
   * Call `listener` when the scheme a page should show may have changed;  returns the stop.
   * - `os`:  the OS switched
   * - `chosen`:  another tab chose (a `storage` event):  applied here first, so the listener only re-draws
   * - Outside a browser:  never called.
   */
  static watch(listener: (change: ColorSchemeChange) => void): () => void {
    if (typeof window === "undefined" || typeof matchMedia !== "function") return () => {}
    const os = matchMedia(DARK_QUERY)
    const onOs = () => listener("os")
    const onStorage = (event: StorageEvent) => {
      // `null`:  the other tab cleared all its storage
      if (event.key !== COLOR_SCHEME_KEY && event.key !== null) return
      ColorScheme.apply(ColorScheme.chosen())
      listener("chosen")
    }
    os.addEventListener("change", onOs)
    window.addEventListener("storage", onStorage)
    return () => {
      os.removeEventListener("change", onOs)
      window.removeEventListener("storage", onStorage)
    }
  }

  /**
   * Move the scheme from its old keys (`OLD_COLOR_SCHEME_KEYS`):
   * the first valid one is kept under `COLOR_SCHEME_KEY`, and every old key removed, so this runs once.
   * - Returns the scheme moved, else `undefined`.
   */
  private static moveOldKeys(): ColorSchemeName | undefined {
    let found: ColorSchemeName | undefined
    for (const key of OLD_COLOR_SCHEME_KEYS) {
      found ??= schemeOf(PrefStore.getAt(key))
      PrefStore.setAt(key, undefined)
    }
    if (found) PrefStore.setAt(COLOR_SCHEME_KEY, found)
    return found
  }
}

/** `value` when it's a scheme (`light` / `dark`), else `undefined`. */
function schemeOf(value: unknown): ColorSchemeName | undefined {
  return ColorSchemeNames.includes(value as ColorSchemeName) ? (value as ColorSchemeName) : undefined
}
