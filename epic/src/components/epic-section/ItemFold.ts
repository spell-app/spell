/****************
 * ### `ItemFold`
 * An item closing at Owen's ✓ or x, folded away as it goes (epic `epic-engine` I306;  Owen:  "it should show as grey
 * and hide with an animate up immediately (optimistic update)"):  its height to nothing and its words faded, then
 * hidden by its section's filter (`data-epic-filtered`);  unfolded the same way if it comes back (taken back, or the
 * server never applied it).
 * - `<epic-section>`'s `onFiltered()` calls it for the items its filter hides or shows again;  the rows below slide up
 *   as the item's height goes, so nothing jumps
 * - plain DOM, no Solid:  the browser's own animations (`Element.animate()`), so it runs only in a browser
 * - reduced motion:  no animation, hidden at once
 ****************/
export class ItemFold {
  /** Items folding now, each its animation:  a second hide leaves it be, a show stops it. */
  private readonly folding = new Map<Element, Animation>()

  /** Ids this fold hid (`fold()`):  only those unfold as they show again, and none folds twice. */
  private readonly folded = new Set<string>()

  /**
   * Hide `item`:  folded away, then `attribute` set, which hides it;  set at once when it can't be animated (reduced
   * motion, no `animate()`, no height) or was folded already.
   * - SIDE EFFECT:  `attribute` on `item`, once the fold ends
   */
  fold(item: Element, attribute: string) {
    if (this.folding.has(item)) return
    const id = item.id
    const height = (item as HTMLElement).getBoundingClientRect?.().height ?? 0
    if (this.folded.has(id) || !height || !ItemFold.animates(item)) {
      this.folded.add(id)
      item.setAttribute(attribute, "")
      return
    }
    this.folded.add(id)
    const animation = item.animate(
      [
        { height: `${height}px`, opacity: 1, overflow: "hidden" },
        { height: "0px", opacity: 0, overflow: "hidden", marginBlock: "0px", paddingBlock: "0px" }
      ],
      { duration: FOLD_MS, easing: "ease-in", fill: "forwards" }
    )
    this.folding.set(item, animation)
    void animation.finished
      .then(() => {
        if (this.folding.get(item) !== animation) return
        this.folding.delete(item)
        item.setAttribute(attribute, "")
        animation.cancel()
      })
      .catch(() => undefined)
  }

  /**
   * Show `item` again:  a fold under way stopped, `attribute` off;  one this fold hid unfolds into place.
   * - SIDE EFFECT:  `attribute` off `item`
   */
  show(item: Element, attribute: string) {
    this.folding.get(item)?.cancel()
    const wasFolding = this.folding.delete(item)
    const wasHidden = item.hasAttribute(attribute)
    item.removeAttribute(attribute)
    if (!this.folded.delete(item.id) || (!wasFolding && !wasHidden) || !ItemFold.animates(item)) return
    const height = (item as HTMLElement).getBoundingClientRect?.().height ?? 0
    if (!height) return
    item.animate(
      [
        { height: "0px", opacity: 0, overflow: "hidden" },
        { height: `${height}px`, opacity: 1, overflow: "hidden" }
      ],
      { duration: FOLD_MS, easing: "ease-out" }
    )
  }

  /** Is `item` folding now? */
  isFolding(item: Element): boolean {
    return this.folding.has(item)
  }

  /** May `item` be animated:  a browser with `animate()`, and the reader not asking for reduced motion? */
  private static animates(item: Element): boolean {
    if (typeof item.animate !== "function") return false
    return !item.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  }
}

/** How long an item takes to fold away, or back (ms). */
export const FOLD_MS = 200
