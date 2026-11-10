import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

// Import directly:  in `core`'s util barrel it would cost every page its bytes, as for `TocPreferences`
import { PrefStore } from "spell/util/persist/PrefStore"
import { E } from "spell/ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-menu.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-menu>` and `<ui-item>`, which a toolbar extends and holds)
import { UIMenu } from "spell/ui/components/ui-menu"
import type { menuVocabulary } from "spell/ui/components/ui-menu/UIMenu.en"
// The menu family's, beside its sheet (below):  `<ui-tabs>`' tab list scrolls the same way
import { ScrollingRow, START, END } from "spell/ui/components/ui-menu/ScrollingRow"
import { toolbarVocabulary } from "./UIToolbar.en"

import scrollingRowCSS from "spell/ui/components/ui-menu/ScrollingRow.css?inline"
import toolbarCSS from "./UIToolbar.css?inline"

/****************
 * ### `<ui-toolbar>`
 * The component behind `<ui-toolbar>`:  a horizontal menu whose items scroll sideways when they don't fit.
 *
 *     <div class="ui toolbar scrolling-row" part="toolbar">
 *       <div class="icon" part="icon">  <slot name="icon">  </div>        (each slot's box only while it has content)
 *       <div class="title" part="title">  <slot name="title">  </div>
 *       <div class="center" part="center">  <slot name="center">  </div>    (takes the room left)
 *       <button class="scroll start" part="scroll-start" aria-label title>‹</button>
 *       <nav class="ui … menu" part="menu">  <slot>  </nav>       (the menu's own box, which scrolls)
 *       <button class="scroll end" part="scroll-end" aria-label title>›</button>
 *       <button class="all-items" part="all-items" aria-label title>▾</button>     (`max-visible`, while some are put away)
 *       <div class="right" part="right">  <slot name="right">  </div>      (pushed to the end)
 *     </div>
 *
 * - It IS a `<ui-menu>` (it extends `UIMenu`):  the same attributes, items, events, `segmented` thumb and menubar.
 *   - Its vocabulary is built on the menu's (`UIToolbar.en.ts`).
 * - Its items never wrap:
 *   when they don't fit, the menu's box scrolls sideways (`:state(overflowing)`), its scrollbar hidden.
 * - A `‹` / `›` button shows at each end while there's more to scroll that way.
 *   - Each sits OVER its end of the row, taking no room in it;  the row fades out under it.
 *   - A click scrolls by most of the box's width, smoothly (at once with reduced motion),
 *     and stops on a whole item.
 *   - Neither shows when everything fits;  the one at an end the row has reached is hidden.
 *   - Out of the Tab order:  the items themselves are what a keyboard reaches, and focusing one scrolls it in.
 * - It follows the box's size and its items' (`ResizeObserver`), and the scroll.
 *   - The scrolling, its keys and their look are the menu family's `ScrollingRow`, `<ui-tabs>`' too.
 * - `shrinkable` (the menu's):  it never scrolls with `‹` / `›`;  its titles fit the row instead, down to the menu's
 *   overflow button (epic `epic-engine` Q38).  Only a row too narrow for even that button scrolls, with no keys.
 *   - `scroll-first`, without a `segmented` look:  once only its icons are left, it scrolls with them, no overflow button.
 *   - `scroll-first`, with a `segmented` look:  it does scroll with them while the row has `--ui-toolbar-scroll-min`
 *     (200px) to show, then it's the dropdown:  a row of many files stays a row for as long as it can.
 * - `max-visible`:  a row of many (a project's files) shows only the ones chosen lately, and a button lists them all.
 *   - Only with more items than that;  a bare `max-visible` means 8.
 *     An attribute, not on by default:  a toolbar of actions has nothing chosen to go by.
 *   - The row keeps the page's order.  The item chosen longest ago leaves it first;  the chosen one never does.
 *   - An item left out is `hidden`, so the menu's own rules skip it, and its overflow menu is the list.
 *   - `remember` keeps the row across reloads.
 * - A BAR's slots around the items, for a site's top bar:
 *   `icon`, `title`, `center` (the room left), `right` (at the end).
 *   - A slot with nothing in it draws no box;  with no items, the menu's box takes no room.
 * - NOTE: left-to-right only, for now:  in a right-to-left page `scrollLeft` counts the other way.
 ****************/
export class UIToolbar extends UIMenu {
  // the menu's names under the toolbar's tag:  same shape, but TypeScript only knows the menu's literals
  @E.proto static vocabulary = toolbarVocabulary as unknown as typeof menuVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { ...UIMenu.prototype.elementSetup.styleSheets, scrollingRow: scrollingRowCSS, toolbar: toolbarCSS }
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Scrolling
  ////////////////

