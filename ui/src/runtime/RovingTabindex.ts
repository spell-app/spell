import { type Prettify } from "spell-ui/util"
import * as UIT from "spell-ui/components/components.types"

import type { Disposer, RovingItems, RovingOptions, RovingOrientation, RovingTabindexMode } from "./runtime.types"

/****************
 * ### `RovingTabindex`
 * Roving tabindex for composite widgets:  menus, tabs, listboxes, toolbars, radio-like groups.
 * - In the runtime's lazy chunk;  components reach it through `UI.focus`, never by import:
 *   - `UI.focus.roving()`:  attached to a container, for the element's life (menus, tabs)
 *   - `UI.focus.arrowKey()`:  one key press, from a JSX `onKeyDown` (the accordion, radios, ratings, swatches)
 * - `tabindex: "left alone"`:  the arrows only move focus, and the items' `tabindex`es stay the caller's:
 *   an accordion's titles, each a tab stop;  a component that draws its own tab stop.
 * - The WAI-ARIA APG pattern:  the group is ONE tab stop (active item `tabindex="0"`, the rest `-1`),
 *   arrow keys move between items, Home / End jump to the ends.
 * - Items come from a selector under `container`, or a function (for slotted or computed items).
 *   They're re-read on every key press, so items added later just work;  call `refresh()` to fix up
 *   `tabindex`es eagerly after a change.
 * - Disabled items (`:disabled`, `aria-disabled="true"`, `hidden`) are skipped.
 * - Horizontal arrows flip in right-to-left layouts.
 ****************/
export class RovingTabindex {
  /** element holding the items;  listens for `keydown` / `focusin` */
  readonly container: HTMLElement
  /** how to find items */
  private readonly source: RovingItems
  /** which arrows move */
  private readonly orientation: RovingOrientation
  /** wrap from last to first and back */
  private readonly wrap: boolean
  /** told when the active item moves */
  private readonly onChange?: RovingOptions["onChange"]
  /** `"roving"`:  the items' `tabindex`es are ours;  `"left alone"`:  the caller's */
  private readonly tabindex: RovingTabindexMode
  /** removes the container's listeners */
  private readonly listeners = new AbortController()

  /** A group over `props`, not listening yet:  `attach()` and `arrowKey()` make one. */
  private constructor(props: RovingTabindexProps) {
    const {
      container,
      items,
      orientation = "vertical",
      wrap = true,
      activeIndex,
      onChange,
      tabindex = "roving"
    } = props
    this.container = container
    this.source = items
    this.orientation = orientation
    this.wrap = wrap
    this.onChange = onChange
    this.tabindex = tabindex
    this._activeIndex = activeIndex ?? this.initialIndex()
    this.refresh()
  }

  /** Current items, in order (disabled ones included -- they keep their index). */
  get items(): HTMLElement[] {
    return typeof this.source === "function"
      ? this.source()
      : Array.from(this.container.querySelectorAll<HTMLElement>(this.source))
  }

  /** Index into `items` of the current tab stop. */
  get activeIndex(): number {
    return this._activeIndex
  }
  private _activeIndex = 0

  /** The current tab stop, if any items exist. */
  get activeItem(): HTMLElement | undefined {
    return this.items[this._activeIndex]
  }

  /** Make item `index` the tab stop and focus it. */
  focus(index: number) {
    const item = this.items[index]
    if (!item) return
    this.setActive(index)
    item.focus()
  }

  /** Re-apply `tabindex`es, e.g. after items were added or removed;  none with `tabindex: "left alone"`. */
  refresh() {
    if (this.tabindex === "left alone") return
    const items = this.items
    if (this._activeIndex >= items.length) this._activeIndex = Math.max(0, items.length - 1)
    items.forEach((item, index) => item.setAttribute("tabindex", index === this._activeIndex ? "0" : "-1"))
  }

  /** Stop listening.  Leaves `tabindex`es as they are. */
  readonly detach: Disposer = () => this.listeners.abort()

  ////////////////
  // ## Internals
  ////////////////

