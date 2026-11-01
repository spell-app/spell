/****************
 * ### `ListSelection`
 * What a click does to a selection, the way a Mac's Finder does it:
 * - Plain:  only what's clicked, which becomes the PIVOT, the fixed end of a range.
 * - Command or Control:  what's clicked is added, or taken away if it was selected.
 *   - Adding moves the pivot to it.
 *   - Taking the pivot away moves it to the last one still selected.
 * - Shift, in a list:  the run from the pivot to what's clicked, in the list's order.
 *   - Another shift-click swaps that run for the new one, and the pivot stays.
 *   - What Command added outside the run stays selected.
 * - Shift, not in a list (no `items`):  as Command.
 * - It holds only the pivot and the last run.
 *   - What's selected is its owner's, handed in and handed back:  a program's list, the Inspector, a tree.
 * - A plain class, no DOM and no Solid:  a running program's lists, the editor and Spell UI's tree share ONE copy of the rule.
 *   - In util, not Spell UI's runtime:  a runner's build may not reach into `spell/ui/runtime`.
 * - Control-click on a Mac never gets here:  the browser makes it a right click, with no click.
 ****************/
export class ListSelection<T> {
  /** The fixed end of a shift-click's range. */
  pivot: T | undefined

  /** What the last shift-click selected:  the next one swaps it. */
  private run: readonly T[] = []

  /**
   * What's selected once `item` is clicked, with `selected` selected and `keys` held.
   * - Shift in a list with no pivot, or one no longer in it:  a plain click.
   * - SIDE EFFECT:  moves the pivot, as the class says.
   */
  clicked(item: T, { items, selected, keys }: ListClick<T>): T[] {
    if (keys.shiftKey && items && this.pivot !== undefined && items.includes(this.pivot)) {
      return this.runTo(item, items, selected)
    }
    this.run = []
    if (keys.metaKey || keys.ctrlKey || (keys.shiftKey && !items)) return this.toggled(item, selected)
    this.pivot = item
    return [item]
  }

  /** `selected` with the last run swapped for the one from the pivot to `item`. */
  private runTo(item: T, items: readonly T[], selected: readonly T[]): T[] {
    const [from, to] = [items.indexOf(this.pivot as T), items.indexOf(item)].sort((a, b) => a - b)
    const run = items.slice(from, to! + 1)
    const kept = selected.filter((each) => !this.run.includes(each) && !run.includes(each))
    this.run = run
    return [...kept, ...run]
  }

  /** `selected` with `item` added, or taken away;  the pivot follows. */
  private toggled(item: T, selected: readonly T[]): T[] {
    if (!selected.includes(item)) {
      this.pivot = item
      return [...selected, item]
    }
    const rest = selected.filter((each) => each !== item)
    if (this.pivot === item) this.pivot = rest.at(-1)
    return rest
  }
}

/** One click, as `ListSelection.clicked()` reads it. */
export type ListClick<T> = {
  /** The list, in its order;  `undefined`:  what's clicked isn't in a list. */
  items: readonly T[] | undefined
  /** What's selected now. */
  selected: readonly T[]
  /** The keys held:  a `MouseEvent` is one. */
  keys: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
}