  /** The row that scrolls:  its menu's box, with a `‹` / `›` key at each end. */
  readonly scrolling = new ScrollingRow({
    owner: this,
    // a shrinkable one fits its titles instead:  no keys, no fades;  unless it scrolls first, and is still whole
    canScroll: () => !this.shrinkable || (!!this.scrollFirst && !this.isDropdown)
  })

  /** The items don't all fit:  the box scrolls. */
  @E.cssState("overflowing")
  get isOverflowing(): boolean {
    return this.scrolling.isOverflowing
  }

  /** `scroll-first`:  the row scrolls before it's a dropdown. */
  protected get scrollsFirst(): boolean {
    return !!this.scrollFirst
  }

  /** SIDE EFFECT:  follows the box's scroll and the sizes of it and its items, once drawn;  the cleanup stops. */
  @E.onChange("isReady", "shrinkable", "scrollFirst", "fitAnswer")
  protected onReadyToScroll(isReady: boolean) {
    const box = this.box
    if (!isReady || !box) return
    return this.scrolling.follow(box)
  }

  /**
   * Scroll by most of the box's width:  `-1` back, `1` on;  smoothly, unless the person asked for less motion.
   * - The kit's `scrollByRow()`, as the site header's keys scroll its tabs.
   */
  @E.untracked
  scrollByPage(direction: -1 | 1) {
    this.scrolling.scrollByPage(direction)
  }

  ////////////////
  // ## Only the open items (`max-visible`)
  ////////////////

  /** The most items the row shows;  `undefined`:  every one. */
  get visibleLimit(): number | undefined {
    const text = this.attributes["max-visible"]
    if (text == null) return undefined
    const count = Math.floor(Number(text))
    return count >= 1 ? count : DEFAULT_MAX_VISIBLE
  }

  /** There are more items than `visibleLimit`:  the rest are put away, and the list's button shows. */
  @E.cssState("limited")
  @E.state
  accessor isLimited = false

  /** The items the row shows, by `value` (else text), the one chosen most lately first. */
  @E.state accessor openValues: readonly string[] = []

  /** The chosen item when the row last followed it. */
  @E.state accessor followedValue: string | undefined = undefined

  /** The items this toolbar hid:  an item the page hid stays the page's. */
  private readonly putAway = new WeakSet<Element>()

  protected override isPutAway(element: Element): boolean {
    return this.putAway.has(element)
  }

  protected override get hasOverflowMenu(): boolean {
    return super.hasOverflowMenu || this.isLimited
  }

  /** The list's button, while drawn. */
  private allItemsButton: HTMLButtonElement | undefined

  protected override get overflowOpener(): HTMLButtonElement | undefined {
    return this.isDropdown ? super.overflowOpener : this.allItemsButton
  }

  /** The list's button's icon. */
  readonly allItemsGlyph = new E.IconGlyph({ owner: this, name: () => (this.isLimited ? ALL_ITEMS_ICON : undefined) })

  /** `putAwayTheRest()` once after Solid's update, however often asked. */
  private readonly limitRefresh = new E.Queued({ when: E.afterSolidUpdate, run: () => this.putAwayTheRest() })

  protected override onItemsChanged() {
    this.limitRefresh.ask()
  }

  /** SIDE EFFECT:  the row's items, as last kept under `remember`, then the items fitted to them. */
  @E.onChange("visibleLimit", "remember", "isReady")
  protected onLimitChanged(limit: number | undefined, remember: string | undefined, isReady: boolean) {
    if (!isReady) return
    if (limit && remember) {
      const kept = UIToolbar.store.get(remember)
      this.openValues = Array.isArray(kept) ? kept.filter((each) => typeof each === "string") : []
    }
    this.limitRefresh.ask()
  }

  /** Show the open items, put the others away, and keep the chosen one in the row and in view. */
  @E.untracked
  private putAwayTheRest() {
    const items = this.rowElements().filter(
      (each) => this.itemOf(each) && (!(each as HTMLElement).hidden || this.putAway.has(each))
    ) as HTMLElement[]
    const limit = this.visibleLimit
    if (!limit || items.length <= limit) {
      for (const item of items) this.showInRow(item, true)
      this.isLimited = false
      return
    }
    const chosen = items.find((each) => this.itemOf(each)?.isSelected)
    const chosenValue = chosen && UIToolbar.valueOf(chosen)
    // an item not drawn yet keeps its place:  a reload's items arrive a few at a time
    const others = this.openValues.filter((each) => each !== chosenValue)
    let open = [...(chosenValue === undefined ? [] : [chosenValue]), ...others].slice(0, limit)
    if (!open.length) open = items.slice(0, limit).map((each) => UIToolbar.valueOf(each))
    for (const item of items) this.showInRow(item, open.includes(UIToolbar.valueOf(item)))
    this.isLimited = true
    this.keepOpenValues(open)
    if (chosen && chosenValue !== this.followedValue) {
      this.followedValue = chosenValue
      const box = this.itemOf(chosen)?.focusTarget
      if (box) E.beforeNextPaint(() => this.scrolling.bringIntoView(box, { smoothly: true }))
    }
  }

