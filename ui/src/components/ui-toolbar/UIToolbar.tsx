import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

// Import directly:  in `core`'s util barrel it would cost every page its bytes, as for `TocPreferences`
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UIT } from "spell/ui/core"
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
 *       <button class="all-items" part="all-items" aria-label title>[icon] ▾</button>   (`max-visible`, while some are put away;  `all-items-always`, always)
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
 * - Its own items draw no key caps:  an action's keys are in its tooltip (`Undo (⌘Z)`).  `show-keys` draws them.
 * - `appearance="pills"`:  each run of its items between two dividers (`<ui-item kind="divider">`), spacers or other elements is one rounded
 *   track, as a group of buttons is drawn, its items tiles on it (`pills()`, `UIToolbar.css`).
 *   - Each item draws its piece of the track (`ItemContext.pill`):  the start and end pieces are rounded.
 *   - It holds through `shrinkable`'s stages:  cut titles and icons stay on their tracks, the `…` button is a pill.
 * - `max-visible`:  a row of many (a project's files) shows only the ones chosen lately, and a button lists them all.
 *   - Only with more items than that;  a bare `max-visible` means 8.
 *     An attribute, not on by default:  a toolbar of actions has nothing chosen to go by.
 *   - The row keeps the page's order.  The item chosen longest ago leaves it first;  the chosen one never does.
 *   - An item left out is `hidden`, so the menu's own rules skip it, and its overflow menu is the list.
 *   - `remember` keeps the row across reloads.
 *   - `closeItem()` closes one of the row's items:  it leaves the row, but stays in the list
 *     (the editor's file tabs' ✕;  epic `editor` T77).
 *   - `all-items-icon` draws an icon before the button's caret, saying what the list is of
 *     (the editor's file tabs:  `file outline`;  epic `editor` T76).
 *   - `all-items-at-end` puts the button at the bar's far end, however few items show:
 *     without it, it sits right after the last one (the editor's file tabs;  epic `editor` I173).
 *   - `all-items-always` shows the button even while every item is in the row:
 *     a list of every file, always in the same spot (the editor's file tabs;  epic `editor` T82).
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
  // ## Its items:  their keys, their pills
  ////////////////

  /**
   * `ItemOwner`:  the menu's context for `item`, plus the toolbar's own for the items in its row:
   * no key caps (unless `show-keys`), and its place in its pill (`appearance="pills"`).
   * - The same object for the same answer (`contextWith()`), so an item doesn't draw again for nothing.
   * - SIDE EFFECT:  as the menu's, and with `pills`, works out the pills again once the items have drawn.
   */
  itemContext(item: Element): UIT.ItemContext {
    const context = super.itemContext(item)
    if (item.parentElement !== this.domElement) return context
    const pill = this.hasPills ? this.pillPlaces.get(item) : undefined
    if (this.hasPills) this.pillRefresh.ask()
    return this.contextWith(context, !this.showKeys, pill)
  }

  /** `appearance` holds `pills`. */
  get hasPills(): boolean {
    return this.hasLook(PILLS)
  }

  /** Each item's place in its pill, by its DOM element:  `pills()` works them out. */
  @E.state({ equals: isSamePlaces }) accessor pillPlaces: ReadonlyMap<Element, UIT.PillPlace> = new Map()

  /** `pills()` once after Solid's update, however often asked. */
  private readonly pillRefresh = new E.Queued({ when: E.afterSolidUpdate, run: () => this.pills() })

  /**
   * Work out each item's place in its pill:  a run of items between two dividers, or anything else in the row
   * that isn't an item (a sub-menu), is one pill;  a hidden item is in none.
   */
  @E.untracked
  private pills() {
    const places = new Map<Element, UIT.PillPlace>()
    let run: Element[] = []
    let isFirstRun = true
    const endRun = () => {
      run.forEach((element, index) => {
        const isFirst = index === 0
        const isLast = index === run.length - 1
        const start = isFirstRun ? "" : "next-"
        places.set(element, isFirst && isLast ? `${start}only` : isFirst ? `${start}start` : isLast ? "end" : "middle")
      })
      if (run.length) isFirstRun = false
      run = []
    }
    for (const element of this.rowElements()) {
      if ((element as HTMLElement).hidden) continue
      const kind = ((element as E.DOMElement).component as { kind?: string } | undefined)?.kind
      if (kind === UIT.ITEM) run.push(element)
      else endRun()
    }
    endRun()
    this.pillPlaces = places
  }

  /** `context` with the toolbar's own:  one object per answer, kept while `context` is. */
  private contextWith(
    context: UIT.ItemContext,
    hidesShortcuts: boolean,
    pill: UIT.PillPlace | undefined
  ): UIT.ItemContext {
    let answers = this.contexts.get(context)
    if (!answers) this.contexts.set(context, (answers = new Map()))
    const key = `${hidesShortcuts}${SEPARATOR}${pill ?? ""}`
    let answer = answers.get(key)
    if (!answer) answers.set(key, (answer = { ...context, hidesShortcuts, ...(pill ? { pill } : {}) }))
    return answer
  }

  /** `contextWith()`'s answers, by the menu's context. */
  private readonly contexts = new WeakMap<UIT.ItemContext, Map<string, UIT.ItemContext>>()

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

  /** The chosen item, just closed (`closeItem()`):  out of the row, until the page chooses another. */
  private closedChoice: string | undefined

  /** The items this toolbar hid:  an item the page hid stays the page's. */
  private readonly putAway = new WeakSet<Element>()

  protected override isPutAway(element: Element): boolean {
    return this.putAway.has(element)
  }

  protected override get hasOverflowMenu(): boolean {
    return super.hasOverflowMenu || this.showsAllItems
  }

  /** The button listing every item is there:  some are put away, or `all-items-always`. */
  get showsAllItems(): boolean {
    return this.isLimited || !!this.allItemsAlways
  }

  /** The list's button, while drawn. */
  private allItemsButton: HTMLButtonElement | undefined

  protected override get overflowOpener(): HTMLButtonElement | undefined {
    return this.isDropdown ? super.overflowOpener : this.allItemsButton
  }

  /** The list's button's icon. */
  readonly allItemsGlyph = new E.IconGlyph({
    owner: this,
    name: () => (this.showsAllItems ? ALL_ITEMS_ICON : undefined)
  })

  /** `all-items-icon`'s icon, before the list's caret:  what the list is of (a project's files). */
  readonly allItemsKindGlyph = new E.IconGlyph({
    owner: this,
    name: () => (this.showsAllItems ? this.attributes["all-items-icon"] || undefined : undefined)
  })

  /** `putAwayTheRest()` once after Solid's update, however often asked. */
  private readonly limitRefresh = new E.Queued({ when: E.afterSolidUpdate, run: () => this.putAwayTheRest() })

  protected override onItemsChanged() {
    this.limitRefresh.ask()
    if (this.hasPills) this.pillRefresh.ask()
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
    if (chosenValue !== this.closedChoice) this.closedChoice = undefined
    const keepsChosen = chosenValue !== undefined && chosenValue !== this.closedChoice
    // an item not drawn yet keeps its place:  a reload's items arrive a few at a time
    const others = this.openValues.filter((each) => each !== chosenValue)
    let open = [...(keepsChosen ? [chosenValue] : []), ...others].slice(0, limit)
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

  /**
   * Close `item`:  it leaves the row, but stays in the list, where choosing it brings it back (epic `editor` T77).
   * - Only while some items are put away (`isLimited`), and never the row's last one:  else it does nothing.
   * - The chosen item:  answers the item to choose in its place, its neighbour in the row (after it, else before);
   *   choosing it is the page's, as every choice in the row is.
   *   Until the page chooses another, the closed one stays out of the row.
   * - SIDE EFFECT:  kept under `remember`, as every change to the row is.
   */
  @E.untracked
  closeItem(item: Element): Element | undefined {
    const row = this.rowElements().filter((each) => this.itemOf(each) && !(each as HTMLElement).hidden)
    if (!this.isLimited || row.length < 2 || !row.includes(item)) return undefined
    const value = UIToolbar.valueOf(item)
    this.keepOpenValues(this.openValues.filter((each) => each !== value))
    const isChosen = !!this.itemOf(item)?.isSelected
    if (isChosen) this.closedChoice = value
    this.limitRefresh.ask()
    if (!isChosen) return undefined
    const at = row.indexOf(item)
    return row[at + 1] ?? row[at - 1]
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
      <Show when={this.showsAllItems && !this.isDropdown}>
        <button
          ref={(element: HTMLButtonElement) => (this.allItemsButton = element)}
          type="button"
          class={[ALL_ITEMS, { [AT_END]: !!this.allItemsAtEnd }]}
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
          {this.allItemsKindGlyph.svg}
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

/** Its class word with `all-items-at-end`:  at the bar's far end. */
const AT_END = "at-end"

/** Its icon. */
const ALL_ITEMS_ICON = "caret down"

/** `max-visible` with no number. */
const DEFAULT_MAX_VISIBLE = 8

/** What `remember` is kept under, in this browser. */
const OPEN_ITEMS_STORE = "ui-toolbar-open-items"

/** Joins two lists of values to compare them:  no value holds it. */
const SEPARATOR = "\0"

/** The `appearance` word of a toolbar whose runs of items are pills. */
const PILLS = "pills"

/** Same places for the same items:  `pillPlaces` keeps its old map. */
function isSamePlaces(a: ReadonlyMap<Element, UIT.PillPlace>, b: ReadonlyMap<Element, UIT.PillPlace>): boolean {
  if (a.size !== b.size) return false
  for (const [element, place] of a) if (b.get(element) !== place) return false
  return true
}

/** A slot of the bar's layout around the items. */
type BarSlot = typeof ICON | typeof TITLE | typeof CENTER | typeof RIGHT
