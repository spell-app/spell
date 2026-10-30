import { For, Match, Show, Switch, untrack } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
import { menuVocabulary } from "./UIMenu.en"
import { SegmentedThumb } from "./SegmentedThumb"
import { TitleFit, type FitAnswer, type FitRow } from "./TitleFit"

import menuCSS from "./UIMenu.css?inline"

/**
 * Same item context, field by field:  items don't re-render for an equal one (`ownItemContext`'s `equals`).
 * - Above the class:  `@derived({ equals })` reads it while the class is defined.
 */
function isSameContext(a: UIT.ItemContext, b: UIT.ItemContext): boolean {
  return (
    a.domElementRole === b.domElementRole &&
    a.role === b.role &&
    a.interactive === b.interactive &&
    a.current === b.current &&
    a.shrinkable === b.shrinkable &&
    a.iconsOnly === b.iconsOnly &&
    a.pressed === b.pressed
  )
}

/**
 * Same overflow rows, row by row and field by field:  the overflow menu doesn't redraw for an equal list.
 * - Above the class:  `@state({ equals })` reads it while the class is defined.
 */
function isSameFolded(a: readonly FoldedItem[], b: readonly FoldedItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((row, index) => {
      const other = b[index]!
      return (Object.keys(row) as (keyof FoldedItem)[]).every((key) => row[key] === other[key])
    })
  )
}

/****************
 * ### `UIMenu`
 * The component behind `<ui-menu>`:  a menu of generic `<ui-item>`s, in one of three shapes
 * (`UIMenu.css` has the markup of each).
 *
 * - DEFAULT, a navigation landmark:  `<nav class="ui ... menu" part="menu" aria-label>` around the slot.
 *   - Items with a `link` are links, the selected one `aria-current="page"`;
 *     `appearance="link"` and `pagination` menus make every other item a `<button>`.
 *   - The DOM element's `aria-label` names the landmark (two navs on a page need distinct names).
 *
 * - `interactive`, an application MENUBAR (WAI-ARIA APG):  `<div role="menubar" aria-orientation>`.
 *   - Items are `role="menuitem"` (their DOM elements `role="none"`),
 *     with ONE Tab stop, and arrow keys, Home and End between them.
 *   - That's a roving tabindex (`UI.focus.roving`) over the items' BOXES (`UIItem.focusTarget`),
 *     never their DOM elements:
 *     a focusable DOM element without a visible role breaks the menubar's required-children pattern.
 *   - Disabled items are skipped.
 *
 * - SUB-MENU:  a `<ui-menu>` owned by a menu (`PartContext`:  directly, or inside an item)
 *   draws `<div class="[position] menu" part="menu">`, Fomantic's `.right.menu` or a vertical menu's `.item > .menu`,
 *   and hands its items the TOP menu's `ItemContext`.
 *
 * - It owns its items (`ItemOwner`):  they draw themselves as `itemContext()` says,
 *   and adopt this component's `elementSetup.styleSheets` (the item rules live in `UIMenu.css`).
 *   Items ASK for their context, which is also how the menu learns its items' DOM elements (the roving set),
 *   after they upgrade in any order.
 *
 * - Events:  `ui-select` (`{ value, item, originalEvent }`) when a link or button item is activated
 *   (a click, or Enter or Space on it);  only the TOP menu sends it.
 *   - A menu never moves `selected` itself, EXCEPT a `segmented` one (a single-choice control):
 *     it selects the activated item and unselects the rest, unless a listener cancels the `ui-select`.
 *   - `segmented choose="many"`:  each item a toggle, turned on and off by itself (`aria-pressed`), then
 *     `ui-changed` (`{ values }`, the items on);  one always stays on (`toggle()`).
 *
 * - A top-level `segmented` menu draws ONE sliding thumb under its items (`SegmentedThumb`),
 *   moved to each new choice as Apple's segmented control slides.
 *
 * - `shrinkable`:  it fits its items' titles to its row (`TitleFit`, epic `ui-gaps` P13):
 *   whole, then cut with `…`, then icons only, then every item folded into ONE overflow button,
 *   `<button part="overflow">` first in its box, whose menu (`<div role="menu" popover part="overflow-menu">`)
 *   holds a row per item;  picking a row clicks the real item, so `selected` and the page's listeners work as ever.
 *   - A `segmented` one has two stages:  whole, else a dropdown, its button showing the chosen item.
 *   - Its items draw their titles in a box of their own while it is (`ItemContext.shrinkable`).
 ****************/
