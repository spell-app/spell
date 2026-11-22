import { Show } from "solid-js"

import { E } from "spell/ui/core"
import type { UITree } from "./UITree"
import type { RowPart } from "./UITree.types"
import { treeItemVocabulary } from "./UITreeItem.en"

import treeCSS from "./UITree.css?inline"
import columnsCSS from "./UITreeColumns.css?inline"

/****************
 * ### `UITreeItem`
 * The component behind `<ui-tree-item>`:  one row of a `<ui-tree>`, holding the rows inside it as its children.
 *
 *     <div part="row">            (the whole width of the tree, however deep the row)
 *       <span part="toggle"/>     (the triangle:  a click opens or closes it, and selects nothing)
 *       <slot name="icon"/>  <span part="label"/>  <slot name="actions"/>
 *     </div>
 *     <div part="group">                (the rows inside it, while it's open)
 *       <div class="folded"><slot/></div>
 *     </div>
 *
 * - Opening and closing are a `Disclosure`:  `open`, `ui-opening`, `ui-closing`, as a section's are.
 * - A click on the row isn't handled here:  it reaches `<ui-tree>`, which knows the other rows.
 * - The row is what takes the focus' ring, though the DOM element takes the focus:  the tree's keys move it.
 * - How deep it is comes from its place, read as it connects:  it pads its row, so a selected row fills the width.
 * - Its tree's `appearance="columns"`:  `:state(in-columns)`, followed as the tree's `appearance` changes.
 *   - While it's open, the rows inside it are the tree's next column, beside the one it's in, with that column's title
 *     (`UITreeColumns.css`).
 *   - The tree does the picking:  a click on its triangle is a click on the row.
 *   - Its parts are as the tree's `show` says:  its icon, `which`, how many rows it holds, the chevron.
 *   - Picked while `expandable` with no rows yet:  a spinner in its column, until they come.
 *   - In a column the tree draws narrow:  `:state(in-narrow)`, only the column's pick showing, its name sideways.
 *   - The tree's `filter` listing its matches elsewhere in the column of rows inside it:  after those rows, drawn by
 *     the tree (`UITree.matchList()`).
 * - Its tree's `appearance="nav"` (a site's side navigation) gives it the docs site's look:  `:state(nav)`, read as it
 *   connects too.  Then a `band` row is a heading over the rows inside it, and `count` / `badge` label its words.
 *   - `band="group"`:  a quiet label over its rows, with no arrow:  whatever holds the tree opens it.
 *   - Its rows stay drawn while it's closed (shut, and out of the keys' and a screen reader's reach), so they ease open
 *     and shut, as the docs site's folds do (`--ui-tree-nav-open-duration` ...).  Every other tree draws them only
 *     while it's open.
 ****************/
