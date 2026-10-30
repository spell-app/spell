import { type E, UIT } from "spell/ui/core"
import type { ThemeMenuText, ThemeMenuTextKey } from "./UIThemeMenu.types"

/****************
 * ### `ThemeMenu`
 * What `<ui-theme-menu>` lists, and its text:  plain data, no Solid, which tests drive directly.
 * - Entries:  Spell's own themes (`UI.themes.own`:  Spell, Glass, Fruity, Merlot, Paper, Midnight, Crisp, Pop, Matrix), in that order,
 *   each with its one-line description.
 *   - Nothing else since epic `debut` P17:  no Plain, no Classic, no Fomantic theme
 *     (those are archived, `src/styles/themes/archive/`).
 * - Titles:  `UIT.ThemeNames.titleOf()`, the theme editor's Start from's too.
 * - One per state of its inputs:  the element remakes it when they change.
 ****************/
export class ThemeMenu {
  /** The themes to list (`UI.themes.own`). */
  readonly themes: readonly string[]

  /** Looks up the component's strings. */
  readonly text: ThemeMenuText

  constructor({ themes, text }: ThemeMenuProps) {
    this.themes = themes
    this.text = text
  }

  /** The list's entries:  one per theme, its title and description. */
  get entries(): E.MenuEntry[] {
    return this.themes.map((name) => {
      const key = DESCRIPTIONS[name]
      return { value: name, text: this.titleFor(name), ...(key && { description: this.text(key) }) }
    })
  }

  /** Display title of theme `name`:  `merlot` => `Merlot`. */
  titleFor(name: string): string {
    return UIT.ThemeNames.titleOf(name)
  }

  /** Theme `theme` in tint `tint`, as people read it:  `Glass - Pink`;  no tint, `Glass` (epic `debut` P23). */
  pickTitleFor(theme: string, tint?: UIT.ThemeHue): string {
    const title = this.titleFor(theme)
    return tint ? this.text("tinted", { title, tint: this.text(tint) }) : title
  }

  /** The dropdown's text for chosen theme `theme` in tint `tint`:  `Merlot theme`, `Glass - Pink theme`. */
  labelFor(theme: string, tint?: UIT.ThemeHue): string {
    return this.text("themeLabel", { title: this.pickTitleFor(theme, tint) })
  }
}

/** Props of `new ThemeMenu()`. */
export type ThemeMenuProps = {
  /** the themes to list (`UI.themes.own`) */
  themes: readonly string[]
  /** the component's texts (`translationForKey()`) */
  text: ThemeMenuText
}

/**
 * Each theme's one-line description, by its text key.
 * - A theme of `UI.themes.own` that isn't here shows its title alone.
 */
const DESCRIPTIONS: Readonly<Record<string, ThemeMenuTextKey>> = {
  spell: "spellDescription",
  glass: "glassDescription",
  fruity: "fruityDescription",
  merlot: "merlotDescription",
  paper: "paperDescription",
  midnight: "midnightDescription",
  crisp: "crispDescription",
  pop: "popDescription",
  matrix: "matrixDescription"
}
