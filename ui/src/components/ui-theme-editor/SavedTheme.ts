// Import directly:  in `core`'s util barrel it cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI, UIT } from "spell/ui/core"
import { EDITS_SHEET } from "./UIThemeEditor.types"

/****************
 * ### `SavedTheme`
 * The theme a viewer made and kept in this browser, put back on any page that asks.
 * - The theme editor's Use this theme button kept it until Owen deleted the button (epic `debut`);
 *   its Stop using still forgets one kept before.
 *
 * - How the Spell editor uses it (its `EditorTheme`):
 *   - `follow(theme)`, each time its theme changes:  the kept sheet goes on while that theme is its base,
 *     so picking another look takes it off
 *   - `restore()` puts the kept base on too;  `has` says whether one is kept, for a menu entry
 *   - imported by its file, `spell/ui/components/ui-theme-editor/SavedTheme`:
 *     the family's barrel would load the editor too
 * - Kept in `localStorage` under `STORAGE_KEY`:  the choices AND the stylesheet's text,
 *   so a page restores it without the editor's texts or code (`ThemeDraft`, `ThemeFile`).
 *   - P25 (Saving Themes) moves it to the person's space.
 *   - Through `PrefStore`:  a private window or blocked storage keeps it for this page only.
 * - Restoring applies the base theme (`UI.themes.apply()`) and then the sheet, on the page (`wear()`):
 *   the same two steps the editor takes, so it looks as it did there.
 * - Static:  one kept theme per browser.
 ****************/
export class SavedTheme {
  /** A theme is kept in this browser. */
  static get has(): boolean {
    return SavedTheme.read() !== undefined
  }

  /** The kept theme's choices;  `undefined` when none is kept (or storage is blocked). */
  static get choices(): UIT.ThemeChoices | undefined {
    return SavedTheme.read()?.choices
  }

  /** The kept theme's stylesheet;  `undefined` when none is kept. */
  static get css(): string | undefined {
    return SavedTheme.read()?.css
  }

  /**
   * Keep `choices` and their stylesheet `css`, in place of any kept before.
   * - NEVER throws:  blocked storage keeps nothing.
   */
  static save(choices: UIT.ThemeChoices, css: string): void {
    const kept: KeptTheme = { choices, css }
    PrefStore.setAt(STORAGE_KEY, kept)
  }

  /** Forget the kept theme.  NEVER throws. */
  static forget(): void {
    PrefStore.setAt(STORAGE_KEY, undefined)
  }

  /**
   * Put the kept theme on the page:  its base theme, then its sheet.  True when one was kept.
   * - SIDE EFFECT:  page-wide (`UI.themes`, `UI.styles`).
   * - A kept base under its old name is kept again under its new one (`studio` => `merlot`, `UIT.ThemeNames`).
   * - A kept base that's no longer a theme is forgotten, with a warning:  false.
   */
  static async restore(): Promise<boolean> {
    const kept = SavedTheme.read()
    if (!kept) return false
    const { themes } = await UI.load()
    const base = UIT.ThemeNames.nameNow(themes, kept.choices.base)
    if (base !== kept.choices.base) SavedTheme.save({ ...kept.choices, base }, kept.css)
    try {
      await SavedTheme.wear(base, kept.css)
    } catch (error) {
      E.Warnings.warn("SavedTheme", `the kept theme's base \`${kept.choices.base}\` is gone;  forgetting it`, error)
      SavedTheme.forget()
      return false
    }
    return true
  }

  /**
   * Wear the kept theme's sheet while the page's theme is `theme` and that's its base;  otherwise take it off.
   * - A base kept under its old name counts as its new one (`studio` as `merlot`).
   * - SIDE EFFECT:  page-wide (`UI.styles`).
   */
  static async follow(theme: string | undefined): Promise<void> {
    const kept = SavedTheme.read()
    const { themes, styles } = await UI.load()
    const css = kept && UIT.ThemeNames.nameNow(themes, kept.choices.base) === theme ? kept.css : ""
    if (css || styles.has(EDITS_SHEET)) styles.register(EDITS_SHEET, css, { page: true })
  }

  ////////////////
  // ## On the page
  ////////////////

  /**
   * Wear theme `base` on the page, then `css` over it (`EDITS_SHEET`):  what the editor makes, shown page-wide.
   * - SIDE EFFECT:  page-wide, every element on the page follows;  replaces the sheet worn before.
   * - Calls racing:  the LAST one wins (`putOnPage()` counts too), even when an earlier base loads later.
   * - Throws a `TypeError` when `base` isn't a theme (`UI.themes.apply()`).
   */
  static async wear(base: string, css: string): Promise<void> {
    const call = ++SavedTheme.calls
    const { themes, styles } = await UI.load()
    if (themes.current !== base) await themes.apply(base)
    if (call === SavedTheme.calls) styles.register(EDITS_SHEET, css, { page: true })
  }

  /**
   * Put `css` on the page as the edited theme's sheet, at once (`""`:  none);  a pending `wear()` won't land.
   * - SIDE EFFECT:  page-wide.  The runtime must be in (`UI.styles`).
   */
  static putOnPage(css: string): void {
    SavedTheme.calls++
    UI.styles.register(EDITS_SHEET, css, { page: true })
  }

  /** Counts `wear()` and `putOnPage()` calls:  only the last one's sheet lands. */
  private static calls = 0

  /** What's kept, if it reads as a theme;  anything else is `undefined`. */
  private static read(): KeptTheme | undefined {
    const kept = PrefStore.getAt(STORAGE_KEY) as Partial<KeptTheme> | undefined
    const isKept = typeof kept?.css === "string" && typeof kept.choices?.base === "string"
    return isKept ? (kept as KeptTheme) : undefined
  }
}

/** What `SavedTheme` keeps:  the choices, and the stylesheet made from them. */
type KeptTheme = {
  /** what the editor shows again */
  choices: UIT.ThemeChoices
  /** what a page applies */
  css: string
}

/** The `localStorage` key of the kept theme. */
const STORAGE_KEY = "spell-ui:theme"