export class UIMenu extends E.UIComponent<typeof menuVocabulary> implements UIT.ItemOwner {
  @E.proto static vocabulary = menuVocabulary
  // `Partial`:  `<ui-toolbar>` extends the menu, stating other keys
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { menu: menuCSS },
    // a sub-menu is a part of its menu:  an item's header looks past it to the menu
    isAPart: true,
    // nothing to delegate to:  the items are the focus targets
    delegatesFocus: false
  }

  /** Once it has drawn (`isReady`):  re-apply the roving tabindexes, over the items it drew. */
  @E.onChange("isReady")
  protected onReadyToRove(isReady: boolean) {
    if (isReady) this.queueRefresh()
  }

  ////////////////
  // ## The menu tree
  ////////////////

  /**
   * Owning menu, when this is a sub-menu.
   * - A `segmented` menu is never one:  a single-choice control keeps its own look and thumb,
   *   even inside another menu (Owen:  the editor's Run | Edit | Debug, in its top bar).
   */
  readonly context = new E.PartContext({
    domElement: this.domElement,
    noun: this.vocabulary.noun,
    barrier: (element) => this.isSegmented || E.PartContext.isBarrier(element)
  })

  /** `appearance` holds `word` (`segmented`, `link` ...):  it takes several at once. */
  hasLook(word: string): boolean {
    return String(this.appearance ?? "")
      .split(" ")
      .includes(word)
  }

  /** A segmented control (`appearance` holds `segmented`):  it moves `selected` itself, and draws a thumb. */
  get isSegmented(): boolean {
    return this.hasLook(SEGMENTED)
  }

  /** A segmented menu of toggles (`choose="many"`):  no thumb, each item pressed in while selected. */
  get choosesMany(): boolean {
    return this.isSegmented && this.choose === MANY
  }

  /** Its items run top to bottom (`direction="vertical"`):  `:state(vertical)`. */
  @E.cssState("vertical")
  get isVertical(): boolean {
    return this.direction === VERTICAL
  }

  /** The owning menu's component, when this is a sub-menu:  only menus own `menu` parts. */
  get parentMenu(): UIMenu | undefined {
    return this.context.ownerComponent<UIMenu>()
  }

  /** Top menu of a sub-menu tree. */
  get topMenu(): UIMenu {
    return this.parentMenu?.topMenu ?? this
  }

  /** A sub-menu's classes:  `[position] menu`, no `ui`. */
  private get subMenuClasses(): string {
    return [this.position, this.vocabulary.noun].filter(Boolean).join(" ")
  }

  ////////////////
  // ## Items
  ////////////////

  /** Item DOM elements that asked THIS (top) menu for their context:  the roving candidates. */
  private readonly itemsThatAsked = new WeakSet<Element>()

  /**
   * What this menu's items render as (only the top menu's is read), from its attributes.
   * - The same object while an equal one is computed (`isSameContext()`):  items don't re-render for it.
   */
  @E.derived({ equals: isSameContext })
  get ownItemContext(): UIT.ItemContext {
    const isInteractive = this.interactive
    return {
      domElementRole: isInteractive ? "none" : undefined,
      role: isInteractive ? "menuitem" : undefined,
      // a form's segmented control (`name`) chooses with a click, as a toggle row does
      interactive: isInteractive || this.hasLook(LINK_LOOK) || this.pagination || this.choosesMany || this.isAFormValue,
      current: "page",
      pressed: this.choosesMany && !isInteractive,
      shrinkable: this.isShrinking,
      iconsOnly: this.isIconsOnly
    }
  }

  /** What a sub-menu's items render as:  the menu's context, but never fitted (only the row's own items are). */
  @E.derived({ equals: isSameContext })
  get nestedItemContext(): UIT.ItemContext {
    return { ...this.ownItemContext, shrinkable: false, iconsOnly: false }
  }

  /**
   * `ItemOwner`:  what `item` renders as -- the TOP menu's published context.  Tracked.
   * - SIDE EFFECT:  records the item for the roving set,
   *   and re-applies the roving tabindexes once the item has (re-)rendered its box.
   */
  itemContext(item: Element): UIT.ItemContext {
    // half-tracked on purpose:  the item follows the top menu's context, never which menu is on top;
    // `@E.untracked` would untrack the whole method
    // oxlint-disable-next-line spell-ui/no-untrack -- half-tracked on purpose (above)
    const top = untrack(() => this.topMenu)
    top.itemsThatAsked.add(item)
    top.queueRefresh()
    return item.parentElement === top.domElement ? top.ownItemContext : top.nestedItemContext
  }

  /**
   * A click inside the menu:  `ui-select` when it activated a link / button item
   * (Enter / Space on one click it too).
   * - Only the top menu dispatches;  a sub-menu's clicks bubble to it.
   */
  @E.on("click")
  protected onClick(event: MouseEvent) {
    if (this.parentMenu) return
    const item = UIMenu.activatedItem(event)
    if (!item || item.matches(UIT.DISABLED_STATE)) return
    const isChosen = this.send("ui-choosing", { value: UIMenu.valueOf(item), item, originalEvent: event })
    if (!isChosen || !this.isSegmented) return
    if (this.choosesMany) this.toggle(item as ChoosableItem)
    else {
      this.chooseOnly(item)
      if (this.isAFormValue) this.chooseValue(UIMenu.valueOf(item))
    }
  }

  ////////////////
  // ## As a form's control
  ////////////////

  /**
   * `:state(form-value)`:  a `segmented` menu choosing one, with a `name`:  `<ui-form>` reads its `value` and writes
   * it back, as a select's (`FormFields`), so a property editor draws its `buttons` kind with one (epic `debut` P31).
   */
  @E.cssState("form-value")
  get isAFormValue(): boolean {
    return this.isSegmented && !this.choosesMany && !!this.attributes.name
  }

  /** Now a form value:  a `<ui-form>` around it binds it (`ui-form-value`). */
  @E.onChange("isAFormValue", "isReady", { defer: true })
  protected onFormValueChanged(isAFormValue: boolean, isReady: boolean) {
    if (isAFormValue && isReady) E.afterSolidUpdate(() => this.send("ui-form-value", {}))
  }

  /** A person chose the item of `value`:  its `value` follows, then `ui-changed` with `{ value }`. */
  private chooseValue(value: string) {
    this.value = value
    this.send("ui-changed", { value })
  }

  /** `value` set (by the page, or a form's binding):  select its item, once the items have asked for their context. */
  @E.onChange("valueText", "isReady")
  protected onValueChanged(value: string | undefined, isReady: boolean) {
    if (isReady && value != null && this.isSegmented && !this.choosesMany) E.afterSolidUpdate(() => this.showValue())
  }

  /** Select the item of `value`, if it has asked for its context yet. */
  @E.untracked
  private showValue() {
    const value = this.valueText
    if (value == null) return
    const item = this.ownedItems().find((each) => UIMenu.valueOf(each) === value)
    if (item && !item.selected) this.chooseOnly(item)
  }

  /** `value`'s text, raw. */
  get valueText(): string | undefined {
    return this.attributes.value ?? undefined
  }

  /** An item's `value`, else its text. */
  private static valueOf(item: Element): string {
    const component = (item as E.DOMElement).component as ItemComponent | undefined
    return component?.value ?? item.textContent?.trim() ?? ""
  }

  /**
   * A segmented menu's choice:  `item` becomes the selected item, every other item of this menu tree drops it
   * (the `active` alias too).
   * - Only items that asked THIS menu for their context:  a nested component's items stay alone.
   */
  private chooseOnly(item: Element) {
    for (const element of this.ownedItems()) {
      if (element !== item) element.removeAttribute(UIT.ACTIVE)
      element.selected = element === item
    }
  }

  /**
   * A toggle menu's press (`choose="many"`):  `item` turns on, or off;  then `ui-changed` with the items on.
   * - One stays on:  turning off the only one on turns on the next that can be (shown, not disabled),
   *   to its right or below, round to the first (Owen:  "the stuck value is \"squirting over\" to the next one").
   */
  private toggle(item: ChoosableItem) {
    const items = this.ownedItems().filter((each) => !each.hidden && !each.matches(UIT.DISABLED_STATE))
    // the property, fresh right after a write (its `:state(selected)` follows a moment later)
    const isOn = (each: ChoosableItem) => !!each.selected
    if (!isOn(item)) item.selected = true
    else {
      if (!items.some((each) => each !== item && isOn(each))) {
        const index = items.indexOf(item)
        const next = [...items.slice(index + 1), ...items.slice(0, Math.max(0, index))][0]
        if (!next) return
        next.selected = true
      }
      item.removeAttribute(UIT.ACTIVE)
      item.selected = false
    }
    this.send("ui-changed", {
      values: this.ownedItems()
        .filter(isOn)
        .map((each) => UIMenu.valueOf(each))
    })
  }

  /** Item DOM elements that asked THIS menu for their context, in page order. */
  @E.untracked
  private ownedItems(): ChoosableItem[] {
    return [...this.domElement.querySelectorAll<ChoosableItem>("*")].filter((each) => this.itemsThatAsked.has(each))
  }

  ////////////////
  // ## The sliding thumb
  ////////////////

  /** The top menu's box (its `nav`, or the menubar), while rendered:  a segmented menu's track. */
  protected box: HTMLElement | undefined

  /** A segmented menu's sliding thumb, while drawn. */
  private thumb: SegmentedThumb | undefined

  /** A top-level `segmented` menu, rendered:  it draws a sliding thumb. */
  get hasThumb(): boolean {
    return !this.parentMenu && this.isSegmented && !this.choosesMany && this.isReady
  }

  /** SIDE EFFECT:  the thumb, drawn on the menu's box while `hasThumb`;  its cleanup takes it down. */
  @E.onChange("hasThumb", "interactive")
  protected onThumbChanged(hasThumb: boolean) {
    const box = this.box
    if (!hasThumb || !box) return
    const thumb = new SegmentedThumb({ track: box, chosenBox: () => this.chosenBox() })
    this.thumb = thumb
    const stop = thumb.start()
    return () => {
      stop()
      this.thumb = undefined
    }
  }

  /**
   * An item's `selected` (or `active`) changed, items came and went, showed or hid, or their words changed:
   * the thumb moves to the chosen one, and a `shrinkable` menu fits again.
   */
  @E.watches({
    attributes: true,
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: [UIT.SELECTED, UIT.ACTIVE, "hidden"]
  })
  protected onChoiceChanged() {
    this.thumb?.update()
    this.titleFit?.update()
    this.readFolded()
  }

  /** The chosen item's box (in its own shadow root), among the items this menu owns. */
  @E.untracked
  private chosenBox(): HTMLElement | undefined {
    for (const element of this.domElement.querySelectorAll<HTMLElement>("*")) {
      if (!this.itemsThatAsked.has(element) || element.hidden || !element.matches(SELECTED_STATE)) continue
      return element.shadowRoot?.querySelector<HTMLElement>(ITEM_BOX) ?? undefined
    }
    return undefined
  }

  ////////////////
  // ## Fitting titles (`shrinkable`)
  ////////////////

  /** It fits its titles to its row:  `shrinkable`, a top-level menu whose items run sideways. */
  get isShrinking(): boolean {
    return this.shrinkable && !this.parentMenu && !this.isVertical
  }

  /** The stage `TitleFit` found:  `whole`, the widest a title may be (cut), `icons` or `overflow`. */
  @E.state accessor fitAnswer: FitAnswer = WHOLE

  /** The titles are gone, the icons only:  `:state(icons-only)`. */
  @E.cssState("icons-only")
  get isIconsOnly(): boolean {
    return this.isShrinking && this.fitAnswer === ICONS
  }

  /** Every item folded into the overflow button:  `:state(overflow)`. */
  @E.cssState("overflow")
  get isFolded(): boolean {
    return this.isShrinking && this.fitAnswer === OVERFLOW && !this.isSegmented
  }

  /** A `segmented` one shows as a dropdown, its overflow button showing the chosen item:  `:state(dropdown)`. */
  @E.cssState("dropdown")
  get isDropdown(): boolean {
    return this.isShrinking && this.fitAnswer === OVERFLOW && this.isSegmented
  }

  /** Shrinking, and drawn:  `TitleFit` runs. */
  get canFit(): boolean {
    return this.isShrinking && this.isReady
  }

  /** The fitting, while it runs. */
  private titleFit: TitleFit | undefined

  /** SIDE EFFECT:  fits the titles while `canFit`, on the box drawn now;  its cleanup shows them whole again. */
  @E.onChange("canFit", "interactive", "appearance")
  protected onFitChanged(canFit: boolean) {
    const box = this.box
    if (!canFit || !box) return
    const fit = new TitleFit({
      box,
      domElement: this.domElement,
      children: () => this.fitChildren(),
      isSegmented: () => this.isSegmented,
      onAnswer: (answer) => this.onFitAnswer(answer)
    })
    this.titleFit = fit
    const stop = fit.start()
    return () => {
      stop()
      this.titleFit = undefined
      this.fitAnswer = WHOLE
    }
  }

  /** A new stage:  the thumb follows its choice's box, the overflow menu closes once it's gone. */
  private onFitAnswer(answer: FitAnswer) {
    this.fitAnswer = answer
    this.thumb?.update()
    this.readFolded()
    if (answer !== OVERFLOW) this.overflowMenu.close()
  }

  /**
   * What `TitleFit` fits:  the box's own items with words (each its box and title box), and everything else in
   * the row (another button, a sub-menu, an item with only an icon).
   */
  @E.untracked
  private fitChildren(): { rows: FitRow[]; others: Element[] } {
    const rows: FitRow[] = []
    const others: Element[] = []
    for (const element of this.rowElements()) {
      const item = this.fittedItem(element)
      if (item) rows.push({ box: item.focusTarget!, title: item.titleBox! })
      else others.push(element)
    }
    return { rows, others }
  }

  /** The elements in the box's default slot:  its row. */
  @E.untracked
  private rowElements(): Element[] {
    return this.box?.querySelector<HTMLSlotElement>(DEFAULT_SLOT)?.assignedElements() ?? []
  }

  /** `element`'s component, when it's an item this menu fits:  its own, drawn with a title box, not hidden. */
  private fittedItem(element: Element): ItemComponent | undefined {
    if (!this.itemsThatAsked.has(element) || (element as HTMLElement).hidden) return undefined
    const item = (element as E.DOMElement).component as ItemComponent | undefined
    return item?.kind === UIT.ITEM && item.focusTarget && item.titleBox ? item : undefined
  }

  ////////////////
  // ## The overflow button and its menu
  ////////////////

  /** The items the overflow menu holds, a row each, read from the page's items (`readFolded()`). */
  @E.state({ equals: isSameFolded }) accessor folded: readonly FoldedItem[] = []

  /** The chosen item, among them:  what a segmented one's dropdown shows. */
  get chosen(): FoldedItem | undefined {
    return this.folded.find((row) => row.isSelected)
  }

  /** Some item inside has a count:  a dot on the overflow button (epic `epic-engine` Q37). */
  get hasFoldedBadge(): boolean {
    return this.folded.some((row) => row.hasBadge)
  }

  /** Read the overflow menu's rows from the fitted items, now. */
  @E.untracked
  private readFolded() {
    if (!this.isShrinking) {
      this.folded = []
      return
    }
    const rows: FoldedItem[] = []
    for (const element of this.rowElements()) {
      const item = this.fittedItem(element)
      if (!item) continue
      const text = item.titleText ?? ""
      rows.push({
        element,
        text,
        icon: item.icon || undefined,
        letter: item.firstLetter,
        isSelected: !!item.isSelected,
        isDisabled: !!item.isDisabled,
        hasBadge: !!item.hasBadge
      })
    }
    this.folded = rows
  }

  /**
   * The overflow menu:  its own open state (the menu sends no open or close events), a popover hung from its button,
   * and its `UI.overlays` entry while open:  Escape or a click outside closes it, focus back on its button for Escape.
   */
  readonly overflowMenu = new E.PopoverPanel({
    component: this,
    restoreFocus: false,
    onDismiss: (reason) => this.closeOverflow(reason === "escape")
  })

  /** The overflow menu is open. */
  get isOverflowOpen(): boolean {
    return this.overflowMenu.isOpen
  }

  /** The overflow button, while drawn. */
  private overflowButton: HTMLButtonElement | undefined

  /** The overflow menu's box, while drawn. */
  private overflowPanel: HTMLElement | undefined

  /** The overflow menu's `id`:  its button's `aria-controls`. */
  @E.lazy
  get overflowMenuId(): string {
    return UI.ids.next(this.vocabulary.tag)
  }

  /** The overflow button's name and tooltip, and its menu's:  "More". */
  get moreText(): string {
    return this.translationForKey("more")
  }

  /** The `…` on the overflow button. */
  readonly moreGlyph = new E.IconGlyph({ owner: this, name: () => (this.isShrinking ? MORE_ICON : undefined) })

  /** A segmented one's dropdown:  its caret, and the chosen item's icon. */
  readonly caretGlyph = new E.IconGlyph({
    owner: this,
    name: () => (this.isShrinking && this.isSegmented ? CARET_ICON : undefined)
  })
  readonly chosenGlyph = new E.IconGlyph({
    owner: this,
    name: () => (this.isShrinking && this.isSegmented ? this.chosen?.icon : undefined)
  })

  /**
   * SIDE EFFECT:  the overflow menu shows in the top layer while open, with its `UI.overlays` entry
   * (`PopoverPanel.follow()`), its chosen row (else its first) focused;  the cleanup hides it.
   */
  @E.onChange("isOverflowOpen", "isConnected")
  protected onOverflowOpenChanged(isOpen: boolean, isConnected: boolean) {
    const hide = this.overflowMenu.follow(this.overflowPanel, isOpen && isConnected)
    if (hide)
      E.afterSolidUpdate(() =>
        this.focusRow(
          Math.max(
            0,
            this.folded.findIndex((row) => row.isSelected)
          )
        )
      )
    return hide
  }

  /** Open the overflow menu, its rows read fresh. */
  @E.untracked
  openOverflow() {
    this.readFolded()
    this.overflowMenu.open()
  }

  /** Close the overflow menu;  `refocus`:  focus goes back to its button (Escape, Tab, a pick). */
  @E.untracked
  closeOverflow(refocus = false) {
    this.overflowMenu.close()
    if (refocus) this.overflowButton?.focus()
  }

  /** Focus row `index` of the overflow menu, as it opens. */
  private focusRow(index: number) {
    this.overflowPanel?.querySelectorAll<HTMLElement>(ROWS)[index]?.focus()
  }

  /** The overflow button's keys:  ↓ opens it, as Enter and Space do (a click). */
  @E.untracked
  private readonly onOverflowButtonKey = (event: KeyboardEvent) => {
    if (event.key !== UIT.Key.arrowDown) return
    event.preventDefault()
    this.openOverflow()
  }

  /**
   * The overflow menu's keys:  ↑ ↓ Home End move, wrapping, past disabled rows (`UI.focus.arrowKey()`);
   * Escape closes it, focus back on its button;  Tab closes it.
   */
  @E.untracked
  private readonly onOverflowMenuKey = (event: KeyboardEvent) => {
    const container = event.currentTarget as HTMLElement
    if (UI.focus.arrowKey(event, { container, items: ROWS, orientation: "vertical", tabindex: "left alone" })) return
    if (event.key === UIT.Key.escape) {
      event.preventDefault()
      this.closeOverflow(true)
    } else if (event.key === UIT.Key.tab) this.closeOverflow(true)
  }

  /** A row was picked:  the menu closes, focus goes back to its button, and the real item is clicked. */
  @E.untracked
  private pickFolded(row: FoldedItem) {
    if (row.isDisabled) return
    this.closeOverflow(true)
    const item = (row.element as E.DOMElement).component as ItemComponent | undefined
    item?.focusTarget?.click()
  }

  /** The overflow button, first in the box:  it shows only once the items fold into it (`UIMenu.css`). */
  private overflowButtonBox(): JSX.Element {
    return (
      <Show when={this.isShrinking && !isServer}>
        <button
          ref={(element: HTMLButtonElement) => (this.overflowButton = element)}
          type="button"
          class={OVERFLOW_ITEM_CLASS}
          part={this.partForName("overflow")}
          style={this.overflowMenu.anchorStyle}
          role={this.interactive ? "menuitem" : undefined}
          aria-haspopup="menu"
          aria-expanded={this.overflowMenu.ariaExpanded}
          aria-controls={this.overflowMenuId}
          aria-label={this.isSegmented ? undefined : this.moreText}
          title={this.isSegmented ? this.chosen?.text : this.moreText}
          onClick={() => (this.isOverflowOpen ? this.closeOverflow() : this.openOverflow())}
          onKeyDown={this.onOverflowButtonKey}
        >
          <Show when={this.isSegmented} fallback={this.moreFace()}>
            {this.dropdownFace()}
          </Show>
        </button>
      </Show>
    )
  }

  /** The overflow button's `…` (or the `overflow` slot's own), and a dot while an item inside has a count. */
  private moreFace(): JSX.Element {
    return (
      <>
        <span class={UIT.ICON}>
          <slot name={this.slotForName("overflow")}>{this.moreGlyph.svg}</slot>
        </span>
        <Show when={this.hasFoldedBadge}>
          <span class={DOT} aria-hidden="true" />
        </Show>
      </>
    )
  }

  /** A segmented one's dropdown:  the chosen item's icon and title, and a caret. */
  private dropdownFace(): JSX.Element {
    return (
      <>
        <Show when={this.chosenGlyph.svg}>
          <span class={UIT.ICON}>{this.chosenGlyph.svg}</span>
        </Show>
        <span class={TITLE}>{this.chosen?.text}</span>
        <span class={CARET}>{this.caretGlyph.svg}</span>
      </>
    )
  }

  /** The overflow menu:  a popover in the top layer, hanging from its button, a row per folded item. */
  private overflowMenuBox(): JSX.Element {
    return (
      <Show when={this.isShrinking && !isServer}>
        <div
          ref={(element: HTMLElement) => (this.overflowPanel = element)}
          id={this.overflowMenuId}
          class={OVERFLOW_MENU_CLASS}
          part={this.partForName("overflow-menu")}
          role="menu"
          popover="manual"
          style={this.overflowMenu.panelStyle}
          aria-label={this.moreText}
          onKeyDown={this.onOverflowMenuKey}
        >
          <For each={this.folded}>{(row) => this.foldedRow(row)}</For>
        </div>
      </Show>
    )
  }

  /**
   * One row of the overflow menu:  the item's icon (its `icon`, a copy of what's in its `icon` slot, else its first
   * letter), its title and a copy of its counts;  the chosen one a `menuitemradio`, ticked.
   */
  private foldedRow(row: FoldedItem): JSX.Element {
    const item = (row.element as E.DOMElement).component as ItemComponent | undefined
    const copies = (name: "icon" | "badge") =>
      (item?.slotted?.(name) ?? []).map((element) => {
        const copy = element.cloneNode(true) as Element
        copy.removeAttribute("slot")
        return copy
      })
    const icons = copies("icon")
    const badges = copies("badge")
    const glyph = row.icon ? new E.IconGlyph({ owner: this, name: () => row.icon }) : undefined
    return (
      <button
        type="button"
        class={[ROW, { [SELECTED_CLASS]: row.isSelected, [DISABLED_CLASS]: row.isDisabled }]}
        role={row.isSelected ? "menuitemradio" : "menuitem"}
        aria-checked={row.isSelected ? "true" : undefined}
        aria-disabled={row.isDisabled ? "true" : undefined}
        tabindex="-1"
        onClick={() => this.pickFolded(row)}
      >
        <span class={UIT.ICON} aria-hidden="true">
          {glyph ? glyph.svg : icons.length ? icons : <span class={LETTER}>{row.letter}</span>}
        </span>
        <span class={TITLE}>{row.text}</span>
        {badges.length ? <span class={BADGE}>{badges}</span> : undefined}
      </button>
    )
  }

  ////////////////
  // ## The menubar
  ////////////////

  /** Top-level and `interactive`?  `:state(interactive)`;  not `isMenubar`, which also waits for `isReady`. */
  @E.cssState("interactive")
  get isInteractiveMenubar(): boolean {
    return !this.parentMenu && this.interactive
  }

  /** The menubar is live:  top-level, `interactive`, rendered. */
  get isMenubar(): boolean {
    return !this.parentMenu && this.interactive && this.isReady
  }

  /** The menubar's arrow-key axis:  `vertical` menus go up and down. */
  private get orientation(): E.RovingOrientation {
    return this.isVertical ? "vertical" : "horizontal"
  }

  /** Live roving tabindex while `interactive`. */
  private rovingTabindex: E.RovingTabindex | undefined

  /** The menubar root, while rendered. */
  private bar: HTMLElement | undefined

  /** SIDE EFFECT:  a roving tabindex over the item DOM elements while this is a menubar;  returns its stop. */
  @E.onChange("isMenubar", "orientation")
  protected onMenubarChanged(isMenubar: boolean, orientation: E.RovingOrientation) {
    if (!isMenubar) return
    E.afterSolidUpdate(() => this.startRoving(orientation))
    return () => this.stopRoving()
  }

  /** Start the roving tabindex on the menubar root, the selected item (or the first) as the tab stop. */
  private startRoving(orientation: E.RovingOrientation) {
    this.stopRoving()
    const bar = this.bar
    if (!bar || !this.domElement.isConnected) return
    const boxes = this.menuItems()
    const selected = boxes.findIndex((box) => (box.getRootNode() as ShadowRoot).host?.matches(SELECTED_STATE))
    this.rovingTabindex = UI.focus.roving({
      container: bar,
      items: () => this.menuItems(),
      orientation,
      activeIndex: Math.max(0, selected)
    })
  }

  /** Stop roving;  the item boxes lose the `tabindex`es it set. */
  private stopRoving() {
    if (!this.rovingTabindex) return
    this.rovingTabindex.detach()
    this.rovingTabindex = undefined
    for (const box of this.menuItems()) box.removeAttribute("tabindex")
  }

  /**
   * Re-apply the roving `tabindex`es once after Solid's update, however often asked,
   * after the item set may have changed (restarting before any focus);  a `shrinkable` menu fits again.
   */
  private readonly rovingRefresh = new E.Queued({ when: E.afterSolidUpdate, run: () => this.refreshRoving() })

  /** Queue `refreshRoving()`. */
  private queueRefresh() {
    this.rovingRefresh.ask()
  }

  /** The item set may have changed:  fit a `shrinkable` menu again, and re-apply the roving `tabindex`es. */
  private refreshRoving() {
    this.titleFit?.update()
    // items that asked since `value` was set:  select its item now
    if (this.isAFormValue) this.showValue()
    if (!this.rovingTabindex) return
    if (this.domElement.matches(":focus-within")) this.rovingTabindex.refresh()
    else this.startRoving(this.orientation)
  }

  /**
   * The roving set, in document order:  the item BOXES (`UIItem.focusTarget`) of items owned by this menu tree,
   * `type="item"`, not hidden.  Untracked:  called from handlers and effect cleanups.
   */
  @E.untracked
  private menuItems(): HTMLElement[] {
    const boxes: HTMLElement[] = []
    for (const element of this.domElement.querySelectorAll<HTMLElement>("*")) {
      if (!this.itemsThatAsked.has(element) || element.hidden) continue
      const item = (element as E.DOMElement).component as ItemComponent | undefined
      const box = item?.focusTarget
      if (box && item.kind === UIT.ITEM) boxes.push(box)
    }
    return boxes
  }

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * The root for this shape:  sub-menu, menubar or landmark;  the DOM element's `aria-label` names the last two.
   * - `shrinkable`:  the overflow button first in the box, and its menu after it (outside a menubar, whose children
   *   must all be its items).
   */
  render(): JSX.Element {
    return (
      <>
        {this.menuBox()}
        {this.overflowMenuBox()}
      </>
    )
  }

  /** The name of its landmark or menubar:  its `aria-label`, else its `label`. */
  private get landmarkLabel(): string | undefined {
    return this.attributes["aria-label"] ?? this.sharedLabel ?? undefined
  }

  /** The menu's box, for its shape. */
  private menuBox(): JSX.Element {
    return (
      <Switch>
        <Match when={this.parentMenu}>
          <div class={this.subMenuClasses} part={this.partForName("menu")}>
            <slot />
          </div>
        </Match>
        <Match when={this.interactive}>
          <div
            ref={(element: HTMLElement) => {
              this.bar = element
              this.box = element
            }}
            class={this.rootClass}
            part={this.partForName("menu")}
            role="menubar"
            aria-orientation={this.isVertical ? "vertical" : undefined}
            aria-label={this.landmarkLabel}
          >
            {this.overflowButtonBox()}
            <slot />
          </div>
        </Match>
        <Match when={true}>
          <nav
            ref={(element: HTMLElement) => (this.box = element)}
            class={this.rootClass}
            part={this.partForName("menu")}
            aria-label={this.landmarkLabel}
          >
            {this.overflowButtonBox()}
            <slot />
          </nav>
        </Match>
      </Switch>
    )
  }

  ////////////////
  // ## Statics
  ////////////////

  /**
   * The item DOM element whose link / button root the event went through, if any.
   * - STATIC:  needs no instance, only the event's path.
   * - `instanceof` is safe here:  a click handler, which the static render (`spell/ui/static`) never runs.
   */
  private static activatedItem(event: Event): Element | undefined {
    for (const target of event.composedPath()) {
      if (!(target instanceof HTMLElement)) continue
      if ((target.localName === "a" || target.localName === "button") && target.part.contains(UIT.ITEM)) {
        const root = target.getRootNode()
        return root instanceof ShadowRoot ? root.host : undefined
      }
    }
    return undefined
  }
}
/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIMenu extends E.AttributeValues<typeof menuVocabulary> {}

