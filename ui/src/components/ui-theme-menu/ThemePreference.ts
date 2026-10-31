// Import directly:  in `core`'s util barrel the pref store cost every page 1.9 kB
import { ColorScheme } from "spell/util/persist/ColorScheme"
import { PrefStore } from "spell/util/persist/PrefStore"
import { ServerPlace } from "spell/util/persist/ServerPlace"
import {
  COLOR_SCHEME_KEY,
  OLD_COLOR_SCHEME_KEYS,
  PREF_SAVED_EVENT,
  PREF_SAVED_PAGE_EVENT,
  type PrefSaved
} from "spell/util/persist/persist.types"
import { E, UI, UIT, type Themes } from "spell/ui/core"
// Import directly:  My themes, without the editor
import { SavedTheme } from "spell/ui/components/ui-theme-editor/SavedTheme"
import {
  DEFAULT_THEME,
  OLD_THEME_KEYS,
  SCHEME_SWITCHING,
  TINTS_LEFT_OUT,
  SchemeChoices,
  THEME_KEYS,
  THEME_STORE,
  type SchemeChoice,
  type ShownScheme,
  type ThemeAndScheme,
  type ThemeKeptIn
} from "./UIThemeMenu.types"

/** The query parameters a page's address says its theme and scheme in (`?theme=glass&scheme=dark`). */
const ADDRESS_PARAMS = { theme: "theme", scheme: "scheme" } as const

/****************
 * ### `ThemePreference`
 * The theme (`UI.themes`) and colour scheme a person chose:  ONE choice for every place Spell draws
 * (epic `debut` P21, Owen:  "one theme picker for everything"), re-applied on every page.
 * - `<ui-theme-menu>` changes it;  a page's entry calls `restore()` once (Spell UI's site:  `site/_src/site.ts`).
 * - Every place shares it:  the editor and its notebooks, the epic pages and guides, Spell UI's, App UI's and the
 *   brand's pages.  Pick a theme in any one, and every other draws in it.
 * - Kept in the person's SPACE (Owen:  "Take from user preference in space"):  the store `spell-site`
 *   (`THEME_STORE`), a file beside their other preferences, `@spell/owen@/__prefs/spell-site.json5`:
 *   `{ theme: "glass", scheme: "dark" }`, through the page server (`ServerPlace`, `/api/prefs`).
 *   - `keptIn`:  `space` on a page served by a page server that keeps them (`SPELL_SERVER.prefs`:  the kit's, with the
 *     app's routes), or one that says so (`keepIn()`:  the editor, whose dev server passes `/api` on);  else
 *     `browser`, where the browser's copy (below) is all there is:  the read-only public build, and a server with no
 *     prefs (spell-epic's own, a demo check's), whose pages never ask it
 *   - A change reaches open pages at once:  the page server tells every page over its live channel
 *     (`PREF_SAVED_EVENT`), and each asks again when it comes back into view.
 *   - A same-origin FRAME of another page (the theme editor's previews, the brand index's thumbnails) keeps it in the
 *     browser, never following the space:  its framer dresses it.
 * - The browser's copy, `localStorage` (`THEME_KEYS`), through `PrefStore`:  the last value seen,
 *   so the page draws the right theme and scheme before the space answers.  The space's value always wins.
 *   - The old keys, each place's own before P21 (`OLD_THEME_KEYS`), are moved over once, and from there into the
 *     space when it holds nothing yet.
 * - Theme:  `DEFAULT_THEME` (Glass, epic `debut` Q39) until the person picks another,
 *   one of Spell's own themes (`UI.themes.own`), in a tint (`glass:pink`, P23), or one of My themes (`mine:<id>`,
 *   `SavedTheme`, P25):  its base, then its sheet;  one deleted since:  the default.
 *   - A theme remembered under its old name comes back as its new one (`studio` as `merlot`, `UIT.ThemeNames`).
 *   - Any other name no longer in the set (Plain, Classic, a Fomantic theme, before epic `debut` P17):
 *     the default, and forgotten.
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
 * - A nested `<ui-root theme>` draws its own scheme inside it, and never reads or writes this choice.
 * - Imports the core entry (`UI`, `spell/ui/core`), which the site entry loads anyway;
 *   the runtime chunk (`UI.themes`) loads only to apply a theme.
 * - Static only:  one theme and scheme per page.
 * - A page's ADDRESS can say its theme and scheme for this load:  `?theme=glass&scheme=dark` (Owen:  "Have a
 *   `?theme=x` for all pages which sets this?";  `addressWith()` writes one, as the theme bench's ↗ does).
 *   - It wins over the remembered choice, but is NEVER stored:  the next page without it shows the remembered one,
 *     and picking from the menu stores the pick as ever (and wins from then on).
 *   - `theme`:  a theme of the set, or one of its old names (`studio`);  any other is ignored, with a warning.
 *   - `scheme`:  `light` or `dark`, read by `ColorScheme` (so the site header follows it too);  any other is
 *     ignored, with a warning.  `HEAD_SCRIPT` reads it too.
 ****************/
