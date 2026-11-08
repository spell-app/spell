// oxlint-disable-next-line spell-ui/no-solid-effect -- the class mirror's RENDER effect:  a throw must reach the error boundary
import { For, Show, createRenderEffect } from "solid-js"
import { Portal, isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
import { tableVocabulary } from "./UITable.en"
import { TableClassMirror } from "./TableClassMirror"
import { TableEditing } from "./TableEditing"
import { ATTACH, TableGrammar } from "./TableGrammar"
import { TableRows } from "./TableRows"
import { TableSort } from "./TableSort"

import tableCSS from "./UITable.css?inline"

/****************
 * ### `UITable`
 * The component behind `<ui-table>`:
 * a native `<table>` in Fomantic's table look, `<ui-table celled appearance="striped"><table>...</table></ui-table>`.
 *
 * - The table stays NATIVE and in the LIGHT DOM (table semantics, find-in-page, copy, the page's CSS);
 *   the shadow root is only `<div class="... scroller" part="scroller"><slot></slot></div>`.
 *
 * - Styling:  the component mirrors its class string (`ui celled striped table`, from `ClassBuilder`)
 *   onto the slotted table (`TableClassMirror`), and registers `UITable.css` as a PAGE sheet too,
 *   whose class-grammar rules then style it.
 *   - The mirror writes only its own words and keeps the author's classes,
 *     and writes them again when a framework rewrites `className`.
 *   - Why classes, not attribute selectors on the DOM element:
 *     one mechanical port of `table.less` serves the element and static markup
 *     (a server writes `class="ui celled table"` and paints before any JS),
 *     and translated names, `yes` / `no` and `medium` resolve through the vocabulary like every other component's.
 *
 * - Row and cell looks are the author's classes on native `tr` / `td` / `th`
 *   (`positive`, `red marked left`, `collapsing` ...):  no JS.
 *
 * - Scrolling:  `scrolling` and `overflowing` cap the scroller's height.
 *   It then scrolls, and is a focusable, named region
 *   (the DOM element's `aria-label`, else the `<caption>`, else the translated `label`).
 *   - A table that doesn't stack (`unstackable`, `stack-by="none"`, or too wide for the stacking breakpoint)
 *     and is wider than its box scrolls SIDEWAYS in the scroller, its height uncapped:
 *     the same focusable, named region, never the page (`isTooWide`, measured).
 *   - A stacked table always fits its box, so it never does.
 *
 * - Sorting (`sortable`):  every `thead` header sorts, except `th[data-sortable="false"]` and `th.disabled`.
 *   - A header's `<button>` is its control (APG's sortable table:  authors SHOULD put one in each sortable header);
 *     a header without one is made focusable (`tabindex="0"`) and answers Enter and Space.
 *     The component never moves or wraps the author's nodes.
 *   - The sorted header gets `aria-sort` (removed from the others);  `UITable.css` draws the caret from it.
 *   - `sort-column` and `sort-direction` are auto-controlled.
 *     Each activation first sends the cancelable `ui-sorting` (`TableSortDetail`):
 *     the sorted column flips, another starts `ascending`.
 *   - Reordering:  data mode shows its rows sorted.
 *     A slotted table reorders its `tbody` rows by cell text only with `client-sort` (simple static tables);
 *     otherwise the app sorts:  frameworks own their rows.
 *
 * - Data mode:  `rows` (and optional `columnDefs`), with NO slotted `<table>`, draws one into the LIGHT DOM:
 *   header cells `scope="col"`, a sort `<button>` each when sortable, keyed rows, text only (never HTML).
 *   It's removed when `rows` is unset or an author table appears:  the author's table always wins.
 *   - Why the light DOM:  the same page sheet and class grammar as a slotted table,
 *     native semantics in the document,
 *     and a server draws the same `<table>` itself (first paint never needs the property).
 *   - NOTE: no virtualization (the plan's ~200-row threshold):  every row is drawn.
 *
 * - NOTE: `sort-column` counts `colspan`s but not `rowspan`s (see `TableSort`).
 *
 * - Editing (`editable`, data mode only;  epic `mockup` P9):  a spreadsheet over `rows`.
 *   - The table is an ARIA `grid`:  one cell is the CURSOR, the only one in the tab order (a roving `tabindex`);
 *     arrows, Tab, Enter, Home / End move it.
 *   - Typing, F2 or Enter opens the cell's editor, by its column's `type` (`TableEditing.typeOf()`);
 *     Enter or Tab keeps it, Escape puts it back.  A `yes-no` cell is a tick box, toggled in place.
 *   - The empty last row adds a row;  Delete clears a cell, ⌘ / Ctrl + Delete (or the row's button) removes its row;
 *     a pasted block of cells fills from the cursor, adding rows past the end.
 *   - Each change goes out as ONE `ui-editing` (`TableEditDetail`), whatever it touched:
 *     not cancelled, the table shows it in new `rows` of its own (`TableEditing.applied()`);
 *     a page that writes its own things (a Spell program, through its core) cancels it, and its rows follow.
 *   - It NEVER changes a row object in place.
 *   - Its look is the sheet's `editable` class word:  square cells on a hairline grid, the cursor outlined.
 *   - NOTE: every row is drawn, as in data mode:  a long table isn't drawn in windows yet.
 *
 * - Rows mode (epic `ui-gaps` P7):  `<ui-row>`s of `<ui-cell>`s, with no native table, for a drawing,
 *   which holds no native HTML.
 *   - The DOM element is then the table box:  the class mirror writes its class words onto the DOM element itself,
 *     so the same class-grammar page rules style it ("Rows and cells" in `UITable.css`).
 *   - The scroller is a CSS grid of `--_table-columns` columns (`TableRows.columnCount()`), each row a subgrid.
 *   - ARIA `table`, its rows `row`, its cells `cell` / `columnheader` / `rowheader`, named by its `caption`.
 *   - Sorting works the same (`TableRows`):  header cells sort, and `client-sort` moves the row elements.
 *   - NOTE: not in a static server render, which draws a rows-mode table unstyled.
 *
 * - `caption`:  drawn above the scroller (attribute, or the `caption` slot);  a native table's `<caption>` wins.
 *
 * - Static server render (`spell/ui/static`):  no observers, effects or listeners.
 *   `decorateStatic()` writes the author table's classes, marker and `aria-sort` once,
 *   and data mode draws its table inside the scroller (the page's static style sheet styles it there).
 ****************/
export class UITable extends E.UIComponent<typeof tableVocabulary> {
  @E.proto static vocabulary = tableVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { table: tableCSS },
    // the scroller and the light-DOM headers take focus themselves
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * Base `onMount()`, plus the light-DOM work:
   * - the render effect that mirrors classes onto the managed table
   *   (undone when the DOM element is released:  it survives moves)
   * - the `@onChange` methods watch the table, decorate headers and (with `client-sort`) reorder rows
   */
  override onMount(): JSX.Element {
    const content = super.onMount()
    if (isServer) {
      this.decorateStatic()
      return content
    }
    this.domElement.addReleaseCallback(() => this.classMirror.detach())
    // stays explicit, a RENDER effect:  the class mirror is the element's main DOM binding,
    // and a throw in its compute (the classes) must reach the element's error boundary --
    // a plain effect's error is only logged
    createRenderEffect(
      () => [this.mirrorTarget, this.rootClass] as const,
      ([table, classes]) => this.classMirror.apply(table, classes)
    )
    return content
  }

  render(): JSX.Element {
    this.registerPageSheets()
    return (
      <>
        <Show when={this.hasOwnCaption}>
          <div class={CAPTION} part={this.partForName("caption")}>
            <slot name="caption">{this.caption}</slot>
          </div>
        </Show>
        <div
          ref={(box: HTMLDivElement) => (this.scroller = box)}
          class={[this.scrollerClasses, { [SIDEWAYS]: this.isTooWide }]}
          style={this.isInRowsMode ? { [COLUMNS_TOKEN]: String(this.columnCount) } : undefined}
          part={this.partForName("scroller")}
          tabindex={this.isScrollRegion ? 0 : undefined}
          role={this.isScrollRegion ? "region" : undefined}
          aria-label={this.isScrollRegion ? this.regionLabel : undefined}
        >
          <slot />
          {isServer ? <Show when={this.isInDataMode}>{this.staticTable()}</Show> : undefined}
        </div>
        {isServer ? undefined : (
          <Portal mount={this.domElement}>
            <Show when={this.isInDataMode}>{this.generatedTable()}</Show>
          </Portal>
        )}
      </>
    )
  }

  /**
   * Register the family's sheets as PAGE sheets too:  their class-grammar rules style the light-DOM table.
   * - Idempotent (`UI.styles.register`);  re-registering new text (hot reload) updates them in place.
   */
  private registerPageSheets() {
    if (isServer) return
    for (const [name, css] of Object.entries(this.elementSetup.styleSheets))
      UI.styles.register(name, css, { page: true })
  }

  /**
   * `stack-by` as a class on the table before the noun (`ui stackable stack-by-container table`):
   * a private word the sheet keys on, from the CANONICAL value, so a translated attribute still works.
   * - A class, not a state of the DOM element:
   *   `:state()` rules in the page sheet left WebKit with stale viewport media queries on a later table.
   */
  protected get extraClass(): string | undefined {
    return this.stackBy ? `${STACK_BY_CLASS}${this.stackBy}` : undefined
  }

  ////////////////
  // ## The managed table
  ////////////////

  /** First author `<table>` child (never the generated one);  follows the DOM element's children. */
  @E.watches({ childList: true })
  get authorTable(): HTMLTableElement | undefined {
    return this.scanAuthorTable()
  }

  /** The generated data-mode table, once rendered (set a microtask after its `ref`). */
  @E.state accessor dataTable: HTMLTableElement | undefined = undefined

  /** Bumped when the managed table's content changes (header rows, caption text ...). */
  @E.state accessor tableRevision = 0

  /** The table this element styles and sorts:  the author's, else the generated one. */
  get managedTable(): HTMLTableElement | undefined {
    return this.authorTable ?? (this.isInDataMode ? this.dataTable : undefined)
  }

  /** Where the class words go:  the managed table, else (rows mode) the DOM element itself. */
  get mirrorTarget(): Element | undefined {
    return this.managedTable ?? (this.isInRowsMode ? this.domElement : undefined)
  }

  /** What's sorted, and watched for changes:  the managed table, else (rows mode) the DOM element and its rows. */
  get sortTarget(): Element | undefined {
    return this.mirrorTarget
  }

  /** Mirrors `rootClass` onto `managedTable`. */
  private readonly classMirror = new TableClassMirror()

  /**
   * First `<table>` child that the element didn't render.
   * - By `localName`, not `instanceof HTMLTableElement`:  a static server render's children are linkedom elements.
   */
  private scanAuthorTable(): HTMLTableElement | undefined {
    for (const child of this.domElement.children) {
      if (child.localName === "table" && !GENERATED.has(child as HTMLTableElement)) return child as HTMLTableElement
    }
    return undefined
  }

  /**
   * Watch the managed table's content (rows, header cells, caption text, its `aria-label`)
   * and bump `tableRevision` when it changes.
   * - Returns the cleanup (run when the table changes).
   */
  @E.onChange("sortTarget")
  protected onManagedTableChanged(table: Element | undefined): (() => void) | undefined {
    if (!table) return undefined
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- watches the managed TABLE, swapped with it
    const observer = new MutationObserver(() => this.tableRevision++)
    // rows mode:  the rows' `header` / `footer` and the cells' `span` move columns and headers too
    const attributeFilter = this.isInRowsMode ? ["aria-label", ...ROW_ATTRIBUTES] : ["aria-label"]
    observer.observe(table, { childList: true, subtree: true, characterData: true, attributeFilter })
    return () => observer.disconnect()
  }

  /**
   * The author table in a static server render, once:  what the browser's effects keep up to date.
   * - its classes mirrored in (`TableClassMirror.mirrored()`)
   * - `data-ui="table"`:  a root of the static stylesheet's `@scope` too, so the table sheet reaches its cells
   *   (a slotted element's insides are out of its owner's scope, but this sheet is a PAGE sheet in the browser)
   * - `aria-sort` on the sorted header, while `sortable` (the caret)
   * - SIDE EFFECT:  writes the page's (linkedom) table;  no focusable headers:  nothing on a static page sorts.
   */
  @E.untracked
  private decorateStatic() {
    const table = this.authorTable
    if (!table) return
    table.setAttribute("class", TableClassMirror.mirrored(table.getAttribute("class"), this.rootClass))
    table.setAttribute(UIT.STATIC_ROOT, this.vocabulary.noun)
    const column = this.sortColumn
    const direction = this.effectiveSortDirection
    if (!this.sortable || column === undefined || !direction) return
    TableSort.headerAt(table, column)?.setAttribute("aria-sort", direction)
  }

  ////////////////
  // ## Rows mode
  ////////////////

  /** The DOM element's `<ui-row>` children;  follows them. */
  @E.watches({ childList: true, equals: E.isSameList })
  get rowElements(): readonly Element[] {
    return TableRows.rows(this.domElement)
  }

  /** Rows mode:  `<ui-row>`s, and neither an author table nor data mode. */
  @E.cssState("rows")
  get isInRowsMode(): boolean {
    return this.rowElements.length > 0 && !this.authorTable && this.dataRows === undefined
  }

  /** Columns of the rows-mode grid;  follows the rows and their cells' `span`s (`tableRevision`). */
  get columnCount(): number {
    void this.tableRevision
    return TableRows.columnCount(this.domElement)
  }

  /** ARIA:  `table` in rows mode (a native table is its own). */
  @E.aria("role")
  get ariaRole(): string | undefined {
    return this.isInRowsMode ? "table" : undefined
  }

  /** ARIA name in rows mode:  the `caption` text, unless the DOM element has an `aria-label`. */
  @E.aria("label")
  get ariaName(): string | undefined {
    return this.isInRowsMode ? this.caption || undefined : undefined
  }

  ////////////////
  // ## Caption
  ////////////////

  /** Draws its own caption:  `caption` or the slot, and no native `<caption>` of the managed table's. */
  @E.cssState("captioned")
  get hasOwnCaption(): boolean {
    void this.tableRevision
    if (this.managedTable?.caption) return false
    return !!this.caption || this.slots.hasContent(this.slotForName("caption"))
  }

  /** Which named slots have content (the `caption` slot). */
  readonly slots = new E.SlotContent(this.domElement)

  /** Name the native managed table by `caption`, while it has no name of its own:  the one this element set. */
  @E.onChange("managedTable", "caption", { writesDOMElement: true })
  protected onCaptionChanged(table: HTMLTableElement | undefined, caption: string | undefined) {
    if (!table || !caption || table.caption || table.hasAttribute("aria-label")) return undefined
    table.setAttribute("aria-label", caption)
    return () => {
      if (table.getAttribute("aria-label") === caption) table.removeAttribute("aria-label")
    }
  }

  ////////////////
  // ## Data mode
  ////////////////

  /**
   * `rows`, when it's an array, or any other list of rows (an iterable, e.g. a program's list of things).
   * - Read again on each read:  a program's list follows its own changes, which a cache here wouldn't hear.
   */
  get dataRows(): readonly UIT.TableRow[] | undefined {
    const rows = this.rows as unknown
    if (Array.isArray(rows)) return rows as readonly UIT.TableRow[]
    if (rows && typeof rows === "object" && Symbol.iterator in rows) return Array.from(rows as Iterable<UIT.TableRow>)
    return undefined
  }

  /** Data mode:  `rows` set and no author table. */
  get isInDataMode(): boolean {
    return this.dataRows !== undefined && !this.authorTable
  }

  /**
   * Data-mode columns:  `columnDefs`;  else the ones its list of rows names, its `tableColumns`
   * (a program's list of things names its own, so an empty one still has them);  else the first row's keys.
   */
  @E.derived
  get dataColumns(): readonly UIT.TableColumn[] {
    const defs = this.columnDefs
    if (Array.isArray(defs)) return (defs as UIT.TableColumn[]).filter((column) => typeof column?.key === "string")
    const named = (this.rows as { tableColumns?: unknown } | undefined)?.tableColumns
    if (Array.isArray(named)) return named as UIT.TableColumn[]
    return TableEditing.columnsOf(this.dataRows ?? [])
  }

  /**
   * Data-mode rows in the current sort order;  unsorted when the column can't sort.
   * - A plain getter, not `@derived`:  a program's list of rows changes where a cache can't see it.
   */
  get sortedRows(): readonly UIT.TableRow[] {
    const rows = this.dataRows ?? []
    const index = this.sortColumn
    const column = index === undefined ? undefined : this.dataColumns[index]
    if (!column || column.sortable === false) return rows
    const sign = this.effectiveSortDirection === "descending" ? -1 : 1
    return [...rows].sort((a, b) => TableSort.compare(a[column.key], b[column.key], sign))
  }

  /**
   * The data-mode table, into the DOM element's LIGHT DOM (through the `Portal`).
   * - No classes here:  `classMirror` writes them like on an author table.
   */
  private generatedTable(): JSX.Element {
    return (
      <table
        ref={(table: HTMLTableElement) => this.adoptDataTable(table)}
        role={this.isEditable ? "grid" : undefined}
        aria-rowcount={this.isWindowed ? this.sortedRows.length + 1 : undefined}
      >
        {this.headAndBody()}
      </table>
    )
  }

  /**
   * The data-mode table in a static server render:  inside the scroller (no light DOM to portal into),
   * with the classes the mirror would write, and `aria-sort` on the sorted header.
   */
  private staticTable(): JSX.Element {
    return <table class={this.rootClass}>{this.headAndBody(this.effectiveSortDirection)}</table>
  }

  /**
   * The data-mode table's head and body.
   * - `direction`:  the static render's `aria-sort` for the sorted column's header
   *   (the browser's comes from `decorateHeaders()`).
   */
  private headAndBody(direction?: UIT.TableSortDirection): JSX.Element {
    const sorted = direction && this.sortable ? this.sortColumn : undefined
    return (
      <>
        <thead>
          <tr>
            <For each={this.dataColumns}>
              {(column, index) => this.columnHeader(column, () => (index() === sorted ? direction : undefined))}
            </For>
          </tr>
        </thead>
        <tbody>
          {this.spacer("above")}
          <Show
            when={this.isEditable}
            fallback={
              <For each={this.drawnRows}>
                {(row) => (
                  <tr>
                    <For each={this.dataColumns}>
                      {(column) => (
                        <td class={TableGrammar.cell(column) || undefined}>{TableSort.text(row[column.key])}</td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            }
          >
            <For each={this.drawnRows}>
              {(row, drawnIndex) => (
                <tr aria-rowindex={this.isWindowed ? this.drawnFrom + drawnIndex() + 2 : undefined}>
                  <For each={this.dataColumns}>
                    {(column, columnIndex) =>
                      this.editableCell({ row, rowIndex: () => this.drawnFrom + drawnIndex(), column, columnIndex })
                    }
                  </For>
                </tr>
              )}
            </For>
            {this.spacer("below")}
            <tr class={NEW_ROW} aria-label={this.translationForKey("new-row")}>
              <For each={this.dataColumns}>
                {(column, columnIndex) =>
                  this.editableCell({ row: undefined, rowIndex: () => this.sortedRows.length, column, columnIndex })
                }
              </For>
            </tr>
          </Show>
          <Show when={!this.isEditable}>{this.spacer("below")}</Show>
        </tbody>
      </>
    )
  }

  ////////////////
  // ## Long tables:  only the rows in view (epic `mockup` P14, J34 B)
  //
  // Past `WINDOW_FROM` rows, a data-mode body draws only the rows in view and a few around them, with a spacer row
  // above and below standing in for the rest, so a table of 10,000 rows scrolls as one of 50.
  // - What's in view:  the body against the window and the scroller (`measureWindow()`), on every scroll and resize.
  // - The cursor is in the data's places (`sortedRows`), drawn or not:  moving it to an undrawn row draws that row
  //   first (`setCursor()`), and keys, edits and paste act on the data, so a paste fills rows past the window too.
  // - A server render draws every row:  nothing scrolls there.
  ////////////////

  /** Is the body drawn in a window?  Past `WINDOW_FROM` rows, in a browser. */
  get isWindowed(): boolean {
    return !isServer && this.isInDataMode && this.sortedRows.length > WINDOW_FROM
  }

  /** The first row drawn, in `sortedRows`. */
  @E.state accessor windowStart = 0

  /** How many rows the window draws. */
  @E.state accessor windowSize = WINDOW_FIRST_SIZE

  /** The first row drawn:  0 when it isn't windowed. */
  get drawnFrom(): number {
    return this.isWindowed ? Math.min(this.windowStart, this.sortedRows.length) : 0
  }

  /** The rows drawn:  all of them, or the window's. */
  get drawnRows(): readonly UIT.TableRow[] {
    const rows = this.sortedRows
    return this.isWindowed ? rows.slice(this.drawnFrom, this.drawnFrom + this.windowSize) : rows
  }

  /** A row standing in for the undrawn rows `above` or `below` the window, as tall as they'd be. */
  private spacer(where: "above" | "below"): JSX.Element {
    const rows = () => {
      const count = this.sortedRows.length
      return where === "above" ? this.drawnFrom : Math.max(0, count - this.drawnFrom - this.drawnRows.length)
    }
    return (
      <Show when={this.isWindowed}>
        <tr class={SPACER} aria-hidden="true">
          <td colspan={Math.max(1, this.dataColumns.length)} style={{ height: `${rows() * this.rowHeight}px` }} />
        </tr>
      </Show>
    )
  }

  /** A drawn row's height in pixels, measured once rows are drawn;  `DEFAULT_ROW_PX` before. */
  @E.state accessor rowHeight = DEFAULT_ROW_PX

  /**
   * SIDE EFFECT:  while windowed, follows every scroll and resize, and draws the rows then in view.
   * - Scrolls are heard on the document, capturing:  the scroller, the page, or any box around it.
   */
  @E.onChange("isReady", "isWindowed")
  protected onWindowed(isReady: boolean, isWindowed: boolean) {
    if (!isReady || !isWindowed) return
    const remeasure = () => E.beforeNextPaint(() => this.measureWindow())
    document.addEventListener("scroll", remeasure, { capture: true, passive: true })
    window.addEventListener("resize", remeasure)
    remeasure()
    return () => {
      document.removeEventListener("scroll", remeasure, { capture: true })
      window.removeEventListener("resize", remeasure)
    }
  }

  /** Draw the rows in view now, and a few around them. */
  @E.untracked
  private measureWindow() {
    const body = this.dataTable?.tBodies[0]
    if (!body || !this.isWindowed) return
    const drawn = body.rows[1]
    if (drawn && !drawn.classList.contains(SPACER) && drawn.offsetHeight) this.rowHeight = drawn.offsetHeight
    const box = this.scrollerScrolls ? this.scroller?.getBoundingClientRect() : undefined
    const top = Math.max(0, box?.top ?? 0)
    const bottom = Math.min(window.innerHeight, box?.bottom ?? window.innerHeight)
    // where the first row would be:  the body's top, the spacer above included
    const first = Math.floor((top - body.getBoundingClientRect().top) / this.rowHeight)
    const count = Math.ceil(Math.max(0, bottom - top) / this.rowHeight)
    const start = Math.max(0, Math.min(first - WINDOW_EXTRA, this.sortedRows.length - 1))
    const size = Math.max(count + 2 * WINDOW_EXTRA, WINDOW_FIRST_SIZE)
    if (start !== this.windowStart) this.windowStart = start
    if (size !== this.windowSize) this.windowSize = size
  }

  /** Draw row `row` if it's outside the window:  the window starts a few rows above it. */
  @E.untracked
  private drawRow(row: number) {
    if (!this.isWindowed || row >= this.sortedRows.length) return
    const from = this.drawnFrom
    if (row >= from && row < from + this.windowSize) return
    this.windowStart = Math.max(0, row - WINDOW_EXTRA)
  }

  /** How many spacer rows the body starts with:  1 while windowed. */
  private get rowsBeforeData(): number {
    return this.isWindowed ? 1 : 0
  }

  /**
   * Remember the generated `table`:  marked at once (the author-table scan must skip it),
   * stored a microtask later (a `ref` runs inside the render, an owned scope).
   */
  private adoptDataTable(table: HTMLTableElement) {
    GENERATED.add(table)
    E.afterSolidUpdate(() => (this.dataTable = table))
  }

  /**
   * One data-mode header:  `th scope="col"`, a `<button>` inside while it can sort.
   * - `sort`:  its `aria-sort`, in a static server render only.
   */
  private columnHeader(column: UIT.TableColumn, sort: () => UIT.TableSortDirection | undefined): JSX.Element {
    const text = column.header ?? column.key
    const optOut = column.sortable === false
    return (
      <th
        scope="col"
        aria-sort={sort()}
        class={TableGrammar.cell(column) || undefined}
        {...{
          [UIT.TABLE_SORT_KEY]: column.key,
          [UIT.TABLE_SORT_OPT_OUT.attribute]: optOut ? UIT.TABLE_SORT_OPT_OUT.value : undefined
        }}
      >
        <Show when={this.sortable && !optOut} fallback={text}>
          <button type="button">{text}</button>
        </Show>
      </th>
    )
  }

  ////////////////
  // ## Sorting
  ////////////////

  /** `sort-column`:  page-controlled, or set by clicks. */
  @E.controlled("sort-column") accessor sortColumn: number | undefined = undefined

  /** `sort-direction`:  page-controlled, or set by clicks. */
  @E.controlled("sort-direction") accessor sortDirection: UIT.TableSortDirection | undefined = undefined

  /** Direction in effect:  `sortDirection`, `ascending` when only a column is set. */
  get effectiveSortDirection(): UIT.TableSortDirection | undefined {
    return this.sortColumn === undefined ? undefined : (this.sortDirection ?? "ascending")
  }

  /** Headers this element made focusable (`tabindex="0"`). */
  private readonly headersMadeFocusable = new Set<Element>()

  /** Header this element set `aria-sort` on. */
  private sortedHeader: Element | undefined

  /** The table, its content, `sortable` or the sort changed:  decorate the headers again. */
  @E.onChange("tableRevision", "sortTarget", "sortable", "sortColumn", "effectiveSortDirection")
  protected onSortChanged(
    _revision: number,
    table: Element | undefined,
    isSortable: boolean,
    column: number | undefined,
    direction: UIT.TableSortDirection | undefined
  ) {
    this.decorateHeaders({ table, isSortable, column, direction })
  }

  /**
   * Header ARIA and focus for the current sort:
   * - while `sortable`, every sortable header without a `<button>` gets `tabindex="0"`;
   *   headers that stop qualifying lose the ones THIS element set
   * - the sorted column's header gets `aria-sort`;  every other header in the `thead` loses it
   */
  private decorateHeaders({ table, isSortable, column, direction }: HeaderSort) {
    const headers = table && isSortable ? TableSort.headers(table) : []
    const focusable = new Set(
      headers.filter((header) => TableSort.isSortable(header) && !header.querySelector("button"))
    )
    for (const header of this.headersMadeFocusable) {
      if (!focusable.has(header)) {
        header.removeAttribute("tabindex")
        this.headersMadeFocusable.delete(header)
      }
    }
    for (const header of focusable) {
      if (header.hasAttribute("tabindex")) continue
      header.setAttribute("tabindex", "0")
      this.headersMadeFocusable.add(header)
    }
    const sorted = table && isSortable && column !== undefined ? TableSort.headerAt(table, column) : undefined
    if (this.sortedHeader && this.sortedHeader !== sorted) this.sortedHeader.removeAttribute("aria-sort")
    for (const header of headers) if (header !== sorted) header.removeAttribute("aria-sort")
    if (sorted && direction) sorted.setAttribute("aria-sort", direction)
    this.sortedHeader = sorted
  }

  /** `client-sort`:  reorder the body rows (the author table's, or rows mode's) by the sorted column's cell text. */
  @E.onChange("authorTable", "isInRowsMode", "clientSort", "sortColumn", "effectiveSortDirection")
  protected onClientSortChanged(
    table: HTMLTableElement | undefined,
    isInRowsMode: boolean,
    clientSort: boolean,
    column: number | undefined,
    direction: UIT.TableSortDirection | undefined
  ) {
    const sorted = table ?? (isInRowsMode ? this.domElement : undefined)
    if (clientSort && sorted && column !== undefined && direction) TableSort.sortRows(sorted, column, direction)
  }

  /** A click on (or inside) a sortable header sorts by it;  on an editable cell, puts the cursor there. */
  @E.on("click")
  protected onClick(event: MouseEvent) {
    const header = this.sortableHeader(event)
    if (header) this.requestSort(header, event)
    else this.clickedCell(event)
  }

  /** Enter / Space on a focusable header (not its button:  that one clicks);  an editable table's keys. */
  @E.on("keydown")
  protected onKeyDown(event: KeyboardEvent) {
    if (this.isEditable && this.editingKey(event)) return
    if (event.key !== UIT.Key.enter && event.key !== UIT.Key.space) return
    const header = this.sortableHeader(event)
    if (!header || event.target !== header) return
    event.preventDefault()
    this.requestSort(header, event)
  }

  /** The sortable header `event` happened in, while the table is `sortable`. */
  @E.untracked
  private sortableHeader(event: Event): Element | undefined {
    const table = this.sortTarget
    if (!table || !this.sortable) return undefined
    const header = TableSort.header(table, event.target)
    return header && TableSort.isSortable(header) ? header : undefined
  }

  /**
   * Sort by `header`'s column:  `ui-sorting` first (cancelable), then `sort-column` / `sort-direction`.
   * - The sorted column flips direction;  another column starts `ascending`.
   * - Nothing changes when the event is cancelled, or when a handler set either property itself.
   */
  @E.untracked
  private requestSort(header: Element, originalEvent: Event) {
    const table = this.sortTarget
    if (!table) return
    const column = TableSort.column(table, header)
    const current = this.sortColumn
    const direction: UIT.TableSortDirection =
      column === current && this.effectiveSortDirection === "ascending" ? "descending" : "ascending"
    const detail: UIT.TableSortDetail = { column, key: TableSort.key(header), direction, originalEvent }
    this.requestChange("sortDirection", direction, () =>
      this.requestChange("sortColumn", column, () => this.send("ui-sorting", detail))
    )
  }

  ////////////////
  // ## Editing
  ////////////////

  /** `editable`, in data mode:  a spreadsheet over `rows`. */
  get isEditable(): boolean {
    return !!this.editable && this.isInDataMode
  }

  /** Each column's kind of value (`TableEditing.typeOf()`), in column order. */
  get columnTypes(): readonly UIT.TableCellType[] {
    const rows = this.dataRows ?? []
    return this.dataColumns.map((column) => TableEditing.typeOf(column, rows))
  }

  /** The cursor:  the cell keys act on;  its `row` is `sortedRows.length` in the empty last row. */
  @E.state accessor cursor: CellAt | undefined = undefined

  /** The cell being edited, and what its editor holds now;  always the cursor's. */
  @E.state accessor editing: CellDraft | undefined = undefined

  /** The cell at `at` in the generated table's body, if it's drawn. */
  @E.untracked
  private cellAt(at: CellAt): HTMLTableCellElement | undefined {
    const body = this.dataTable?.tBodies[0]
    if (!body) return undefined
    // the empty last row is the body's last, after a spacer below
    if (at.row === this.sortedRows.length && this.isEditable) return body.rows[body.rows.length - 1]?.cells[at.column]
    const drawn = at.row - this.drawnFrom
    if (drawn < 0 || drawn >= this.drawnRows.length) return undefined
    return body.rows[this.rowsBeforeData + drawn]?.cells[at.column]
  }

  /** The body cell `target` is in, as a place, if it's the generated table's. */
  @E.untracked
  private placeOf(target: EventTarget | null): CellAt | undefined {
    const cell = (target as Element | null)?.closest?.("td")
    const table = this.dataTable
    if (!cell || !table || cell.closest("table") !== table || cell.parentElement?.parentElement !== table.tBodies[0])
      return undefined
    const row = cell.parentElement as HTMLTableRowElement
    if (row.classList.contains(SPACER)) return undefined
    if (row.classList.contains(NEW_ROW)) return { row: this.sortedRows.length, column: cell.cellIndex }
    return { row: this.drawnFrom + row.sectionRowIndex - this.rowsBeforeData, column: cell.cellIndex }
  }

  /**
   * One cell of an editable table:  its value shown, or its editor while it's edited.
   * - In the tab order only while it's the cursor (the first cell, before there is one).
   */
  private editableCell({ row, rowIndex, column, columnIndex }: EditableCell): JSX.Element {
    const type = () => this.columnTypes[columnIndex()] ?? "text"
    const isCursor = () => {
      const cursor = this.cursor
      return cursor
        ? cursor.row === rowIndex() && cursor.column === columnIndex()
        : rowIndex() === 0 && columnIndex() === 0
    }
    const isEditing = () => isCursor() && this.editing !== undefined
    const value = () => row?.[column.key]
    return (
      <td
        class={[TableGrammar.cell(column) || undefined, { [CURSOR]: isCursor() && !!this.cursor }]}
        tabindex={isCursor() ? 0 : -1}
        aria-readonly={column.readOnly ? "true" : undefined}
      >
        <Show
          when={isEditing()}
          fallback={
            <Show when={type() === "yes-no"} fallback={<>{TableEditing.textFor(column, type(), value())}</>}>
              <input
                type="checkbox"
                class={TICK}
                tabindex="-1"
                checked={!!value()}
                disabled={!!column.readOnly}
                aria-label={column.header ?? column.key}
                onClick={(event) => {
                  event.preventDefault()
                  this.toggle({ row: rowIndex(), column: columnIndex() }, event)
                }}
              />
            </Show>
          }
        >
          {this.editor(column, type())}
        </Show>
        <Show when={row && columnIndex() === this.dataColumns.length - 1}>
          <button
            type="button"
            class={DELETE_ROW}
            tabindex="-1"
            aria-label={this.translationForKey("delete-row")}
            onClick={(event) => this.removeRow(rowIndex(), event)}
          >
            ×
          </button>
        </Show>
      </td>
    )
  }

  /** The editor of the cell being edited:  a field of its column's kind, or a list of its choices. */
  private editor(column: UIT.TableColumn, type: UIT.TableCellType): JSX.Element {
    const focus = (field: HTMLInputElement | HTMLSelectElement) =>
      E.afterSolidUpdate(() => {
        field.focus()
        if (field instanceof HTMLInputElement && field.type === "text") field.setSelectionRange(9999, 9999)
      })
    const draft = (event: Event) => {
      const editing = this.editing
      if (editing) this.editing = { ...editing, draft: (event.target as HTMLInputElement).value }
    }
    if (type === "choice" || type === "link") {
      return (
        <select
          ref={focus}
          class={EDITOR}
          aria-label={column.header ?? column.key}
          onChange={draft}
          onFocusOut={() => this.commitEdit()}
        >
          <option value="" selected={this.editing?.draft === ""} />
          <For each={column.choices ?? []}>
            {(choice, index) => (
              <option value={String(index())} selected={this.editing?.draft === String(index())}>
                {choice.text ?? TableSort.text(choice.value)}
              </option>
            )}
          </For>
        </select>
      )
    }
    return (
      <input
        ref={focus}
        class={EDITOR}
        type={type === "number" ? "number" : type === "date" ? "date" : "text"}
        value={this.editing?.draft ?? ""}
        aria-label={column.header ?? column.key}
        onInput={draft}
        onFocusOut={() => this.commitEdit()}
      />
    )
  }

  /** A click on an editable body cell (not its tick box or button):  the cursor goes there. */
  @E.untracked
  private clickedCell(event: MouseEvent) {
    if (!this.isEditable) return
    const at = this.placeOf(event.target)
    if (!at || (event.target as Element).closest(`.${EDITOR}`)) return
    if (this.editing) this.commitEdit()
    this.cursor = at
  }

  /** A double click on an editable cell opens its editor. */
  @E.on("dblclick")
  protected onDoubleClick(event: MouseEvent) {
    if (!this.isEditable) return
    const at = this.placeOf(event.target)
    if (at) this.startEdit(at)
  }

  /**
   * An editable table's key, if it's one:  true when it took it.
   * - In an editor:  Enter keeps it and goes down (Shift up), Tab keeps it and goes on, Escape puts it back.
   * - On a cell:  arrows, Tab, Home / End move;  Enter or F2 edit (Enter toggles a tick box, as Space does);
   *   Delete or Backspace clears it, with ⌘ / Ctrl its row goes;  any letter starts its editor with that letter.
   */
  @E.untracked
  private editingKey(event: KeyboardEvent): boolean {
    const target = event.target as Element
    if (target.closest?.(`.${EDITOR}`)) return this.editorKey(event)
    const at = this.placeOf(target)
    if (!at) return false
    const type = this.columnTypes[at.column] ?? "text"
    const isMod = event.metaKey || event.ctrlKey
    const move = MOVES[event.key]
    const take = () => {
      event.preventDefault()
      return true
    }
    if (move) {
      this.moveCursor(at, isMod ? { rows: move.rows * 9999, columns: move.columns * 9999 } : move)
      return take()
    }
    if (event.key === UIT.Key.tab) {
      this.moveCursor(at, { rows: 0, columns: event.shiftKey ? -1 : 1 }, "wrap")
      return take()
    }
    if (event.key === UIT.Key.home || event.key === UIT.Key.end) {
      const last = this.dataColumns.length - 1
      const column = event.key === UIT.Key.home ? 0 : last
      this.setCursor({ row: isMod ? (event.key === UIT.Key.home ? 0 : this.sortedRows.length) : at.row, column })
      return take()
    }
    if (type === "yes-no" && (event.key === UIT.Key.enter || event.key === UIT.Key.space)) {
      this.toggle(at, event)
      return take()
    }
    if (event.key === UIT.Key.enter || event.key === "F2") {
      this.startEdit(at)
      return take()
    }
    if (event.key === UIT.Key.delete || event.key === UIT.Key.backspace) {
      if (isMod) this.removeRow(at.row, event)
      else this.clearCell(at, event)
      return take()
    }
    if (event.key.length === 1 && !isMod && !event.altKey && type !== "yes-no") {
      this.startEdit(at, event.key)
      return take()
    }
    return false
  }

  /** A key in the open editor:  see `editingKey()`. */
  private editorKey(event: KeyboardEvent): boolean {
    const at = this.editing?.at
    if (!at) return false
    if (event.key === UIT.Key.escape) {
      this.editing = undefined
      this.focusCursor()
    } else if (event.key === UIT.Key.enter) {
      this.commitEdit(event, { rows: event.shiftKey ? -1 : 1, columns: 0 })
    } else if (event.key === UIT.Key.tab) {
      this.commitEdit(event, { rows: 0, columns: event.shiftKey ? -1 : 1 }, "wrap")
    } else return false
    event.preventDefault()
    event.stopPropagation()
    return true
  }

  /** Open the editor of the cell at `at`, holding `typed` (a key pressed), else what the cell holds. */
  @E.untracked
  private startEdit(at: CellAt, typed?: string) {
    const column = this.dataColumns[at.column]
    if (!column || column.readOnly) return
    const type = this.columnTypes[at.column] ?? "text"
    if (type === "yes-no") return
    const draft = typed ?? TableEditing.draftFor(column, type, this.sortedRows[at.row]?.[column.key])
    this.cursor = at
    this.editing = { at, draft }
  }

  /**
   * Keep what the editor holds:  a `set` of its row, or an `add` from the empty last row, if it changed anything.
   * - Then the cursor moves by `move`, or stays, focused.
   */
  @E.untracked
  private commitEdit(originalEvent?: Event, move?: CursorMove, wrap?: "wrap") {
    const editing = this.editing
    if (!editing) return
    this.editing = undefined
    const { at, draft } = editing
    const column = this.dataColumns[at.column]
    if (column) {
      const type = this.columnTypes[at.column] ?? "text"
      const row = this.sortedRows[at.row]
      const was = row?.[column.key]
      const value = TableEditing.valueFrom(column, type, draft, was)
      if (row && !TableEditing.isSame(value, was))
        this.sendEdits([{ kind: "set", row, key: column.key, value, was }], originalEvent)
      else if (!row && !TableEditing.isSame(value, undefined))
        this.sendEdits([{ kind: "add", values: { [column.key]: value } }], originalEvent)
    }
    if (move) this.moveCursor(at, move, wrap)
    else this.focusCursor()
  }

  /** Turn the tick box at `at` over. */
  @E.untracked
  private toggle(at: CellAt, originalEvent: Event) {
    const column = this.dataColumns[at.column]
    this.setCursor(at)
    if (!column || column.readOnly) return
    const row = this.sortedRows[at.row]
    if (row)
      this.sendEdits(
        [{ kind: "set", row, key: column.key, value: !row[column.key], was: row[column.key] }],
        originalEvent
      )
    else this.sendEdits([{ kind: "add", values: { [column.key]: true } }], originalEvent)
  }

  /** Empty the cell at `at`:  a tick box unticked. */
  @E.untracked
  private clearCell(at: CellAt, originalEvent: Event) {
    const column = this.dataColumns[at.column]
    const row = this.sortedRows[at.row]
    if (!column || column.readOnly || !row) return
    const value = this.columnTypes[at.column] === "yes-no" ? false : undefined
    if (!TableEditing.isSame(value, row[column.key]))
      this.sendEdits([{ kind: "set", row, key: column.key, value, was: row[column.key] }], originalEvent)
  }

  /** Remove the row at `index` (as shown). */
  @E.untracked
  private removeRow(index: number, originalEvent: Event) {
    const row = this.sortedRows[index]
    if (row) this.sendEdits([{ kind: "remove", row }], originalEvent)
  }

  /** A pasted block of cells fills from the cursor, as one `ui-editing`. */
  @E.on("paste")
  protected onPaste(event: ClipboardEvent) {
    if (!this.isEditable || this.editing) return
    const at = this.placeOf(event.target)
    const text = event.clipboardData?.getData("text/plain")
    if (!at || !text) return
    event.preventDefault()
    const edits = TableEditing.pasteEdits({
      rows: this.sortedRows,
      columns: this.dataColumns,
      types: this.columnTypes,
      row: at.row,
      column: at.column,
      cells: TableEditing.cellsOf(text)
    })
    this.sendEdits(edits, event)
  }

  /**
   * Ask for `edits`:  `ui-editing` first;  not cancelled, the table shows them in new `rows`.
   * - Nothing to ask for:  nothing sent.
   */
  @E.untracked
  private sendEdits(edits: readonly UIT.TableEdit[], originalEvent?: Event) {
    if (!edits.length) return
    const detail: UIT.TableEditDetail = { edits, originalEvent }
    if (this.send("ui-editing", detail)) this.rows = TableEditing.applied(this.dataRows ?? [], edits)
  }

  /** Move the cursor from `at` by `move`, kept inside the table (the empty last row counts);  `wrap`:  Tab's way. */
  @E.untracked
  private moveCursor(at: CellAt, move: CursorMove, wrap?: "wrap") {
    const lastRow = this.sortedRows.length
    const lastColumn = this.dataColumns.length - 1
    let row = at.row + move.rows
    let column = at.column + move.columns
    if (wrap && column > lastColumn && row < lastRow) [row, column] = [row + 1, 0]
    if (wrap && column < 0 && row > 0) [row, column] = [row - 1, lastColumn]
    this.setCursor({ row: clamp(row, 0, lastRow), column: clamp(column, 0, lastColumn) })
  }

  /** Put the cursor at `at`, and focus its cell. */
  @E.untracked
  private setCursor(at: CellAt) {
    this.drawRow(at.row)
    this.cursor = at
    this.focusCursor()
  }

  /** Focus the cursor's cell, once it's drawn. */
  @E.untracked
  private focusCursor() {
    E.afterSolidUpdate(() => {
      const at = this.cursor
      if (at) this.cellAt(at)?.focus()
    })
  }

  ////////////////
  // ## The scroller
  ////////////////

  /** Shadow scroller's classes, e.g. `resizable short scrolling scroller`. */
  @E.derived
  get scrollerClasses(): string {
    return TableGrammar.scroller((name) => this.scrollerValue(name))
  }

  /** Scrolling or overflowing:  the scroller's height is capped, and it scrolls. */
  get scrollerScrolls(): boolean {
    return TableGrammar.scrolls((name) => this.scrollerValue(name))
  }

  /** The scroller scrolls, either way:  a focusable, named region. */
  get isScrollRegion(): boolean {
    return this.scrollerScrolls || this.isTooWide
  }

  /** The shadow scroller, once drawn (from its `ref`). */
  private scroller: HTMLDivElement | undefined

  /**
   * The table is wider than the scroller:  it doesn't stack, and the scroller scrolls it sideways (`SIDEWAYS`).
   * - Measured (`onReadyToMeasure()`):  whether a table stacks is the sheet's call
   *   (viewport, its own width, tokens), so the width it ends up is the one fact to go on.
   */
  @E.state accessor isTooWide = false

  /**
   * SIDE EFFECT:  follows the sizes of the scroller and the managed table, once drawn;  the cleanup stops.
   * - Never on a server (an effect's apply):  a static page's wide table spills, as before.
   */
  @E.onChange("isReady", "managedTable")
  protected onReadyToMeasure(isReady: boolean, table: HTMLTableElement | undefined) {
    const box = this.scroller
    if (!isReady || !box) return
    const resizes = new ResizeObserver(() => this.measureWidth())
    resizes.observe(box)
    if (table) resizes.observe(table)
    this.measureWidth()
    return () => resizes.disconnect()
  }

  /** Is the table wider than the scroller?  A pixel of slack:  fractional widths round either way. */
  private measureWidth() {
    const box = this.scroller
    if (box) this.isTooWide = box.scrollWidth > box.clientWidth + 1
  }

  /**
   * Name of the scroller region:  the DOM element's `aria-label`, else the table's `<caption>` text,
   * else the table's own `aria-label`, else the `label` text.
   * - Read in `render()`:  the translated text needs the loaded runtime;
   *   follows `tableRevision` (a new caption or `aria-label`).
   * - The table's own name before `label`:  several tables on a page, each its own region, need names apart.
   */
  private get regionLabel(): string {
    void this.tableRevision
    const table = this.managedTable
    const caption = table?.caption?.textContent?.trim()
    return this.attributes["aria-label"] ?? (caption || table?.ariaLabel || this.translationForKey("label"))
  }

  // `attached` (any edge), `attached-top`, `attached-bottom`, from `attach`:
  // the DOM element carries the table's outer margin, so it mirrors the attached scroller's
  // (`UITable.css`:  inside a size container a margin never collapses with the content above).

  /** Attached on any edge:  `:state(attached)`. */
  @E.cssState("attached")
  get isAttached(): boolean {
    return !!this.scrollerValue(ATTACH)
  }

  /** Attached at the top:  `:state(attached-top)`. */
  @E.cssState("attached-top")
  get isAttachedTop(): boolean {
    return this.scrollerValue(ATTACH) === UIT.TOP
  }

  /** Attached at the bottom:  `:state(attached-bottom)`. */
  @E.cssState("attached-bottom")
  get isAttachedBottom(): boolean {
    return this.scrollerValue(ATTACH) === UIT.BOTTOM
  }

  /** Converted value of scroller attribute `name` (`TableGrammar.scroller()`'s). */
  private scrollerValue(name: string): unknown {
    return this.classValue(name as E.AttributeName<typeof tableVocabulary>)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UITable extends E.AttributeValues<typeof tableVocabulary> {}

/** What `decorateHeaders()` decorates for. */
type HeaderSort = {
  /** the managed table (or, in rows mode, the DOM element), if any */
  table: Element | undefined
  /** `sortable` */
  isSortable: boolean
  /** sorted column, if any */
  column: number | undefined
  /** its direction, if any */
  direction: UIT.TableSortDirection | undefined
}

/** Tables the element rendered itself (data mode):  never mistaken for an author's. */
const GENERATED = new WeakSet<HTMLTableElement>()

/** Prefix of the class `stack-by` adds to the table:  `stack-by-container`, `stack-by-viewport`. */
const STACK_BY_CLASS = "stack-by-"

/** The scroller's class while the table is too wide for it (`isTooWide`):  `UITable.css` scrolls it sideways. */
const SIDEWAYS = "sideways"

/** The caption box's class. */
const CAPTION = "caption"

/** The rows-mode grid's column count, on the scroller. */
const COLUMNS_TOKEN = "--_table-columns"

/** Rows-mode attributes that move columns or headers:  a row's `header` / `footer`, a cell's `span`. */
const ROW_ATTRIBUTES = ["header", "footer", "span"]

/** A cell of an editable table, by its row (as shown;  `sortedRows.length` is the empty last row) and column. */
type CellAt = {
  /** row, as shown */
  row: number
  /** column */
  column: number
}

/** The cell being edited, and its editor's text. */
type CellDraft = {
  /** where */
  at: CellAt
  /** what the editor holds:  a choice's place in `choices` for a `choice` or `link` */
  draft: string
}

/** How far the cursor moves. */
type CursorMove = {
  /** rows down (negative:  up) */
  rows: number
  /** columns on (negative:  back) */
  columns: number
}

/** What `editableCell()` draws. */
type EditableCell = {
  /** the row;  none in the empty last row */
  row: UIT.TableRow | undefined
  /** its place, as shown */
  rowIndex: () => number
  /** the column */
  column: UIT.TableColumn
  /** its place */
  columnIndex: () => number
}

/** The arrow keys' moves. */
const MOVES: Record<string, CursorMove | undefined> = {
  [UIT.Key.arrowUp]: { rows: -1, columns: 0 },
  [UIT.Key.arrowDown]: { rows: 1, columns: 0 },
  [UIT.Key.arrowLeft]: { rows: 0, columns: -1 },
  [UIT.Key.arrowRight]: { rows: 0, columns: 1 }
}

/** `n`, kept between `low` and `high`. */
function clamp(n: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, n))
}

/** An editable table's empty last row's class. */
const NEW_ROW = "new-row"
/** A long table's spacer rows' class:  standing in for the rows not drawn. */
const SPACER = "spacer"

/** How many rows a body has before it's drawn in a window. */
const WINDOW_FROM = 200
/** How many rows a window draws before it's measured. */
const WINDOW_FIRST_SIZE = 60
/** How many rows a window draws above and below what's in view. */
const WINDOW_EXTRA = 15
/** A row's height before one is measured, in pixels. */
const DEFAULT_ROW_PX = 32

/** The cursor cell's class. */
const CURSOR = "cursor"

/** A cell's editor's class. */
const EDITOR = "cell-editor"

/** A `yes-no` cell's tick box's class. */
const TICK = "cell-tick"

/** A row's delete button's class. */
const DELETE_ROW = "delete-row"