export class UITreeItem extends E.UIComponent<typeof treeItemVocabulary> {
  @E.proto static vocabulary = treeItemVocabulary
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { tree: treeCSS, columns: columnsCSS },
    delegatesFocus: false,
    aria: { role: "treeitem" },
    cssStates: ["selected"]
  }

  /** The rows inside it show. */
  @E.cssState("open") @E.controlled("open") accessor isOpen = false

  /** Opening and closing it, as a person would. */
  readonly disclosure = new E.Disclosure({ component: this, member: "isOpen" })

  /**
   * How many rows it's inside.
   * - `ownedWrite`, as `indent`, `treeElement` and `isInNav`:  `onConnect()` writes them,
   *   and the browser runs it wherever the row is put in a page, inside a Solid render too.
   */
  @E.state({ ownedWrite: true }) accessor depth = 0

  /** How many rows it's inside that aren't `band`s:  how far in it's drawn, as a heading band adds no step. */
  @E.state({ ownedWrite: true }) accessor indent = 0

  /** The `<ui-tree>` it's in, found as it connects. */
  @E.state({ ownedWrite: true }) accessor treeElement: E.DOMElement | undefined = undefined

  /** Its tree's component, once it has one. */
  private get tree(): UITree | undefined {
    return this.treeElement?.component as UITree | undefined
  }

  /** Its tree shows a column per level (`appearance="columns"`):  `:state(in-columns)`. */
  @E.cssState("in-columns")
  get isInColumns(): boolean {
    return !!this.tree?.isColumns
  }

  /** `appearance="columns"`:  the title over the column of rows inside it, from the tree's `column-titles`. */
  get columnTitle(): string | undefined {
    return this.isInColumns ? this.tree?.titleForColumn(this.depth + 1) : undefined
  }

  /** `appearance="columns"`:  where the column of rows inside it goes, and how wide it is, as its tree says. */
  get columnPlace(): Record<string, string> | undefined {
    const { tree } = this
    if (!this.isInColumns || !tree) return undefined
    return {
      "--_ui-tree-column-start": tree.columnStartCSS(this.depth + 1),
      "--_ui-tree-column-own-width": tree.columnWidthCSS(this.depth + 1)
    }
  }

  /** `appearance="columns"`:  the column it's in is drawn narrow, a strip with its pick:  `:state(in-narrow)`. */
  @E.cssState("in-narrow")
  get isInNarrowColumn(): boolean {
    return this.isInColumns && !!this.tree?.isNarrowColumn(this.depth)
  }

  /** `appearance="columns"`:  the column of rows inside it is drawn narrow. */
  get hasNarrowRows(): boolean {
    return this.isInColumns && !!this.tree?.isNarrowColumn(this.depth + 1)
  }

  /** `appearance="columns"`:  the column of rows inside it is narrow, but drawn whole for now, over the next ones. */
  get hasPeekingRows(): boolean {
    return this.isInColumns && !!this.tree?.isPeekColumn(this.depth + 1)
  }

  /** `appearance="columns"`:  the column of rows inside it is wholly under a narrow one drawn whole over it. */
  get hasCoveredRows(): boolean {
    return this.isInColumns && !!this.tree?.isCoveredColumn(this.depth + 1)
  }

  /** Its tree is a side navigation (`appearance="nav"`):  `:state(nav)`. */
  @E.cssState("nav") @E.state({ ownedWrite: true }) accessor isInNav = false

  /** It's a heading band over its rows:  `:state(band)`, with `band`'s value as a class of its row. */
  @E.cssState("band")
  get isBand(): boolean {
    return !!this.band
  }

  /** The tree's `filter` hides it. */
  @E.state @E.cssState("filtered-out") accessor isFilteredOut = false

  /**
   * In a column view, it's the pick kept in the column `filter` filters, though it doesn't match:  dimmed, so it
   * doesn't read as a match.
   */
  @E.state @E.cssState("unmatched") accessor isUnmatched = false

  /** The tree's `filter` matches a row inside it, so those show though it's closed. */
  @E.state accessor isKeptOpen = false

  /** How many rows are directly inside it.  Rows only, so a marker between them doesn't count. */
  @E.watches({ childList: true })
  get rowCount(): number {
    return [...this.domElement.children].filter((child) => child.localName === this.domElement.localName).length
  }

  /** Does it have a row inside it? */
  get hasRows(): boolean {
    return this.rowCount > 0
  }

  /** In a column view, does it show `part`, as its tree's `show` says?  Every part, anywhere else. */
  private shows(part: RowPart): boolean {
    return !this.isInColumns || !!this.tree?.shows(part)
  }

  /** In a column view, it's picked and `expandable`, its rows not here yet:  its column shows a spinner. */
  get isLoadingRows(): boolean {
    return this.isInColumns && this.isOpen && !!this.expandable && !this.hasRows
  }

  /** In a column view, the tree's `filter` filters its rows. */
  get hasFilteredRows(): boolean {
    const { tree } = this
    return this.isInColumns && !!tree?.filter && tree.filteredRowsParent === this.domElement
  }

  /** In a column view, the tree's `filter` filters its rows, and none matches, here or elsewhere. */
  get showsNoMatches(): boolean {
    const { tree } = this
    return this.hasFilteredRows && !!tree?.hasNoMatches && !tree.hasOtherMatches
  }

  /** In a column view, the tree's matches elsewhere go after the rows inside it:  their column is its rows'. */
  get showsMatchList(): boolean {
    const { tree } = this
    return this.isInColumns && this.showsRows && !!tree?.filter && tree.filteredColumn === this.depth + 1
  }

  /** It can open:  it has rows, or says it will. */
  @E.cssState("has-items")
  get canOpen(): boolean {
    return this.hasRows || !!this.expandable
  }

  /** The rows inside it are on screen. */
  get showsRows(): boolean {
    // a column view shows only the chain of picks:  a filter's match opens no column
    return this.canOpen && (this.isOpen || (this.isKeptOpen && !this.isInColumns))
  }

  /** The box of rows inside it is drawn:  while they show, and always in a side navigation, so they ease. */
  get drawsRows(): boolean {
    return this.showsRows || (this.isInNav && this.canOpen)
  }

  /** What `ui-changed` calls it. */
  get valueOrLabel(): string {
    return this.value ?? this.label ?? ""
  }

  /** The words the tree's `filter` looks in:  its `label` and `which`, or what's in its `label` slot. */
  get filterWords(): string {
    const slotted = this.domElement.querySelector(':scope > [slot="label"]')?.textContent ?? ""
    return `${this.label ?? ""} ${this.which ?? ""} ${slotted}`
  }

  /** The screen reader's `aria-expanded`. */
  @E.aria("expanded")
  get ariaOpen(): "true" | "false" | undefined {
    return this.canOpen ? (this.showsRows ? "true" : "false") : undefined
  }

  /** The screen reader's `aria-selected`. */
  @E.aria("selected")
  get ariaIsSelected(): "true" | "false" | undefined {
    return this.group ? undefined : this.selected ? "true" : "false"
  }

  /** The screen reader's `aria-level`:  1 for a top row. */
  @E.aria("level")
  get ariaDepth(): string {
    return String(this.depth + 1)
  }

  render() {
    return (
      <>
        <div
          class={["row", this.band]}
          part={this.partForName("row")}
          style={{
            "--_ui-tree-depth": this.isInColumns ? 0 : this.indent,
            "clip-path": this.isInColumns ? this.tree?.peekClipCSS(this.depth) : undefined
          }}
        >
          <Show when={this.shows("chevron")}>
            <span
              class="toggle"
              part={this.partForName("toggle")}
              aria-hidden="true"
              title={this.canOpen ? this.translationForKey(this.isOpen ? "close" : "open") : undefined}
              onClick={this.onToggleClicked}
            />
          </Show>
          <slot name="icon">
            <Show when={this.shows("icon") && this.icon}>{(icon) => <ui-icon class="icon" name={icon()} />}</Show>
          </slot>
          <span class="label" part={this.partForName("label")}>
            <slot name="label">
              <span class="words">{this.label}</span>
              <Show when={this.shows("which") && this.which}>{(which) => <span class="which">{which()}</span>}</Show>
            </slot>
          </span>
          <Show when={this.count}>
            {(count) => (
              <ui-label class="count" part={this.partForName("count")} size="mini" appearance="circular">
                {count()}
              </ui-label>
            )}
          </Show>
          <Show when={this.isInColumns && !this.count && this.hasRows && this.shows("count")}>
            <span class="row-count">{this.rowCount}</span>
          </Show>
          <Show when={this.badge}>
            {(badge) => (
              <ui-label class="badge" part={this.partForName("badge")} size="mini" color="yellow" appearance="basic">
                {badge()}
              </ui-label>
            )}
          </Show>
          <span class="actions">
            <slot name="actions" />
          </span>
        </div>
        <Show when={this.drawsRows}>
          <div
            class={[
              "rows",
              {
                shut: !this.showsRows,
                narrow: this.hasNarrowRows,
                peek: this.hasPeekingRows,
                covered: this.hasCoveredRows
              }
            ]}
            role="group"
            part={
              this.hasNarrowRows
                ? `${this.partForName("group")} ${this.partForName("narrow-column")}`
                : this.partForName("group")
            }
            inert={this.showsRows ? undefined : ""}
            aria-label={this.columnTitle}
            style={this.columnPlace}
          >
            <Show when={this.columnTitle}>
              {(title) => (
                <div
                  class="column-title"
                  part={this.partForName("column-title")}
                  aria-hidden="true"
                  style={{ "clip-path": this.tree?.peekClipCSS(this.depth + 1) }}
                >
                  {title()}
                </div>
              )}
            </Show>
            <div class="folded">
              <slot />
              <Show when={this.isLoadingRows}>
                <div class="loading">
                  <ui-loader visible="" size="small" aria-label={this.tree?.translationForKey("loading")} />
                </div>
              </Show>
              <Show when={this.showsNoMatches}>
                <div class="empty">{this.tree?.translationForKey("noMatches")}</div>
              </Show>
              <Show when={this.showsMatchList}>{this.tree?.matchList()}</Show>
            </div>
          </div>
        </Show>
      </>
    )
  }

  /** The triangle was clicked:  open or close, and select nothing;  in a column view, it's a click on the row. */
  @E.untracked private readonly onToggleClicked = (event: MouseEvent) => {
    if (!this.canOpen || this.isInColumns) return
    event.stopPropagation()
    this.disclosure.toggle(event)
  }

  /** It connected:  how deep it is, and whether its tree is a side navigation. */
  onConnect() {
    super.onConnect()
    let depth = 0
    let indent = 0
    let at = this.domElement.parentElement
    for (; at && at.localName === this.domElement.localName; at = at.parentElement) {
      depth++
      if (!at.hasAttribute(BAND)) indent++
    }
    this.depth = depth
    this.indent = indent
    this.isInNav = at?.getAttribute("appearance") === NAV
    this.treeElement = at ? (at as E.DOMElement) : undefined
    // after this connect's render:  a write here could land inside the tree's own
    E.afterSolidUpdate(() => this.tree?.rowConnected())
  }

  /** It was selected, by whatever:  it shows, in the middle of the tree if it was out of sight. */
  @E.onChange("selected", { defer: true })
  protected onSelectedChanged(selected: boolean | undefined) {
    if (selected) E.scrollIntoSight(this.domElement)
  }
}

export interface UITreeItem extends E.AttributeValues<typeof treeItemVocabulary> {}

/** The tree's `appearance` that makes it a side navigation. */
const NAV = "nav"

/** The attribute of a row that's a heading band:  it adds no step in. */
const BAND = "band"