export class ThemePreference {
  /** The theme a person who never picked one sees:  `DEFAULT_THEME`, Glass, in every place. */
  static readonly defaultTheme: string = DEFAULT_THEME

  /**
   * Where the person's choice is kept:  their `space` (and this browser's copy), or this `browser` alone.
   * - Until `keepIn()` says:  `space` on a page served by a server that keeps them (`SPELL_SERVER.prefs`), else `browser`;
   *   and `browser` in a same-origin frame of another page (the class doc), whose framer dresses it.
   */
  static get keptIn(): ThemeKeptIn {
    return (ThemePreference.kept ??= ThemePreference.serverKeepsPrefs && !isSameOriginFrame() ? "space" : "browser")
  }

  /**
   * Say where this page keeps the person's choice:  e.g. the editor, which the page server didn't serve but whose
   * `/api` reaches it, `ThemePreference.keepIn("space")`;  its read-only public build, `"browser"`.
   * - Call before `restore()`.
   */
  static keepIn(keptIn: ThemeKeptIn): void {
    ThemePreference.kept = keptIn
  }

  /**
   * Inline `<head>` script re-applying the stored scheme before first paint, as `applyScheme()` does.
   * - The page template (`templates/spell-ui-docs.html`) inlines it, in `<head>` before the stylesheet `<link>`.
   * - ES5, no dependencies, never throws:  so it reads the key raw, not through `PrefStore`,
   *   whose text it matches (a scheme is kept as `dark`, unquoted).
   * - Reads the old keys too (`OLD_COLOR_SCHEME_KEYS`) while the new one is absent:  `restore()` moves them over.
   * - Its keys are `ColorScheme`'s own constants;  every page that inlines it holds a copy of its text.
   * - The address's `?scheme=light|dark` first, as `read()` takes it.
   */
  static readonly HEAD_SCRIPT =
    `try{var l=localStorage,d=document.documentElement,s=(/[?&]${ADDRESS_PARAMS.scheme}=(light|dark)(&|$)/.exec(location.search)||[])[1]||` +
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
    const tint = ThemePreference.tintFor(name, ThemePreference.chosen.tint)
    ThemePreference.update({ ...ThemePreference.chosen, theme: name, tint })
    ThemePreference.remember(name, tint)
    await ThemePreference.applyTheme(name)
  }

  /**
   * Choose tint `tint` for the theme chosen (`undefined`:  none, the theme as it is):  remember it with the theme as
   * one name (`glass:pink`), tell subscribers, wear it (epic `debut` P23).
   * - A tint the theme leaves out (`ThemePreference.tintsFor()`):  none.
   * - Resolves once its sheet is on.
   */
  static async setTint(tint: UIT.ThemeHue | undefined): Promise<void> {
    const { theme } = ThemePreference.chosen
    const allowed = ThemePreference.tintFor(theme, tint)
    ThemePreference.update({ ...ThemePreference.chosen, tint: allowed })
    ThemePreference.remember(theme, allowed)
    await ThemePreference.applyTheme(theme)
  }

  /**
   * The tints theme `theme` offers:  every one of Spell UI's colours (`UIT.ThemeHues`), by its own name, but those
   * that can't read on it, light or dark (`TINTS_LEFT_OUT`, from the contrast test).
   */
  static tintsFor(theme: string): readonly UIT.ThemeHue[] {
    // one of My themes:  its colours are its own (epic `debut` P25)
    if (theme.startsWith(SavedTheme.PREFIX)) return []
    const leftOut = TINTS_LEFT_OUT[theme] ?? []
    return UIT.ThemeHues.filter((hue) => !leftOut.includes(hue))
  }

  /**
   * The text a theme and its tint are kept as:  `glass:pink`;  no tint, `glass` alone.
   * - and `pickOf()` reads one back
   */
  static pickText(theme: string, tint?: UIT.ThemeHue): string {
    return tint ? `${theme}${TINT_SEPARATOR}${tint}` : theme
  }

  /** A kept pick's theme and tint:  `glass:pink` => `{ theme: "glass", tint: "pink" }`;  a tint that isn't one, none. */
  static pickOf(text: string): { theme: string; tint?: UIT.ThemeHue } {
    if (text.startsWith(SavedTheme.PREFIX)) return { theme: text }
    const [theme = "", tint] = text.split(TINT_SEPARATOR)
    return UIT.ThemeHues.includes(tint as UIT.ThemeHue) ? { theme, tint: tint as UIT.ThemeHue } : { theme }
  }

  /** Choose colour scheme `scheme` (`system`:  follow the OS):  remember it, tell subscribers, show it on `<html>`. */
  static setScheme(scheme: SchemeChoice): void {
    ThemePreference.update({ ...ThemePreference.chosen, scheme })
    ThemePreference.withoutTransitions(document.documentElement)
    ColorScheme.choose(chosenFor(scheme))
    ThemePreference.saveToSpace("scheme", scheme)
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
   * - Then asks the person's space (`keptIn`), and wears what it says, if that's another.
   * - SIDE EFFECTS:  from then on, follows
   *   - the OS's scheme and other tabs' switches (`watch()`)
   *   - the space:  every page's pick, as the page server tells it, and on coming back into view (`followSpace()`)
   */
  static async restore(): Promise<void> {
    const { theme, scheme } = ThemePreference.chosen
    ThemePreference.applyScheme(scheme)
    ThemePreference.watch()
    ThemePreference.followSpace()
    await ThemePreference.applyTheme(theme)
    await ThemePreference.askSpace()
  }

  /**
   * Take the person's choice from their space:  wear its theme and scheme, where they're not the ones shown.
   * - The space holding nothing yet:  what this browser had (its copy, or a place's old key) is saved there, once.
   * - Resolves once it's worn;  nothing when this page keeps its choice in the browser (`keptIn`).
   * - NEVER throws:  a space that can't be reached (`ServerPlace` logs) leaves the browser's copy.
   */
  static async askSpace(): Promise<void> {
    const store = ThemePreference.spaceStore
    if (!store) return
    try {
      const [theme, scheme] = await Promise.all([store.load("theme"), store.load("scheme")])
      // the space holds nothing yet:  this browser's pick, if it made one, moves there (the old keys' too)
      if (theme === undefined) ThemePreference.saveToSpace("theme", ThemePreference.picked())
      if (scheme === undefined) ThemePreference.saveToSpace("scheme", schemeOf(PrefStore.getAt(COLOR_SCHEME_KEY)))
      await ThemePreference.took({ theme, scheme })
    } catch (error) {
      console.error("ThemePreference.askSpace():  couldn't wear the space's theme", error)
    }
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

  /**
   * `address` with `theme` and `scheme` in its query (`?theme=glass&scheme=dark`):  a page opened at it shows in
   * them, whatever its viewer chose there, without storing them (see the class doc).
   * - A relative `address` is read against this page's;  what comes back is a full one.
   */
  static addressWith(address: string, { theme, scheme }: { theme?: string; scheme?: ShownScheme }): string {
    const url = new URL(address, typeof location === "undefined" ? "http://localhost" : location.href)
    if (theme) url.searchParams.set(ADDRESS_PARAMS.theme, theme)
    if (scheme) url.searchParams.set(ADDRESS_PARAMS.scheme, scheme)
    return url.href
  }

  /**
   * Another page saved the person's pick (`PrefSaved`, from the page server's live channel):
   * wear it, if it's the theme or scheme and not the one shown.
   * - Public for tests and for a page with no live client of its own;  `followSpace()` calls it.
   * - NEVER throws.
   */
  static async heard(saved: PrefSaved): Promise<void> {
    if (saved.store !== THEME_STORE) return
    if (saved.key === "theme" || saved.key === "scheme") await ThemePreference.took({ [saved.key]: saved.value })
  }

  /** Forget the in-memory theme and scheme, the address's and where they're kept (tests):  the next read goes back to them. */
  static reset(): void {
    ThemePreference.current = undefined
    ThemePreference.addressed = undefined
    ThemePreference.kept = undefined
    ThemePreference.spaced = undefined
    ColorScheme.rereadAddress()
  }

  ////////////////
  // ## Internals
  ////////////////

  /** The theme and scheme in memory;  `undefined` until first read. */
  @E.state private static accessor current: ThemeAndScheme | undefined = undefined

  /** The theme this page's address says (`?theme=`), read once;  never stored.  Its scheme is `ColorScheme`'s. */
  private static addressed: { theme?: string } | undefined

  /** The address's theme, read on first use. */
  private static get fromAddress(): { theme?: string } {
    if (ThemePreference.addressed) return ThemePreference.addressed
    const params = new URLSearchParams(typeof location === "undefined" ? "" : location.search)
    return (ThemePreference.addressed = { theme: params.get(ADDRESS_PARAMS.theme) || undefined })
  }

  /** One of My themes' sheets is on the page, put there by `applyTheme()`:  taken off when another theme's chosen. */
  private static isWearingMine = false

  /** The theme the page wears whatever is chosen (`wear()`);  `undefined`:  the one chosen. */
  private static worn: string | undefined

  /** Where the choice is kept, once said (`keepIn()`) or first read (`keptIn`). */
  private static kept: ThemeKeptIn | undefined

  /** The space's store, made on first use (`spaceStore`);  `null`:  none on this page. */
  private static spaced: PrefStore | null | undefined

  /** Did the page server serve this page?  It says so in `window.SPELL_SERVER`. */
  private static get servedPage(): boolean {
    return typeof window !== "undefined" && !!(window as { SPELL_SERVER?: unknown }).SPELL_SERVER
  }

  /**
   * Does the server that served this page keep the person's prefs (`/api/prefs`)?  It says so in
   * `window.SPELL_SERVER.prefs` (the app's route module);  a server without them never gets asked.
   */
  private static get serverKeepsPrefs(): boolean {
    return typeof window !== "undefined" && !!(window as { SPELL_SERVER?: { prefs?: boolean } }).SPELL_SERVER?.prefs
  }

  /** The person's `spell-site` store in their space (`ServerPlace`), or `undefined`:  kept in the browser. */
  private static get spaceStore(): PrefStore | undefined {
    if (ThemePreference.spaced === undefined)
      ThemePreference.spaced =
        ThemePreference.keptIn === "space" ? new PrefStore(THEME_STORE, { place: ServerPlace.shared }) : null
    return ThemePreference.spaced ?? undefined
  }

  /** Keep theme `theme` and tint `tint` as this browser's copy, and in the space:  one text (`pickText()`). */
  private static remember(theme: string, tint: UIT.ThemeHue | undefined): void {
    const text = ThemePreference.pickText(theme, tint)
    PrefStore.setAt(THEME_KEYS.theme, text === ThemePreference.defaultTheme ? undefined : text)
    ThemePreference.saveToSpace("theme", text)
  }

  /** `tint`, if theme `theme` offers it (`tintsFor()`);  else none. */
  private static tintFor(theme: string, tint: UIT.ThemeHue | undefined): UIT.ThemeHue | undefined {
    return tint && ThemePreference.tintsFor(theme).includes(tint) ? tint : undefined
  }

  /**
   * Keep `value` at `key` in the person's space, when this page keeps its choice there.
   * - Not waited on:  the page already shows it.  NEVER throws:  `ServerPlace` logs a failure.
   */
  private static saveToSpace(key: "theme" | "scheme", value: string | undefined): void {
    const store = ThemePreference.spaceStore
    if (!store || value === undefined) return
    // not waited on:  the page already wears it;  the page server tells the other pages
    void store.save(key, value).catch((error: unknown) => console.error("ThemePreference:  couldn't save", error))
  }

  /**
   * Wear `theme` and `scheme`, from the space or another page, where they're readable and not what's shown:
   * kept as this browser's copy too.  `undefined`:  that one's unchanged.
   * - The address's theme and scheme still win for this visit.
   */
  private static async took({ theme, scheme }: { theme?: unknown; scheme?: unknown }): Promise<void> {
    if (isSchemeChoice(scheme) && scheme !== ThemePreference.chosen.scheme) {
      ThemePreference.withoutTransitions(document.documentElement)
      ColorScheme.remember(chosenFor(scheme))
      ThemePreference.update({ ...ThemePreference.chosen, scheme: ColorScheme.chosen() ?? "system" })
    }
    if (typeof theme !== "string" || !theme) return
    PrefStore.setAt(THEME_KEYS.theme, theme === ThemePreference.defaultTheme ? undefined : theme)
    const pick = ThemePreference.pickOf(theme)
    const { chosen } = ThemePreference
    if (ThemePreference.fromAddress.theme || (pick.theme === chosen.theme && pick.tint === chosen.tint)) return
    ThemePreference.update({ ...chosen, ...pick, tint: pick.tint })
    await ThemePreference.applyTheme(pick.theme)
  }

  /**
   * Follow the space, once per page:  every page's pick as the page server tells it, and the space again each time
   * the page comes back into view (a message missed while asleep).
   * - A page the page server served hears it from its live client (`PREF_SAVED_PAGE_EVENT`);
   *   one it didn't (the editor) opens the live channel itself (`listenLive()`).
   * - Page-wide for the page's life:  nothing to undo.
   */
  @E.once private static followSpace(): void {
    if (!ThemePreference.spaceStore || typeof document === "undefined") return
    if (ThemePreference.servedPage)
      addEventListener(
        PREF_SAVED_PAGE_EVENT,
        (event) => void ThemePreference.heard((event as CustomEvent<PrefSaved>).detail)
      )
    else ThemePreference.listenLive()
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void ThemePreference.askSpace()
    })
  }

  /**
   * Open the page server's live channel (`/api/server/live`) and hear its saved prefs:  for a page it didn't serve,
   * whose `/api` reaches it (the editor's dev server passes the socket on).
   * - Closed (the server restarted):  tries again, `wait` ms later, doubling up to 10s.
   */
  private static listenLive(wait = 1000): void {
    if (typeof WebSocket === "undefined") return
    const url = new URL(LIVE_CHANNEL, location.href)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    const socket = new WebSocket(url)
    let opened = false
    socket.addEventListener("open", () => (opened = true))
    socket.addEventListener("message", (message: MessageEvent<string>) => {
      const { event, data } = JSON.parse(message.data) as { event: string; data: PrefSaved }
      if (event === PREF_SAVED_EVENT) void ThemePreference.heard(data)
    })
    socket.addEventListener("close", () => {
      const retry = opened ? 1000 : wait
      void E.after(retry / 1000, () => ThemePreference.listenLive(Math.min(retry * 2, 10_000)))
    })
  }

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
    if (old.theme === chosen.theme && old.scheme === chosen.scheme && old.tint === chosen.tint) return
    ThemePreference.tell(chosen)
  }

  /** Call every listener with `chosen`. */
  private static tell(chosen: ThemeAndScheme): void {
    for (const listener of [...ThemePreference.listeners]) listener(chosen)
  }

  /**
   * Apply theme `name` with `UI.themes` (the runtime loaded now, if need be), in the tint chosen;  the one worn
   * instead, if any (`wear()`), as it is.
   * - Only a theme of the set (`UI.themes.own`):
   *   an old name is chosen again as its new one, anything else as the default theme.
   * - The tint's sheet is the theme editor's (`ThemeDraft.tintCss()`), loaded only when one is chosen.
   */
  private static async applyTheme(name: string): Promise<void> {
    const { themes } = await UI.load()
    const known = ThemePreference.knownName(themes, name)
    if (known !== name && name === ThemePreference.fromAddress.theme)
      return ThemePreference.applyAddressed(themes, name)
    if (known !== name) return ThemePreference.setTheme(known)
    // one of My themes (`mine:<id>`, epic `debut` P25):  its base, then its sheet
    const mine = ThemePreference.worn ? undefined : SavedTheme.picked(name)
    if (mine) {
      ThemePreference.isWearingMine = true
      return SavedTheme.wear(mine.choices.base, mine.css)
    }
    if (ThemePreference.isWearingMine) {
      ThemePreference.isWearingMine = false
      SavedTheme.putOnPage("")
    }
    const { tint } = ThemePreference.chosen
    if (ThemePreference.worn || !tint) return themes.apply(ThemePreference.worn ?? name)
    const { ThemeDraft } = await import("spell/ui/components/ui-theme-editor/ThemeDraft")
    await themes.apply(name, { tint: ThemeDraft.tintCss(name, tint) })
  }

  /**
   * The address's theme, `name`, isn't one of the set as it's written:  its new name, if it's an old one;  else
   * ignored, with a warning, for the remembered theme.  Neither is stored.
   */
  private static async applyAddressed(themes: Themes, name: string): Promise<void> {
    const now = UIT.ThemeNames.nameNow(themes, name)
    const isKnown = themes.own.includes(now)
    if (!isKnown) E.Warnings.warn("ThemePreference", `the address's theme \`${name}\` isn't a theme;  ignored`)
    ThemePreference.addressed = { ...ThemePreference.fromAddress, theme: isKnown ? now : undefined }
    const theme = ThemePreference.read().theme
    ThemePreference.update({ ...ThemePreference.chosen, theme })
    await ThemePreference.applyTheme(theme)
  }

  /**
   * `name` as a theme of the set:  itself, its new name (`studio` => `merlot`),
   * or, no longer a theme (`classic`, a Fomantic theme), the default theme.
   */
  private static knownName(themes: Themes, name: string): string {
    if (SavedTheme.picked(name)) return name
    const now = UIT.ThemeNames.nameNow(themes, name)
    return themes.own.includes(now) ? now : ThemePreference.defaultTheme
  }

  /**
   * The theme and scheme:  the address's, else the stored ones (the scheme's, `ColorScheme`'s);  anything unreadable is the default (`defaultTheme`,
   * `system`).
   */
  private static read(): ThemeAndScheme {
    const { theme, tint } = ThemePreference.pickOf(ThemePreference.fromAddress.theme || ThemePreference.stored().theme)
    return { theme, scheme: ColorScheme.chosen() ?? "system", ...(tint && { tint }) }
  }

  /**
   * The theme this browser's copy holds (`THEME_KEYS.theme`), else the default.
   * - SIDE EFFECT:  while it holds none, moves an old key's theme over, once (`OLD_THEME_KEYS`).
   */
  private static stored(): { theme: string } {
    return { theme: ThemePreference.picked() ?? ThemePreference.defaultTheme }
  }

  /** The theme this browser's copy holds, an old key's moved over first (`stored()`);  `undefined`:  none picked. */
  private static picked(): string | undefined {
    return textAt(THEME_KEYS.theme) ?? ThemePreference.moveOldKeys()
  }

  /**
   * Move the theme from each place's old key (`OLD_THEME_KEYS`):
   * the first one found is kept under `THEME_KEYS.theme`, and every old key removed, so this runs once.
   * - Returns the theme moved, else `undefined`.
   */
  private static moveOldKeys(): string | undefined {
    let found: string | undefined
    for (const key of OLD_THEME_KEYS) {
      found ??= textAt(key)
      PrefStore.setAt(key, undefined)
    }
    if (found) PrefStore.setAt(THEME_KEYS.theme, found)
    return found
  }
}

