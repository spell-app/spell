import { For } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"
import { buttonsVocabulary } from "./UIButtons.en"

import buttonCSS from "./UIButton.css?inline"

/****************
 * ### `UIButtons`
 * The component behind `<ui-buttons>`:  a group of buttons (and `<ui-or>`s) that share one look.
 *
 * - Its shadow DOM is one box, `<div class="ui … buttons" role="group">`, around a slot.
 *   That box is the group's TRACK:  the buttons' resting fill, which they sit on, set in a little (`UIButton.css`).
 * - Almost no code:  `UIButton.css` hands the group's look to the slotted buttons through inherited tokens.
 * - Its `:state()`s are only for layout the DOM element itself must do:
 *   `fluid` (also for a `width`, or `attach` top / bottom / both) and the floats.
 * - A `wrapping` group measures its rows, and draws a track behind each (`rows`):
 *   CSS can't tell which button starts or ends a row.
 * - A group whose buttons draw their own outline or fill draws no track (`isTrackless`):
 *   CSS can't see into the slot (`:host(:has())` isn't in Chrome).
 ****************/
export class UIButtons extends E.UIComponent<typeof buttonsVocabulary> {
  @E.proto static vocabulary = buttonsVocabulary
  @E.protoMerged static elementSetup = { styleSheets: { button: buttonCSS } } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Layout
  ////////////////

  /** Full width:  `fluid`, a `width` (equal-width buttons), or attached as a whole row (`attach`). */
  @E.cssState("fluid")
  get isFluid(): boolean {
    const { attach } = this
    return this.fluid || !!this.width || attach === "both" || attach === "top" || attach === "bottom"
  }

  ////////////////
  // ## The track
  ////////////////

  /**
   * Its buttons draw their own look, an outline (`basic`) or a fill (a `color`):
   * the group then draws no track for them to sit in, and they sit joined (`UIButton.css`, "Trackless group").
   * - Follows its children and their attributes;  never on a server.
   */
  @E.watches({ childList: true, subtree: true, attributes: true })
  get isTrackless(): boolean {
    return !isServer && [...this.domElement.children].some((child) => UIButtons.drawsOwnLook(child))
  }

  /** `trackless` while its buttons draw their own look (`isTrackless`). */
  protected get extraClass(): string | undefined {
    return this.isTrackless ? TRACKLESS_CLASS : undefined
  }

  /**
   * A child draws its own look:  a `color`, or `basic` among its `appearance` words.
   * - Read from its attribute values, which already take other languages.
   */
  private static drawsOwnLook(child: Element): boolean {
    const values = (child as Partial<E.DOMElement>).attributeValues
    if (!values) return false
    const { appearance } = values
    return !!values.color || (typeof appearance === "string" && appearance.split(/\s+/).includes(BASIC))
  }

  ////////////////
  // ## Rows (`wrapping`)
  ////////////////

  /**
   * Where each row of a `wrapping` group sits in the group's box, the track's inset and border included:
   * one `.row` box is drawn behind each, so every row has round ends of its own.
   * - Empty until measured, and for a group that doesn't wrap:  the group's box is then the one track.
   */
  @E.state({ equals: sameRows })
  accessor rows: readonly RowBox[] = []

  /** The group's box (the track), once rendered. */
  private groupBox?: HTMLElement

  /**
   * SIDE EFFECT:  while it's `wrapping` and drawn, measures its rows again whenever the group, a button or the slot's
   * buttons change;  the cleanup stops, and drops the rows.
   */
  @E.onChange("isReady", "wrapping")
  protected onWrappingChanged(isReady: boolean, wrapping: boolean | undefined) {
    const box = this.groupBox
    const slot = box?.querySelector("slot")
    if (!isReady || !wrapping || !box || !slot) return
    const stop = new AbortController()
    const resizes = new ResizeObserver(() => this.measureRows())
    resizes.observe(box)
    const watchButtons = () => {
      for (const button of slot.assignedElements()) resizes.observe(button)
      this.measureRows()
    }
    watchButtons()
    slot.addEventListener("slotchange", watchButtons, { signal: stop.signal })
    return () => {
      stop.abort()
      resizes.disconnect()
      this.rows = []
    }
  }

