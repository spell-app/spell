import { isServer } from "@solidjs/web"
import { For, Show, type Accessor } from "solid-js"

import { Dragging } from "spell/util/Dragging"
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI } from "spell/ui/core"
import { TreeMeasure } from "spell/ui/components/ui-tree-diagram/TreeMeasure"
import { treeVocabulary } from "./UITree.en"
import { DEFAULT_ROW_PARTS, type RowPart, type TreeItemData } from "./UITree.types"
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
 *   - `size`:  each column's width, by level (`E.PaneSizes`, as `<ui-split-panel>` reads its sizes):  px, `em`, a
 *     percent of the box of columns, `auto` to fit the rows it shows (measured, `fitWidths`), `*` for the token's.
 *   - The line after each column resizes it, as a Mac's Finder's does:  dragged, or its arrow keys;  with Option (Alt),
 *     every column together;  a double-click fits the column to its longest row, with Option every column.
 *     A width set so wins over `size`.  A tree with an `id` remembers them in this browser (the `ui-tree` store,
 *     `widths:<id>`);  one without, until the page reloads.
 *   - `path`:  the ids of each column's pick, from the top;  set it to open a path, read it as people pick.
 *   - `filter` filters one column:  the last one on screen as the filter starts, so moving about doesn't move it.
 *   - `sticky-path`:  the path line above the columns, naming each column's pick;  a click on one picks it again,
 *     keeping the columns after it, and scrolls its column into view.
 *   - Narrow columns:  while the columns don't fit the tree's width, the first ones narrow to a strip with their pick's
 *     name, as few as it takes, never the last `narrow-before` (2) nor the selected row's.
 *     The pointer or the focus on one draws it whole again, OVER the columns after it, which stay put.
 *     While even the strips don't make room, the full columns share what they leave (`fullColumnMostPx`).
 *   - The box scrolls sideways a column at a time (it snaps), and keeps the selected row's column in view.
 *   - `show`:  which parts each row shows (`icon which count chevron`).
 *   - An `expandable` row picked before its rows come shows a spinner in its column (`<ui-loader>`).
 *   - Its rows can be DATA instead:  `items`, a `TreeItemData` list, drawn in its shadow root ("Columns from data").
 *     For big trees:  a `children` function runs the first time its item opens, and only the open path is drawn.
 *     Rows from markup draw themselves, as in every tree:  none builds a shadow root it doesn't show.
 * - `ui-settled`:  `ui-changed`'s detail again, once what's selected has stayed put for a moment (the arrow keys stopped).
 * - For subclasses (a `<netlist-columns>` built on it):
 *   - `rowClass(item)`:  class names for a row drawn from `items`, which the subclass's own sheet styles
 *     (`elementSetup.styleSheets`, spread from this one's)
 *   - its tokens and parts:  `UITreeColumns.css`'s header
 * - `sticky-path`:  while it scrolls, one line pinned at its top names the open rows the first row in view is inside.
 *   - Read again on every scroll of whatever scrolls it, before the next paint:  rows know nothing of it.
 *   - Hidden from screen readers:  each row already says how deep it is (`aria-level`), and the keys walk the rows.
 *   - The same line as the columns' path line, drawn by one `renderPath()`.
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
    return E.commaList(this.columnTitles)
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
        {this.renderPath(
          () => this.pathRows,
          (row) => this.scrollToRow(row)
        )}
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
   * The path line:  `rows`' names, outermost first, `›` between them, each a click handing `onPick` its row and place.
   * - The outline's `sticky-path`, pinned over the rows;  in columns, a line of its own above them.
   * - `current`:  the place of the row that reads as where you are, the last unless it says.
   * - The outer names give way first:  each shrinks a hundred times more than the one after it.
   * - Hidden from screen readers (the class docstring says why).
   */
  private renderPath<Row extends PathRow>(
    rows: () => readonly Row[],
    onPick: (row: Row, index: number, event: MouseEvent) => void,
    current: () => number = () => rows().length - 1
  ) {
    return (
      <Show when={rows().length}>
        <div class="path" part={this.partForName("path")} aria-hidden="true">
          <For each={rows()}>
            {(row, index) => (
              <>
                <Show when={index()}>
                  <span class="separator">›</span>
                </Show>
                <span
                  class={["path-row", { current: index() === current() }]}
                  part={this.partForName("path-row")}
                  style={{ "flex-shrink": 100 ** (rows().length - 1 - index()) }}
                  onClick={(event: MouseEvent) => onPick(row, index(), event)}
                >
                  {row.label}
                </span>
              </>
            )}
          </For>
        </div>
      </Show>
    )
  }

  /**
   * `appearance="columns"`:  the columns, in a box that scrolls sideways, with the line after each to size it.
   * - From markup:  the top rows are the first column, and each open row draws the rows inside it as the next,
   *   placed against this box (`UITreeColumns.css`).
   * - From `items`:  every column is drawn here (`itemColumns()`).
   */
  private renderColumns() {
    return (
      <>
        {this.renderPath(
          () => this.columnPicks,
          (_row, index, event) => this.pickFromPath(index, event),
          () => this.selectedColumn
        )}
        <div class="columns">
          <Show when={this.hasItemData} fallback={this.firstColumn()}>
            {this.itemColumns()}
          </Show>
          <div class={["column-filler", { titled: this.columnTitleList.length > 0 }]} aria-hidden="true" />
          <For each={this.columnIndexes}>{(column) => this.columnEdge(column)}</For>
          <div class="column-probe" aria-hidden="true" />
          <div class="narrow-probe" aria-hidden="true" />
        </div>
      </>
    )
  }

  /** From markup:  the top rows, as the first column. */
  private firstColumn() {
    return (
      <div
        class={["column", { narrow: this.isNarrowColumn(0), peek: this.isPeekColumn(0) }]}
        style={{ width: this.columnWidthCSS(0), "margin-inline-end": this.peekMarginCSS(0) }}
      >
        <Show when={this.titleForColumn(0)}>
          {(title) => (
            <div class="column-title" aria-hidden="true">
              {title()}
            </div>
          )}
        </Show>
        <slot />
        <Show when={this.hasNoMatches && this.filteredRowsParent === this.domElement}>
          <div class="empty" part={this.partForName("empty")}>
            <slot name="empty">{this.translationForKey("noMatches")}</slot>
          </div>
        </Show>
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
    const path = this.isColumns ? [...this.rowsAround(row), row].map((each) => each.valueOrLabel) : undefined
    if (!this.send("ui-selecting", { item: row.domElement, value, path, originalEvent: event })) return
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
    const detail = { value, values, item: row.domElement, path, originalEvent: event }
    this.send("ui-changed", detail)
    this.settleSoon(detail)
  }

  /** A `ui-settled` waiting for what's selected to stay put. */
  private settleTimer: ReturnType<typeof E.after> | undefined

  /** `ui-settled`, with `detail`, once nothing else is selected for `SETTLE_SECONDS`. */
  private settleSoon(detail: object) {
    this.settleTimer?.cancel()
    this.settleTimer = E.after(SETTLE_SECONDS, () => {
      this.settleTimer = undefined
      this.send("ui-settled", detail)
    })
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
    this.openPath = this.openChain.map((each) => each.valueOrLabel)
    if (this.filter) this.applyFilter()
  }

  /**
   * The ids of each column's pick, from the top:  the `path` property.
   * - From `items`, it's the one fact the columns are drawn from.
   * - From markup, the rows' `open` is:  a pick writes it here, and a page that sets it opens those rows.
   */
  @E.controlled("path") accessor openPath: readonly string[] = []

  /** From markup:  a page set `path`, so open its rows, and select the last, as a pick would, sending nothing. */
  @E.onChange("openPath", "isReady", "rowsVersion")
  protected onPathChanged(path: readonly string[]) {
    if (!this.isColumns || this.hasItemData || !this.isReady || !this.isControlledByPage("openPath")) return
    if (
      E.isSameList(
        path,
        this.openChain.map((each) => each.valueOrLabel)
      )
    )
      return
    const rows: UITreeItem[] = []
    for (const id of path) {
      const row = this.rowsIn(rows.at(-1)?.domElement ?? this.domElement).find((each) => each.valueOrLabel === id)
      if (!row) break
      rows.push(row)
    }
    const last = rows.at(-1)
    if (!last) return
    for (const each of this.allRows) {
      if (each.isOpen && !rows.includes(each)) each.disclosure.close()
      if (!!each.selected !== (each === last)) each.selected = each === last
    }
    for (const row of rows) row.disclosure.open()
    this.showNewestColumn()
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
    const count = this.hasItemData ? this.columnLists.length : 1 + this.openChain.filter((row) => row.canOpen).length
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
    return this.isReady && this.isConnected && !this.hasItemData
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
    if (this.hasItemData) return this.onItemKeyDown(event)
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
   * `size`, read:  each column's size by level, the last going on for every deeper column.
   * - `undefined` for `*`, or an entry that isn't a size (warned about):  that column takes `--ui-tree-column-width`.
   */
  @E.derived({ equals: E.isSameList })
  get columnSizes(): readonly (E.PaneSize | undefined)[] {
    return E.commaList(this.size).map((entry) => E.PaneSizes.sizeFor(entry, { source: "<ui-tree size>" }))
  }

  /** Column `index`'s `size`:  `undefined` for the token's width. */
  sizeOfColumn(index: number): E.PaneSize | undefined {
    const sizes = this.columnSizes
    return sizes.length ? sizes[Math.min(index, sizes.length - 1)] : undefined
  }

  /**
   * Each column's width by level, in px, as a person dragged it:  `undefined` for one left as `size` says.
   * - Kept under the tree's `id`, when it has one (`keepWidths()`).
   */
  @E.state({ equals: E.isSameList }) accessor columnWidths: readonly (number | undefined)[] = []

  /** The width an Option-drag gave every column, in px:  a column's own drag still wins. */
  @E.state accessor everyColumnWidth: number | undefined = undefined

  /** Each `size="auto"` column's width by level, in px:  what its rows need, measured as they draw (`fitKey`). */
  @E.state({ equals: E.isSameList }) accessor fitWidths: readonly (number | undefined)[] = []

  /** Column `index`'s width as a person dragged it, in px:  its own drag, else an Option-drag's;  else `undefined`. */
  private draggedWidthOf(index: number): number | undefined {
    return this.columnWidths[index] ?? this.everyColumnWidth
  }

  /**
   * Column `index`'s width, as CSS:  a narrow strip's (`narrowColumns`), else its full width (`fullWidthCSS()`).
   * - A narrow one under the pointer is drawn whole (`peekColumn`), over the columns after it.
   */
  columnWidthCSS(index: number): string {
    if (this.isNarrowColumn(index)) return NARROW_WIDTH
    return this.fullWidthCSS(index, { isShared: !this.isPeekColumn(index) })
  }

  /**
   * The room column `index` takes in the row of columns, as CSS:  a strip's when it's narrow, though drawn whole for
   * now, so the columns after it stay where they are.
   */
  private roomOfColumnCSS(index: number): string {
    return this.narrowColumns.includes(index) ? NARROW_WIDTH : this.fullWidthCSS(index)
  }

  /**
   * Column `index`'s `margin-inline-end`, while it's drawn whole over the columns after it (`peekColumn`):
   * the strip's width less its own, so it takes a strip's room.  `undefined` otherwise.
   */
  peekMarginCSS(index: number): string | undefined {
    return this.isPeekColumn(index)
      ? `calc(${NARROW_WIDTH} - ${this.fullWidthCSS(index, { isShared: false })})`
      : undefined
  }

  /**
   * Column `index`'s full width, as CSS:  a person's drag, else `size`'s, else the token's;  never over
   * `fullColumnMostPx` while the columns don't fit, unless `isShared` is false (a narrow one drawn whole over the rest).
   * - `auto`:  its rows' width once measured;  the token's until then.
   * - A percent is of the tree's box of columns, never under `MIN_COLUMN_PX`.
   */
  private fullWidthCSS(index: number, { isShared = true } = {}): string {
    const most = this.fullColumnMostPx
    if (isShared && most < this.widthPxOf(index)) return `${most}px`
    const dragged = this.draggedWidthOf(index)
    if (dragged !== undefined) return `${dragged}px`
    const size = this.sizeOfColumn(index)
    if (!size) return DEFAULT_WIDTH
    if (E.PaneSizes.isAuto(size)) {
      const fit = this.fitWidths[index]
      return fit === undefined ? DEFAULT_WIDTH : `${fit}px`
    }
    if (size.units === "%") return `max(${MIN_COLUMN_PX}px, ${size.value}%)`
    return `${size.value}${size.units}`
  }

  /** Column `index`'s width on screen, in px:  a strip's, or its full width, never over `fullColumnMostPx`. */
  private shownWidthPxOf(index: number): number {
    if (this.narrowColumns.includes(index)) return this.narrowWidthPx
    return Math.min(this.fullColumnMostPx, this.widthPxOf(index))
  }

  /** Column `index`'s width when it isn't narrow, in px:  as `columnWidthCSS()` says, worked out. */
  widthPxOf(index: number): number {
    const dragged = this.draggedWidthOf(index)
    if (dragged !== undefined) return dragged
    const size = this.sizeOfColumn(index)
    if (!size) return this.defaultWidthPx
    if (E.PaneSizes.isAuto(size)) return this.fitWidths[index] ?? this.defaultWidthPx
    if (size.units === "%") return Math.max(MIN_COLUMN_PX, (this.boxWidthPx * size.value) / 100)
    if (size.units === "em") return size.value * this.emPx
    if (size.units === "rem") return size.value * this.remPx
    return size.value
  }

  /** Where column `index` starts, as CSS:  the room of the columns before it, added up. */
  columnStartCSS(index: number): string {
    const widths = Array.from({ length: index }, (_, before) => this.roomOfColumnCSS(before))
    return `calc(0px + ${widths.join(" + ") || "0px"})`
  }

  /**
   * The line after column `index`:  a few px of it to drag, or to move with the keys, sizing that column;
   * Option (Alt) with either sizes every column.  A double-click fits the column to its rows;  with Option, every one.
   */
  private columnEdge(index: number) {
    return (
      <div
        class={[
          "column-edge",
          {
            narrow: this.narrowColumns.includes(index),
            covered: index > (this.peekColumn ?? Infinity),
            last: index === this.columnIndexes.length - 1
          }
        ]}
        role="separator"
        tabindex="0"
        aria-orientation="vertical"
        aria-label={this.translationForKey("resizeColumn")}
        aria-valuenow={Math.round(this.widthPxOf(index))}
        aria-valuemin={MIN_COLUMN_PX}
        style={{ "inset-inline-start": this.columnStartCSS(index + 1) }}
        onPointerDown={(event) => this.startResizing(event, index)}
        onKeyDown={(event) => this.resizeByKey(event, index)}
        onDblClick={(event: MouseEvent) => this.fitColumn(index, event)}
      />
    )
  }

  /** What an unsized column's width comes to, in px:  measured as the columns draw. */
  @E.state accessor defaultWidthPx = 0

  /** What `1em` comes to in the columns, in px:  for a `size` in `em`. */
  @E.state accessor emPx = DEFAULT_EM_PX

  /** What `1rem` comes to, in px:  for a `size` in `rem`. */
  @E.state accessor remPx = DEFAULT_EM_PX

  /** Measure what an unsized column's width comes to, in px, and keep it (`defaultWidthPx`);  a narrow one's;  an em's. */
  private measureDefaultWidth(): number {
    const root = this.domElement.renderRoot
    const widthOf = (selector: string) => root.querySelector(selector)?.getBoundingClientRect().width ?? 0
    const width = Math.round(widthOf(".column-probe"))
    if (width) this.defaultWidthPx = width
    // not rounded:  several strips side by side, the full columns sharing what they leave, must add up
    const narrow = widthOf(".narrow-probe")
    if (narrow) this.narrowWidthPx = narrow
    const box = root.querySelector(".columns")
    if (box) this.emPx = parseFloat(getComputedStyle(box).fontSize) || this.emPx
    this.remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || this.remPx
    return width
  }

  /** Column `index`'s width on screen now, in px, measuring an unsized one's first if it hasn't been. */
  private widthNowOf(index: number): number {
    if (!this.defaultWidthPx) this.measureDefaultWidth()
    return this.widthPxOf(index)
  }

  /** Drag column `index`'s line:  it follows the pointer;  with Option (Alt), every column takes its width.  Escape puts it back. */
  private startResizing(event: PointerEvent & { currentTarget: HTMLElement }, index: number) {
    if (event.button !== 0) return
    const startWidth = this.widthNowOf(index)
    const before = { columns: this.columnWidths, every: this.everyColumnWidth }
    const isEvery = event.altKey
    const direction = this.isRightToLeft ? -1 : 1
    this.isResizing = true
    new Dragging(event.currentTarget, event, {
      carried: [event.currentTarget],
      follows: false,
      // the line's own cursor, over the whole page while it's dragged
      cursor: "col-resize",
      placing: (x) => {
        const width = startWidth + (x - event.clientX) * direction
        if (isEvery) this.setEveryColumnWidth(width, { keeps: false })
        else this.setColumnWidth(index, width, { keeps: false })
      },
      onDrop: () => {
        this.isResizing = false
        this.keepWidths()
      },
      onCancel: () => {
        this.isResizing = false
        this.columnWidths = before.columns
        this.everyColumnWidth = before.every
      }
    })
  }

  /** A column's line is being dragged:  `:state(resizing)`, so the columns follow the pointer with no easing. */
  @E.state @E.cssState("resizing") accessor isResizing = false

  /** Left and right on column `index`'s line:  narrower and wider, ten times as far with Shift;  every column with Option. */
  private resizeByKey(event: KeyboardEvent, index: number) {
    const step = RESIZE_KEYS[event.key]
    if (!step) return
    event.preventDefault()
    event.stopPropagation()
    const direction = this.isRightToLeft ? -1 : 1
    const distance = KEY_STEP_PX * (event.shiftKey ? SHIFT_STEPS : 1)
    const width = this.widthNowOf(index) + step * direction * distance
    if (event.altKey) this.setEveryColumnWidth(width)
    else this.setColumnWidth(index, width)
  }

  /**
   * A double-click on column `index`'s line:  the column fits its longest row, as a person's width (kept);
   * with Option (Alt), every column on screen fits its own.
   * - A narrow column keeps what it had:  its rows aren't drawn whole.
   */
  private fitColumn(index: number, event: MouseEvent) {
    if (!event.altKey) return this.setColumnWidth(index, this.measureFitWidth(index, this.boxWidthPx || Infinity))
    const widths = this.columnIndexes.map((each) =>
      this.isNarrowColumn(each) ? this.draggedWidthOf(each) : this.measureFitWidth(each, this.boxWidthPx || Infinity)
    )
    this.everyColumnWidth = undefined
    this.columnWidths = trimmedWidths(widths)
    this.keepWidths()
  }

  /**
   * Column `index` is `width` px wide now, at least `MIN_COLUMN_PX`;  `undefined`:  back to what `size` says.
   * - SIDE EFFECT:  kept under the tree's `id`, unless `keeps` is false (mid-drag).
   */
  private setColumnWidth(index: number, width: number | undefined, { keeps = true } = {}) {
    const widths = [...this.columnWidths]
    widths[index] = width === undefined ? undefined : Math.round(Math.max(MIN_COLUMN_PX, width))
    this.columnWidths = trimmedWidths(widths)
    if (keeps) this.keepWidths()
  }

  /**
   * Every column is `width` px wide now, at least `MIN_COLUMN_PX`, deeper ones as they come:  an Option-drag.
   * - Each column's own width goes, so they're all the same.
   * - SIDE EFFECT:  kept under the tree's `id`, unless `keeps` is false (mid-drag).
   */
  private setEveryColumnWidth(width: number, { keeps = true } = {}) {
    this.everyColumnWidth = Math.round(Math.max(MIN_COLUMN_PX, width))
    this.columnWidths = []
    if (keeps) this.keepWidths()
  }

  /** Keep the widths a person set under the tree's `id`, when it has one:  `widths:<id>` in the tree's store. */
  private keepWidths() {
    const id = this.domElement.id
    if (!id || isServer) return
    const columns = this.columnWidths
    const every = this.everyColumnWidth
    const kept: KeptWidths = {
      ...(columns.length && { columns: columns.map((each) => each ?? null) }),
      ...(every !== undefined && { every })
    }
    UITree.store.set(`${WIDTHS_KEY}${id}`, kept.columns || kept.every ? kept : undefined)
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
    const kept = UITree.keptWidths(id)
    this.columnWidths = (kept.columns ?? []).map((each) => (typeof each === "number" ? each : undefined))
    this.everyColumnWidth = typeof kept.every === "number" ? kept.every : undefined
  }

  /** Is it laid out right to left? */
  private get isRightToLeft(): boolean {
    return getComputedStyle(this.domElement).direction === "rtl"
  }

  ////////////////
  // ## Fitting columns to their rows
  ////////////////

  /**
   * What the `size="auto"` columns' widths depend on, as one text:  they're measured again as it changes.
   * - Empty while there's nothing to measure:  not columns, not ready, or no `auto` column.
   */
  protected get fitKey(): string {
    if (!this.isColumns || !this.isReady || !this.columnSizes.some((size) => E.PaneSizes.isAuto(size))) return ""
    return JSON.stringify([
      this.columnIndexes.length,
      this.narrowColumns,
      this.openPath,
      this.rowsVersion,
      this.childrenVersion,
      this.filter,
      this.filterColumn,
      this.show
    ])
  }

  /** The `auto` columns' rows changed, or what they show:  measure them again, once they're drawn. */
  @E.onChange("fitKey")
  protected onFitKeyChanged(fitKey: string) {
    if (!fitKey || isServer) return undefined
    return E.beforeNextPaint(() => this.measureFitWidths())
  }

  /** Measure each `auto` column on screen that a person hasn't sized, and isn't narrow (`fitWidths`). */
  private measureFitWidths() {
    if (!this.defaultWidthPx) this.measureDefaultWidth()
    const most = Math.max(MIN_COLUMN_PX, this.defaultWidthPx * FIT_MOST_TIMES)
    this.fitWidths = this.columnIndexes.map((index) => {
      const isMeasured =
        E.PaneSizes.isAuto(this.sizeOfColumn(index)) &&
        this.draggedWidthOf(index) === undefined &&
        !this.isNarrowColumn(index)
      return (isMeasured ? this.measureFitWidth(index, most) : undefined) ?? this.fitWidths[index]
    })
  }

  /**
   * The width column `index` needs to show its longest row whole, in px, from `MIN_COLUMN_PX` to `most`;
   * `undefined` when it isn't drawn, or has no rows.
   * - SIDE EFFECT:  lays the page out, once a column.
   */
  private measureFitWidth(index: number, most: number): number | undefined {
    if (isServer) return undefined
    const width = this.hasItemData ? this.fitOfItemColumn(index) : this.fitOfRowColumn(index)
    return width === undefined ? undefined : Math.round(Math.min(most, Math.max(MIN_COLUMN_PX, width)))
  }

  /**
   * From `items`:  the width column `index`'s rows need, in px, measured from the DATA, not the rows drawn.
   * - Each label and `which` is measured in its row's font (`TreeMeasure.widthOf()`), so a row needn't be drawn
   *   (`Row Windowing` draws only those in view).
   * - What else a row takes (its icon, count, chevron, margins, the column's scroll bar) is the column's width
   *   less its words' and `which`'s tracks and the room after them:  the grid makes them the same in every row.
   */
  private fitOfItemColumn(index: number): number | undefined {
    const column = this.domElement.renderRoot.querySelector<HTMLElement>(`ul[data-depth="${index}"]`)
    const words = column?.querySelector(".column-row .words")
    const items = this.shownIn(this.columnLists[index] ?? [], index)
    if (!column || !words || !items.length) return undefined
    const tracks = getComputedStyle(column).gridTemplateColumns.split(/\s+/).map(parseFloat)
    const [, wordsTrack = 0, whichTrack = 0, room = 0] = tracks
    const others = column.offsetWidth - wordsTrack - whichTrack - room
    const widest = (texts: (string | undefined)[], sample: Element) => {
      const font = TreeMeasure.fontOf(sample)
      return Math.max(0, ...texts.map((text) => (text ? (TreeMeasure.widthOf(text, font) ?? 0) : 0)))
    }
    const which = this.shows("which") ? column.querySelector(".column-row .which") : null
    const whichWidth = which
      ? widest(
          items.map((item) => item.which),
          which
        ) + (parseFloat(getComputedStyle(which).marginInlineStart) || 0)
      : 0
    return Math.ceil(
      others +
        widest(
          items.map((item) => item.label),
          words
        ) +
        whichWidth
    )
  }

  /**
   * From markup:  the width column `index`'s rows need, in px:  its box measured at `max-content`, for a moment.
   * - Rows from markup draw themselves (their icon, count, badge, actions), so their text alone wouldn't say.
   * - The rows inside a picked row are out of the column's flow (`position: fixed`), so they don't count.
   */
  private fitOfRowColumn(index: number): number | undefined {
    const parent = index ? this.openChain.filter((row) => row.canOpen)[index - 1]?.domElement : this.domElement
    const box = index
      ? parent?.renderRoot.querySelector<HTMLElement>(".rows")
      : this.domElement.renderRoot.querySelector<HTMLElement>(".column")
    if (!parent || !box || !this.rowsIn(parent).length) return undefined
    const { width, transition } = box.style
    // no easing, so it's measured at once (a page may ease to `max-content`:  `interpolate-size`)
    box.style.transition = "none"
    box.style.width = "max-content"
    const fit = box.getBoundingClientRect().width
    box.style.width = width
    box.style.transition = transition
    return Math.ceil(fit)
  }

  /** The tree's store of what it keeps:  `widths:<id>` (and the path, later);  made on first use, so a server render never touches storage. */
  private static get store(): PrefStore {
    return (UITree.madeStore ??= new PrefStore(STORE_NAME))
  }
  private static madeStore?: PrefStore

  /**
   * The widths kept under tree `id`.
   * - SIDE EFFECT:  moves what the old store kept (`ui-tree-column-widths`, a list of widths by `id`) over, once.
   */
  private static keptWidths(id: string): KeptWidths {
    const key = `${WIDTHS_KEY}${id}`
    const old = new PrefStore(OLD_WIDTHS_STORE)
    if (old.has(id)) {
      const columns = old.get(id)
      if (!UITree.store.has(key) && Array.isArray(columns)) UITree.store.set(key, { columns })
      old.forget(id)
    }
    const kept = UITree.store.get(key)
    return kept && typeof kept === "object" ? (kept as KeptWidths) : {}
  }

  ////////////////
  // ## The columns' path line
  ////////////////

  /** In columns, with `sticky-path`:  each column's pick, outermost first, as the path line names them. */
  private get columnPicks(): readonly PathRow[] {
    if (!this.stickyPath) return []
    if (!this.hasItemData) return this.openChain
    const lists = this.columnLists
    return this.openPath.flatMap((id, depth) => lists[depth]?.find((item) => item.id === id) ?? [])
  }

  /** In columns, the column of the selected row, by level:  the last pick's, unless the keys or the path went back. */
  get selectedColumn(): number {
    if (this.hasItemData) return this.selectedDepth
    const chain = this.openChain
    const at = chain.findIndex((row) => row.selected)
    return at >= 0 ? at : chain.length - 1
  }

  /**
   * The path line's name for column `depth`'s pick was clicked:  that pick is selected again, as the key back to it
   * would, the columns after it kept;  then its column is scrolled into view, and has the focus.
   */
  private pickFromPath(depth: number, event: MouseEvent) {
    if (this.hasItemData) {
      const item = this.columnLists[depth]?.find((each) => each.id === this.openPath[depth])
      if (!item) return
      this.pickItem(item, depth, event, { keepsInside: true })
      E.afterSolidUpdate(() => this.focusKeyRow())
    } else {
      const row = this.openChain[depth]
      if (!row) return
      this.focusRow(row)
      this.activate(row, event, { keepsInside: true })
    }
    this.showColumn(depth)
  }

  /**
   * Scroll the columns' box the least that shows column `depth` whole, once it's drawn at its new width.
   * - Always to a column's start, where the box's scroll snaps (`scroll-snap-type`):  the first one far enough along
   *   to show column `depth`'s end.
   */
  private showColumn(depth: number) {
    if (isServer) return
    E.beforeNextPaint(() => {
      const box = this.domElement.renderRoot.querySelector<HTMLElement>(".columns")
      if (!box) return
      const starts = [0]
      for (let index = 0; index < depth; index++) starts.push(starts[index] + this.shownWidthPxOf(index))
      const start = starts[depth]
      const end = start + this.shownWidthPxOf(depth)
      // right to left, `scrollLeft` runs from 0 down
      const direction = this.isRightToLeft ? -1 : 1
      const scrolled = box.scrollLeft * direction
      let to: number | undefined
      if (start < scrolled) to = start
      else if (end > scrolled + box.clientWidth) to = starts.find((each) => each >= end - box.clientWidth) ?? start
      if (to === undefined) return
      const isStill = matchMedia("(prefers-reduced-motion: reduce)").matches
      box.scrollTo({ left: to * direction, behavior: isStill ? "instant" : "smooth" })
    })
  }

  ////////////////
  // ## Narrow columns
  ////////////////

  /** How wide the box of columns is, in px:  measured as it changes size, 0 until then. */
  @E.state accessor boxWidthPx = 0

  /** What a narrow column's width comes to, in px (`--ui-tree-narrow-width`):  measured as the columns draw. */
  @E.state accessor narrowWidthPx = 0

  /** The column under the pointer, by level:  a narrow one widens over the columns after it while it's there. */
  @E.state accessor hoveredColumn: number | undefined = undefined

  /** The column with the focus, by level:  a narrow one widens over the columns after it while it has it. */
  @E.state accessor focusedColumn: number | undefined = undefined

  /**
   * The columns that take a narrow strip's room, by level:  while the columns don't fit the tree's width, the first
   * ones, as few as it takes, each a strip with its pick's name.
   * - Never the last `narrow-before` (2), nor the selected row's column.
   * - A column a person sized, or `size` sizes, narrows too, and widens back to that size.
   * - The one under the pointer or with the focus too:  it widens OVER the columns after it (`peekColumn`), so they
   *   stay where they are and the selected one stays in view.
   */
  get narrowColumns(): readonly number[] {
    if (!this.isColumns || !this.boxWidthPx || !this.defaultWidthPx) return []
    const count = this.columnIndexes.length
    const selected = this.selectedColumn
    let total = 0
    for (let index = 0; index < count; index++) total += this.widthPxOf(index)
    const narrow: number[] = []
    for (let index = 0; index < count - (this.narrowBefore ?? 2) && total > this.boxWidthPx; index++) {
      if (index === selected) continue
      narrow.push(index)
      total -= this.widthPxOf(index) - this.narrowWidthPx
    }
    return narrow
  }

  /** The narrow column under the pointer, else the one with the focus:  drawn whole, over the columns after it. */
  get peekColumn(): number | undefined {
    const narrow = this.narrowColumns
    for (const index of [this.hoveredColumn, this.focusedColumn]) {
      if (index !== undefined && narrow.includes(index)) return index
    }
    return undefined
  }

  /** Is column `index` drawn narrow, a strip with its pick?  Rows from markup ask too (`UITreeItem`). */
  isNarrowColumn(index: number): boolean {
    return this.narrowColumns.includes(index) && index !== this.peekColumn
  }

  /** Is column `index` a narrow one drawn whole for now, over the columns after it?  Rows from markup ask too. */
  isPeekColumn(index: number): boolean {
    return index === this.peekColumn
  }

  /**
   * From markup, while a narrow column is drawn whole over the ones after it (`peekColumn`):  `clip-path` for the
   * lines of column `index`, cutting off what the peeking column covers.  `undefined` for none.
   * - Needed because each column from markup is drawn INSIDE the row picked before it, so a later column paints over
   *   the peeking one, whatever its `z-index`;  from `items`, the columns are siblings, and `z-index` does it.
   * - Each line's own box, not its column's:  clipping a column would clip every column drawn inside it.
   */
  peekClipCSS(index: number): string | undefined {
    const peek = this.peekColumn
    if (peek === undefined || index <= peek || this.hasItemData) return undefined
    const peekEnd = `${this.columnStartCSS(peek)} + ${this.fullWidthCSS(peek, { isShared: false })}`
    const covered = `max(0px, ${peekEnd} - ${this.columnStartCSS(index)})`
    return this.isRightToLeft ? `inset(0 ${covered} 0 0)` : `inset(0 0 0 ${covered})`
  }

  /**
   * From markup:  is column `index` wholly under the narrow column drawn whole over it (`peekColumn`)?
   * Its border goes too, which `peekClipCSS()` can't reach.
   */
  isCoveredColumn(index: number): boolean {
    const peek = this.peekColumn
    if (peek === undefined || index <= peek || this.hasItemData) return false
    let start = 0
    for (let before = 0; before < index; before++) start += this.shownWidthPxOf(before)
    let peekStart = 0
    for (let before = 0; before < peek; before++) peekStart += this.shownWidthPxOf(before)
    return start + this.shownWidthPxOf(index) <= peekStart + this.widthPxOf(peek)
  }

  /**
   * The widest a full column is drawn, in px, while the columns don't fit even with the strips:  the full ones share
   * what the strips leave, so the selected column shows whole (at a phone's width, say);  `Infinity` while they fit.
   * - Shared fairly:  a column narrower than its share keeps its width, and the rest share what it leaves.
   * - Never under `MIN_COLUMN_PX`.
   */
  get fullColumnMostPx(): number {
    if (!this.isColumns || !this.boxWidthPx || !this.defaultWidthPx) return Infinity
    const narrow = this.narrowColumns
    const full = this.columnIndexes
      .filter((index) => !narrow.includes(index))
      .map((index) => this.widthPxOf(index))
      .sort((a, b) => a - b)
    let room = this.boxWidthPx - narrow.length * this.narrowWidthPx
    if (full.reduce((sum, width) => sum + width, 0) <= room) return Infinity
    for (let at = 0; at < full.length; at++) {
      const share = room / (full.length - at)
      if (full[at] > share) return Math.max(MIN_COLUMN_PX, Math.floor(share))
      room -= full[at]
    }
    return Infinity
  }

  /** While it's in the page as columns:  the width of its box of columns, measured as it changes. */
  @E.onChange("isConnected", "isColumns", "isReady")
  protected watchBoxWidth(isConnected: boolean, isColumns: boolean, isReady: boolean) {
    if (!isConnected || !isColumns || !isReady || isServer) return undefined
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      this.boxWidthPx = Math.round(entry.contentRect.width)
      this.measureDefaultWidth()
    })
    // the box is drawn by the time the next paint comes
    const cancel = E.beforeNextPaint(() => {
      const box = this.domElement.renderRoot.querySelector(".columns")
      if (box) observer.observe(box)
    })
    return () => {
      cancel()
      observer.disconnect()
    }
  }

  /** The pointer moved onto a column:  a narrow one widens while it's there.  Its line, after it, changes nothing. */
  @E.on("pointerover")
  protected onPointerOver(event: PointerEvent) {
    if (!this.isColumns) return
    const path = event.composedPath()
    if (path.some((target) => (target as Element).classList?.contains("column-edge"))) return
    this.hoveredColumn = this.columnOf(path)
  }

  /** The pointer left the tree:  no column is under it. */
  @E.on("pointerleave")
  protected onPointerLeft() {
    this.hoveredColumn = undefined
  }

  /** The focus moved into a column:  a narrow one widens while it has it. */
  @E.on("focusin")
  protected onFocusIn(event: FocusEvent) {
    if (this.isColumns) this.focusedColumn = this.columnOf(event.composedPath())
  }

  /** The focus left:  the next `focusin`, if it stays in the tree, says where it went. */
  @E.on("focusout")
  protected onFocusOut() {
    this.focusedColumn = undefined
  }

  /**
   * The column an event went through, by level, from its `composedPath()`:  `undefined` for none.
   * - From `items`, each column is a `ul.column` with its `data-depth`;  from markup, the first is the tree's own
   *   `.column`, and each deeper one an open row's `.rows`, one level deeper than that row.
   */
  private columnOf(path: EventTarget[]): number | undefined {
    for (const target of path) {
      if (target === this.domElement) return undefined
      const box = target as HTMLElement
      if (box.classList?.contains("column")) return Number(box.dataset.depth ?? 0)
      if (box.classList?.contains("rows")) {
        const { component } = (box.getRootNode() as ShadowRoot).host as E.DOMElement
        if (component instanceof UITreeItem) return component.depth + 1
      }
    }
    return undefined
  }

  ////////////////
  // ## The sticky path
  ////////////////

  /** `sticky-path`:  the open rows the first row in view is inside, outermost first, while one is out of sight. */
  @E.state({ equals: E.isSameList }) accessor pathRows: readonly UITreeItem[] = []

  /** A read of the path is waiting for the next paint. */
  private cancelPathRead: (() => void) | undefined

  /** While connected with `sticky-path`, as rows:  every scroll that moves the tree reads the path again. */
  @E.onChange("isConnected", "stickyPath", "isColumns")
  protected watchScrolling(isConnected: boolean, stickyPath: boolean | undefined, isColumns: boolean) {
    if (!isConnected || !stickyPath || isColumns || isServer) {
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

  /** The text to look for changed:  as it starts, in a column view, the last column on screen is the one it filters. */
  @E.onChange("filter", "isReady")
  protected onFilterChanged(filter: string | undefined) {
    if (filter && !this.hadFilter) this.filterColumn = Math.max(0, this.columnIndexes.length - 1)
    this.hadFilter = !!filter
    this.applyFilter()
  }

  /** It had a `filter` when that last changed. */
  @E.state private accessor hadFilter = false

  /** `appearance="columns"`:  the column `filter` filters, by level, set as it starts. */
  @E.state accessor filterColumn = 0

  /** From markup, in a column view:  the element whose rows `filter` filters, the tree or a pick. */
  get filteredRowsParent(): Element {
    if (!this.isColumns || !this.filterColumn) return this.domElement
    return this.openChain.filter((row) => row.canOpen)[this.filterColumn - 1]?.domElement ?? this.domElement
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
    if (this.isColumns) return this.applyColumnFilter(text)
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

  /** In a column view, `text` filters one column (`filterColumn`):  it hides the rows there that don't hold it. */
  private applyColumnFilter(text: string) {
    if (this.hasItemData) {
      const list = this.columnLists[this.filterColumn]
      this.hasNoMatches = !!text && !!list?.length && !this.shownIn(list, this.filterColumn).length
      return
    }
    for (const row of this.allRows) {
      row.isFilteredOut = false
      row.isKeptOpen = false
    }
    let anyMatch = false
    for (const row of this.rowsIn(this.filteredRowsParent)) {
      const isMatch = !text || row.filterWords.toLowerCase().includes(text)
      row.isFilteredOut = !isMatch
      anyMatch ||= isMatch
    }
    this.hasNoMatches = !!text && !anyMatch
  }

  ////////////////
  // ## Showing parts
  ////////////////

  /** `show`'s words:  the parts of a column's row it shows. */
  get shownParts(): readonly RowPart[] {
    const words = (this.show ?? "").split(/\s+/).filter(Boolean)
    return words.length ? (words as RowPart[]) : DEFAULT_ROW_PARTS
  }

  /** Does a column's row show `part`?  Rows from markup ask too (`UITreeItem`). */
  shows(part: RowPart): boolean {
    return this.shownParts.includes(part)
  }

  ////////////////
  // ## Columns from data
  ////////////////

  /** `items` is set:  the columns are drawn from it, here, not from `<ui-tree-item>`s. */
  get hasItemData(): boolean {
    return Array.isArray(this.items)
  }

  /** The top items. */
  private get topItems(): readonly TreeItemData[] {
    return (this.items as unknown as readonly TreeItemData[] | undefined) ?? []
  }

  /** Each item's children once its `children` has run:  the list, or the promise of it. */
  private readonly childrenOfItem = new WeakMap<TreeItemData, readonly TreeItemData[] | Promise<unknown>>()

  /** Bumped as a promised list comes:  what's read from `childrenOfItem` is read again. */
  @E.state private accessor childrenVersion = 0

  /**
   * `item`'s children, made once:  `undefined` while a promise of them is on its way.
   * - SIDE EFFECT:  the first call runs a `children` function.
   */
  private childrenOf(item: TreeItemData): readonly TreeItemData[] | undefined {
    void this.childrenVersion
    const known = this.childrenOfItem.get(item)
    if (known) return Array.isArray(known) ? known : undefined
    const { children } = item
    const made = typeof children === "function" ? children() : (children ?? [])
    if (Array.isArray(made)) {
      this.childrenOfItem.set(item, made)
      // a function that made none:  its chevron goes
      if (typeof children === "function") this.childrenVersion++
      return made
    }
    const promised = Promise.resolve(made)
      .then((list) => this.childrenOfItem.set(item, list))
      .catch((error) => {
        E.Warnings.warn("<ui-tree items>", `\`${item.id}\`'s children didn't come:`, error)
        this.childrenOfItem.set(item, [])
      })
      .finally(() => this.childrenVersion++)
    this.childrenOfItem.set(item, promised)
    return undefined
  }

  /** Does `item` open a column?  A `children` function does until it's run;  then, if it made any. */
  private hasChildren(item: TreeItemData): boolean {
    void this.childrenVersion
    const known = this.childrenOfItem.get(item)
    if (known) return !Array.isArray(known) || known.length > 0
    return typeof item.children === "function" || (item.children?.length ?? 0) > 0
  }

  /** The count `item`'s row shows:  its own, else how many children it has, once known. */
  private countOf(item: TreeItemData): number | undefined {
    void this.childrenVersion
    const known = this.childrenOfItem.get(item)
    if (item.count !== undefined) return item.count
    if (Array.isArray(known)) return known.length
    return Array.isArray(item.children) ? item.children.length : undefined
  }

  /**
   * Each column's items, by level:  the top items, then the children of each pick of `path` that has some.
   * - `undefined`:  that column's items are on their way.
   */
  private get columnLists(): (readonly TreeItemData[] | undefined)[] {
    const lists: (readonly TreeItemData[] | undefined)[] = [this.topItems]
    for (const id of this.openPath) {
      const item = lists.at(-1)?.find((each) => each.id === id)
      if (!item || !this.hasChildren(item)) break
      const children = this.childrenOf(item)
      if (children?.length === 0) break
      lists.push(children)
      if (!children) break
    }
    return lists
  }

  /** The items column `depth` shows:  `list`, filtered if it's `filter`'s column. */
  private shownIn(list: readonly TreeItemData[], depth: number): readonly TreeItemData[] {
    const text = (this.filter ?? "").trim().toLowerCase()
    if (!text || depth !== this.filterColumn) return list
    return list.filter((item) => `${item.label} ${item.which ?? ""}`.toLowerCase().includes(text))
  }

  /**
   * Was a pick made by going back a column (the left key), so the columns after it stay?
   * - Kept with the `path` it was made on:  any other path (a new pick, a page setting it) ends it.
   */
  @E.state private accessor wentBack: { depth: number; path: readonly string[] } | undefined = undefined

  /** The column of the selected item:  the last pick, unless the keys went back. */
  private get selectedDepth(): number {
    const back = this.wentBack
    return back && back.path === this.openPath ? back.depth : this.openPath.length - 1
  }

  /** The item that takes the tab stop in column `depth`:  its pick, else its first. */
  private keyItemIn(depth: number): TreeItemData | undefined {
    const list = this.shownIn(this.columnLists[depth] ?? [], depth)
    return list.find((item) => item.id === this.openPath[depth]) ?? list[0]
  }

  /**
   * Extra class names for `item`'s row in a column drawn from `items`:  none here;  a subclass overrides it.
   * - Set on the row (`.column-row`), for the subclass's own sheet (`elementSetup.styleSheets`) to style:
   *   `.column-row.port .which { ... }`.
   * - Read once, as the row is drawn.
   * - Rows from markup draw themselves, in shadow roots a subclass's sheet doesn't reach:  so only `items` rows.
   */
  rowClass(_item: TreeItemData): string | undefined {
    return undefined
  }

  /** Every column, from `items`. */
  private itemColumns() {
    return (
      <For each={this.columnLists} keyed={false}>
        {(list, depth) => this.itemColumn(list, depth)}
      </For>
    )
  }

  /** Column `depth`:  its title, its rows, and while they're on their way, a spinner. */
  private itemColumn(list: Accessor<readonly TreeItemData[] | undefined>, depth: number) {
    const shown = () => this.shownIn(list() ?? [], depth)
    return (
      <ul
        class={["column items", { narrow: this.isNarrowColumn(depth), peek: this.isPeekColumn(depth) }]}
        role="group"
        part={
          this.isNarrowColumn(depth)
            ? `${this.partForName("column")} ${this.partForName("narrow-column")}`
            : this.partForName("column")
        }
        data-depth={depth}
        aria-label={this.titleForColumn(depth)}
        aria-busy={list() ? undefined : "true"}
        style={{ width: this.columnWidthCSS(depth), "margin-inline-end": this.peekMarginCSS(depth) }}
      >
        <Show when={this.titleForColumn(depth)}>
          {(title) => (
            <li class="column-title" role="none" aria-hidden="true">
              {title()}
            </li>
          )}
        </Show>
        <For each={shown()}>{(item) => this.itemRow(item, depth)}</For>
        <Show when={!list()}>
          <li class="loading" role="none">
            <ui-loader visible="" size="small" aria-label={this.translationForKey("loading")} />
          </li>
        </Show>
        <Show when={!!list()?.length && !shown().length}>
          <li class="empty" role="none" part={this.partForName("empty")}>
            <slot name="empty">{this.translationForKey("noMatches")}</slot>
          </li>
        </Show>
      </ul>
    )
  }

  /** `item`'s row in column `depth`:  icon, label and which, count, chevron, each as `show` says. */
  private itemRow(item: TreeItemData, depth: number) {
    const isPicked = () => this.openPath[depth] === item.id
    const isSelected = () => isPicked() && depth === this.selectedDepth
    const ownClasses = (this.rowClass(item) ?? "").split(/\s+/).filter(Boolean)
    return (
      <li
        class={["column-row", ...ownClasses, { selected: isSelected(), "on-path": isPicked() && !isSelected() }]}
        part={this.partForName("column-row")}
        role="treeitem"
        data-id={item.id}
        tabindex={depth === Math.max(0, this.selectedDepth) && this.keyItemIn(depth) === item ? "0" : "-1"}
        aria-level={depth + 1}
        aria-selected={isSelected() ? "true" : "false"}
        aria-expanded={this.hasChildren(item) ? (isPicked() ? "true" : "false") : undefined}
        onClick={(event: MouseEvent) => this.pickItem(item, depth, event)}
      >
        <Show when={this.shows("icon") && item.icon}>
          {(icon) => (
            <span class="icon">
              <ui-icon name={icon()} />
            </span>
          )}
        </Show>
        <span class="label">
          <span class="words">{item.label}</span>
          <Show when={this.shows("which") && item.which}>{(which) => <span class="which">{which()}</span>}</Show>
        </span>
        <Show when={this.shows("count") && this.countOf(item) !== undefined}>
          <span class="count">{this.countOf(item)}</span>
        </Show>
        <Show when={this.shows("chevron") && this.hasChildren(item)}>
          <span class="chevron" aria-hidden="true" />
        </Show>
      </li>
    )
  }

  /**
   * `item`, in column `depth`, was clicked, or a key moved onto it:  it's selected, asking first.
   * - The path is cut there, so the columns after it close and its children open in the next;
   *   with `keepsInside`, and it already picked (the keys going back or in), the columns after it stay.
   */
  private pickItem(item: TreeItemData, depth: number, event: Event, { keepsInside = false } = {}) {
    const isPicked = this.openPath[depth] === item.id
    const path = keepsInside && isPicked ? this.openPath : [...this.openPath.slice(0, depth), item.id]
    const detailPath = path.slice(0, depth + 1)
    const announce = () => this.send("ui-selecting", { item, value: item.id, path: detailPath, originalEvent: event })
    const isDone = E.isSameList(path, this.openPath) ? announce() : this.requestChange("openPath", path, announce)
    if (!isDone) return
    this.wentBack = depth < this.openPath.length - 1 ? { depth, path: this.openPath } : undefined
    const detail = { value: item.id, values: [item.id], item, path: detailPath, originalEvent: event }
    this.send("ui-changed", detail)
    this.settleSoon(detail)
    if (!keepsInside) this.showNewestColumn()
    this.showPicks()
  }

  /**
   * The keys on a row from `items`, as the markup rows' (`columnKeyActions()`):  they select as they move.
   * - Up, down, Home and End within its column;  the key toward the next column goes in, onto its pick, else its
   *   first;  the other goes back, the columns after it kept.  Enter and Space select.
   */
  private onItemKeyDown(event: KeyboardEvent) {
    const box = (event.composedPath()[0] as Element).closest?.("li[data-id]") as HTMLElement | null | undefined
    const depth = Number((box?.parentElement as HTMLElement | null | undefined)?.dataset.depth)
    if (!box || Number.isNaN(depth)) return
    const list = this.shownIn(this.columnLists[depth] ?? [], depth)
    const at = list.findIndex((each) => each.id === box.dataset.id)
    const item = list[at]
    if (!item) return
    const pick = (next: TreeItemData | undefined, nextDepth = depth, keepsInside = false) => {
      if (!next) return false
      this.pickItem(next, nextDepth, event, { keepsInside })
      return true
    }
    const moveTo = (index: number) => {
      const next = list[Math.max(0, Math.min(list.length - 1, index))]
      return next === item ? true : pick(next)
    }
    const goIn = () => {
      if (this.openPath[depth] !== item.id || !this.hasChildren(item)) return false
      const inside = this.shownIn(this.childrenOf(item) ?? [], depth + 1)
      return pick(inside.find((each) => each.id === this.openPath[depth + 1]) ?? inside[0], depth + 1, true)
    }
    const goOut = () => {
      if (!depth) return false
      const before = this.shownIn(this.columnLists[depth - 1] ?? [], depth - 1)
      return pick(
        before.find((each) => each.id === this.openPath[depth - 1]),
        depth - 1,
        true
      )
    }
    const actions: Record<string, () => boolean> = {
      ArrowDown: () => moveTo(at + 1),
      ArrowUp: () => moveTo(at - 1),
      Home: () => moveTo(0),
      End: () => moveTo(list.length - 1),
      ArrowRight: this.isRightToLeft ? goOut : goIn,
      ArrowLeft: this.isRightToLeft ? goIn : goOut,
      Enter: () => pick(item),
      " ": () => pick(item)
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    if (action()) E.afterSolidUpdate(() => this.focusKeyRow())
  }

  /** The focus goes to the row with the tab stop, scrolled into its column's view. */
  private focusKeyRow() {
    const depth = Math.max(0, this.selectedDepth)
    const id = this.keyItemIn(depth)?.id
    if (id === undefined) return
    const column = this.domElement.renderRoot.querySelector<HTMLElement>(`ul[data-depth="${depth}"]`)
    const row = column?.querySelector<HTMLElement>(`li[data-id="${CSS.escape(id)}"]`)
    row?.focus({ preventScroll: true })
    if (row && column) revealIn(column, row)
  }

  /** `path` changed:  the selected row's column in view, its end too;  from `items`, each column's pick in view. */
  @E.onChange("openPath", "isReady", { defer: true })
  protected onOpenPathChanged() {
    if (!this.isColumns || !this.isReady) return
    this.showColumn(this.selectedColumn)
    if (this.hasItemData) this.showPicks()
  }

  /** Scroll each column from `items` to its pick, before the next paint. */
  private showPicks() {
    if (isServer) return
    E.beforeNextPaint(() => {
      for (const column of this.domElement.renderRoot.querySelectorAll<HTMLElement>("ul.column")) {
        const pick = column.querySelector<HTMLElement>("li.selected, li.on-path")
        if (pick) revealIn(column, pick)
      }
    })
  }
}

export interface UITree extends E.AttributeValues<typeof treeVocabulary> {}

/** The widths a person set, kept under a tree's `id`:  a column's own, by level (`null` for none), and an Option-drag's. */
type KeptWidths = { columns?: (number | null)[]; every?: number }

/** `widths` without the `undefined`s at its end:  the columns after them take what `size` says. */
function trimmedWidths(widths: readonly (number | undefined)[]): (number | undefined)[] {
  const trimmed = [...widths]
  while (trimmed.length && trimmed.at(-1) === undefined) trimmed.pop()
  return trimmed
}

/** A row the path line names:  a `<ui-tree-item>`, or an `items` entry. */
type PathRow = { readonly label?: string | undefined }

/** Where `row`'s own line is on screen, without the rows inside it. */
function rowBoxOf(row: UITreeItem): DOMRect {
  return (row.domElement.renderRoot.querySelector(".row") ?? row.domElement).getBoundingClientRect()
}

/**
 * Scroll `column` the least that shows `row`, up or down only, so the page itself never moves.
 * - `row`'s offset parent is `column` (the sheet makes it `position: relative`).
 */
function revealIn(column: HTMLElement, row: HTMLElement) {
  const { offsetTop: top, offsetHeight: height } = row
  const titleHeight = column.querySelector<HTMLElement>(".column-title")?.offsetHeight ?? 0
  if (top - titleHeight < column.scrollTop) column.scrollTop = top - titleHeight
  else if (top + height > column.scrollTop + column.clientHeight) column.scrollTop = top + height - column.clientHeight
}

/** `choose` of a tree whose rows are selected many at a time. */
const MANY = "many"

/** How long what's selected stays put before `ui-settled`, in seconds. */
const SETTLE_SECONDS = 0.3

/** The tree's `appearance` that shows a column per level. */
const COLUMNS = "columns"

/** A column's width while nobody has sized it. */
const DEFAULT_WIDTH = "var(--_ui-tree-column-width)"

/** A narrow column's width. */
const NARROW_WIDTH = "var(--_ui-tree-narrow-width)"

/** The tree's store, in this browser:  each tree's widths under `widths:<id>`. */
const STORE_NAME = "ui-tree"

/** The start of the key a tree's widths are kept under, before its `id`. */
const WIDTHS_KEY = "widths:"

/** Where the widths were kept before (epic `from-console` P5):  a list of widths under each tree's `id`, moved over once. */
const OLD_WIDTHS_STORE = "ui-tree-column-widths"

/** What `1em` and `1rem` come to before they're measured, in px. */
const DEFAULT_EM_PX = 16

/** The widest a `size="auto"` column grows, in default widths (`--ui-tree-column-width`). */
const FIT_MOST_TIMES = 3

/** The narrowest a column can be made, in px. */
const MIN_COLUMN_PX = 80

/** How far an arrow key moves a column's line, in px. */
const KEY_STEP_PX = 16

/** How many steps Shift makes it. */
const SHIFT_STEPS = 10

/** The keys that move a column's line, and which way:  narrower, wider (right to left, turned round). */
const RESIZE_KEYS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
