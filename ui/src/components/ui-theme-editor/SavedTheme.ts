// Import directly:  in `core`'s util barrel it cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI, UIT } from "spell/ui/core"
import { EDITS_SHEET } from "./UIThemeEditor.types"

/****************
 * ### `SavedTheme`
 * The themes a person made in the theme editor and saved by name:  "My themes" (epic `debut` P25), kept in this
 * browser, put back on any page that picks one.
 * - Each one (`MyTheme`):  an id, made once when it's first saved and never changed (a rename changes only its name:
 *   WWOD §3, names aren't ids), its name, what the editor made (`UIT.ThemeChoices`) and the sheet made from it.
 *   - The sheet is kept too, so a page wears it without the editor's texts or code (`ThemeDraft`, `ThemeFile`).
 * - Any number:  `save()` adds one or writes one back by its id, `remove()` deletes one.
 * - The one theme a browser kept before P25 (`OLD_KEY`) opens as the first of them, named after its base
 *   (`My Fruity`), once.
 * - Picked in the theme menu as `mine:<id>` (`ThemePreference`):  `wear()` puts its base theme on, then its sheet,
 *   the same two steps the editor takes, so it looks as it did there.
 * - Kept in `localStorage` (`LIST_KEY`), through `PrefStore`:  a private window or blocked storage keeps them for this
 *   page only.  Export and import carry one to another browser (the editor's).
 * - Static:  one list per browser.
 * - Imported by its file (`spell/ui/components/ui-theme-editor/SavedTheme`) by the theme menu and the Spell editor:
 *   the family's barrel would load the editor too.
 ****************/
export class SavedTheme {
  /** The theme menu's prefix for one of My themes:  `mine:<id>`. */
  static readonly PREFIX = "mine:"

  /** Every saved theme, oldest first;  the one kept before P25 moved in first, once. */
  static get list(): readonly MyTheme[] {
    SavedTheme.moveOldTheme()
    const kept = PrefStore.getAt(LIST_KEY)
    return Array.isArray(kept) ? kept.filter(isMyTheme) : []
  }

  /** The saved theme with id `id`;  `undefined`:  none (deleted since). */
  static get(id: string): MyTheme | undefined {
    return SavedTheme.list.find((theme) => theme.id === id)
  }

  /** The saved theme a theme menu's name names (`mine:<id>`);  `undefined`:  another theme, or one deleted since. */
  static picked(name: string | undefined): MyTheme | undefined {
    return name?.startsWith(SavedTheme.PREFIX) ? SavedTheme.get(name.slice(SavedTheme.PREFIX.length)) : undefined
  }

  /** The theme menu's name for saved theme `theme`:  `mine:<id>`. */
  static pickName(theme: Pick<MyTheme, "id">): string {
    return `${SavedTheme.PREFIX}${theme.id}`
  }

  /**
   * Save `theme`:  a new one (no `id`), its id made now;  else written back in its place, by its id.
   * - Returns it as kept.
   * - NEVER throws:  blocked storage keeps it for this page only.
   */
  static save({ id, name, choices, css }: SavedThemeInput): MyTheme {
    const list = [...SavedTheme.list]
    const theme: MyTheme = { id: id ?? SavedTheme.newId(), name, choices: { ...choices, name }, css }
    const at = list.findIndex((kept) => kept.id === theme.id)
    if (at === -1) list.push(theme)
    else list[at] = theme
    PrefStore.setAt(LIST_KEY, list)
    return theme
  }

  /** Delete saved theme `id`.  NEVER throws. */
  static remove(id: string): void {
    PrefStore.setAt(
      LIST_KEY,
      SavedTheme.list.filter((theme) => theme.id !== id)
    )
  }

  /** `name`, or with " 2", " 3" ... after it when a saved theme has it already (an import's, epic `debut` P25). */
  static freeName(name: string): string {
    const taken = new Set(SavedTheme.list.map((theme) => theme.name))
    if (!taken.has(name)) return name
    let count = 2
    while (taken.has(`${name} ${count}`)) count++
    return `${name} ${count}`
  }

  ////////////////
  // ## On the page
  ////////////////

  /**
   * Wear theme `base` on the page, then `css` over it (`EDITS_SHEET`):  what the editor makes, or a saved theme.
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

  ////////////////
  // ## Internals
  ////////////////

  /** A new theme's id:  the time and a few random letters, base 36. */
  private static newId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  }

  /**
   * The one theme kept before P25 (`OLD_KEY`), moved in as the first of My themes, named after its base (`My Fruity`);
   * the old key forgotten, so this runs once.
   */
  private static moveOldTheme(): void {
    const old = PrefStore.getAt(OLD_KEY) as Partial<MyTheme> | undefined
    if (old === undefined) return
    PrefStore.setAt(OLD_KEY, undefined)
    if (typeof old.css !== "string" || typeof old.choices?.base !== "string") return
    const name = `My ${UIT.ThemeNames.titleOf(old.choices.base)}`
    const kept = PrefStore.getAt(LIST_KEY)
    const list = Array.isArray(kept) ? kept.filter(isMyTheme) : []
    PrefStore.setAt(LIST_KEY, [
      { id: SavedTheme.newId(), name, choices: { ...old.choices, name }, css: old.css },
      ...list
    ])
    E.Warnings.devWarn("SavedTheme", `the theme kept in this browser is now "${name}", the first of My themes`)
  }
}

/** One of My themes:  a theme the person made and saved by name. */
export type MyTheme = {
  /** made once, when it's first saved, and never changed:  what the menu remembers (`mine:<id>`) */
  id: string
  /** what people call it;  a rename changes only this */
  name: string
  /** what the editor made:  its base theme, tint and colours ... */
  choices: UIT.ThemeChoices
  /** the sheet made from it, worn over its base */
  css: string
}

/** What `SavedTheme.save()` takes:  a theme, its `id` when it's one already saved. */
export type SavedThemeInput = Omit<MyTheme, "id"> & { id?: string }

/** Whether `value` reads as one of My themes. */
function isMyTheme(value: unknown): value is MyTheme {
  const theme = value as Partial<MyTheme> | undefined
  return (
    typeof theme?.id === "string" &&
    typeof theme.name === "string" &&
    typeof theme.css === "string" &&
    typeof theme.choices?.base === "string"
  )
}

/** The `localStorage` key of My themes. */
const LIST_KEY = "spell-ui:themes"

/** The key of the ONE theme a browser kept before P25. */
const OLD_KEY = "spell-ui:theme"
