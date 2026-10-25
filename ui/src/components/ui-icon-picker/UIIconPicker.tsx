import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell-ui/core"
import { F } from "spell-ui/forms"
import { IconCatalog, type IconChoice, type IconGroup, type IconSearchWords } from "./IconCatalog"
import { iconPickerVocabulary } from "./UIIconPicker.en"
import { IconPickerFallback } from "./UIIconPicker.fallback"

import iconPickerCSS from "./UIIconPicker.css?inline"

/****************
 * ### `UIIconPicker`
 * The component behind `<ui-icon-picker>`:  a form control whose value is an icon's NAME.
 *
 * - Closed:  a field in an input's look, a `<button part="field">` showing the chosen glyph and its name
 *   (or the placeholder, light and italic:  "none" by default), with a caret.
 * - Open:  a panel under the field (a popover in the top layer, anchored to it, never taller than the window's room:
 *   its grid scrolls), with:
 *   - a search box, focused, that filters as you type, over the icons' names AND Font Awesome's search terms
 *     (`IconCatalog`:  `mail` finds `envelope`)
 *   - a grid of glyphs, the first one "none" (a circle with a slash), which clears the value;
 *     not offered while `required`
 *   - each glyph's name as its tooltip (`title`)
 * - Its icons are every icon the picker's icon packs know (its nearest `<ui-root icons>`'s, else the page's),
 *   one per glyph (`IconCatalog`).
 *   - With no search:  in groups, Font Awesome's own categories (Animals, Arrows ...), each under a heading,
 *     then "Other";  the heading of the group at the grid's top stays stuck there as it scrolls.
 *     Until the categories have loaded (as it first opens), one list, A-Z.
 *   - A search:  one list, the best matches first.
 *   - The grid draws only the rows in view, and a few either side (`gridWindow`):
 *     each glyph is an SVG file of its own, and the default packs hold ~1,800.
 *     The rows box inside the grid is as tall as every row, so it scrolls the whole list.
 *     A heading takes a row of its own, as tall as a row of glyphs, so every row is the same height.
 * - Opening shows the chosen icon, highlighted, its row scrolled into the middle.
 * - Keyboard, with the focus in the search box (an APG combobox over a listbox):
 *   - arrows move the highlight through the grid, Enter picks it
 *   - Escape closes, back on the field;  Tab closes and moves on
 *   - on the field:  Enter, Space, Down or Up open it;  typing a letter opens it searching for that letter
 * - Picking sends the cancelable `ui-changing` first (a handler that sets `el.value` again wins), then `ui-changed`.
 *   Then the panel closes, the focus back on the field.
 * - `value` is controlled (`@controlled`);  the ATTRIBUTE is the starting (and reset) value.
 * - `readonly`:  focusable, but never opens.  `disabled`:  a disabled field, out of the tab order and the form.
 * - A form control:  it submits the icon's name while there is one;  `required` needs one.
 *   Named by the DOM element's `<label for>` / `aria-label` (`ControlLabels`).
 * - Draws its glyphs itself (`IconGlyph`, as `<ui-icon>` does), not as `<ui-icon>` elements:
 *   a grid of custom elements, each with a shadow root, for what is one `<svg>` each.
 ****************/
