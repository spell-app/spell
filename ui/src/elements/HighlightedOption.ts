import { E } from "spell/ui/core"
import { F } from "spell/ui/forms"
// Import directly to avoid circular import:  spell-element imports nothing of Spell UI, so it has always loaded first
import { state } from "spell/element"

/****************
 * ### `HighlightedOption`
 * The ONE highlighted option of a list a control opens:  what the arrows move, Enter picks,
 * and `aria-activedescendant` points at.
 * - Shared by `<ui-dropdown>`'s options, `<ui-search>`'s results and `<ui-icon-picker>`'s cells.
 * - Reactive (`index`), so a component draws from it and its effects follow it.
 * - Knows its list only through `list()`, read fresh each time:  a filtered list keeps the highlight's index,
 *   so the control says what a new list does to it (`clear()`, `index = 0` ...).
 * - Steps as `MenuOptions.nextEnabledIndexIn()` does:  disabled options skipped, stopping at the ends unless `wrap`.
 ****************/
export class HighlightedOption<T extends object> {
  /** Index into `list()` of the highlighted option;  `-1` for none. */
  @state accessor index = -1

  /** The list the highlight moves through, read fresh each time. */
  private readonly list: () => readonly T[]

  constructor(list: () => readonly T[]) {
    this.list = list
  }

  /** The highlighted option;  `undefined` for none. */
  get option(): T | undefined {
    return this.list()[this.index]
  }

  /** Highlight `option`, when it's in the list (the pointer over a row). */
  highlight(option: T) {
    const at = this.list().indexOf(option)
    if (at >= 0 && at !== this.index) this.index = at
  }

  /**
   * Move the highlight `delta` enabled options (an arrow key, PageUp / Down):  from none, `+1` is the first.
   * - `-1` for none when the list has no enabled option.
   */
  move(delta: number, options?: E.MenuNavigateOptions) {
    this.index = F.MenuOptions.nextEnabledIndexIn(this.list(), this.index, delta, options)
  }

  /** Highlight the first (`"first"`) or last (`"last"`) enabled option:  Home / End. */
  moveTo(end: "first" | "last") {
    this.index = F.MenuOptions.nextEnabledIndexIn(this.list(), -1, end === "first" ? 1 : -1)
  }

  /** Nothing highlighted. */
  clear() {
    this.index = -1
  }
}
