import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

/****************
 * ### `ScrollingRow`
 * A row of items that scrolls sideways when they don't fit, with a `‹` / `›` key at each end
 * while there's more to scroll that way.
 * - `<ui-toolbar>` and `<ui-tabs>` both use it:  ONE way a row of ours scrolls.
 *   - The toolbar's row is its menu's `<nav>`;  the tab set's, its tab list.
 * - Its look is [the scrolling row's sheet](ScrollingRow.css), which each of them adopts:
 *   the row's box carries the class `scrolling-row`, the row and its two keys are its children.
 * - What it does:
 *   - follows the row's scroll, and the sizes of the row and its items (`ResizeObserver`), once `follow()`ed
 *   - `canScrollStart` / `canScrollEnd`:  which key shows;  `isOverflowing`:  either does
 *   - `scrollByPage()`:  a key's press, by most of the row's width (the kit's `scrollByRow()`)
 *   - `bringIntoView()`:  scrolls the row, and only the row, so one item shows whole
 *   - `key()`:  draws a key
 * - Its owner is the component drawing the row:  the keys take its part names, words and icon packs.
 * - MUST be created under that component's owner:  each key draws an icon.
 * - NOTE: left-to-right only, for now:  in a right-to-left page `scrollLeft` counts the other way.
 ****************/
export class ScrollingRow {
  /** There's more to scroll back to (the `‹` key shows). */
  @E.state accessor canScrollStart = false

  /** There's more to scroll on to (the `›` key shows). */
  @E.state accessor canScrollEnd = false

  /** The items don't all fit:  the row scrolls. */
  get isOverflowing(): boolean {
    return this.canScrollStart || this.canScrollEnd
  }

  /** The component drawing the row. */
  private readonly owner: ScrollingRowOwner

  /** Whether the keys may show:  a shrinkable toolbar fits its titles instead;  untracked when it's asked. */
  private readonly canScroll: () => boolean

  /** The row's box, while followed. */
  private row: HTMLElement | undefined

  constructor({ owner, canScroll = () => true }: ScrollingRowProps) {
    this.owner = owner
    this.canScroll = canScroll
  }

  /**
   * SIDE EFFECT:  follow `row`'s scroll, and the sizes of it and its items.
   * - Its items:  what its `<slot>` holds (a toolbar's), else its own children (a tab set's buttons).
   * - Returns the cleanup, for an effect's.
   */
  follow(row: HTMLElement): () => void {
    this.row = row
    const stop = new AbortController()
    row.addEventListener("scroll", () => this.measure(), { passive: true, signal: stop.signal })
    const resizes = new ResizeObserver(() => this.measure())
    resizes.observe(row)
    const slot = row.querySelector("slot")
    const watchItems = () => {
      for (const item of this.items()) resizes.observe(item)
    }
    watchItems()
    slot?.addEventListener("slotchange", watchItems, { signal: stop.signal })
    // a tab set's buttons come and go with its panes
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- a watch on ANOTHER element (the row a component hands it), only while followed
    const children = slot ? undefined : new MutationObserver(watchItems)
    children?.observe(row, { childList: true })
    this.measure()
    return () => {
      stop.abort()
      resizes.disconnect()
      children?.disconnect()
      if (this.row !== row) return
      // no longer a row (a tab set turned vertical):  no keys
      this.row = undefined
      this.canScrollStart = this.canScrollEnd = false
    }
  }

  /** Read where the row is scrolled to, and how far it can go. */
  measure() {
    const row = this.row
    if (!row) return
    const canScroll = this.canScroll()
    const { start, end } = E.scrollEnds(row)
    this.canScrollStart = canScroll && start
    this.canScrollEnd = canScroll && end
  }

  /** Scroll by most of the row's width:  `-1` back, `1` on;  smoothly, unless the person asked for less motion. */
  scrollByPage(direction: -1 | 1) {
    if (this.row) E.scrollByRow(this.row, direction)
  }

