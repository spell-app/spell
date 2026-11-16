import { isServer } from "@solidjs/web"
import { For, Show } from "solid-js"

import { Dragging } from "spell/util/Dragging"
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI } from "spell/ui/core"
import { treeVocabulary } from "./UITree.en"
import { UITreeItem } from "./UITreeItem"

import treeCSS from "./UITree.css?inline"
import columnsCSS from "./UITreeColumns.css?inline"

/****************
 * ### `UITree`
 * The component behind `<ui-tree>`:  rows nested in rows (`<ui-tree-item>`s), which open and close,
 * selected one or many at a time.
 * - Its rows are its children, and each row's rows are that row's:  the nesting IS the tree.
 * - Selecting:  a click on a row, or Enter or Space on it.
 *   - `choose="many"` follows the rule every list of ours does (`E.ListSelection`):  Shift takes a range, Command or
 *     Control adds or takes away, over the rows on screen, in their order.
 *   - It asks first, with a cancelable `ui-selecting`:  a page that decides what's selected itself cancels it,
 *     and sets each row's `selected`.
 * - Keys, the tree pattern:  up and down, Home and End (`UI.focus.roving()`);  right opens, then goes in;  left closes,
 *   then goes out.  One tab stop.
 * - `filter`:  only the rows whose words hold it, with the rows they're inside kept open.
 *   It changes no row's `open`.  Rows drawn only once their parent opens can't be found while that's closed.
 * - Plain walks over its light DOM, so 500 rows filter in a few milliseconds.
 * - `appearance="columns"`:  a column per level, side by side, as a Mac's Finder shows folders.
 *   - The same rows, nested the same way:  each open row draws the rows inside it as the next column
 *     (`UITreeColumns.css`).
 *   - Selecting a row opens it, and closes every other open row but the ones it's inside:
 *     the open rows are the chain of picks, one a column (a picked row with no rows is open too, drawing none).
 *   - The keys select as they move:  up and down within a column;  right and left to the next and previous column.
 *   - `column-titles`:  a title over each column, by level.
 *   - The line after each column resizes it:  dragged, or its arrow keys;  a double-click puts it back.
 *     A tree with an `id` remembers the widths in this browser, under it;  one without, until the page reloads.
 * - `sticky-path`:  while it scrolls, one line pinned at its top names the open rows the first row in view is inside.
 *   - Read again on every scroll of whatever scrolls it, before the next paint:  rows know nothing of it.
 *   - Hidden from screen readers:  each row already says how deep it is (`aria-level`), and the keys walk the rows.
 ****************/
