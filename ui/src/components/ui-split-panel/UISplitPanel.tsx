import { For } from "solid-js"
import { isServer } from "@solidjs/web"

import { E } from "spell/ui/core"
import { splitPanelVocabulary } from "./UISplitPanel.en"

import splitPanelCSS from "./UISplitPanel.css?inline"

/****************
 * ### `UISplitPanel`
 * The component behind `<ui-split-panel>`:  its children side by side (`columns`) or one above the other (`rows`),
 * sized as those say, with a bar between each two to drag when `resizable`.
 *
 *     <slot></slot>                            (the panes:  your children, in the host's flex row)
 *     <div part="bar" role="separator"></div>  (one less than the panes)
 *
 * - Each child is a pane, written anywhere:  `<ui-panel parent="its id">` joins it, as a section joins a section.
 *   - A child that draws no box of its own (`display: contents`:  `<ui-segment>`, `<ui-card>`, a view's `<slot>`) is
 *     given one, marked `data-split-box` (`giveBoxes()`, epic `old-console-redo` I13):  else its size lands on nothing,
 *     and what's in it sits in the row as wide as its words.
 *   - A child with `hidden` isn't a pane:  the others share its room, and nothing in it is redrawn.
 * - A pane is never moved or redrawn as panes come and go or bars drag:  the sizes are its inline `flex`,
 *   and its place is its inline `order`, between the bars'.  So a running program in one keeps running.
 *   - The price:  Tab reaches the bars after every pane, not between them.
 * - The sizes aren't remembered here:  `ui-changed` hands over `sizes`, to keep and give back as `columns` or `rows`.
 * - Sizes, in `columns` or `rows`:  a comma list, one for each pane (`"20%, *, 380px"`), read by `E.PaneSizes`,
 *   as `<ui-tree>` reads its columns' `size`.
 *   - a number, `px` or `em`:  fixed
 *   - `%`:  that share of what the fixed panes leave
 *   - `*`, or missing:  an equal share of the percent left
 *   - `auto`:  as big as its content, shrinking when there's no room, marked `data-split-fit`;  a drag fixes it, in px
 * - `grows`:  ONE pane takes every change, e.g. the app between its tools (`grows="first"`):
 *   - a bar sizes the pane on its other side, in px, and the growing pane takes the difference
 *   - so the panes between keep their widths, and slide
 *   - the panel's own growth and shrinking is that pane's too;  past its `min-width`, the others give way
 * - A dragged bar stays under the pointer, until a pane's least or most stops it:
 *   - the panes on each side of it take the move, the nearest first:  one at its most (or least) passes the rest on
 *   - a pane's own `min-height` / `max-height` (`min-width` / `max-width` side by side) bound it, whatever they say:
 *     px, a percent, `max-content`
 *   - one whose least and most are the same can't be resized, e.g. a folded card, its header alone:
 *     a bar beside it sizes the nearest panes that can be, across it, and it keeps its size
 *   - let go, each pane keeps its kind of size:  a share's new share puts it where it was dragged to
 * - Keyboard:  a bar takes the focus;  the arrow keys along it move it, Shift by ten times as much.
 ****************/
