// Import directly:  in `core`'s util barrel the pref store cost every page 1.9 kB
import { ColorScheme } from "spell/util/persist/ColorScheme"
import { PrefStore } from "spell/util/persist/PrefStore"
import { COLOR_SCHEME_KEY, OLD_COLOR_SCHEME_KEYS } from "spell/util/persist/persist.types"
import { E, UI } from "spell-ui/core"
import {
  DOCS_DEFAULT_THEME,
  DOCS_LOOK_KEYS,
  DOCS_PLAIN_THEME,
  DOCS_SCHEME_SWITCHING,
  type DocsLook,
  type DocsScheme,
  type DocsShownScheme
} from "./docs-components.types"

/****************
 * ### `ThemePreference`
 * The docs site viewer's LOOK -- theme (`UI.themes`) and colour scheme --
 * remembered per viewer, re-applied on every page.
 * `<ui-docs-themes>` changes it;  the site entry (`site/_src/site.ts`) calls `restore()` once per page.
 * - Theme:  `defaultTheme` (the docs: `DOCS_DEFAULT_THEME`, `spell`, the brand) until the viewer picks another;
 *   picking Plain (our own look, `undefined`) is stored as `DOCS_PLAIN_THEME`, so it outlives the page.
 * - Stored in `localStorage` (`DOCS_LOOK_KEYS`), through `PrefStore`:
 *   a private window or blocked storage just forgets between pages.
 *   The look is ALSO kept in memory, so it works for the page either way.
 * - Scheme:  the kit's `ColorScheme` (`spell/util/persist`), the one choice every Spell site shares
 *   with `<spell-site-header>` on the docs, epic pages and saga pages:
 *   its key, its old keys moved once, `ui-light` / `ui-dark` and inline `color-scheme` on `<html>`.
 *   - Here, following the OS is called `system`.
 *   - For the frame it switches in, `DOCS_SCHEME_SWITCHING` is on `<html>` too:
 *     a theme can turn transitions off under it.
 * - `system` follows the OS:  `shownScheme()` resolves it (`ColorScheme.osScheme()`),
 *   and `subscribe()`d listeners hear when the OS switches (the icon showing the scheme stays right).
 *   - Other tabs' switches arrive the same way (`ColorScheme.watch()`).
 * - Before first paint:  a module script runs too late,
 *   so pages inline `HEAD_SCRIPT` in `<head>` (the page template, `templates/spell-ui-docs.html`).
 *   - It re-applies the SCHEME synchronously.
 *   - The THEME can't be:  its sheet is a lazy chunk.
 *     `restore()` starts that load as the site bundle evaluates, alongside the families' own chunks,
 *     so it usually lands with their first render;  page text may flash the default look for a frame.
 * - Several pickers on one page (the right column's, a components page's `for` one)
 *   stay in step through `subscribe()`.
 * - Imports the core entry (`UI`, `spell-ui/core`), which the site entry loads anyway;
 *   the runtime chunk (`UI.themes`) loads only to apply a theme.
 * - Static only:  the look is one per page.
 * - Another site reuses it with its own default theme and theme key (`site()`):
 *   the editor app starts in `fruity`, and remembers its theme apart from the docs';  the SCHEME stays shared.
 ****************/
export class ThemePreference {
  /** The theme a viewer who never picked one sees:  `DOCS_DEFAULT_THEME`, unless a site set its own (`site()`). */
  static defaultTheme: string = DOCS_DEFAULT_THEME

  /** The `localStorage` key of the chosen theme:  `DOCS_LOOK_KEYS.theme`, unless a site set its own (`site()`). */
  static themeKey: string = DOCS_LOOK_KEYS.theme

  /**
   * Make this page another site's:  its own default theme, and its own key for the chosen theme.
   * - Call BEFORE the first read (`restore()`, a picker):  a look read before stays in memory.
   * - e.g. the editor app:  `ThemePreference.site({ defaultTheme: "fruity", themeKey: "spell-app:theme" })`
   */
  static site({ defaultTheme, themeKey }: ThemeSite): void {
    ThemePreference.defaultTheme = defaultTheme
    ThemePreference.themeKey = themeKey
  }