  /**
   * Scroll the row so `item` shows whole, clear of the keys:  the least that does it.
   * - It stops where a press of a key would (an item's start at the row's start, the row's scroll snap):
   *   between two such places, the browser snapped back, and a tab near the end was left out of sight.
   * - Only the row moves, never the page:  a tab picked at the bottom of a long page stays where it is.
   * - `smoothly`:  as a key's press does (at once with reduced motion);  else at once, for a first drawing.
   */
  bringIntoView(item: Element, { smoothly = false }: { smoothly?: boolean } = {}) {
    const row = this.row
    if (!row || !item.isConnected) return
    const view = row.getBoundingClientRect()
    const box = item.getBoundingClientRect()
    // the keys sit over the row's ends:  the item shows clear of them
    const inset = parseFloat(getComputedStyle(row).scrollPaddingInlineStart) || 0
    const start = view.left + inset
    const end = view.right - inset
    let by = 0
    if (box.left < start) by = box.left - start
    else if (box.right > end) {
      // the first item whose start, at the row's start, brings `item`'s end in;  else `item`'s own start
      const starts = this.items().map((each) => each.getBoundingClientRect().left)
      const fits = starts.find((left) => left > start && box.right - (left - start) <= end)
      by = Math.min(fits ?? box.left, box.left) - start
    }
    if (!by) return
    const isReduced = !!row.ownerDocument.defaultView?.matchMedia(REDUCED_MOTION).matches
    row.scrollBy({ left: by, behavior: smoothly && !isReduced ? "smooth" : "instant" })
  }

  /** The row's items:  what its `<slot>` holds (a toolbar's), else its own children (a tab set's buttons). */
  private items(): Element[] {
    const row = this.row
    const slot = row?.querySelector("slot")
    return slot ? slot.assignedElements() : [...(row?.children ?? [])]
  }

  /** The `‹` (`start`) or `›` (`end`) key:  in the layout only while the items overflow, shown while it can go. */
  key(end: ScrollEnd): JSX.Element {
    const isStart = end === START
    const label = () => this.owner.translationForKey(isStart ? "scrollStart" : "scrollEnd")
    const glyph = new E.IconGlyph({ owner: this.owner, name: () => (isStart ? CHEVRON_START : CHEVRON_END) })
    return (
      <button
        type="button"
        class={`${SCROLL} ${end}`}
        part={this.owner.partForName(isStart ? "scroll-start" : "scroll-end")}
        tabindex="-1"
        aria-label={label()}
        title={label()}
        hidden={!this.isOverflowing}
        data-can={(isStart ? this.canScrollStart : this.canScrollEnd) ? "" : undefined}
        onClick={() => this.scrollByPage(isStart ? -1 : 1)}
      >
        {glyph.svg}
      </button>
    )
  }
}

/** What a `ScrollingRow` needs of the component drawing it. */
export type ScrollingRowOwner = E.IconGlyphOwner & {
  /** a part's name in its vocabulary:  `scroll-start`, `scroll-end` */
  partForName(name: string): string
  /** a text of its vocabulary:  `scrollStart`, `scrollEnd` (each key's name and tooltip) */
  translationForKey(key: string): string
}

/** `ScrollingRow`'s settings. */
export type ScrollingRowProps = {
  /** the component drawing the row */
  owner: ScrollingRowOwner
  /** whether the keys may show (default:  always, while the items don't fit) */
  canScroll?: () => boolean
}

/** An end of the row:  where a key sits. */
export type ScrollEnd = typeof START | typeof END

/** The `‹` key's end. */
export const START = "start"

/** The `›` key's end. */
export const END = "end"

/** Class word of the two keys. */
const SCROLL = "scroll"

/** The `‹` key's icon. */
const CHEVRON_START = "chevron left"

/** The `›` key's icon. */
const CHEVRON_END = "chevron right"

/** The person asked for less motion. */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