export class UISplitPanel extends E.UIComponent<typeof splitPanelVocabulary> {
  @E.proto static vocabulary = splitPanelVocabulary
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { splitPanel: splitPanelCSS },
    cssStates: ["resizable"]
  }

  /** The panes now, in order:  the children without `hidden`. */
  @E.state({ equals: E.isSameList }) accessor panes: HTMLElement[] = []

  /** A bar is being dragged. */
  @E.state @E.cssState("dragging") accessor isDragging = false

  /** Each bar's place, as a percent of the room of the two panes beside it:  what a screen reader says. */
  @E.state({ equals: E.isSameList }) accessor barPlaces: number[] = []

  /** Sizes now, one per pane.  NOT a reactive member:  a drag rewrites them on every move. */
  private sizes: E.PaneSize[] = []

  /** What a drag works from, measured when it starts. */
  private dragged: BarDrag | undefined

  /** One above the other. */
  @E.cssState("rows")
  get isRows(): boolean {
    return this.rows !== undefined
  }

  /** The sizes as given, whichever way the panes go. */
  get sizesGiven(): string {
    return (this.isRows ? this.rows : this.columns) ?? ""
  }

  /** Index of the pane that takes every change (`grows`):  `undefined` without one. */
  private get growingPane(): number | undefined {
    const grows = this.grows?.trim()
    if (!grows) return undefined
    if (grows === "first") return 0
    if (grows === "last") return this.panes.length - 1
    const position = parseInt(grows, 10)
    return position >= 1 && position <= this.panes.length ? position - 1 : undefined
  }

  /** The last bar's parts:  it's a bar, and the last. */
  private get lastBarPart(): string {
    return `${this.partForName("bar")} ${this.partForName("last-bar")}`
  }

  render() {
    return (
      <>
        <slot />
        <For each={this.panes.slice(1)}>
          {(_pane, index) => (
            <div
              class="bar"
              part={index() === this.panes.length - 2 ? this.lastBarPart : this.partForName("bar")}
              style={{ order: index() * 2 + 1 }}
              role={this.resizable ? "separator" : undefined}
              tabindex={this.resizable ? 0 : undefined}
              aria-label={this.resizable ? this.translationForKey("resizePanes") : undefined}
              aria-orientation={this.isRows ? "horizontal" : "vertical"}
              aria-valuenow={this.resizable ? (this.barPlaces[index()] ?? MIDDLE) : undefined}
              onPointerDown={(event) => this.startDragging(event, index())}
              onPointerMove={this.drag}
              onPointerUp={this.stopDragging}
              onPointerCancel={this.stopDragging}
              onKeyDown={(event) => this.moveByKey(event, index())}
            />
          )}
        </For>
      </>
    )
  }

  ////////////////
  // ## Panes
  ////////////////

  /** Children came or went:  they're the panes now. */
  @E.on("slotchange", { target: "renderRoot" })
  protected onSlotChanged() {
    this.findPanes()
  }

  /** A child's `hidden` changed. */
  @E.watches({ attributes: true, attributeFilter: ["hidden"], subtree: true })
  protected onHiddenChanged(mutations: MutationRecord[]) {
    if (mutations.some(({ target }) => target.parentNode === this.domElement)) this.findPanes()
  }

  /** Read the panes from the children. */
  private findPanes() {
    this.panes = [...this.domElement.children].filter((child) => !child.hasAttribute("hidden")) as HTMLElement[]
  }

  /** Size the panes once drawn, and again when their number or the sizes given change. */
  @E.onChange("panes", "sizesGiven", { writesDOMElement: true })
  protected onPanesChanged(panes: HTMLElement[], sizesGiven: string) {
    this.apply(E.PaneSizes.sizesFor(sizesGiven, panes.length, { source: "<ui-split-panel>" }))
    if (isServer) return
    this.giveBoxes()
    // measured once laid out, after this update:  the bars read the places, so a write now would draw them twice;
    // boxes again first, for a child whose element has only now set itself up
    E.beforeNextPaint(() => {
      this.giveBoxes()
      this.findBarPlaces()
    })
  }

  /**
   * SIDE EFFECT:  each pane that draws no box of its own (`display: contents`) marked `BOX_ATTRIBUTE`, which gives it
   * one (`UISplitPanel.css`):  so its inline `flex` sizes something, and a drag can measure it.
   * - once marked, always:  the box it's given makes it read as one
   */
  private giveBoxes() {
    for (const pane of this.panes)
      if (!pane.hasAttribute(BOX_ATTRIBUTE) && getComputedStyle(pane).display === "contents")
        pane.setAttribute(BOX_ATTRIBUTE, "")
  }

  /** Read each bar's place from where the panes are now:  not on every move of a drag. */
  private findBarPlaces() {
    const lengths = this.panes.map((pane) => {
      const { width, height } = pane.getBoundingClientRect()
      return this.isRows ? height : width
    })
    this.barPlaces = lengths.slice(1).map((after, index) => {
      const before = lengths[index]
      return before + after ? Math.round((before * 100) / (before + after)) : MIDDLE
    })
  }

  /** Make `sizes` the sizes:  each pane's inline `order` and `flex`. */
  private apply(sizes: E.PaneSize[]) {
    this.sizes = sizes
    // beside a growing pane, a fixed pane still gives way once that one is as small as it gets
    const fixedShrink = this.growingPane === undefined ? 0 : 1
    this.panes.forEach((pane, index) => {
      const size = sizes[index]
      pane.style.order = String(index * 2)
      pane.style.flex =
        size.units === "%"
          ? `${size.value} ${size.value} 0`
          : size.units === AUTO
            ? "0 1 auto"
            : `0 ${fixedShrink} ${size.value}${size.units}`
      pane.toggleAttribute(FIT_ATTRIBUTE, size.units === AUTO)
    })
  }

  ////////////////
  // ## Dragging a bar
  ////////////////

  /** A bar's `pointerdown`:  measure the two panes it sits between, and take the pointer until it's let go. */
  private startDragging(event: PointerEvent & { currentTarget: HTMLElement }, bar: number) {
    if (!this.resizable || event.button !== 0) return
    this.dragged = this.measure(bar, this.isRows ? event.clientY : event.clientX)
    if (!this.dragged) return
    event.currentTarget.setPointerCapture(event.pointerId)
    this.isDragging = true
    event.preventDefault()
  }

  /** `pointermove` while dragging:  the bar follows the pointer. */
  @E.untracked private readonly drag = (event: PointerEvent) => {
    if (this.dragged) this.moveTo(this.dragged, this.isRows ? event.clientY : event.clientX)
  }

  /** Let go:  say where the sizes ended up. */
  @E.untracked private readonly stopDragging = () => {
    if (!this.dragged) return
    this.settle(this.dragged)
    this.dragged = undefined
    this.isDragging = false
    this.findBarPlaces()
    this.sendSizes()
  }

  /** An arrow key along the bar moves it, Shift by ten times as much. */
  @E.untracked private moveByKey(event: KeyboardEvent, bar: number) {
    const direction = (this.isRows ? ROW_KEYS : COLUMN_KEYS)[event.key]
    if (!this.resizable || !direction) return
    const held = this.measure(bar, 0)
    if (!held) return
    this.moveTo(held, direction * KEY_STEP_PX * (event.shiftKey ? SHIFT_STEPS : 1))
    this.settle(held)
    this.findBarPlaces()
    this.sendSizes()
    event.preventDefault()
  }

  /** Say the sizes now, in the form `columns` and `rows` take. */
  private sendSizes() {
    this.send("ui-changed", { sizes: E.PaneSizes.sizeText(this.sizes), panes: this.panes })
  }

  /**
   * What moving bar `bar` works from, with the pointer at `pointer`:  `undefined` when it can't move.
   * - Every pane's size and its least and most (`PaneBounds`), whatever sets them.
   * - `undefined` when no pane on one side of the bar can be resized (its least and most the same).
   * - Measures ONCE, here:  `getBoundingClientRect()` is too slow for every move.
   */
  private measure(bar: number, pointer: number): BarDrag | undefined {
    const isRows = this.isRows
    const [minShare, minPixels] = UISplitPanel.minimums(this.minSize)
    const lengths = this.panes.map((pane) => {
      const { width, height } = pane.getBoundingClientRect()
      return isRows ? height : width
    })
    const total = lengths.reduce((sum, length) => sum + length, 0)
    const bounds = this.panes.map((pane, index) => {
      const own = UISplitPanel.boundsOf(pane, isRows)
      const shareLeast = this.sizes[index]?.units === "%" ? (total * minShare) / 100 : 0
      // never above its most, nor above what it is now:  a pane can always stay as it is
      const least = Math.min(Math.max(own.least, minPixels, shareLeast), own.most, lengths[index])
      return { least, most: Math.max(own.most, lengths[index]) }
    })
    const canResize = (index: number) => bounds[index].most - bounds[index].least >= 1
    let pane1 = bar
    while (pane1 >= 0 && !canResize(pane1)) pane1--
    let pane2 = bar + 1
    while (pane2 < this.panes.length && !canResize(pane2)) pane2++
    if (pane1 < 0 || pane2 >= this.panes.length) return undefined
    return {
      bar,
      lengths,
      bounds,
      sizes: this.sizes,
      pane1,
      pane2,
      pointerStart: pointer,
      size1: lengths[pane1],
      size2: lengths[pane2],
      bounds1: bounds[pane1],
      bounds2: bounds[pane2],
      minPixels
    }
  }

  /**
   * Move the bar to `pointer`:  it stays under it, until a pane's least or most stops it.
   * - The panes before the bar take the move, the nearest first, each up to its most (or down to its least);
   *   the panes after it give it up, the same way.
   *   - So a pane that can't be resized is skipped, and one at its most passes the rest on.
   * - While dragging, every pane is held at its size in px:  shares laid out by `flex` would spread a move over
   *   every pane, and a pane CSS stops (`max-height: max-content`) passes its part to the others.
   *   Let go (`settle()`), they're shares again.
   * - Beside an `auto` pane, a fixed pane takes the move, limited only by `min-size`:  the panel grows with it.
   */
  private moveTo(held: BarDrag, pointer: number) {
    const moved = pointer - held.pointerStart
    const growing = this.growingPane
    if (growing !== undefined) return this.moveBeside(held, growing, moved)
    const { pane1, pane2, sizes } = held
    if (sizes[pane1]?.units === AUTO || sizes[pane2]?.units === AUTO) return this.moveBesideAuto(held, moved)
    const { lengths, bounds, bar } = held
    const before = lengths.map((_, index) => bar - index).filter((index) => index >= 0)
    const after = lengths.map((_, index) => bar + 1 + index).filter((index) => index < lengths.length)
    const [gaining, losing] = moved >= 0 ? [before, after] : [after, before]
    const room = (list: number[], way: "grow" | "shrink") =>
      list.reduce(
        (sum, index) =>
          sum + (way === "grow" ? bounds[index].most - lengths[index] : lengths[index] - bounds[index].least),
        0
      )
    let left = Math.min(Math.abs(moved), room(gaining, "grow"), room(losing, "shrink"))
    const next = [...lengths]
    let gain = left
    for (const index of gaining) {
      const step = Math.min(gain, bounds[index].most - lengths[index])
      next[index] += step
      gain -= step
    }
    for (const index of losing) {
      const step = Math.min(left, lengths[index] - bounds[index].least)
      next[index] -= step
      left -= step
    }
    held.moved = next
    this.apply(next.map((length) => ({ value: Math.round(length * 100) / 100, units: "px" })))
  }

  /**
   * Let go of a move:  the panes go back to their kinds of size, at the sizes they were moved to.
   * - A share's new share is its part of what the shares have now, so laid out by `flex` it's as tall (wide) as it
   *   was moved to:  every share in proportion to its size, and none stopped by its least or most.
   * - A fixed pane keeps its size in px;  an `auto` pane moved is fixed in px, one not moved stays `auto`.
   */
  private settle(held: BarDrag) {
    const moved = held.moved
    if (!moved) return
    const { sizes, lengths } = held
    const isShare = (index: number) => sizes[index]?.units === "%"
    const shares = sizes.reduce((sum, size, index) => (isShare(index) ? sum + size.value : sum), 0)
    const room = moved.reduce((sum, length, index) => (isShare(index) ? sum + length : sum), 0)
    this.apply(
      sizes.map((size, index) => {
        if (isShare(index))
          return { value: room ? Math.round(((moved[index] * shares) / room) * 100) / 100 : size.value, units: "%" }
        return Math.abs(moved[index] - lengths[index]) < 0.5 ? size : { value: Math.round(moved[index]), units: "px" }
      })
    )
  }

  /**
   * Move a bar beside an `auto` pane:  the fixed pane takes the move in px, the `auto` one is as big as its content.
   * - Only limited by `min-size` and the fixed pane's own bounds:  the panel grows with it.
   * - Two `auto` panes:  the first becomes fixed.
   */
  private moveBesideAuto(held: BarDrag, moved: number) {
    const { pane1, pane2, size1, size2, bounds1, bounds2, sizes } = held
    const fixed = [pane1, pane2].find((index) => sizes[index]?.units !== AUTO) ?? pane1
    const wanted = fixed === pane1 ? size1 + moved : size2 - moved
    const own = fixed === pane1 ? bounds1 : bounds2
    const value = Math.round(Math.min(own.most, Math.max(own.least, held.minPixels, wanted)))
    this.apply(sizes.map((size, index) => (index === fixed ? { value, units: "px" } : size)))
  }

  /**
   * Move a bar in a panel with a growing pane (`grows`):  the pane on the bar's other side takes the move, in px,
   * and the growing pane the difference.
   * - Every other pane is fixed at its width as the drag started, so none moves but those two.
   * - Neither gets smaller than `min-size` (px), and the growing pane keeps `DEFAULT_MIN_SHARE` of the room.
   */
  private moveBeside(held: BarDrag, growing: number, moved: number) {
    const { pane1, pane2, size1, size2, bounds1, bounds2, lengths, minPixels } = held
    const sized = growing <= pane1 ? pane2 : pane1
    const bounds = sized === pane1 ? bounds1 : bounds2
    const wanted = sized === pane1 ? size1 + moved : size2 - moved
    const room = lengths.reduce((total, length) => total + length, 0)
    const growingLeast = Math.max(minPixels, (room * DEFAULT_MIN_SHARE) / 100)
    const most = Math.min(bounds.most, lengths[sized] + lengths[growing] - growingLeast)
    const value = Math.round(Math.min(most, Math.max(bounds.least, wanted)))
    this.apply(
      this.sizes.map((size, index) => {
        if (index === growing) return { value: 100, units: "%" }
        if (index === sized) return { value, units: "px" }
        return size.units === "%" || size.units === AUTO ? { value: Math.round(lengths[index]), units: "px" } : size
      })
    )
  }

  ////////////////
  // ## Sizes
  ////////////////

  /**
   * The least and most `pane` may be dragged to, px:  its own `min-` and `max-height` (`-width` side by side).
   * - Its least:  only px count;  `auto` is 0.
   * - Its most:  whatever its `max-height` says, `max-content` or a percent too, found by asking for far more
   *   and measuring what it takes;  `none` is `Infinity`.
   * - SIDE EFFECT:  lays the page out again, once per pane with a most.
   */
  private static boundsOf(pane: HTMLElement, isRows: boolean): PaneBounds {
    const style = getComputedStyle(pane)
    const least = isRows ? style.minHeight : style.minWidth
    const most = isRows ? style.maxHeight : style.maxWidth
    return {
      least: least.endsWith("px") ? parseFloat(least) : 0,
      most: most === "none" ? Infinity : UISplitPanel.mostOf(pane, isRows)
    }
  }

  /** How big `pane` gets when asked for far more than there's room for, px:  what its `max-height` allows. */
  private static mostOf(pane: HTMLElement, isRows: boolean): number {
    const flex = pane.style.flex
    pane.style.flex = `0 0 ${FAR_MORE_PX}px`
    const { width, height } = pane.getBoundingClientRect()
    pane.style.flex = flex
    return isRows ? height : width
  }

  /** `min-size`, as the smallest share and the smallest px. */
  private static minimums(minSize: string | undefined): [share: number, pixels: number] {
    const match = NUMBER_WITH_UNITS.exec(minSize?.trim() ?? "")
    if (!match) return [DEFAULT_MIN_SHARE, 0]
    const value = parseFloat(match[1])
    return match[2] === "%" ? [value, 0] : [DEFAULT_MIN_SHARE, value]
  }
}