  /**
   * Inline `<head>` script re-applying the stored scheme before first paint, as `applyScheme()` does.
   * - The page template (`templates/spell-ui-docs.html`) inlines it, in `<head>` before the stylesheet `<link>`.
   * - ES5, no dependencies, never throws:  so it reads the key raw, not through `PrefStore`,
   *   whose text it matches (a scheme is kept as `dark`, unquoted).
   * - Reads the old keys too (`OLD_COLOR_SCHEME_KEYS`) while the new one is absent:  `restore()` moves them over.
   * - Its keys are `ColorScheme`'s own constants;  every page that inlines it holds a copy of its text.
   */
  static readonly HEAD_SCRIPT =
    `try{var l=localStorage,d=document.documentElement,s=` +
    [COLOR_SCHEME_KEY, ...OLD_COLOR_SCHEME_KEYS].map((key) => `l.getItem(${JSON.stringify(key)})`).join("||") +
    `;if(s==="light"||s==="dark"){d.classList.add("ui-"+s);d.style.colorScheme=s}}catch(e){}`

  /** The look now:  stored on first read, then kept in memory. */
  static get look(): DocsLook {
    return (ThemePreference.current ??= ThemePreference.read())
  }

  /** The scheme the OS asks for (`ColorScheme.osScheme()`);  `light` where there's no `matchMedia` (a server). */
  static osScheme(): DocsShownScheme {
    return ColorScheme.osScheme()
  }

  /** The scheme the page SHOWS:  the chosen one, or while following the OS, the OS's. */
  static shownScheme(scheme: DocsScheme = ThemePreference.look.scheme): DocsShownScheme {
    return scheme === "system" ? ThemePreference.osScheme() : scheme
  }

  /**
   * Choose theme `name` (`undefined` or `""`:  our own look):  remember it, tell subscribers, apply it.
   * - Resolves once its sheets are registered.
   * - An unknown name (a renamed sheet) is forgotten:  the default theme.
   */
  static async setTheme(name: string | undefined): Promise<void> {
    const theme = name || undefined
    ThemePreference.update({ ...ThemePreference.look, theme })
    const stored = theme === ThemePreference.defaultTheme ? undefined : (theme ?? DOCS_PLAIN_THEME)
    ThemePreference.store(ThemePreference.themeKey, stored)
    await ThemePreference.applyTheme(theme)
  }

  /** Choose colour scheme `scheme` (`system`:  follow the OS):  remember it, tell subscribers, show it on `<html>`. */
  static setScheme(scheme: DocsScheme): void {
    ThemePreference.update({ ...ThemePreference.look, scheme })
    ThemePreference.withoutTransitions(document.documentElement)
    ColorScheme.choose(chosenFor(scheme))
  }

  /** Flip the scheme the page shows, light <-> dark, and remember it (no longer following the OS).  Returns it. */
  static flipScheme(): DocsShownScheme {
    const next = ThemePreference.shownScheme() === "dark" ? "light" : "dark"
    ThemePreference.setScheme(next)
    return next
  }

  /**
   * Show `scheme` on `root` (default `<html>`):
   * its `ui-light` / `ui-dark` class (the other one off) and the same inline `color-scheme`;  `system`:  neither.
   * - SIDE EFFECT:  `DOCS_SCHEME_SWITCHING` on `root` until the frame after next (`withoutTransitions()`).
   */
  static applyScheme(scheme: DocsScheme, root: HTMLElement = document.documentElement): void {
    ThemePreference.withoutTransitions(root)
    ColorScheme.apply(chosenFor(scheme), root)
  }

  /**
   * Re-apply the stored look:  the scheme at once, the theme once its sheets load.  Call once per page.
   * - SIDE EFFECT:  from then on, follows the OS's scheme and other tabs' switches (`watch()`).
   */
  static async restore(): Promise<void> {
    const { theme, scheme } = ThemePreference.look
    ThemePreference.applyScheme(scheme)
    ThemePreference.watch()
    if (theme !== undefined) await ThemePreference.applyTheme(theme)
  }

  /**
   * Call `listener` with the look on every change --
   * and when the OS switches scheme, since the scheme the page shows changed (`shownScheme()`);
   * returns the unsubscribe.
   * - SIDE EFFECT:  starts watching the OS and other tabs (`watch()`), once.
   */
  static subscribe(listener: (look: DocsLook) => void): () => void {
    ThemePreference.watch()
    ThemePreference.listeners.add(listener)
    return () => {
      ThemePreference.listeners.delete(listener)
    }
  }

