// Import directly:  in `core`'s util barrel it cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI, UIT } from "spell-ui/core"
import { EDITS_SHEET } from "./UIThemeEditor.types"

/****************
 * ### `SavedTheme`
 * The theme a viewer made and chose to USE (`<ui-theme-editor>`'s Use this theme):
 * kept in this browser, and put back on any page that asks.
 *
 * - How the Spell editor uses it (its `EditorTheme`):
 *   - `follow(theme)`, each time its theme changes:  the kept sheet goes on while that theme is its base,
 *     so picking another look takes it off
 *   - `restore()` puts the kept base on too;  `has` says whether one is kept, for a menu entry
 *   - imported by its file, `spell-ui/components/ui-theme-editor/SavedTheme`:
 *     the family's barrel would load the editor too
 * - Kept in `localStorage` under `STORAGE_KEY`:  the choices AND the stylesheet's text,
 *   so a page restores it without the editor's texts or code (`ThemeSheet`).
 *   - Through `PrefStore`:  a private window or blocked storage keeps it for this page only.
 * - Restoring applies the base theme (`UI.themes.apply()`) and then the sheet, on the page:
 *   the same two steps `ThemeSheet.applyToPage()` takes, so it looks as it did in the editor.
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
    const { themes, styles } = await UI.load()
    const base = UIT.ThemeNames.nameNow(themes, kept.choices.base)
    if (base !== kept.choices.base) SavedTheme.save({ ...kept.choices, base }, kept.css)
    try {
      await themes.apply(base)
    } catch (error) {
      E.Warnings.warn("SavedTheme", `the kept theme's base \`${kept.choices.base}\` is gone;  forgetting it`, error)
      SavedTheme.forget()
      return false
    }
    styles.register(EDITS_SHEET, kept.css, { page: true })
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