  /**
   * Group the slotted buttons into rows by where they sit, and keep each row's box:
   * the buttons' bounds, grown by the track's inset and border, in the group box's padding-box coordinates
   * (what an absolutely placed child is placed in).
   */
  private measureRows() {
    const box = this.groupBox
    const slot = box?.querySelector("slot")
    if (!box || !slot) return
    const style = getComputedStyle(box)
    const grow = {
      left: parseFloat(style.paddingLeft) + box.clientLeft,
      top: parseFloat(style.paddingTop) + box.clientTop,
      right: parseFloat(style.paddingRight) + parseFloat(style.borderRightWidth),
      bottom: parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth)
    }
    const origin = box.getBoundingClientRect()
    const rows: RowBox[] = []
    let row: DOMRect[] = []
    const close = () => {
      if (row.length) rows.push(UIButtons.rowBox(row, origin, box, grow))
      row = []
    }
    for (const button of slot.assignedElements()) {
      const bounds = button.getBoundingClientRect()
      if (bounds.width === 0 && bounds.height === 0) continue
      // a button starting at or below the row's bottom starts the next row
      if (row.length && bounds.top >= Math.max(...row.map((it) => it.bottom)) - 0.5) close()
      row.push(bounds)
    }
    close()
    this.rows = rows
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div
        ref={(element) => (this.groupBox = element)}
        class={this.rootClass}
        role="group"
        part={this.partForName("group")}
      >
        <slot />
        {/* after the slot:  `UIButton.css`'s child rules (`:first-child` ...) still see the slot first */}
        <For each={this.rows} keyed={false}>
          {(row) => (
            <span
              class={ROW_CLASS}
              aria-hidden="true"
              style={{
                left: `${row().left}px`,
                top: `${row().top}px`,
                width: `${row().width}px`,
                height: `${row().height}px`
              }}
            />
          )}
        </For>
      </div>
    )
  }

  /** One row's box:  its buttons' bounds, grown by `grow`, from the padding box of `box` (at `origin`). */
  private static rowBox(bounds: DOMRect[], origin: DOMRect, box: HTMLElement, grow: RowGrowth): RowBox {
    const left = Math.min(...bounds.map((it) => it.left)) - grow.left
    const top = Math.min(...bounds.map((it) => it.top)) - grow.top
    const right = Math.max(...bounds.map((it) => it.right)) + grow.right
    const bottom = Math.max(...bounds.map((it) => it.bottom)) + grow.bottom
    return {
      left: left - origin.left - box.clientLeft,
      top: top - origin.top - box.clientTop,
      width: right - left,
      height: bottom - top
    }
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIButtons extends E.AttributeValues<typeof buttonsVocabulary> {}

/** A row's box in a `wrapping` group, in px from the group box's padding box. */
type RowBox = { left: number; top: number; width: number; height: number }

/** How far a row's box reaches past its buttons on each side:  the track's inset and border, in px. */
type RowGrowth = { left: number; top: number; right: number; bottom: number }

/** Class word of a row's box. */
const ROW_CLASS = "row"

/** Class word of a group that draws no track:  its buttons draw their own look. */
const TRACKLESS_CLASS = "trackless"

/** The `appearance` word of an outlined button. */
const BASIC = "basic"

/** Same rows, to the half pixel:  a re-measure that moved nothing leaves `rows` alone. */
function sameRows(a: readonly RowBox[], b: readonly RowBox[]): boolean {
  const near = (x: number, y: number) => Math.abs(x - y) < 0.5
  return (
    a.length === b.length &&
    a.every(
      (it, at) =>
        near(it.left, b[at]!.left) &&
        near(it.top, b[at]!.top) &&
        near(it.width, b[at]!.width) &&
        near(it.height, b[at]!.height)
    )
  )
}
