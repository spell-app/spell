// Import directly:  in `core`'s util barrel the pref store cost every page 1.9 kB
import { ColorScheme } from "spell/util/persist/ColorScheme"
import { PrefStore } from "spell/util/persist/PrefStore"
import { COLOR_SCHEME_KEY, OLD_COLOR_SCHEME_KEYS } from "spell/util/persist/persist.types"
import { E, UI, UIT, type Themes } from "spell-ui/core"
import {
  DEFAULT_THEME,
  SCHEME_SWITCHING,
  THEME_KEYS,
  type SchemeChoice,
  type ShownScheme,
  type ThemeAndScheme
} from "./UIThemeMenu.types"

/****************
 * ### `ThemePreference`
 * The theme (`UI.themes`) and colour scheme a viewer chose,
 * remembered per viewer, re-applied on every page.
 * `<ui-theme-menu>` changes it;  a page's entry calls `restore()` once (Spell UI's site:  `site/_src/site.ts`).
 * - Theme:  `defaultTheme` (Spell UI's pages:  `DEFAULT_THEME`, `spell`) until the viewer picks another,
 *   one of Spell's own themes (`UI.themes.own`).
 *   - A theme remembered under its old name comes back as its new one (`studio` as `merlot`, `UIT.ThemeNames`).
 *   - Any other name no longer in the set (Plain, Classic, a Fomantic theme, before epic `debut` P17):
 *     the place's own default, and forgotten.
 * - Stored in `localStorage` (`THEME_KEYS`), through `PrefStore`:
 *   a private window or blocked storage just forgets between pages.
 *   The pair is ALSO kept in memory, so it works for the page either way.
 * - Scheme:  the kit's `ColorScheme` (`spell/util/persist`), the one choice every Spell site shares
 *   with `<spell-site-header>` on the docs, epic pages and saga pages:
 *   its key, its old keys moved once, `ui-light` / `ui-dark` and inline `color-scheme` on `<html>`.
 *   - Here, following the OS is called `system`.
 *   - For the frame it switches in, `SCHEME_SWITCHING` is on `<html>` too:
 *     a theme can turn transitions off under it.
 * - `system` follows the OS:  `shownScheme()` resolves it (`ColorScheme.osScheme()`),
 *   and `subscribe()`d listeners hear when the OS switches (the icon showing the scheme stays right).
 *   - Other tabs' switches arrive the same way (`ColorScheme.watch()`).
 * - Before first paint:  a module script runs too late,
 *   so pages inline `HEAD_SCRIPT` in `<head>` (the page template, `templates/spell-ui-docs.html`).
 *   - It re-applies the SCHEME synchronously.
 *   - The THEME can't be:  its sheet is a lazy chunk.
 *     `restore()` starts that load as the site bundle evaluates, alongside the families' own chunks,
 *     so it usually lands with their first render;  page text may flash the default theme for a frame.
 * - Several menus on one page (the top bar's, a components page's masthead's)
 *   stay in step through `subscribe()`.
 * - Imports the core entry (`UI`, `spell-ui/core`), which the site entry loads anyway;
 *   the runtime chunk (`UI.themes`) loads only to apply a theme.
 * - Static only:  one theme and scheme per page.
 * - Each place keeps its own default theme and theme key (`site()`, epic `debut` J87):
 *   the editor app starts in `fruity`, and remembers its theme apart from the docs';  the SCHEME stays shared.
 ****************/
export class ThemePreference {
  /** The theme a viewer who never picked one sees:  `DEFAULT_THEME`, unless a place set its own (`site()`). */
  static defaultTheme: string = DEFAULT_THEME

  /** The `localStorage` key of the chosen theme:  `THEME_KEYS.theme`, unless a place set its own (`site()`). */
  static themeKey: string = THEME_KEYS.theme