export interface UISplitPanel extends E.AttributeValues<typeof splitPanelVocabulary> {}

/** The least and most a pane may be dragged to, px, from its own CSS:  the same, and it can't be resized. */
type PaneBounds = {
  /** Its `min-height` (`min-width`), else 0. */
  least: number
  /** Its `max-height` (`max-width`), else `Infinity`. */
  most: number
}

/** What moving a bar works from, measured once as it starts. */
type BarDrag = {
  /** Index of the bar. */
  bar: number
  /** Every pane's size as it started, px. */
  lengths: number[]
  /** Every pane's least and most, px, `min-size` included. */
  bounds: PaneBounds[]
  /** The sizes given as it started:  each pane's kind of size, which it goes back to when let go. */
  sizes: E.PaneSize[]
  /** Every pane's size now, px, once the bar has moved. */
  moved?: number[]
  /** Index of the pane before the bar. */
  pane1: number
  /** Index of the pane after it. */
  pane2: number
  /** Where the pointer was as it started, px. */
  pointerStart: number
  /** `pane1`'s size as it started, px. */
  size1: number
  /** `pane2`'s size as it started, px. */
  size2: number
  /** The least and most `pane1` may be, px, `min-size` included. */
  bounds1: PaneBounds
  /** The least and most `pane2` may be, px, `min-size` included. */
  bounds2: PaneBounds
  /** Smallest size a fixed pane may have, px. */
  minPixels: number
}

/** A pane as big as its content:  its units (`E.PaneSizes`). */
const AUTO = "auto"
/** The attribute an `auto` pane carries, for what it holds to lay out in it rather than over it. */
const FIT_ATTRIBUTE = "data-split-fit"

/** Marks a pane that draws no box of its own, given one (`giveBoxes()`). */
const BOX_ATTRIBUTE = "data-split-box"
/** A bar's place before the panes are measured. */
const MIDDLE = 50
/** One size in a spec:  a number with optional units. */
const NUMBER_WITH_UNITS = /^([0-9]*\.?[0-9]+)(px|em|rem|%)?$/
/** Smallest share a pane may be dragged to, unless `min-size` says. */
const DEFAULT_MIN_SHARE = 5
/** Far more than any pane could be, px:  what a pane is asked for to find its most. */
const FAR_MORE_PX = 100_000
/** How far an arrow key moves a bar, px. */
const KEY_STEP_PX = 16
/** How many steps Shift makes it. */
const SHIFT_STEPS = 10
/** The arrow keys along a bar between panes side by side, and which way each moves it. */
const COLUMN_KEYS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
/** The arrow keys along a bar between panes one above the other, and which way each moves it. */
const ROW_KEYS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 }
