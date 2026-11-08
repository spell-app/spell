import { Show } from "solid-js"

import { E } from "spell/ui/core"
import { treeItemVocabulary } from "./UITreeItem.en"

import treeCSS from "./UITree.css?inline"

/****************
 * ### `UITreeItem`
 * The component behind `<ui-tree-item>`:  one row of a `<ui-tree>`, holding the rows inside it as its children.
 *
 *     <div part="row">            (the whole width of the tree, however deep the row)
 *       <span part="toggle"/>     (the triangle:  a click opens or closes it, and selects nothing)
 *       <slot name="icon"/>  <span part="label"/>  <slot name="actions"/>
 *     </div>
 *     <div part="group"><slot/></div>   (the rows inside it, while it's open)
 *
 * - Opening and closing are a `Disclosure`:  `open`, `ui-opening`, `ui-closing`, as a section's are.
 * - A click on the row isn't handled here:  it reaches `<ui-tree>`, which knows the other rows.
 * - The row is what takes the focus' ring, though the DOM element takes the focus:  the tree's keys move it.
 * - How deep it is comes from its place, read as it connects:  it pads its row, so a selected row fills the width.
 * - Its tree's `appearance="nav"` (a site's side navigation) gives it the docs site's look:  `:state(nav)`, read as it
 *   connects too.  Then a `band` row is a heading over the rows inside it, and `count` / `badge` label its words.
 ****************/
export class UITreeItem extends E.UIComponent<typeof treeItemVocabulary> {
  @E.proto static vocabulary = treeItemVocabulary
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { tree: treeCSS },
    delegatesFocus: false,
    aria: { role: "treeitem" },
    cssStates: ["selected"]
  }

  /** The rows inside it show. */
  @E.cssState("open") @E.controlled("open") accessor isOpen = false

  /** Opening and closing it, as a person would. */
  readonly disclosure = new E.Disclosure({ component: this, member: "isOpen" })

  /** How many rows it's inside. */
  @E.state accessor depth = 0

  /** How many rows it's inside that aren't `band`s:  how far in it's drawn, as a heading band adds no step. */
  @E.state accessor indent = 0

  /** Its tree is a side navigation (`appearance="nav"`):  `:state(nav)`. */
  @E.cssState("nav") @E.state accessor isInNav = false

  /** It's a heading band over its rows:  `:state(band)`, with `band`'s value as a class of its row. */
  @E.cssState("band")
  get isBand(): boolean {
    return !!this.band
  }

  /** The tree's `filter` hides it. */
  @E.state @E.cssState("filtered-out") accessor isFilteredOut = false

  /** The tree's `filter` matches a row inside it, so those show though it's closed. */
  @E.state accessor isKeptOpen = false

  /** Does it have a row inside it?  Rows only, so a marker between them doesn't count. */
  @E.watches({ childList: true })
  get hasRows(): boolean {
    return [...this.domElement.children].some((child) => child.localName === this.domElement.localName)
  }

  /** It can open:  it has rows, or says it will. */
  @E.cssState("has-items")
  get canOpen(): boolean {
    return this.hasRows || !!this.expandable
  }

  /** The rows inside it are on screen. */
  get showsRows(): boolean {
    return this.canOpen && (this.isOpen || this.isKeptOpen)
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
        <div class={["row", this.band]} part={this.partForName("row")} style={{ "--_ui-tree-depth": this.indent }}>
          <span
            class="toggle"
            part={this.partForName("toggle")}
            aria-hidden="true"
            title={this.canOpen ? this.translationForKey(this.isOpen ? "close" : "open") : undefined}
            onClick={this.onToggleClicked}
          />
          <slot name="icon">
            <Show when={this.icon}>{(icon) => <ui-icon class="icon" name={icon()} />}</Show>
          </slot>
          <span class="label" part={this.partForName("label")}>
            <slot name="label">
              <span class="words">{this.label}</span>
              <Show when={this.which}>{(which) => <span class="which">{which()}</span>}</Show>
            </slot>
          </span>
          <Show when={this.count}>
            {(count) => (
              <ui-label class="count" part={this.partForName("count")} size="mini" appearance="circular">
                {count()}
              </ui-label>
            )}
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
        <Show when={this.showsRows}>
          <div class="rows" role="group" part={this.partForName("group")}>
            <slot />
          </div>
        </Show>
      </>
    )
  }

  /** The triangle was clicked:  open or close, and select nothing. */
  @E.untracked private readonly onToggleClicked = (event: MouseEvent) => {
    if (!this.canOpen) return
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
