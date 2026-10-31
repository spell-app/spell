/****************
 * ### `ListSelection`
 * What a click does to a selection in an ordered list, the way a Mac's or Windows' lists do:
 * - Plain:  only what's clicked.
 * - Command or Control:  what's clicked is added, or taken away if it was selected.
 * - Shift:  everything from the last one clicked to it, in the list's order.
 * - It holds only the ANCHOR, the last one clicked, where a shift-click's range starts.
 *   - What's selected is its owner's, handed in and handed back:  a program's list, the Inspector, a tree.
 * - A plain class, no DOM and no Solid:  a running program's lists, the editor and Spell UI's tree share ONE copy of the rule.
 *   - In util, not Spell UI's runtime:  a runner's build may not reach into `spell/ui/runtime`.
 ****************/
export class ListSelection<T> {
  /** The last one clicked:  where a shift-click's range starts. */
  anchor: T | undefined

  /**
   * What's selected once `item` is clicked, among `items`, with `selected` selected and `keys` held.
   * - Shift with no anchor, or one no longer in `items`:  a plain click.
   * - SIDE EFFECT:  moves the anchor to `item`, except for a shift-click's range.
   */
  clicked(item: T, { items, selected, keys }: ListClick<T>): T[] {
    if (keys.shiftKey && this.anchor !== undefined && items.includes(this.anchor)) {
      const [from, to] = [items.indexOf(this.anchor), items.indexOf(item)].sort((a, b) => a - b)
      return items.slice(from, to! + 1)
    }
    this.anchor = item
    if (!keys.metaKey && !keys.ctrlKey) return [item]
    return selected.includes(item) ? selected.filter((each) => each !== item) : [...selected, item]
  }
}

/** One click, as `ListSelection.clicked()` reads it. */
export type ListClick<T> = {
  /** The list, in its order. */
  items: readonly T[]
  /** What's selected now. */
  selected: readonly T[]
  /** The keys held:  a `MouseEvent` is one. */
  keys: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
}