////////////////
// ## Constants
////////////////

/** Selector of a selected item DOM element:  the menubar's first tab stop. */
const SELECTED_STATE = ":state(selected)"

/** Selector of an item's box in its shadow root:  what a segmented menu's thumb covers. */
const ITEM_BOX = `.${UIT.ITEM}`

/** The `appearance` of a single-choice menu:  it moves `selected` itself. */
const SEGMENTED: UIT.MenuAppearance = "segmented"
/** `choose` of a menu of toggles. */
const MANY = "many"

/** The `appearance` word that makes every item interactive, with the link hover. */
const LINK_LOOK = "link"

/** The `direction` of a menu whose items run top to bottom. */
const VERTICAL = "vertical"

/** `TitleFit`'s stages the menu tells apart. */
const WHOLE = "whole"
const ICONS = "icons"
const OVERFLOW = "overflow"

/** The box's default slot:  its row. */
const DEFAULT_SLOT = ":scope > slot:not([name])"

/** Icons of the overflow button:  `…`, and a segmented one's dropdown caret. */
const MORE_ICON = "ellipsis horizontal"
const CARET_ICON = "caret down"

/** Class words of the overflow button (drawn as an item), its menu and their pieces (`UIMenu.css`, "Shrinkable"). */
const OVERFLOW_ITEM_CLASS = `${UIT.ITEM} overflow`
const OVERFLOW_MENU_CLASS = "overflow-menu"
const ROW = "row"
const TITLE = "title"
const BADGE = "badge"
const LETTER = "letter"
const CARET = "caret"
const DOT = "dot"
const SELECTED_CLASS = "selected"
const DISABLED_CLASS = "disabled"