  /** Arrow / Home / End handling;  true when it moved focus. */
  private readonly onKeyDown = (event: KeyboardEvent): boolean => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return false
    const items = this.items
    const from = this.indexOfEvent(event, items)
    if (from < 0) return false
    const next = this.targetIndex(event.key, from, items)
    if (next === undefined || next === from) return false
    event.preventDefault()
    this.focus(next)
    return true
  }

  /** Focus landing on an item (click, script) makes it the tab stop. */
  private readonly onFocusIn = (event: FocusEvent) => {
    const items = this.items
    const index = this.indexOfEvent(event, items)
    if (index >= 0 && index !== this._activeIndex) this.setActive(index)
  }

  /** Where `key` moves from `from`, or `undefined` if it isn't a navigation key for this orientation. */
  private targetIndex(key: string, from: number, items: HTMLElement[]): number | undefined {
    const rtl = getComputedStyle(this.container).direction === "rtl"
    const horizontal = this.orientation !== "vertical"
    const vertical = this.orientation !== "horizontal"
    let step = 0
    if (vertical && key === UIT.Key.arrowDown) step = 1
    else if (vertical && key === UIT.Key.arrowUp) step = -1
    else if (horizontal && key === UIT.Key.arrowRight) step = rtl ? -1 : 1
    else if (horizontal && key === UIT.Key.arrowLeft) step = rtl ? 1 : -1
    else if (key === UIT.Key.home) return this.seek(-1, 1, items)
    else if (key === UIT.Key.end) return this.seek(items.length, -1, items)
    else return undefined
    return this.seek(from, step, items)
  }

  /**
   * First enabled item stepping from `from` by `step`, honouring `wrap`.
   * - Home / End start just off the ends (`-1` / `length`);  if every item is disabled, the tab stop stays put.
   * - Without `wrap`, running off an end stays on `from`.
   */
  private seek(from: number, step: number, items: HTMLElement[]): number {
    const count = items.length
    const offEnd = from < 0 || from >= count
    let index = from
    for (let tries = 0; tries < count; tries++) {
      index += step
      if (index < 0 || index >= count) {
        if (offEnd) return this._activeIndex
        if (!this.wrap) return from
        index = (index + count) % count
      }
      if (this.isEnabled(items[index]!)) return index
    }
    return offEnd ? this._activeIndex : from
  }

  /** Index of the item the event came from (composed path, so events from inside items count). */
  private indexOfEvent(event: Event, items: HTMLElement[]): number {
    const path = event.composedPath()
    return items.findIndex((item) => path.includes(item))
  }

  /** Can focus land on `item`? */
  private isEnabled(item: HTMLElement): boolean {
    return !item.hidden && !item.matches(":disabled") && item.getAttribute("aria-disabled") !== "true"
  }

  /** Make `index` the tab stop and tell `onChange`. */
  private setActive(index: number) {
    this._activeIndex = index
    this.refresh()
    const item = this.items[index]
    if (item) this.onChange?.(item, index)
  }

  /** Starting tab stop:  an item already marked current, else the first. */
  private initialIndex(): number {
    const marked = this.items.findIndex(
      (item) => item.getAttribute("tabindex") === "0" || item.getAttribute("aria-selected") === "true"
    )
    return Math.max(0, marked)
  }

  ////////////////
  // ## Statics
  ////////////////

  /**
   * Create and start a roving tabindex -- see class docs.
   * - STATIC:  the factory `UI.focus.roving()` calls;  it listens on `container` until `detach()`.
   */
  static attach(props: RovingTabindexProps): RovingTabindex {
    const group = new RovingTabindex(props)
    const { signal } = group.listeners
    group.container.addEventListener("keydown", group.onKeyDown, { signal })
    group.container.addEventListener("focusin", group.onFocusIn, { signal })
    return group
  }

  /**
   * One key press on a group nothing is attached to:  a JSX `onKeyDown` hands it on, with the group's items.
   * - Arrows step from the item the event came from, Home / End jump, as an attached group's do;
   *   `onChange` hears of the move (a radio group chooses there).
   * - Returns true when it moved focus (and prevented the key's default), false for any other key.
   * - STATIC:  the group keeps no state between presses;  the items say where it is.
   */
  static arrowKey(event: KeyboardEvent, props: RovingTabindexProps): boolean {
    return new RovingTabindex(props).onKeyDown(event)
  }
}

/** Constructor props for `RovingTabindex` (and `UI.focus.roving()`):  where the items are, plus `RovingOptions`. */
export type RovingTabindexProps = Prettify<
  RovingOptions & {
    /** element holding the items;  listens for `keydown` / `focusin` */
    container: HTMLElement
    /** a selector under `container`, or a function for slotted / computed items */
    items: RovingItems
  }
>