  /**
   * Make this page another place's:  its own default theme, and its own key for the chosen theme.
   * - Call before `restore()`.
   * - A menu that read the pair first (it connected as Spell UI defined it) follows the place's own:
   *   the pair is read again under the new key, and subscribers told.
   * - e.g. the editor app:  `ThemePreference.site({ defaultTheme: "fruity", themeKey: "spell-app:theme" })`
   */
  static site({ defaultTheme, themeKey }: ThemeSite): void {
    ThemePreference.defaultTheme = defaultTheme
    ThemePreference.themeKey = themeKey
    if (ThemePreference.current) ThemePreference.update(ThemePreference.read())
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

  /** The theme and scheme chosen now:  stored on first read, then kept in memory. */
  static get chosen(): ThemeAndScheme {
    return (ThemePreference.current ??= ThemePreference.read())
  }

  /** The scheme the OS asks for (`ColorScheme.osScheme()`);  `light` where there's no `matchMedia` (a server). */
  static osScheme(): ShownScheme {
    return ColorScheme.osScheme()
  }

  /** The scheme the page SHOWS:  the chosen one, or while following the OS, the OS's. */
  static shownScheme(scheme: SchemeChoice = ThemePreference.chosen.scheme): ShownScheme {
    return scheme === "system" ? ThemePreference.osScheme() : scheme
  }

  /**
   * Choose theme `name`:  remember it, tell subscribers, apply it.
   * - Resolves once its sheets are registered.
   * - An old name is taken as its new one;  a name no longer in the set is forgotten, for the default theme.
   */
  static async setTheme(name: string): Promise<void> {
    ThemePreference.update({ ...ThemePreference.chosen, theme: name })
    ThemePreference.store(ThemePreference.themeKey, name === ThemePreference.defaultTheme ? undefined : name)
    await ThemePreference.applyTheme(name)
  }

  /** Choose colour scheme `scheme` (`system`:  follow the OS):  remember it, tell subscribers, show it on `<html>`. */
  static setScheme(scheme: SchemeChoice): void {
    ThemePreference.update({ ...ThemePreference.chosen, scheme })
    ThemePreference.withoutTransitions(document.documentElement)
    ColorScheme.choose(chosenFor(scheme))
  }

  /** Flip the scheme the page shows, light <-> dark, and remember it (no longer following the OS).  Returns it. */
  static flipScheme(): ShownScheme {
    const next = ThemePreference.shownScheme() === "dark" ? "light" : "dark"
    ThemePreference.setScheme(next)
    return next
  }

  /**
   * Show `scheme` on `root` (default `<html>`):
   * its `ui-light` / `ui-dark` class (the other one off) and the same inline `color-scheme`;  `system`:  neither.
   * - SIDE EFFECT:  `SCHEME_SWITCHING` on `root` until the frame after next (`withoutTransitions()`).
   */
  static applyScheme(scheme: SchemeChoice, root: HTMLElement = document.documentElement): void {
    ThemePreference.withoutTransitions(root)
    ColorScheme.apply(chosenFor(scheme), root)
  }

  /**
   * Re-apply the stored theme and scheme:  the scheme at once, the theme once its sheets load.  Call once per page.
   * - SIDE EFFECT:  from then on, follows the OS's scheme and other tabs' switches (`watch()`).
   */
  static async restore(): Promise<void> {
    const { theme, scheme } = ThemePreference.chosen
    ThemePreference.applyScheme(scheme)
    ThemePreference.watch()
    await ThemePreference.applyTheme(theme)
  }

  /**
   * Call `listener` with the theme and scheme on every change --
   * and when the OS switches scheme, since the scheme the page shows changed (`shownScheme()`);
   * returns the unsubscribe.
   * - SIDE EFFECT:  starts watching the OS and other tabs (`watch()`), once.
   */
  static subscribe(listener: (chosen: ThemeAndScheme) => void): () => void {
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
    ThemePreference.tell(ThemePreference.chosen)
  }

  /**
   * Make this page wear theme `name` itself, whatever is chosen, from now on;  `undefined`:  the one chosen again.
   * - Its menu still chooses, and remembers, for what the page shows of OTHER places, never for the page itself.
   * - e.g. the theme editor (`<ui-theme-editor>`, epic `debut` P24):  its own bar and column stay Fruity while it
   *   previews pages in another theme (Owen, Q40:  "Make outer theme \"fruity\"");  framed, the Spell editor wears
   *   the theme previewed in it, never remembered.
   * - The scheme isn't worn:  the page still shows the one chosen.
   */
  static async wear(name: string | undefined): Promise<void> {
    ThemePreference.worn = name
    await ThemePreference.applyTheme(ThemePreference.chosen.theme)
  }

  /** Forget the in-memory theme and scheme (tests):  the next read goes back to storage. */
  static reset(): void {
    ThemePreference.current = undefined
  }

  ////////////////
  // ## Internals
  ////////////////

  /** The theme and scheme in memory;  `undefined` until first read. */
  @E.state private static accessor current: ThemeAndScheme | undefined = undefined

  /** The theme the page wears whatever is chosen (`wear()`);  `undefined`:  the one chosen. */
  private static worn: string | undefined

  /** `subscribe()`d listeners. */
  private static readonly listeners = new Set<(chosen: ThemeAndScheme) => void>()

  /**
   * Once per page, through `ColorScheme.watch()`:
   * - tell listeners when the OS switches scheme (the shown scheme changed while following it)
   * - take other tabs' scheme switches:  ColorScheme applied it, this keeps the pair in step
   * - page-wide for the page's life:  nothing to undo
   */
  @E.once private static watch(): void {
    ColorScheme.watch((change) => {
      if (change === "os") return ThemePreference.osChanged()
      ThemePreference.update({ ...ThemePreference.chosen, scheme: ColorScheme.chosen() ?? "system" })
    })
  }

  /**
   * Put `SCHEME_SWITCHING` on `root` until the frame after next:
   * the first frame paints the new scheme with transitions off, the second turns them back on.
   * - A second switch meanwhile just ends it a frame early.
   */
  private static withoutTransitions(root: Element): void {
    if (typeof requestAnimationFrame !== "function") return
    root.classList.add(SCHEME_SWITCHING)
    E.beforeNextPaint(() => E.beforeNextPaint(() => root.classList.remove(SCHEME_SWITCHING)))
  }

  /** Set the theme and scheme in memory and tell subscribers, if they changed. */
  private static update(chosen: ThemeAndScheme): void {
    const old = ThemePreference.chosen
    ThemePreference.current = chosen
    if (old.theme === chosen.theme && old.scheme === chosen.scheme) return
    ThemePreference.tell(chosen)
  }

  /** Call every listener with `chosen`. */
  private static tell(chosen: ThemeAndScheme): void {
    for (const listener of [...ThemePreference.listeners]) listener(chosen)
  }

  /**
   * Apply theme `name` with `UI.themes` (the runtime loaded now, if need be);  the one worn instead, if any (`wear()`).
   * - Only a theme of the set (`UI.themes.own`):
   *   an old name is chosen again as its new one, anything else as the default theme.
   */
  private static async applyTheme(name: string): Promise<void> {
    const { themes } = await UI.load()
    const known = ThemePreference.knownName(themes, name)
    if (known !== name) return ThemePreference.setTheme(known)
    await themes.apply(ThemePreference.worn ?? name)
  }

  /**
   * `name` as a theme of the set:  itself, its new name (`studio` => `merlot`),
   * or, no longer a theme (`classic`, a Fomantic theme), the default theme.
   */
  private static knownName(themes: Themes, name: string): string {
    const now = UIT.ThemeNames.nameNow(themes, name)
    return themes.own.includes(now) ? now : ThemePreference.defaultTheme
  }

  /** The stored theme and scheme;  anything unreadable is the default (`defaultTheme`, `system`). */
  private static read(): ThemeAndScheme {
    return {
      theme: ThemePreference.load(ThemePreference.themeKey) || ThemePreference.defaultTheme,
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
function chosenFor(scheme: SchemeChoice): ShownScheme | undefined {
  return scheme === "system" ? undefined : scheme
}