export class UIIconPicker extends F.FormComponent<typeof iconPickerVocabulary> {
  @E.proto static vocabulary = iconPickerVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { iconPicker: iconPickerCSS },
    cssStates: ["fluid"],
    Fallback: IconPickerFallback
  } satisfies Partial<E.ElementSetup>

  /** Shows as invalid only once a person has interacted. */
  @E.proto static invalidShows: E.InvalidTiming = "once touched"

  ////////////////
  // ## The value
  ////////////////

  /** `value`:  set by the page, or picked;  `""` (none) until either. */
  @E.controlled("value") accessor value: string | undefined = ""

  /** The chosen icon's name, trimmed;  `""` for none. */
  get iconName(): string {
    return typeof this.value === "string" ? this.value.trim() : ""
  }

  /**
   * A person picked `name` (`""`:  none):  send the cancelable `ui-changing`, then set the DOM element's property,
   * unless a handler set it first;  then `ui-changed`, once it's in.  Then close, back on the field.
   * - Returns true when applied.
   */
  @E.untracked
  choose(name: string, originalEvent?: Event): boolean {
    this.isTouched = true
    const detail = { value: name, originalEvent }
    const applied = this.requestChange("value", name, () => this.send("ui-changing", detail))
    // Then the -ed half, once the value is in (epic elemental-spell P9:  a form reads `ui-changed`)
    if (applied) this.send("ui-changed", detail)
    this.close({ refocus: true })
    return applied
  }

  /** What the field says while no icon is chosen:  `placeholder`, else "none". */
  get placeholderText(): string {
    return this.placeholder ?? this.translationForKey("noIcon")
  }

  /** The chosen icon's glyph, for the field. */
  readonly chosenGlyph = new E.IconGlyph({ owner: this, name: () => this.iconName || undefined })

  ////////////////
  // ## Form
  ////////////////

  /** The icon's name while there is one;  `null` (`setFormValue()`'s "no value") for none. */
  get formValue(): E.FieldValue {
    return this.iconName || null
  }

  /** Back to the `value` ATTRIBUTE. */
  onFormReset() {
    this.value = this.attributes.value ?? ""
  }

  onFormStateRestore(state: File | string | FormData | null) {
    this.value = typeof state === "string" ? state : ""
  }

  protected get validationLabel(): string | undefined {
    return this.labels.accessibleName ?? this.name
  }

  protected get validationAnchor(): HTMLElement | undefined {
    return this.field
  }

  /** A click aimed at the DOM element itself (its `<label for>`) focuses the field. */
  protected activateControl() {
    this.field?.focus()
  }

  ////////////////
  // ## Open
  ////////////////

  /** The panel is open:  `:state(open)`. */
  @E.cssState("open")
  @E.state
  accessor isOpen = false

  /** This element's `UI.overlays` entry:  an outside click or Escape closes the panel. */
  private readonly overlay: E.OverlayEntry = {
    element: this.domElement,
    kind: "popover",
    restoreFocus: false,
    onDismiss: (reason) => {
      this.close({ refocus: reason === ESCAPE_REASON })
    }
  }

  /**
   * Open the panel, searching for `query`:  its search box empty, unless a letter typed on the field opened it.
   * - Not while disabled or readonly.
   * - Returns true when it opened.
   */
  @E.untracked
  open(query = ""): boolean {
    if (this.isOpen || this.isDisabled || this.isReadOnly) return false
    this.query = query
    this.highlighted = -1
    this.scrollTop = 0
    this.isOpen = true
    return true
  }

  /**
   * Close the panel;  `refocus`:  the focus back on the field (a pick, Escape).
   * - Returns true when it closed.
   */
  @E.untracked
  close({ refocus = false }: { refocus?: boolean } = {}): boolean {
    if (!this.isOpen) return false
    this.isOpen = false
    if (refocus) this.field?.focus()
    return true
  }

  /**
   * The popover and the overlay entry while open AND connected, once rendered;  the search box focused,
   * the grid measured.
   * - `isConnected`:  a removed element keeps its state (`keepAlive`), but the page must not keep its overlay entry.
   */
  @E.onChange("isOpen", "isConnected", "isReady")
  protected onOpenChanged(isOpen: boolean, isConnected: boolean, isReady: boolean) {
    const { panel, search } = this
    if (!isOpen || !isConnected || !isReady || !panel) return undefined
    if (!panel.matches(":popover-open")) panel.showPopover()
    UI.overlays.open(this.overlay)
    this.measureGrid()
    if (search) {
      search.value = this.query
      search.focus()
    }
    return () => {
      if (panel.matches(":popover-open")) panel.hidePopover()
      UI.overlays.close(this.overlay)
    }
  }

  ////////////////
  // ## The icons
  ////////////////

  /** Every icon the picker's packs offer, A-Z;  `undefined` until they've loaded (`IconCatalog`). */
  @E.state accessor catalog: readonly IconChoice[] | undefined = undefined

  /** Font Awesome's search terms and categories, once loaded as the panel first opened. */
  @E.state accessor searchWords: IconSearchWords | undefined = undefined

  /** What's typed in the search box. */
  @E.state accessor query = ""

  /** The icons that match the search, best first;  every icon for none. */
  @E.derived({ equals: E.isSameList })
  get matches(): readonly IconChoice[] {
    return IconCatalog.matches(this.catalog ?? [], this.query, this.searchWords?.terms)
  }

  /**
   * The grid's groups, Font Awesome's categories:  with no search, once they've loaded;
   * else `undefined`, one list.
   */
  @E.derived
  get groups(): readonly IconGroup[] | undefined {
    const categories = this.searchWords?.categories
    if (!categories?.length || E.IconName.normalize(this.query)) return undefined
    return IconCatalog.groupsOf(this.catalog ?? [], categories)
  }

  /**
   * Every cell of the grid:  "none" first (`NONE_CELL`), unless `required`, then each group's icons, or the matches.
   * - A glyph in several groups is here once for each.
   */
  @E.derived({ equals: E.isSameList })
  get cells(): readonly IconChoice[] {
    const shown = this.groups ? this.groups.flatMap((group) => group.choices) : this.matches
    return this.required ? shown : [NONE_CELL, ...shown]
  }

  /** Cells before the matches:  1 for "none", else 0. */
  get firstMatchCell(): number {
    return this.required ? 0 : 1
  }

  /**
   * The grid's rows, top to bottom, laid out for its columns:
   * - one list:  the cells, a row of `columns` at a time
   * - in groups:  "none" alone, then each group's heading, and its cells a row at a time
   */
  @E.derived
  get rows(): readonly GridRow[] {
    const { columns } = this.gridLayout
    const groups = this.groups
    if (!groups) return cellRows(0, this.cells.length)
    const rows = cellRows(0, this.firstMatchCell)
    let start = this.firstMatchCell
    for (const group of groups) {
      const end = start + group.choices.length
      rows.push({ group, start, end: start }, ...cellRows(start, end))
      start = end
    }
    return rows

    /** Rows of cells `start` up to (not including) `end`, `columns` a row. */
    function cellRows(start: number, end: number): GridRow[] {
      const made: GridRow[] = []
      for (let at = start; at < end; at += columns) made.push({ start: at, end: Math.min(end, at + columns) })
      return made
    }
  }

  /**
   * Load the icons each time the panel opens (the page's packs may have changed), then show the chosen one;
   * and Font Awesome's search words, the first time:  its categories group the grid at once.
   * - NEVER throws:  icons that won't load leave the grid with "none" alone.
   */
  @E.onChange("isOpen", "isReady")
  protected onIconsNeeded(isOpen: boolean, isReady: boolean) {
    if (!isOpen || !isReady || isServer) return undefined
    let isCurrent = true
    void UI.load()
      .then((ui) => IconCatalog.choicesFor(E.IconGlyph.packsFor(this.domElement, ui.icons)))
      .then((choices) => {
        if (!isCurrent) return
        this.catalog = choices
        this.highlightChosen()
      })
      .catch((error: unknown) => E.Warnings.warn("<ui-icon-picker>", "can't list the page's icons:", error))
    if (!this.searchWords) {
      void IconCatalog.searchWords().then((words) => {
        if (isCurrent) this.onSearchWordsLoaded(words)
      })
    }
    return () => {
      isCurrent = false
    }
  }

  /**
   * The search words are in:  the grid takes its groups (or a search more matches),
   * and the highlighted icon keeps its highlight, in its new place.
   */
  @E.untracked
  private onSearchWordsLoaded(words: IconSearchWords) {
    const highlighted = this.cells[this.highlighted]
    this.searchWords = words
    const at = highlighted ? this.cells.indexOf(highlighted) : -1
    if (at < 0) return
    this.highlighted = at
    E.afterSolidUpdate(() => this.reveal(at, "center"))
  }

  ////////////////
  // ## The grid's window
  //
  // Only the rows in view are drawn, a few either side:  the rows above and below are the grid's padding.
  ////////////////

  /** The grid's layout, measured as it opens:  cells a row, a row's height (its gap included), rows in view. */
  @E.state accessor gridLayout: GridLayout = UNMEASURED

  /** How far the grid is scrolled (px), as its `scroll` events say. */
  @E.state accessor scrollTop = 0

  /** The rows drawn:  `first` up to (not including) `end`, and how many rows the whole grid has. */
  get gridWindow(): { first: number; end: number; rows: number } {
    const { columns, rowHeight, rowsInView } = this.gridLayout
    const rows = this.rows.length
    if (!rowHeight) return { first: 0, end: Math.min(rows, Math.ceil(FIRST_DRAW / columns)), rows }
    const first = Math.max(0, Math.floor(this.scrollTop / rowHeight) - SPARE_ROWS)
    return { first, end: Math.min(rows, first + rowsInView + 2 * SPARE_ROWS), rows }
  }

  /** The rows drawn (`gridWindow`). */
  @E.derived({ equals: E.isSameList })
  get drawnRows(): readonly GridRow[] {
    const { first, end } = this.gridWindow
    return this.rows.slice(first, end)
  }

  /**
   * The heading stuck at the grid's top:  the group of the row there, once its own heading has reached the top;
   * `undefined` above the first heading, or in one list.
   * - `offset` (px, 0 or less):  the next group's heading, coming up under it, pushes it up and out.
   */
  get stuckHeading(): { group: IconGroup; offset: number } | undefined {
    const { rowHeight } = this.gridLayout
    if (!this.groups || !rowHeight) return undefined
    const rows = this.rows
    const top = Math.floor(this.scrollTop / rowHeight)
    const group = rows.slice(0, top + 1).findLast((row) => row.group)?.group
    if (!group) return undefined
    // how far below the grid's top the next heading starts (px)
    const next = rows.findIndex((row, at) => at > top && row.group)
    const below = next < 0 ? rowHeight : next * rowHeight - this.scrollTop
    return { group, offset: Math.min(0, below - rowHeight) }
  }

  /**
   * The rows box's size:  every row's height, the rows above those drawn as its top padding (px).
   * - Not the scroller's own padding:  padding never shrinks, so it would grow the scroller past the panel.
   * - Nothing before the grid is measured.
   */
  get rowsBoxSize(): JSX.CSSProperties | undefined {
    const { first, rows } = this.gridWindow
    const { rowHeight } = this.gridLayout
    if (!rowHeight) return undefined
    return { "padding-block-start": `${first * rowHeight}px`, "block-size": `${rows * rowHeight}px` }
  }

  /**
   * Measure the grid as laid out:  its columns and its rows' height.
   * - Rows in view:  as many as the WINDOW holds, as it opens.
   *   Its own box isn't settled yet (it grows as the icons arrive), so the first scroll measures it (`onGridScroll`).
   * - SIDE EFFECT:  reads layout.
   */
  @E.untracked
  private measureGrid() {
    const { rowsBox } = this
    if (!rowsBox) return
    const style = getComputedStyle(rowsBox)
    const template = style.gridTemplateColumns
    const columns = Math.max(1, template === "none" ? 1 : template.split(" ").length)
    const rowHeight = (Number.parseFloat(style.gridAutoRows) || 0) + (Number.parseFloat(style.rowGap) || 0)
    const rowsInView = rowHeight ? Math.ceil(window.innerHeight / rowHeight) : 0
    this.gridLayout = { columns, rowHeight, rowsInView }
  }

  /**
   * Scroll cell `cell`'s row into view:  `"nearest"` just enough, `"center"` into the middle.
   * - SIDE EFFECT:  scrolls the grid.
   */
  @E.untracked
  private reveal(cell: number, block: "nearest" | "center" = "nearest") {
    const grid = this.grid
    const { rowHeight } = this.gridLayout
    if (!grid || !rowHeight) return
    const top = this.rowOf(cell) * rowHeight
    // in groups, the stuck heading covers the top row
    const covered = this.groups ? rowHeight : 0
    if (block === "center") grid.scrollTop = top - (grid.clientHeight - rowHeight) / 2
    else if (top < grid.scrollTop + covered) grid.scrollTop = top - covered
    else if (top + rowHeight > grid.scrollTop + grid.clientHeight) grid.scrollTop = top + rowHeight - grid.clientHeight
    // now, not on the `scroll` event:  the cell must be drawn for `aria-activedescendant`
    this.scrollTop = grid.scrollTop
  }

  ////////////////
  // ## The highlight
  ////////////////

  /** The highlighted cell, by its place in the grid ("none" is 0 when offered);  `-1` for none. */
  @E.state accessor highlighted = -1

  /** Highlight the chosen icon, its row in the middle;  with a search, or none chosen, the first cell. */
  @E.untracked
  private highlightChosen() {
    const name = this.iconName
    const at = name && !this.query ? this.cells.findIndex((choice) => choice.names.includes(name)) : -1
    if (at < 0) {
      this.highlighted = this.query ? this.firstMatchCell : 0
      return
    }
    this.highlighted = at
    // once the grid's padding has grown to hold every row:  until then it can't scroll that far
    E.afterSolidUpdate(() => this.reveal(at, "center"))
  }

  /** The row holding cell `cell` (`rows`);  0 for none. */
  private rowOf(cell: number): number {
    const at = this.rows.findIndex((row) => !row.group && row.start <= cell && cell < row.end)
    return Math.max(0, at)
  }

  /**
   * The cell `rowsDown` rows of cells below cell `cell` (above, when negative), headings skipped:
   * in the same column, else the row's last;  `cell` itself past the first or last row.
   */
  private cellBelow(cell: number, rowsDown: number): number {
    const rows = this.rows
    const from = this.rowOf(cell)
    if (!rows[from]) return cell
    const column = cell - rows[from].start
    for (let at = from + rowsDown; at >= 0 && at < rows.length; at += rowsDown) {
      const row = rows[at]
      if (!row.group) return Math.min(row.start + column, row.end - 1)
    }
    return cell
  }

  /** Move the highlight to cell `cell` (kept in the grid), and its row into view. */
  @E.untracked
  private highlight(cell: number) {
    const last = this.cells.length - 1
    if (last < 0) return
    this.highlighted = E.clamp(cell, 0, last)
    this.reveal(this.highlighted)
  }

  ////////////////
  // ## Names
  ////////////////

  /** What names the field and the grid:  the DOM element's `<label for>` / `aria-label`. */
  private get accessibleName(): string | undefined {
    return this.labels.accessibleName
  }

  /** The field's accessible name:  its label, then what it shows (`Icon, star`);  its content alone without one. */
  private get fieldLabel(): string | undefined {
    const name = this.accessibleName
    return name ? `${name}, ${this.iconName || this.placeholderText}` : undefined
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Ids and the anchor name, from `UI.ids` once rendering. */
  private ids = { panel: "", grid: "", anchor: "" }

  /** The field (the closed control). */
  private field?: HTMLButtonElement

  /** The panel popover. */
  private panel?: HTMLElement

  /** The search box. */
  private search?: HTMLInputElement

  /** The grid:  the listbox, which scrolls. */
  private grid?: HTMLElement

  /** The grid's rows box, inside it:  as tall as every row, the cells in view laid out in it. */
  private rowsBox?: HTMLElement

  render(): JSX.Element {
    this.ids = { panel: UI.ids.next(ID_PREFIX), grid: UI.ids.next(ID_PREFIX), anchor: `--${UI.ids.next(ID_PREFIX)}` }
    const anchor = { [ANCHOR_PROPERTY]: this.ids.anchor }
    return (
      <>
        <button
          ref={(element) => (this.field = element)}
          type="button"
          class={this.rootClass}
          part={this.partForName("field")}
          style={anchor}
          disabled={this.isDisabled}
          aria-haspopup="listbox"
          aria-expanded={this.isOpen ? "true" : "false"}
          aria-controls={this.ids.panel}
          aria-label={this.fieldLabel}
          aria-invalid={this.isShownInvalid ? "true" : undefined}
          aria-required={this.required ? "true" : undefined}
          onClick={this.onFieldClick}
          onKeyDown={this.onFieldKeyDown}
        >
          <Show when={this.iconName}>
            <span class={GLYPH} part={this.partForName("glyph")} aria-hidden="true">
              {this.chosenGlyph.svg}
            </span>
          </Show>
          <span class={[UIT.TEXT, { [PLACEHOLDER]: !this.iconName }]} part={this.partForName("text")}>
            {this.iconName || this.placeholderText}
          </span>
        </button>
        {this.panelBox(anchor)}
      </>
    )
  }

  /** The panel:  the search box over the grid. */
  private panelBox(anchor: JSX.CSSProperties): JSX.Element {
    return (
      <div
        ref={(element) => (this.panel = element)}
        id={this.ids.panel}
        class={PANEL}
        part={this.partForName("panel")}
        style={anchor}
        // a server render can't show a popover:  the panel stays shut
        popover={isServer ? undefined : "manual"}
        onMouseDown={this.onPanelMouseDown}
      >
        <input
          ref={(element) => (this.search = element)}
          type="search"
          class={SEARCH}
          part={this.partForName("search")}
          role="combobox"
          placeholder={this.translationForKey("searchIcons")}
          aria-label={this.translationForKey("searchIcons")}
          aria-expanded={this.isOpen ? "true" : "false"}
          aria-controls={this.ids.grid}
          aria-autocomplete="list"
          aria-activedescendant={this.highlighted >= 0 ? this.cellId(this.highlighted) : undefined}
          autocomplete="off"
          spellcheck={false}
          onInput={this.onSearchInput}
          onKeyDown={this.onSearchKeyDown}
        />
        <div
          ref={(element) => (this.grid = element)}
          id={this.ids.grid}
          class={GRID}
          part={this.partForName("grid")}
          role="listbox"
          aria-label={this.accessibleName ?? this.translationForKey("searchIcons")}
          onScroll={this.onGridScroll}
        >
          <Show when={this.isOpen && this.stuckHeading}>
            {(stuck) => (
              <div
                class={[HEADING, STUCK]}
                part={this.partForName("heading")}
                style={{ translate: `0 ${stuck().offset}px` }}
                aria-hidden="true"
              >
                <span>{this.headingOf(stuck().group)}</span>
              </div>
            )}
          </Show>
          <div ref={(element) => (this.rowsBox = element)} class={ROWS} role="none" style={this.rowsBoxSize}>
            <Show when={this.isOpen}>
              <For each={this.drawnRows}>{(row) => this.row(row)}</For>
            </Show>
          </div>
        </div>
        <Show when={this.isOpen && this.catalog && !this.matches.length}>
          <div class={UIT.MESSAGE} role="status">
            {this.translationForKey("noIconsMatch")}
          </div>
        </Show>
      </div>
    )
  }

  /**
   * One row of the grid:  a group's heading, or its cells.
   * - The heading is hidden from assistive tech:  a listbox holds only options, and each option's name says what it is.
   */
  private row(row: GridRow): JSX.Element {
    const { group } = row
    if (group) {
      return (
        <div class={HEADING} part={this.partForName("heading")} aria-hidden="true">
          <span>{this.headingOf(group)}</span>
        </div>
      )
    }
    return (
      <For each={this.cells.slice(row.start, row.end)}>{(choice, index) => this.cell(choice, row.start + index())}</For>
    )
  }

  /** What group `group`'s heading says:  its category's label, else "Other". */
  private headingOf(group: IconGroup): string {
    return group.label ?? this.translationForKey("otherIcons")
  }

  /** Cell `cell`:  a glyph, its name its tooltip;  or "none", a circle with a slash. */
  private cell(choice: IconChoice, cell: number): JSX.Element {
    const isNone = choice === NONE_CELL
    const name = isNone ? this.translationForKey("noIcon") : choice.name
    const glyph = isNone ? undefined : new E.IconGlyph({ owner: this, name: () => choice.name })
    const isChosen = () => (isNone ? !this.iconName : !!this.iconName && choice.names.includes(this.iconName))
    return (
      <div
        id={this.cellId(cell)}
        class={[CELL, { [NONE]: isNone, [UIT.ACTIVE]: isChosen(), [UIT.SELECTED]: this.highlighted === cell }]}
        part={this.partForName("cell")}
        role="option"
        aria-selected={isChosen() ? "true" : "false"}
        aria-label={name}
        title={name}
        onClick={(event) => this.choose(isNone ? "" : choice.name, event)}
        onPointerMove={() => this.hover(cell)}
      >
        {glyph ? glyph.svg : UIIconPicker.noneGlyph()}
      </div>
    )
  }

  /** DOM id of grid cell `cell`. */
  private cellId(cell: number): string {
    return `${this.ids.grid}-${cell}`
  }

  ////////////////
  // ## Handlers
  ////////////////

  /** The field opens and closes the panel. */
  @E.untracked
  private readonly onFieldClick = () => {
    if (this.isOpen) this.close()
    else this.open()
  }

  /** Down / Up open the panel (Enter and Space click the field);  a letter opens it searching for that letter. */
  @E.untracked
  private readonly onFieldKeyDown = (event: KeyboardEvent) => {
    if (this.isOpen || event.altKey || event.ctrlKey || event.metaKey) return
    const { key } = event
    if (key === UIT.Key.arrowDown || key === UIT.Key.arrowUp) {
      event.preventDefault()
      this.open()
    } else if (key.length === 1 && key !== UIT.Key.space) {
      event.preventDefault()
      this.open(key)
    }
  }

  /** A click in the panel keeps the focus in the search box:  only the box itself takes it. */
  private readonly onPanelMouseDown = (event: MouseEvent) => {
    if (event.target !== this.search) event.preventDefault()
  }

  /** Typing filters the grid, from its top, the best match highlighted. */
  private readonly onSearchInput = (event: Event) => {
    this.query = (event.currentTarget as HTMLInputElement).value
    this.highlighted = this.query ? this.firstMatchCell : 0
    if (this.grid) this.grid.scrollTop = 0
    this.scrollTop = 0
  }

  /** Arrows move through the grid, Enter picks, Escape closes, Tab closes and moves on. */
  @E.untracked
  private readonly onSearchKeyDown = (event: KeyboardEvent) => {
    const { key } = event
    if (key === UIT.Key.escape) {
      event.preventDefault()
      event.stopPropagation()
      this.close({ refocus: true })
      return
    }
    if (key === UIT.Key.tab) {
      this.close()
      return
    }
    if (key === UIT.Key.enter) {
      event.preventDefault()
      this.pickHighlighted(event)
      return
    }
    const next = this.cellForArrow(key)
    if (next === undefined || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    this.highlight(next)
  }

  /**
   * Where an arrow key moves the highlight:  a cell across, or a row of cells down or up;
   * `undefined` for another key.
   */
  private cellForArrow(key: string): number | undefined {
    const cell = this.highlighted
    const across = getComputedStyle(this.domElement).direction === "rtl" ? -1 : 1
    let next: number | undefined
    if (key === UIT.Key.arrowRight) next = cell + across
    else if (key === UIT.Key.arrowLeft) next = cell - across
    else if (key === UIT.Key.arrowDown) next = this.cellBelow(cell, 1)
    else if (key === UIT.Key.arrowUp) next = this.cellBelow(cell, -1)
    // nothing highlighted yet:  any arrow starts at the first cell
    return next === undefined || cell >= 0 ? next : 0
  }

  /** Pick the highlighted cell, if there is one. */
  private pickHighlighted(originalEvent: Event) {
    const choice = this.cells[this.highlighted]
    if (choice) this.choose(choice === NONE_CELL ? "" : choice.name, originalEvent)
  }

  /** The pointer over cell `cell` highlights it. */
  @E.untracked
  private hover(cell: number) {
    if (this.highlighted !== cell) this.highlighted = cell
  }

  /** The grid scrolled:  draw the rows now in view, as many as its box holds now it's settled. */
  @E.untracked
  private readonly onGridScroll = () => {
    const grid = this.grid
    if (!grid) return
    this.scrollTop = grid.scrollTop
    const layout = this.gridLayout
    const rowsInView = layout.rowHeight ? Math.ceil(grid.clientHeight / layout.rowHeight) + 1 : 0
    if (rowsInView && rowsInView !== layout.rowsInView) this.gridLayout = { ...layout, rowsInView }
  }

  ////////////////
  // ## Statics
  ////////////////

  /**
   * The "none" glyph:  a circle with a slash, drawn here, not from a pack, so it shows whatever packs the page has.
   * - STATIC:  the same for every picker.
   */
  private static noneGlyph(): JSX.Element {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" />
        <path d="M3.6 12.4 12.4 3.6" />
      </svg>
    )
  }
}