/** What joins a theme and its tint, kept as one text:  `glass:pink` (`ThemePreference.pickText()`). */
const TINT_SEPARATOR = ":"

/** The page server's live channel, as a page it didn't serve opens it (the kit's `LiveReload.events`). */
const LIVE_CHANNEL = "/api/server/live"

/** The text kept at `key` (`spell-site:theme`), or `undefined`:  none, or not text. */
function textAt(key: string): string | undefined {
  const value = PrefStore.getAt(key)
  return typeof value === "string" && value ? value : undefined
}

/** `value` when it's a scheme kept in the browser (`light` / `dark`), else `undefined`:  following the OS. */
function schemeOf(value: unknown): ShownScheme | undefined {
  return value === "light" || value === "dark" ? value : undefined
}

/** Is `value` a scheme choice (`light`, `dark`, `system`)? */
function isSchemeChoice(value: unknown): value is SchemeChoice {
  return SchemeChoices.includes(value as SchemeChoice)
}

/**
 * Is this page in a frame of a page on its own origin (the theme editor's previews)?  Its framer dresses it.
 * - A cross-origin framer (VS Code's side bar) can't be read:  not one.
 */
function isSameOriginFrame(): boolean {
  try {
    return typeof window !== "undefined" && window.parent !== window && !!window.frameElement
  } catch {
    return false
  }
}

/** `scheme` as `ColorScheme` keeps it:  `system` is nothing chosen. */
function chosenFor(scheme: SchemeChoice): ShownScheme | undefined {
  return scheme === "system" ? undefined : scheme
}