  /** Show `item` in the row, or put it away:  only ever hides what it can show again. */
  private showInRow(item: HTMLElement, isShown: boolean) {
    if (isShown) {
      if (this.putAway.delete(item)) item.hidden = false
    } else if (!item.hidden) {
      this.putAway.add(item)
      item.hidden = true
    }
  }

  /** SIDE EFFECT:  the open items are `open`, kept under `remember` when they changed. */
  private keepOpenValues(open: string[]) {
    if (open.join(SEPARATOR) === this.openValues.join(SEPARATOR)) return
    this.openValues = open
    if (this.remember) UIToolbar.store.set(this.remember, open)
  }

  /** Where every toolbar's `remember` is kept:  made on first use, so a server render never touches storage. */
  private static get store(): PrefStore {
    return (UIToolbar.madeStore ??= new PrefStore(OPEN_ITEMS_STORE))
  }
  private static madeStore?: PrefStore

  /** The button that lists every item:  always there, outside the row that scrolls. */
  private allItems(): JSX.Element {
    return (
      <Show when={this.isLimited && !this.isDropdown}>
        <button
          ref={(element: HTMLButtonElement) => (this.allItemsButton = element)}
          type="button"
          class={ALL_ITEMS}
          part={this.toolbarPart(ALL_ITEMS)}
          style={this.overflowMenu.anchorStyle}
          aria-haspopup="menu"
          aria-expanded={this.overflowMenu.ariaExpanded}
          aria-controls={this.overflowMenuId}
          aria-label={this.moreText}
          title={this.moreText}
          onClick={() => (this.isOverflowOpen ? this.closeOverflow() : this.openOverflow())}
          onKeyDown={this.onOverflowButtonKey}
        >
          {this.allItemsGlyph.svg}
        </button>
      </Show>
    )
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Which slots have light-DOM children:  a bar's slot box draws only when it has some. */
  readonly slots = new E.SlotContent(this.domElement)

  render(): JSX.Element {
    return (
      <div
        class={[TOOLBAR_CLASS, SCROLLING_ROW, { [EMPTY]: !this.slots.hasContent("") }]}
        part={this.toolbarPart("toolbar")}
      >
        {this.barSlot(ICON)}
        {this.barSlot(TITLE)}
        {this.barSlot(CENTER)}
        {this.scrolling.key(START)}
        {super.render()}
        {this.scrolling.key(END)}
        {this.allItems()}
        {this.barSlot(RIGHT)}
      </div>
    )
  }

  /** Bar slot `name`'s box, only while something is in it. */
  private barSlot(name: BarSlot): JSX.Element {
    const slotName = this.slotForName(name as never)
    return (
      <Show when={this.slots.hasContent(slotName)}>
        <div class={name} part={this.toolbarPart(name)}>
          <slot name={slotName} />
        </div>
      </Show>
    )
  }

  /** A part of the toolbar's own (its vocabulary adds them to the menu's, which TypeScript knows). */
  private toolbarPart(name: "toolbar" | "scroll-start" | "scroll-end" | typeof ALL_ITEMS | BarSlot): string {
    return this.partForName(name as never)
  }
}
/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIToolbar extends E.AttributeValues<typeof toolbarVocabulary> {}

////////////////
// ## Constants
////////////////

/** Classes of the box around the menu and its buttons. */
const TOOLBAR_CLASS = "ui toolbar"

/** Class word of a row that scrolls (`ScrollingRow.css`). */
const SCROLLING_ROW = "scrolling-row"

/** Class word of a toolbar with no items:  its menu box takes no room. */
const EMPTY = "empty"

/** The bar's `icon` slot (and its box's class word and part). */
const ICON = "icon"

/** The bar's `title` slot. */
const TITLE = "title"

/** The bar's `center` slot:  the room left after the icon and title. */
const CENTER = "center"

/** The bar's `right` slot:  at the end. */
const RIGHT = "right"

/** Class word and part of the button listing every item. */
const ALL_ITEMS = "all-items"

/** Its icon. */
const ALL_ITEMS_ICON = "caret down"

/** `max-visible` with no number. */
const DEFAULT_MAX_VISIBLE = 8

/** What `remember` is kept under, in this browser. */
const OPEN_ITEMS_STORE = "ui-toolbar-open-items"

/** Joins two lists of values to compare them:  no value holds it. */
const SEPARATOR = "\0"

/** A slot of the bar's layout around the items. */
type BarSlot = typeof ICON | typeof TITLE | typeof CENTER | typeof RIGHT
