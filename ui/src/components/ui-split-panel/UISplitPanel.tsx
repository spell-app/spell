import { For } from "solid-js"

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
 *   - A child with `hidden` isn't a pane:  the others share its room, and nothing in it is redrawn.
 * - A pane is never moved or redrawn as panes come and go or bars drag:  the sizes are its inline `flex`,
 *   and its place is its inline `order`, between the bars'.  So a running program in one keeps running.
 *   - The price:  Tab reaches the bars after every pane, not between them.
 * - The sizes aren't remembered here:  `ui-changed` hands over `sizes`, to keep and give back as `columns` or `rows`.
 * - Sizes, in `columns` or `rows`:  a comma list, one for each pane (`"20%,*,380px"`).
 *   - a number, `px` or `em`:  fixed
 *   - `%`:  that share of what the fixed panes leave
 *   - `*`, or missing:  an equal share of the percent left
 *   - `auto`:  as big as its content, shrinking when there's no room, marked `data-split-fit`;  a drag fixes it, in px
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
  private sizes: PaneSize[] = []

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
    this.apply(UISplitPanel.sizesFor(sizesGiven, panes.length))
    this.findBarPlaces()
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
  private apply(sizes: PaneSize[]) {
    this.sizes = sizes
    this.panes.forEach((pane, index) => {
      const size = sizes[index]
      pane.style.order = String(index * 2)
      pane.style.flex =
        size.units === "%"
          ? `${size.value} ${size.value} 0`
          : size.units === AUTO
            ? "0 1 auto"
            : `0 0 ${size.value}${size.units}`
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
    this.moveTo(held, direction * KEY_STEP_PX * (event.shiftKey ? SHIFT_STEPS : 1))
    this.findBarPlaces()
    this.sendSizes()
    event.preventDefault()
  }

  /** Say the sizes now, in the form `columns` and `rows` take. */
  private sendSizes() {
    this.send("ui-changed", { sizes: UISplitPanel.sizeText(this.sizes), panes: this.panes })
  }

  /**
   * What moving bar `bar` works from, with the pointer at `pointer`.
   * - Measures ONCE, here:  `getBoundingClientRect()` is too slow for every move.
   */
  private measure(bar: number, pointer: number): BarDrag {
    const isRows = this.isRows
    const rect1 = this.panes[bar].getBoundingClientRect()
    const rect2 = this.panes[bar + 1].getBoundingClientRect()
    const size1 = isRows ? rect1.height : rect1.width
    const size2 = isRows ? rect2.height : rect2.width
    const shareOfOthers = this.sizes.reduce(
      (total, size, index) => (index === bar || index === bar + 1 || size.units !== "%" ? total : total + size.value),
      0
    )
    const [minShare, minPixels] = UISplitPanel.minimums(this.minSize)
    return {
      pane1: bar,
      pane2: bar + 1,
      pointerStart: pointer,
      size1,
      size2,
      activeShare: Math.max(100 - shareOfOthers, minShare * 2),
      minShare,
      minPixels
    }
  }

  /**
   * Move the bar to `pointer`.
   * - A fixed pane takes the move in px, and the shares take up the difference:  no fixed pane moves.
   *   - Beside an `auto` pane, it's only limited by `min-size`:  the panel grows with it.
   *   - An `auto` pane with nothing fixed beside it becomes fixed.
   * - Two shares:  the first takes the share at the pointer, clamped to 2 decimals, the second what's left.
   */
  private moveTo(held: BarDrag, pointer: number) {
    const { pane1, pane2, pointerStart, size1, size2, activeShare, minShare, minPixels } = held
    const moved = pointer - pointerStart
    const units = (index: number) => this.sizes[index]?.units
    const fixed =
      [pane1, pane2].find((index) => units(index) !== "%" && units(index) !== AUTO) ??
      [pane1, pane2].find((index) => units(index) !== "%")
    if (fixed !== undefined) {
      const other = fixed === pane1 ? pane2 : pane1
      const wanted = fixed === pane1 ? size1 + moved : size2 - moved
      const most = units(other) === AUTO ? Infinity : size1 + size2
      const value = Math.round(Math.min(most, Math.max(minPixels, wanted)))
      this.apply(this.sizes.map((size, index) => (index === fixed ? { value, units: "px" } : size)))
      return
    }
    const room = size1 + size2
    if (!room) return
    const share = ((size1 + moved) * activeShare) / room
    const value1 = Math.round(Math.min(activeShare - minShare, Math.max(minShare, share)) * 100) / 100
    const value2 = Math.round((activeShare - value1) * 100) / 100
    this.apply(
      this.sizes.map((size, index) => {
        if (index === pane1) return { value: value1, units: "%" }
        if (index === pane2) return { value: value2, units: "%" }
        return size
      })
    )
  }

  ////////////////
  // ## Sizes
  ////////////////

  /**
   * One `PaneSize` per pane from `spec`, in the form `columns` and `rows` take.
   * - Cut or padded to `count`:  a missing or unreadable entry counts as `*`.
   * - `*` entries share the percent the `%` entries leave, equally (at least 1% each).
   */
  static sizesFor(spec: string, count: number): PaneSize[] {
    const given = spec ? spec.split(",").slice(0, count) : []
    while (given.length < count) given.push(STAR)
    let stars = 0
    let percents = 0
    const sizes = given.map((text): { value: number | typeof STAR; units: string } => {
      const size = text.trim()
      if (size === AUTO) return { value: 0, units: AUTO }
      const match = NUMBER_WITH_UNITS.exec(size)
      if (match) {
        const units = match[2] || "px"
        const value = parseFloat(match[1])
        if (units === "%") percents += value
        return { value, units }
      }
      if (size !== STAR) console.warn(`<ui-split-panel>:  the size "${size}" isn't one;  it shares what's left`)
      stars++
      return { value: STAR, units: "%" }
    })
    const perStar = Math.max(1, (100 - percents) / Math.max(stars, 1))
    return sizes.map(({ value, units }) => ({ value: value === STAR ? perStar : value, units }))
  }

  /** `sizes` in the form `columns` and `rows` take:  `"60%,40%"`. */
  static sizeText(sizes: PaneSize[]): string {
    return sizes.map(({ value, units }) => (units === AUTO ? AUTO : `${value}${units}`)).join(",")
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

/** One pane's size, e.g. `{ value: 20, units: "%" }`. */
export type PaneSize = {
  /** How much, in `units`. */
  value: number
  /** `px`, `em`, `%` or `auto` (its `value` unused). */
  units: string
}

/** What moving a bar works from, measured once as it starts. */
type BarDrag = {
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
  /** Percent the two panes share. */
  activeShare: number
  /** Smallest share either may have. */
  minShare: number
  /** Smallest size a fixed pane may have, px. */
  minPixels: number
}

/** A pane as big as its content:  its units, and how a spec says it. */
const AUTO = "auto"
/** A size that shares what's left. */
const STAR = "*"
/** The attribute an `auto` pane carries, for what it holds to lay out in it rather than over it. */
const FIT_ATTRIBUTE = "data-split-fit"
/** A bar's place before the panes are measured. */
const MIDDLE = 50
/** One size in a spec:  a number with optional units. */
const NUMBER_WITH_UNITS = /^([0-9]*\.?[0-9]+)(px|em|rem|%)?$/
/** Smallest share a pane may be dragged to, unless `min-size` says. */
const DEFAULT_MIN_SHARE = 5
/** How far an arrow key moves a bar, px. */
const KEY_STEP_PX = 16
/** How many steps Shift makes it. */
const SHIFT_STEPS = 10
/** The arrow keys along a bar between panes side by side, and which way each moves it. */
const COLUMN_KEYS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
/** The arrow keys along a bar between panes one above the other, and which way each moves it. */
const ROW_KEYS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 }