  /**
   * The OS switched scheme:  tell listeners, since the scheme the page shows changed while following it.
   * - Called by the `prefers-color-scheme` watch (`watch()`);  public for tests, which can't switch the OS.
   */
  static osChanged(): void {
    ThemePreference.tell(ThemePreference.look)
  }

  /** Forget the in-memory look (tests):  the next read goes back to storage. */
  static reset(): void {
    ThemePreference.current = undefined
  }

  ////////////////
  // ## Internals
  ////////////////

  /** The look in memory;  `undefined` until first read. */
  @E.state private static accessor current: DocsLook | undefined = undefined

  /** `subscribe()`d listeners. */
  private static readonly listeners = new Set<(look: DocsLook) => void>()

  /**
   * Once per page, through `ColorScheme.watch()`:
   * - tell listeners when the OS switches scheme (the shown scheme changed while following it)
   * - take other tabs' scheme switches:  ColorScheme applied it, this keeps the look in step
   * - page-wide for the page's life:  nothing to undo
   */
  @E.once private static watch(): void {
    ColorScheme.watch((change) => {
      if (change === "os") return ThemePreference.osChanged()
      ThemePreference.update({ ...ThemePreference.look, scheme: ColorScheme.chosen() ?? "system" })
    })
  }

  /**
   * Put `DOCS_SCHEME_SWITCHING` on `root` until the frame after next:
   * the first frame paints the new scheme with transitions off, the second turns them back on.
   * - A second switch meanwhile just ends it a frame early.
   */
  private static withoutTransitions(root: Element): void {
    if (typeof requestAnimationFrame !== "function") return
    root.classList.add(DOCS_SCHEME_SWITCHING)
    E.beforeNextPaint(() => E.beforeNextPaint(() => root.classList.remove(DOCS_SCHEME_SWITCHING)))
  }

  /** Set the look in memory and tell subscribers, if it changed. */
  private static update(look: DocsLook): void {
    const old = ThemePreference.look
    ThemePreference.current = look
    if (old.theme === look.theme && old.scheme === look.scheme) return
    ThemePreference.tell(look)
  }

  /** Call every listener with `look`. */
  private static tell(look: DocsLook): void {
    for (const listener of [...ThemePreference.listeners]) listener(look)
  }

  /**
   * Apply theme `name` with `UI.themes` (the runtime loaded now, if need be).
   * - Only a picker's names:  one of ours (`UI.themes.own`), `classic` or a Fomantic theme (`UI.themes.names`);
   *   anything else is forgotten, for the default theme.
   */
  private static async applyTheme(name: string | undefined): Promise<void> {
    const { themes } = await UI.load()
    const known = [...themes.own, themes.base, ...themes.names]
    if (name !== undefined && !known.includes(name)) {
      const fallback = ThemePreference.defaultTheme
      return ThemePreference.setTheme(name === fallback ? undefined : fallback)
    }
    await themes.apply(name)
  }

  /** The stored look;  anything unreadable is the default (`defaultTheme`, `system`). */
  private static read(): DocsLook {
    const theme = ThemePreference.load(ThemePreference.themeKey) || ThemePreference.defaultTheme
    return {
      theme: theme === DOCS_PLAIN_THEME ? undefined : theme,
      scheme: ColorScheme.chosen() ?? "system"
    }
  }

  /** The text kept at `key` (`spell-ui-site:theme`), or `undefined`:  none, or not text. */
  private static load(key: string): string | undefined {
    const value = PrefStore.getAt(key)
    return typeof value === "string" ? value : undefined
  }

  /**
   * Keep `value` at `key` (`undefined`:  forget it).
   * - Storage blocked:  kept for this page (`PrefStore`'s memory).
   */
  private static store(key: string, value: string | undefined): void {
    PrefStore.setAt(key, value)
  }
}

/** What `ThemePreference.site()` takes:  another site's own theme settings. */
export type ThemeSite = {
  /** the theme a viewer who never picked one sees, e.g. `fruity` */
  defaultTheme: string
  /** the `localStorage` key of the chosen theme, e.g. `spell-app:theme` */
  themeKey: string
}

/** `scheme` as `ColorScheme` keeps it:  `system` is nothing chosen. */
function chosenFor(scheme: DocsScheme): DocsShownScheme | undefined {
  return scheme === "system" ? undefined : scheme
}