export class UITree extends E.UIComponent<typeof treeVocabulary> {
  @E.proto static vocabulary = treeVocabulary
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { tree: treeCSS, columns: columnsCSS },
    delegatesFocus: false,
    aria: { role: "tree" }
  }

  /** The anchor of a Shift range. */
  private readonly selection = new E.ListSelection<UITreeItem>()

  /** Up, down, Home and End over the rows on screen, once it's connected. */
  private roving: ReturnType<typeof UI.focus.roving> | undefined

  /** Its `filter` matches no row. */
  @E.state @E.cssState("no-matches") accessor hasNoMatches = false

  /** It has a `filter`. */
  @E.cssState("filtering")
  get isFiltering(): boolean {
    return !!this.filter
  }

  /** The screen reader's `aria-multiselectable`. */
  @E.aria("multiSelectable")
  get ariaIsMany(): "true" | undefined {
    return this.choose === MANY ? "true" : undefined
  }

  /** The screen reader's `aria-label`. */
  @E.aria("label")
  get ariaName(): string | undefined {
    return this.label
  }

  /** `appearance="columns"`:  a column per level, side by side. */
  @E.cssState("columns")
  get isColumns(): boolean {
    return this.appearance === COLUMNS
  }

  /** `column-titles`, one a level:  none without it. */
  get columnTitleList(): string[] {
    return (this.columnTitles ?? "")
      .split(",")
      .map((title) => title.trim())
      .filter(Boolean)
  }

  /** The title over column `index`, 0 for the top rows':  the last title goes on for every deeper column. */
  titleForColumn(index: number): string | undefined {
    const titles = this.columnTitleList
    return titles[Math.min(index, titles.length - 1)]
  }

  render() {
    return (
      <Show when={!this.isColumns} fallback={this.renderColumns()}>
        {this.renderRows()}
      </Show>
    )
  }

  /** The rows, nested:  every appearance but `columns`. */
  private renderRows() {
    return (
      <>
        <Show when={this.pathRows.length}>
          <div class="path" part={this.partForName("path")} aria-hidden="true">
            <For each={this.pathRows}>
              {(row, index) => (
                <>
                  <Show when={index()}>
                    <span class="separator">›</span>
                  </Show>
                  <span
                    class="path-row"
                    part={this.partForName("path-row")}
                    style={{ "flex-shrink": 100 ** (this.pathRows.length - 1 - index()) }}
                    onClick={() => this.scrollToRow(row)}
                  >
                    {row.label}
                  </span>
                </>
              )}
            </For>
          </div>
        </Show>
        <slot />
        <Show when={this.hasNoMatches}>
          <div class="empty" part={this.partForName("empty")}>
            <slot name="empty">{this.translationForKey("noMatches")}</slot>
          </div>
        </Show>
      </>
    )
  }

  /**
   * `appearance="columns"`:  the top rows as the first column, in a box that scrolls sideways.
   * - Each open row draws the rows inside it as the next column, placed against this box (`UITreeColumns.css`).
   */
  private renderColumns() {
    return (
      <div class="columns">
        <div class="column" style={{ width: this.columnWidthCSS(0) }}>
          <Show when={this.titleForColumn(0)}>
            {(title) => (
              <div class="column-title" aria-hidden="true">
                {title()}
              </div>
            )}
          </Show>
          <slot />
          <Show when={this.hasNoMatches}>
            <div class="empty" part={this.partForName("empty")}>
              <slot name="empty">{this.translationForKey("noMatches")}</slot>
            </div>
          </Show>
        </div>
        <For each={this.columnIndexes}>{(column) => this.columnEdge(column)}</For>
        <div class="column-probe" aria-hidden="true" />
      </div>
    )
  }

  ////////////////
  // ## Rows
  ////////////////

  /** The rows directly under `parent`. */
  private rowsIn(parent: Element): UITreeItem[] {
    const rows: UITreeItem[] = []
    for (const child of parent.children) {
      const { component } = child as E.DOMElement
      if (component instanceof UITreeItem) rows.push(component)
    }
    return rows
  }

  /** The rows on screen, in their order. */
  private get rowsOnScreen(): UITreeItem[] {
    const walk = (parent: Element): UITreeItem[] =>
      this.rowsIn(parent).flatMap((row) =>
        row.isFilteredOut ? [] : [row, ...(row.showsRows ? walk(row.domElement) : [])]
      )
    return walk(this.domElement)
  }

  /** Every row, on screen or not, in its order. */
  private get allRows(): UITreeItem[] {
    const walk = (parent: Element): UITreeItem[] => this.rowsIn(parent).flatMap((row) => [row, ...walk(row.domElement)])
    return walk(this.domElement)
  }

  /** The row `event` happened on:  the innermost, whatever it went through. */
  private rowOf(event: Event): UITreeItem | undefined {
    for (const target of event.composedPath()) {
      if (target === this.domElement) return undefined
      const { component } = target as E.DOMElement
      if (component instanceof UITreeItem) return component
    }
    return undefined
  }

  ////////////////
  // ## Selecting
  ////////////////

  /** A row was clicked.  A button in its `actions`, or a link, is that control's click. */
  @E.on("click")
  protected onClicked(event: MouseEvent) {
    const row = this.rowOf(event)
    if (!row || E.OwnControls.isClicked(event, { upTo: row.domElement })) return
    this.roving?.focus(this.roving.items.indexOf(row.domElement))
    this.activate(row, event)
  }

  /**
   * `row` was clicked, or Enter or Space pressed on it;  in a column view, a key moved onto it too.
   * - `keepsInside`:  a column view keeps the columns after it open, as when a key goes back to it.
   */
  private activate(row: UITreeItem, event: MouseEvent | KeyboardEvent, { keepsInside = false } = {}) {
    if (row.group) {
      if (this.isColumns) this.openColumnOf(row, event, keepsInside)
      else row.disclosure.toggle(event)
      return
    }
    const value = row.valueOrLabel
    if (!this.send("ui-selecting", { item: row.domElement, value, originalEvent: event })) return
    if (this.isColumns) this.openColumnOf(row, event, keepsInside)
    const rows = this.rowsOnScreen.filter((each) => !each.group)
    const selected = this.allRows.filter((each) => each.selected)
    const next = new Set(
      this.choose === MANY ? this.selection.clicked(row, { items: rows, selected, keys: event }) : [row]
    )
    for (const each of this.allRows) {
      if (!!each.selected !== next.has(each)) each.selected = next.has(each)
    }
    const values = this.allRows.filter((each) => next.has(each)).map((each) => each.valueOrLabel)
    this.send("ui-changed", { value, values, originalEvent: event })
  }

  ////////////////
  // ## Columns
  ////////////////

  /**
   * `appearance="columns"`:  `row` is picked, so the rows inside it become the next column.
   * - It opens, though it has no rows:  `open` marks each column's pick, the earlier ones drawn grey.
   * - Every other open row closes, but the ones it's inside, and with `keepsInside`, the ones inside it.
   * - Then the box scrolls to its end, so the newest column is in view.
   */
  private openColumnOf(row: UITreeItem, event?: Event, keepsInside = false) {
    const chain = new Set(this.rowsAround(row))
    chain.add(row)
    for (const each of this.allRows) {
      const isKept = chain.has(each) || (keepsInside && row.domElement.contains(each.domElement))
      if (each.isOpen && !isKept) each.disclosure.close(event)
    }
    row.disclosure.open(event)
    if (!keepsInside) this.showNewestColumn()
  }

  /** The open rows, outermost first, one a level:  each column's pick, the last one the newest. */
  private get openChain(): UITreeItem[] {
    void this.rowsVersion
    const chain: UITreeItem[] = []
    for (let level: Element = this.domElement; ;) {
      const open = this.rowsIn(level).find((row) => row.isOpen)
      if (!open) return chain
      chain.push(open)
      level = open.domElement
    }
  }

  /** The columns on screen, by level:  the top rows', then one for each pick with rows inside it. */
  get columnIndexes(): number[] {
    if (!this.isColumns) return []
    const count = 1 + this.openChain.filter((row) => row.canOpen).length
    return Array.from({ length: count }, (_, index) => index)
  }

  /** Bumped as rows come, go or connect:  the chain is read again. */
  @E.state private accessor rowsVersion = 0

  /** A row connected, maybe after the tree drew:  what's read from the rows is read again (`UITreeItem.onConnect()`). */
  rowConnected() {
    this.rowsVersion++
  }

  /** The rows `row` is inside, outermost first. */
  private rowsAround(row: UITreeItem): UITreeItem[] {
    const around: UITreeItem[] = []
    for (let at = row.domElement.parentElement; at && at !== this.domElement; at = at.parentElement) {
      const { component } = at as E.DOMElement
      if (component instanceof UITreeItem) around.unshift(component)
    }
    return around
  }

  /** The rows in the same column as `row`, on screen:  its parent's, or the top rows. */
  private rowsBeside(row: UITreeItem): UITreeItem[] {
    const parent = row.domElement.parentElement
    return parent ? this.rowsIn(parent).filter((each) => !each.isFilteredOut) : [row]
  }

  /** Scroll the columns' box to its end, once the newest column is drawn. */
  private showNewestColumn() {
    if (isServer) return
    E.beforeNextPaint(() => {
      const box = this.domElement.renderRoot.querySelector<HTMLElement>(".columns")
      if (!box) return
      const isRightToLeft = getComputedStyle(box).direction === "rtl"
      const isStill = matchMedia("(prefers-reduced-motion: reduce)").matches
      box.scrollTo({
        left: isRightToLeft ? -box.scrollWidth : box.scrollWidth,
        behavior: isStill ? "instant" : "smooth"
      })
    })
  }

  ////////////////
  // ## Keys
  ////////////////

  /** Is it in the page, with the runtime there to rove with? */
  protected get canRove(): boolean {
    return this.isReady && this.isConnected
  }

  /** The keys, while it's in the page:  the rows are read again on each press. */
  @E.onChange("canRove")
  protected onCanRoveChanged(canRove: boolean) {
    if (!canRove) return
    this.roving = UI.focus.roving({
      container: this.domElement,
      items: () => this.rowsOnScreen.map((row) => row.domElement),
      orientation: "vertical",
      wrap: false,
      activeIndex: Math.max(
        0,
        this.rowsOnScreen.findIndex((row) => row.selected)
      )
    })
    return () => {
      this.roving?.detach()
      this.roving = undefined
    }
  }

  /** Right, left, Enter and Space;  the rest are `UI.focus.roving()`'s. */
  @E.on("keydown")
  protected onKeyDown(event: KeyboardEvent) {
    const row = this.rowOf(event)
    if (!row || event.target !== row.domElement) return
    const handled = this.keyActions(row)[event.key]?.(event)
    if (handled === false) return
    if (handled !== undefined) event.preventDefault()
  }

  /** What each key does on `row`;  `false`:  it did nothing, so leave the key alone. */
  private keyActions(row: UITreeItem): Record<string, (event: KeyboardEvent) => unknown> {
    const select = (event: KeyboardEvent) => this.activate(row, event)
    if (this.isColumns) return { Enter: select, " ": select, ...this.columnKeyActions(row) }
    return {
      Enter: select,
      " ": select,
      ArrowRight: () => {
        if (!row.canOpen) return false
        if (!row.showsRows) row.disclosure.open()
        else this.focusRow(this.rowsIn(row.domElement).find((each) => !each.isFilteredOut))
        return true
      },
      ArrowLeft: (): unknown => {
        if (row.isOpen && row.canOpen) return row.disclosure.close()
        const parent = row.domElement.parentElement as E.DOMElement | null
        const up = parent?.component
        if (up instanceof UITreeItem) return this.focusRow(up) ?? true
        return false
      }
    }
  }

  /**
   * `appearance="columns"`:  the keys select as they move, before `UI.focus.roving()` sees them, as a Mac's Finder's do.
   * - Up, down, Home and End:  within `row`'s column, selecting the row they land on, which opens its column.
   * - The key toward the next column:  into it, onto the row picked there before, else its first.
   * - The other:  back to the row it's inside, the columns after it kept.
   * - Right to left, the columns go leftward, and so do those two keys.
   */
  private columnKeyActions(row: UITreeItem): Record<string, (event: KeyboardEvent) => unknown> {
    const column = this.rowsBeside(row)
    const at = column.indexOf(row)
    const pick = (next: UITreeItem | undefined, event: KeyboardEvent, keepsInside = false) => {
      if (!next) return false
      this.focusRow(next)
      this.activate(next, event, { keepsInside })
      return true
    }
    const moveTo = (index: number, event: KeyboardEvent) => {
      const next = column[Math.max(0, Math.min(column.length - 1, index))]
      return next === row ? true : pick(next, event)
    }
    const goIn = (event: KeyboardEvent) => {
      if (!row.showsRows) return false
      const inside = this.rowsIn(row.domElement).filter((each) => !each.isFilteredOut)
      return pick(inside.find((each) => each.isOpen) ?? inside[0], event, true)
    }
    const goOut = (event: KeyboardEvent) => pick(this.rowsAround(row).at(-1), event, true)
    const isRightToLeft = getComputedStyle(this.domElement).direction === "rtl"
    return {
      ArrowDown: (event) => moveTo(at + 1, event),
      ArrowUp: (event) => moveTo(at - 1, event),
      Home: (event) => moveTo(0, event),
      End: (event) => moveTo(column.length - 1, event),
      ArrowRight: isRightToLeft ? goOut : goIn,
      ArrowLeft: isRightToLeft ? goIn : goOut
    }
  }

  /** Move the focus to `row`. */
  private focusRow(row: UITreeItem | undefined) {
    if (row) this.roving?.focus(this.roving.items.indexOf(row.domElement))
  }

  ////////////////
  // ## Column widths
  ////////////////

  /**
   * Each column's width by level, in px, as a person sized it:  `undefined` for one left at `--ui-tree-column-width`.
   * - Kept under the tree's `id`, when it has one (`columnWidthStore`).
   */
  @E.state({ equals: E.isSameList }) accessor columnWidths: readonly (number | undefined)[] = []

  /** Column `index`'s width, as CSS:  its own, else the token's. */
  columnWidthCSS(index: number): string {
    const width = this.columnWidths[index]
    return width === undefined ? DEFAULT_WIDTH : `${width}px`
  }

  /** Where column `index` starts, as CSS:  the widths of the columns before it, added up. */
  columnStartCSS(index: number): string {
    const widths = Array.from({ length: index }, (_, before) => this.columnWidthCSS(before))
    return `calc(0px + ${widths.join(" + ") || "0px"})`
  }

  /** The line after column `index`:  a few px of it to drag, or to move with the keys, sizing that column. */
  private columnEdge(index: number) {
    return (
      <div
        class="column-edge"
        role="separator"
        tabindex="0"
        aria-orientation="vertical"
        aria-label={this.translationForKey("resizeColumn")}
        aria-valuenow={Math.round(this.columnWidths[index] ?? this.defaultWidthPx)}
        aria-valuemin={MIN_COLUMN_PX}
        style={{ "inset-inline-start": this.columnStartCSS(index + 1) }}
        onPointerDown={(event) => this.startResizing(event, index)}
        onKeyDown={(event) => this.resizeByKey(event, index)}
        onDblClick={() => this.setColumnWidth(index, undefined)}
      />
    )
  }

  /** What an unsized column's width comes to, in px:  measured as the columns draw. */
  @E.state accessor defaultWidthPx = 0

  /** Column `index`'s width on screen now, in px. */
  private widthOf(index: number): number {
    const width = this.columnWidths[index]
    if (width !== undefined) return width
    return this.measureDefaultWidth()
  }

  /** Measure what an unsized column's width comes to, in px, and keep it (`defaultWidthPx`). */
  private measureDefaultWidth(): number {
    const probe = this.domElement.renderRoot.querySelector<HTMLElement>(".column-probe")
    const width = Math.round(probe?.getBoundingClientRect().width ?? 0)
    if (width) this.defaultWidthPx = width
    return width
  }

  /** Drag column `index`'s line:  it follows the pointer;  Escape puts it back. */
  private startResizing(event: PointerEvent & { currentTarget: HTMLElement }, index: number) {
    if (event.button !== 0) return
    const startWidth = this.widthOf(index)
    const before = this.columnWidths[index]
    const direction = this.isRightToLeft ? -1 : 1
    new Dragging(event.currentTarget, event, {
      carried: [event.currentTarget],
      follows: false,
      // the line's own cursor, over the whole page while it's dragged
      cursor: "col-resize",
      placing: (x) => this.setColumnWidth(index, startWidth + (x - event.clientX) * direction, { keeps: false }),
      onDrop: () => this.setColumnWidth(index, this.columnWidths[index]),
      onCancel: () => this.setColumnWidth(index, before, { keeps: false })
    })
  }

  /** Left and right on column `index`'s line:  narrower and wider, ten times as far with Shift. */
  private resizeByKey(event: KeyboardEvent, index: number) {
    const step = RESIZE_KEYS[event.key]
    if (!step) return
    event.preventDefault()
    event.stopPropagation()
    const direction = this.isRightToLeft ? -1 : 1
    const distance = KEY_STEP_PX * (event.shiftKey ? SHIFT_STEPS : 1)
    this.setColumnWidth(index, this.widthOf(index) + step * direction * distance)
  }

  /**
   * Column `index` is `width` px wide now, at least `MIN_COLUMN_PX`;  `undefined`:  back to the token's.
   * - SIDE EFFECT:  kept under the tree's `id`, unless `keeps` is false (mid-drag).
   */
  private setColumnWidth(index: number, width: number | undefined, { keeps = true } = {}) {
    const widths = [...this.columnWidths]
    widths[index] = width === undefined ? undefined : Math.round(Math.max(MIN_COLUMN_PX, width))
    while (widths.length && widths.at(-1) === undefined) widths.pop()
    this.columnWidths = widths
    const id = this.domElement.id
    if (keeps && id) {
      if (widths.length)
        UITree.columnWidthStore.set(
          id,
          widths.map((each) => each ?? null)
        )
      else UITree.columnWidthStore.forget(id)
    }
  }

  /** The widths kept under its `id`, as it connects;  what an unsized one comes to;  its newest column, in view. */
  @E.onChange("isConnected", "isColumns")
  protected onConnectedInColumns(isConnected: boolean, isColumns: boolean) {
    if (!isConnected || !isColumns || isServer) return
    E.beforeNextPaint(() => this.measureDefaultWidth())
    // the picks it was drawn with, in view
    this.showNewestColumn()
    const id = this.domElement.id
    if (!id) return
    const kept = UITree.columnWidthStore.get<(number | null)[]>(id)
    if (Array.isArray(kept)) this.columnWidths = kept.map((each) => (typeof each === "number" ? each : undefined))
  }

  /** Is it laid out right to left? */
  private get isRightToLeft(): boolean {
    return getComputedStyle(this.domElement).direction === "rtl"
  }

  /** Where every column tree's widths are kept, by its `id`:  made on first use, so a server render never touches storage. */
  private static get columnWidthStore(): PrefStore {
    return (UITree.madeColumnWidthStore ??= new PrefStore(COLUMN_WIDTHS_STORE))
  }
  private static madeColumnWidthStore?: PrefStore

  ////////////////
  // ## The sticky path
  ////////////////

  /** `sticky-path`:  the open rows the first row in view is inside, outermost first, while one is out of sight. */
  @E.state({ equals: E.isSameList }) accessor pathRows: readonly UITreeItem[] = []

  /** A read of the path is waiting for the next paint. */
  private cancelPathRead: (() => void) | undefined

  /** While connected with `sticky-path`:  every scroll that moves the tree reads the path again. */
  @E.onChange("isConnected", "stickyPath")
  protected watchScrolling(isConnected: boolean, stickyPath: boolean | undefined) {
    if (!isConnected || !stickyPath || isServer) {
      this.pathRows = []
      return undefined
    }
    // a scroll doesn't bubble:  caught on its way down, from whatever box scrolls the tree;  one read a frame
    const onScroll = () => this.readPathSoon()
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    this.readPathSoon()
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true })
      this.cancelPathRead?.()
    }
  }

  /** Read the path before the next paint, once however many scrolls ask. */
  private readPathSoon() {
    this.cancelPathRead ??= E.beforeNextPaint(() => {
      this.cancelPathRead = undefined
      this.pathRows = this.readPath()
    })
  }

  /** The open rows around the first row in view, when the outermost of them is above the top of what's in view. */
  private readPath(): UITreeItem[] {
    const box = E.scrollingBoxFor(this.domElement)
    const top = Math.max(box?.getBoundingClientRect().top ?? 0, this.domElement.getBoundingClientRect().top)
    const first = this.rowsOnScreen.find((row) => rowBoxOf(row).bottom > top + this.pathHeight)
    if (!first) return []
    const around: UITreeItem[] = []
    for (let at = first.domElement.parentElement; at && at !== this.domElement; at = at.parentElement) {
      const { component } = at as E.DOMElement
      if (component instanceof UITreeItem) around.unshift(component)
    }
    return around.length && rowBoxOf(around[0]!).top < top ? around : []
  }

  /** Scroll so `row` is the first row in view, just under the path, selecting nothing. */
  private scrollToRow(row: UITreeItem) {
    const box = E.scrollingBoxFor(this.domElement)
    if (!box) return
    const top = Math.max(box.getBoundingClientRect().top, this.domElement.getBoundingClientRect().top)
    box.scrollTop += rowBoxOf(row).top - top - this.pathHeight
  }

  /** How tall the path's line is while it shows:  0 while it doesn't. */
  private get pathHeight(): number {
    return this.domElement.renderRoot.querySelector<HTMLElement>(".path")?.offsetHeight ?? 0
  }

  ////////////////
  // ## Filtering
  ////////////////

  /** The text to look for changed. */
  @E.onChange("filter", "isReady")
  protected onFilterChanged() {
    this.applyFilter()
  }

  /** Rows came or went, or their words changed. */
  @E.watches({ childList: true, subtree: true, attributes: true, attributeFilter: ["label", "which"] })
  protected onRowsChanged() {
    this.rowsVersion++
    if (this.filter) this.applyFilter()
    this.roving?.refresh()
  }

  /** Hide what doesn't match, and keep open what's around what does. */
  private applyFilter() {
    const text = (this.filter ?? "").trim().toLowerCase()
    const matchIn = (parent: Element): boolean => {
      let anyMatch = false
      for (const row of this.rowsIn(parent)) {
        const isInside = matchIn(row.domElement)
        const isMatch = !text || row.filterWords.toLowerCase().includes(text)
        row.isFilteredOut = !isMatch && !isInside
        row.isKeptOpen = !!text && isInside
        anyMatch ||= isMatch || isInside
      }
      return anyMatch
    }
    this.hasNoMatches = !matchIn(this.domElement) && !!text
  }
}

export interface UITree extends E.AttributeValues<typeof treeVocabulary> {}

/** Where `row`'s own line is on screen, without the rows inside it. */
function rowBoxOf(row: UITreeItem): DOMRect {
  return (row.domElement.renderRoot.querySelector(".row") ?? row.domElement).getBoundingClientRect()
}

/** `choose` of a tree whose rows are selected many at a time. */
const MANY = "many"

/** The tree's `appearance` that shows a column per level. */
const COLUMNS = "columns"

/** A column's width while nobody has sized it. */
const DEFAULT_WIDTH = "var(--_ui-tree-column-width)"

/** What the column widths are kept under, in this browser. */
const COLUMN_WIDTHS_STORE = "ui-tree-column-widths"

/** The narrowest a column can be made, in px. */
const MIN_COLUMN_PX = 80

/** How far an arrow key moves a column's line, in px. */
const KEY_STEP_PX = 16

/** How many steps Shift makes it. */
const SHIFT_STEPS = 10

/** The keys that move a column's line, and which way:  narrower, wider (right to left, turned round). */
const RESIZE_KEYS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
