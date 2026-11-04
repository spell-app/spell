import { isServer } from "@solidjs/web"
import { For, Show } from "solid-js"

import { E, UI } from "spell/ui/core"
import { treeVocabulary } from "./UITree.en"
import { UITreeItem } from "./UITreeItem"

import treeCSS from "./UITree.css?inline"

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
 * - `sticky-path`:  while it scrolls, one line pinned at its top names the open rows the first row in view is inside.
 *   - Read again on every scroll of whatever scrolls it, before the next paint:  rows know nothing of it.
 *   - Hidden from screen readers:  each row already says how deep it is (`aria-level`), and the keys walk the rows.
 ****************/
export class UITree extends E.UIComponent<typeof treeVocabulary> {
  @E.proto static vocabulary = treeVocabulary
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { tree: treeCSS },
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

  render() {
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

  /** `row` was clicked, or Enter or Space pressed on it. */
  private activate(row: UITreeItem, event: MouseEvent | KeyboardEvent) {
    if (row.group) {
      row.disclosure.toggle(event)
      return
    }
    const value = row.valueOrLabel
    if (!this.send("ui-selecting", { item: row.domElement, value, originalEvent: event })) return
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

  /** Move the focus to `row`. */
  private focusRow(row: UITreeItem | undefined) {
    if (row) this.roving?.focus(this.roving.items.indexOf(row.domElement))
  }

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
