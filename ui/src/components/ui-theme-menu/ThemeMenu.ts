import { type E, UIT } from "spell/ui/core"
import type { MyTheme } from "spell/ui/components/ui-theme-editor/SavedTheme"
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

  /** My themes, the ones the person saved (`SavedTheme.list`), listed first. */
  readonly mine: readonly MyTheme[]

  constructor({ themes, text, mine = [] }: ThemeMenuProps) {
    this.themes = themes
    this.text = text
    this.mine = mine
  }

  /**
   * The list's entries:  My themes first, under their heading, when there's one (epic `debut` P25, Owen's C6:
   * "My themes, above spell's");  then one per theme of Spell's, its title and description.
   * - One of My themes is `mine:<id>`, described by the theme it builds on.
   */
  get entries(): E.MenuEntry[] {
    const spells: E.MenuEntry[] = this.themes.map((name) => {
      const key = DESCRIPTIONS[name]
      return { value: name, text: this.titleFor(name), ...(key && { description: this.text(key) }) }
    })
    if (!this.mine.length) return spells
    const mine: E.MenuEntry[] = this.mine.map((theme) => ({
      value: `${MINE_PREFIX}${theme.id}`,
      text: theme.name,
      description: this.pickTitleFor(theme.choices.base, theme.choices.primary)
    }))
    return [{ type: "header", text: this.text("myThemes") }, ...mine, { type: "divider", text: "" }, ...spells]
  }

  /** Display title of theme `name`:  `merlot` => `Merlot`;  one of My themes (`mine:<id>`), its name. */
  titleFor(name: string): string {
    if (name.startsWith(MINE_PREFIX)) {
      const theme = this.mine.find((kept) => `${MINE_PREFIX}${kept.id}` === name)
      if (theme) return theme.name
    }
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
  /** My themes (`SavedTheme.list`):  listed first;  none, by default */
  mine?: readonly MyTheme[]
}

/** The prefix of one of My themes' names in the list:  `mine:<id>` (`SavedTheme.PREFIX`;  data, so it's here too). */
const MINE_PREFIX = "mine:"

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