/**
 * The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`).
 * - Minus `value`:  the `@controlled` accessor of that name wins.
 */
export interface UIIconPicker extends Omit<E.AttributeValues<typeof iconPickerVocabulary>, "value"> {}

/** The grid's layout, as `measureGrid()` reads it. */
type GridLayout = {
  /** cells a row */
  readonly columns: number
  /** a row's height, its gap included (px);  0 until measured */
  readonly rowHeight: number
  /** rows the grid's box shows at once, one more for a part-shown row;  the window's rows until it scrolls */
  readonly rowsInView: number
}

/**
 * One row of the grid (`rows`):  a group's heading, or cells `start` up to (not including) `end` of `cells`.
 * - A heading's `start` and `end` are both its group's first cell.
 */
type GridRow = {
  /** the group this row is the heading of;  absent for a row of cells */
  readonly group?: IconGroup
  /** its first cell, in `cells` */
  readonly start: number
  /** the cell after its last */
  readonly end: number
}

/** The grid before it's measured:  `FIRST_DRAW` cells are drawn. */
const UNMEASURED: GridLayout = { columns: 1, rowHeight: 0, rowsInView: 0 }

/** The "none" cell's place in `cells`:  one object, told apart by identity. */
const NONE_CELL: IconChoice = { name: "", names: [], file: "" }

/** How many cells the grid draws before it's measured. */
const FIRST_DRAW = 60

/** Rows drawn beyond those in view, above and below:  so a fast scroll rarely shows an empty row. */
const SPARE_ROWS = 3

/** `UI.ids` prefix of the panel's, the grid's and the cells' ids, and the anchor name. */
const ID_PREFIX = "ui-icon-picker"

/** Private custom property the field's anchor name rides in, to the field and the panel. */
const ANCHOR_PROPERTY = "--_ui-icon-picker-anchor"

/** `UI.overlays`' reason for an Escape. */
const ESCAPE_REASON = "escape"

/** Class of the chosen glyph's box, in the field. */
const GLYPH = "glyph"

/** Class of the field's text while it shows the placeholder. */
const PLACEHOLDER = "placeholder"

/** Class of the panel. */
const PANEL = "panel"

/** Class of the search box. */
const SEARCH = "search"

/** Class of the grid. */
const GRID = "grid"

/** Class of the grid's rows box. */
const ROWS = "rows"

/** Class of each cell. */
const CELL = "cell"

/** Class of a group's heading. */
const HEADING = "heading"

/** Class of the heading stuck at the grid's top. */
const STUCK = "stuck"

/** Class of the "none" cell. */
const NONE = "none"