/** Selector of the overflow menu's rows, in its box. */
const ROWS = `:scope > .${ROW}`

////////////////
// ## Item types
////////////////

/** What the menu reads from an item's component (`UIItem`, not imported:  another family). */
type ItemComponent = {
  /** `kind` (its vocabulary getter):  `item`, `header` or `divider`;  only `item`s join the roving set */
  readonly kind?: string
  /** `value` (its vocabulary getter):  what `ui-select` reports for the item (default its text) */
  readonly value?: string
  /** the item's box that takes focus (its link or button), once rendered */
  focusTarget?: HTMLElement
  /** its title box, in a `shrinkable` menu */
  readonly titleBox?: HTMLElement
  /** its title, as a person reads it */
  readonly titleText?: string
  /** its `icon` attribute */
  readonly icon?: string
  /** selected (or `active`) */
  readonly isSelected?: boolean
  /** disabled */
  readonly isDisabled?: boolean
  /** something in its `badge` slot */
  readonly hasBadge?: boolean
  /** its title's first letter:  what stands for it with no icon */
  readonly firstLetter?: string
  /** its light-DOM children in slot `name` */
  slotted?(name: "icon" | "badge"): Element[]
}

/** One row of a `shrinkable` menu's overflow menu:  a fitted item, as read when it was (`readFolded()`). */
type FoldedItem = {
  /** the item's DOM element:  what a pick clicks */
  readonly element: Element
  /** its title */
  readonly text: string
  /** its `icon` attribute */
  readonly icon: string | undefined
  /** its title's first letter:  its icon when it has none */
  readonly letter: string | undefined
  /** selected:  ticked */
  readonly isSelected: boolean
  /** disabled:  can't be picked */
  readonly isDisabled: boolean
  /** has a count */
  readonly hasBadge: boolean
}

/** What the menu writes on an item's DOM element it chooses (`UIItem`'s reflected `selected`). */
type ChoosableItem = HTMLElement & {
  /** the item's `selected` property */
  selected?: boolean
}
