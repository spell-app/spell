import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-item.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-item>`, which a submenu extends)
import { UIItem } from "spell/ui/components/ui-item"
import type { itemVocabulary } from "spell/ui/components/ui-item/UIItem.en"
import { SubMenuAim } from "./SubMenuAim"
import type { UIMenu } from "./UIMenu"
import { submenuVocabulary } from "./UISubmenu.en"

import submenuCSS from "./UISubmenu.css?inline"

/**
 * `ui-choosing`, a menu's choice:  the `<ui-menu>` it draws round its items is always English.
 * - Above the class:  `@E.on(CHOOSING)` reads it while the class is defined.
 */
const CHOOSING = "ui-choosing"

/**
 * The fly-out's box, while open:  a raised panel beside the row, its top level with the row's, on its other side
 * when it doesn't fit, framing the menu inside (which draws no frame of its own:  `UIMenu.isInPopup`).
 * - `position-anchor: auto`:  the row, its implicit anchor (`showPopover({ source })`).
 * - Tokens, so a theme restyles it:  `--ui-popup-background` (else `--ui-surface`), `--ui-border-color`,
 *   `--ui-menu-radius`, `--ui-shadow-raised`;  inside a popup, the popup's own background (it inherits its token).
 * - As wide as what it holds (so it turns to the other side rather than squeezing), at most the window's width less
 *   a margin;  at most its height, scrolling inside.
 * - `--ui-menu-margin: 0`:  the menu inside sits flush in its frame.
 * - The popover's own look (`inset`, `margin`, `padding`, `border`, `background`) is replaced, and a named menu
 *   (`display: contents`, as every menu) gets a box.
 * - Above the class:  `elementSetup`'s sheet (`FLYOUT_SHEET`) reads it while the class is defined.
 */
const FLYOUT_STYLE: Readonly<Record<string, string>> = {
  display: "block",
  position: "fixed",
  "position-anchor": "auto",
  "position-area": "inline-end span-block-end",
  "position-try-fallbacks": "flip-inline, flip-block, flip-block flip-inline",
  inset: "auto",
  margin: "calc(-0.25em - var(--ui-border-width, 1px)) 0",
  padding: "0.25em 0",
  "box-sizing": "border-box",
  width: "max-content",
  "max-height": "100%",
  "max-width": "calc(100vw - 1em)",
  "overflow-y": "auto",
  "overscroll-behavior": "contain",
  color: "var(--ui-text-color)",
  background: "var(--ui-popup-background, var(--ui-surface))",
  border: "var(--ui-border-width) solid var(--ui-border-color)",
  "border-radius": "var(--ui-menu-radius, var(--ui-radius))",
  "box-shadow": "var(--ui-shadow-raised)",
  "--ui-menu-margin": "0"
}

/**
 * The box drawn round the items inside, while open:  `FLYOUT_STYLE`, as a rule of its own sheet, never inline.
 * - So a page's `::part(flyout)` rules win over it (a page's rule beats a shadow root's own):
 *   its background, blur, padding, min-width.
 * - Above the class:  `elementSetup` reads it while the class is defined.
 */
const FLYOUT_SHEET = `@layer ui.components.submenu.types { .flyout:popover-open { ${Object.entries(FLYOUT_STYLE)
  .map(([name, value]) => `${name}: ${value};`)
  .join(" ")} } }`

/****************
 * ### `<ui-submenu>`
 * The component behind `<ui-submenu>`:  a row of a menu that opens a FLY-OUT, another menu beside it.
 *
 *     <button class="item" part="item" role="menuitem" aria-haspopup="menu" aria-expanded>   (`UIItem`'s box)
 *       <span class="icon" part="icon">  <svg>  </span>                     (with an icon)
 *       <span class="title" part="title">  Theme  </span>                    (its `label`)
 *       <span class="chevron" part="chevron">  <svg>  </span>
 *     </button>
 *     <div class="flyout" part="flyout" popover="manual">                    (the items inside:  its own menu)
 *       <ui-menu direction="vertical" [size] [ticks] [icon-column]>  <slot>  </ui-menu>
 *     </div>
 *
 * - It IS a `<ui-item>` (it extends `UIItem`):  its menu owns it as one of its items, so its row sits in the menu's
 *   icon column, ticks gutter and roving focus as any item's.
 * - Its fly-out, EITHER:
 *   - the items written inside it, in a `<ui-menu>` it draws round them, sized as its own menu and with its ticks
 *     and icon column;  so no `<ui-menu>` is written inside
 *   - or the `<ui-menu>` its `menu` names, elsewhere on the page, shown where it is:  a popover anchored to the row,
 *     NOT moved, so the page's tree stays as it was written
 * - Either way the fly-out's menu is a fly-out (`UIMenu.isAFlyout`):  `role="menu"`, its items `menuitem`s,
 *   arrow keys between them, no frame of its own.
 *   - The fly-out's box is the frame:  a popover in the top layer, placed beside the row by CSS anchor positioning
 *     (`FLYOUT_STYLE`), turned to the other side at the window's edge.
 *   - Its anchor is the implicit one its row sets as it shows it (`showPopover({ source })`), as `<ui-popup>`'s is:
 *     a menu elsewhere on the page can't name an anchor inside this element's shadow root.
 * - Opening:
 *   - the pointer over its row;  `SubMenuAim` keeps it open while the pointer heads for it, across other rows
 *   - a click, Enter or Space;  the arrow key toward the fly-out (→, ← in a right-to-left page;  ↓ in a menu whose
 *     items run sideways).  By keyboard, focus goes to its first item.
 *   - Only one open per menu:  opening one closes the one open beside it (`openByOwner`).
 * - Closing:
 *   - the arrow key away from it, or Escape (`UI.overlays`):  focus back on the row
 *   - Tab, a click outside, the pointer settling on another row of its menu
 *   - choosing one of its items:  every fly-out closes, and the choice goes on up as a choice in the menu
 *     (the `ui-choosing` its menu sends, through the row;  a named menu's is sent again from the row)
 *   - its menu closing:  its row loses its box (a popup round the menu hid), so the fly-out goes too
 *     (a `ResizeObserver`)
 ****************/
export class UISubmenu extends UIItem {
  // its own names, and the item's it shares:  TypeScript only knows the item's literals
  @E.proto static vocabulary = submenuVocabulary as unknown as typeof itemVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { item: UIItem.elementSetup.styleSheets.item, submenu: submenuCSS, "submenu-flyout": FLYOUT_SHEET },
    // NOT a part, unlike an item:  the `<ui-menu>` it draws round its items stops climbing here,
    // so it's a menu of its own, not a sub-menu of the row's menu
    isAPart: false,
    // the item's own, restated:  its setup is typed as its literal
    disabled: "its own"
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The row
  ////////////////

  /** A click on its row opens its fly-out, never chooses it (`UIMenu`'s `ui-choosing`). */
  get opensAMenu(): boolean {
    return true
  }

  /** Always a button:  something to press, in any menu. */
  get rootTag(): "a" | "button" | "div" {
    return "button"
  }

  /** Always an item, never a header or divider:  its vocabulary has no `kind`. */
  get kind(): "item" {
    return UIT.ITEM
  }

  /** Its title:  its `label`;  what's written inside it is the fly-out's. */
  get titleText(): string {
    return this.label?.trim() ?? ""
  }

  /** It draws its label and chevron beside its icon, always. */
  protected get hasMoreThanItsIcon(): boolean {
    return true
  }

  /** No title box to fit:  a `shrinkable` menu leaves the row as it is. */
  get hasTitleBox(): boolean {
    return false
  }

  protected get boxHasPopup(): "menu" {
    return "menu"
  }

  protected get boxExpanded(): "true" | "false" {
    return this.flyout.ariaExpanded
  }

  /** The chevron at the row's end. */
  readonly chevronGlyph = new E.IconGlyph({ owner: this, name: () => (this.itemContext ? CHEVRON_ICON : undefined) })

  /** The row's menu:  the component its row asked for its item context. */
  get ownerMenu(): UIMenu | undefined {
    return this.context.ownerComponent<UIMenu>()
  }

  /** The row's menu's DOM element:  where the one fly-out open at a time is kept. */
  private get ownerElement(): Element | undefined {
    return this.context.owner?.owner
  }

  ////////////////
  // ## The fly-out
  ////////////////

  /** Its fly-out is showing:  `:state(open)`. */
  @E.cssState("open")
  @E.state
  accessor isOpen = false

  /** How many have been made:  each fly-out's `UI.overlays` pool is its own (`flyout`, below, reads it). */
  private static made = 0

  /**
   * The fly-out:  its open state, a popover beside the row, and its `UI.overlays` entry while open.
   * - A pool of its own, each fly-out:  a click outside them all closes every one open, and a popup round the menu.
   * - Escape closes it, focus back on the row;  a click outside closes it.
   */
  readonly flyout = new E.PopoverPanel({
    component: this,
    member: "isOpen",
    restoreFocus: false,
    pool: `${FLYOUT_POOL}-${++UISubmenu.made}`,
    alsoInside: () => (this.namesAMenu ? this.namedMenu() : undefined),
    onDismiss: (reason) => this.close({ refocus: reason === "escape" })
  })

  /** Its fly-out is the menu its `menu` names, elsewhere on the page. */
  get namesAMenu(): boolean {
    return !!this.attributes.menu
  }

  /** The `<ui-menu>` its `menu` names, in its own tree, if it's there. */
  @E.untracked
  private namedMenu(): HTMLElement | undefined {
    const id = this.attributes.menu
    if (!id || !this.domElement.isConnected) return undefined
    return (this.domElement.getRootNode() as Document | ShadowRoot).getElementById?.(id) ?? undefined
  }

  /**
   * An item written inside it says whether it's on or off (`selected` or `active`, written, `"false"` too):
   * its fly-out ticks what's on, in a menu of its own without `ticks` too (the ☰ menu's View ›).
   * - Watches the items' attributes:  one ticked later gets its gutter then.
   */
  @E.watches({ childList: true, subtree: true, attributes: true })
  get hasOnOrOffItems(): boolean {
    return [...this.domElement.children].some((child) => UISubmenu.isOnOrOff(child))
  }

  /** The box drawn round the items inside, while drawn. */
  private panel: HTMLElement | undefined

  /** The `<ui-menu>` drawn round the items inside, while drawn. */
  private innerMenu: HTMLElement | undefined

  /** The fly-out's box:  the named menu, else the box drawn round the items inside. */
  @E.untracked
  private get flyoutBox(): HTMLElement | undefined {
    return this.namesAMenu ? this.namedMenu() : this.panel
  }

  /** The fly-out's menu:  the named one's component, else the one drawn round the items inside. */
  @E.untracked
  private get flyoutMenu(): UIMenu | undefined {
    const element = this.namesAMenu ? this.namedMenu() : this.innerMenu
    return (element as E.DOMElement | undefined)?.component as UIMenu | undefined
  }

  /**
   * Drawn:  its fly-out's menu becomes a fly-out (`role="menu"`), and a named menu a hidden popover,
   * so it's ready before it first opens.
   */
  @E.onChange("isReady", "isConnected")
  protected onReadyForFlyout(isReady: boolean, isConnected: boolean) {
    if (isReady && isConnected) E.afterSolidUpdate(() => this.prepareFlyout())
  }

  /** Make the fly-out's menu a fly-out, and a named menu a popover, hidden until shown;  its box, if it's there. */
  @E.untracked
  private prepareFlyout(): HTMLElement | undefined {
    const box = this.flyoutBox
    if (box && this.namesAMenu && box.popover !== MANUAL) box.popover = MANUAL
    const menu = this.flyoutMenu
    if (menu && !menu.isAFlyout) menu.isAFlyout = true
    return box
  }

  /**
   * Open its fly-out, as a person would;  the one open beside it in its menu closes.
   * - `byKeyboard`:  focus goes to its first item.
   * - `pointer`:  the pointer event that opened it, where `SubMenuAim` starts from.
   * - Nothing while disabled, or outside a menu.
   */
  @E.untracked
  open({ byKeyboard = false, pointer }: OpenedBy = {}): void {
    if (this.isDisabled || !this.itemContext) return
    const owner = this.ownerElement
    const other = owner && UISubmenu.openByOwner.get(owner)
    if (other && other !== this) other.close()
    this.focusesOnShow = byKeyboard
    this.openedAt = pointer
    if (this.isOpen) {
      if (byKeyboard) this.focusFlyout()
      return
    }
    this.flyout.open()
  }

  /** Close its fly-out;  `refocus`:  focus back on its row (Escape, the arrow key away). */
  @E.untracked
  close({ refocus = false }: { refocus?: boolean } = {}): void {
    if (this.isOpen) this.flyout.close()
    if (refocus) this.focusTarget?.focus()
  }

  /** Open by keyboard:  its first item takes focus once it shows. */
  private focusesOnShow = false

  /** Where the pointer was as it opened on hover. */
  private openedAt: PointerEvent | undefined

  /**
   * SIDE EFFECT:  while open, the fly-out shows beside the row, framed and placed (`FLYOUT_STYLE`),
   * with what follows it:  the pointer on its menu, its keys, a named menu's choices, the row's box, the aim.
   * - The cleanup hides it and stops them all.
   */
  @E.onChange("isOpen", "isConnected", "isReady")
  protected onOpenChanged(isOpen: boolean, isConnected: boolean, isReady: boolean) {
    if (!isOpen || !isConnected || !isReady) return
    const row = this.focusTarget
    const box = this.prepareFlyout()
    if (!row || !box) {
      if (!box) E.Warnings.warn("<ui-submenu>", `no menu with id ${JSON.stringify(this.attributes.menu)} to show`)
      E.afterSolidUpdate(() => this.close())
      return
    }
    // the box drawn round the items inside is framed by its own sheet (`FLYOUT_SHEET`)
    const unframe = this.namesAMenu ? UISubmenu.frame(box) : undefined
    const hide = this.flyout.follow(box, true, row)
    // `HTMLElement`'s event map, for `pointerover`
    const owner = this.ownerElement as HTMLElement | undefined
    if (owner) UISubmenu.openByOwner.set(owner, this)

    const listeners = new AbortController()
    const { signal } = listeners
    owner?.addEventListener("pointerover", this.onMenuPointerOver, { signal })
    box.addEventListener("keydown", this.onFlyoutKey, { signal })
    if (this.namesAMenu) box.addEventListener(this.choosingEventOf(box), this.onNamedMenuChoosing, { signal })
    // its menu closing (a popup round it hid):  the row has no box any more
    const rowWatch = new ResizeObserver(() => {
      if (!row.checkVisibility()) this.close()
    })
    rowWatch.observe(row)
    this.aim.start(this.openedAt)
    if (this.focusesOnShow) E.afterSolidUpdate(() => this.focusFlyout())

    return () => {
      listeners.abort()
      rowWatch.disconnect()
      this.aim.stop()
      hide?.()
      unframe?.()
      if (owner && UISubmenu.openByOwner.get(owner) === this) UISubmenu.openByOwner.delete(owner)
    }
  }

  /**
   * Focus the fly-out's chosen item, else its first, once it can take it
   * (a menu that just became a fly-out draws again first).
   */
  private focusFlyout() {
    if (this.focusChosen()) return
    E.beforeNextPaint(() => this.focusChosen())
  }

  /**
   * Focus what the fly-out opens to;  true when something in it took focus:
   * - its chosen item (`selected`, `active`), as a menu's tab stop is
   * - else the first thing in it that takes focus:  an item, or rich content that knows its own chosen row --
   *   a component with a `focusChosen()` (`<ui-theme-menu show="menu">`'s, which its host calls as it opens)
   */
  @E.untracked
  private focusChosen(): boolean {
    const menu = this.flyoutMenu
    if (!menu) return false
    if (menu.focusChosenItem()) return true
    for (const child of this.flyoutChildren()) {
      const component = (child as E.DOMElement).component as (object & { focusChosen?: () => void }) | undefined
      if (component instanceof UIItem && component.kind === UIT.ITEM && !component.isDisabled) break
      if (typeof component?.focusChosen !== "function") continue
      component.focusChosen()
      if (child.matches(":focus-within")) return true
    }
    return menu.focusFirstItem()
  }

  /** What its fly-out holds:  the named menu's children, else the items written inside it. */
  private flyoutChildren(): Element[] {
    return [...((this.namesAMenu ? this.namedMenu() : this.domElement)?.children ?? [])]
  }

  ////////////////
  // ## The pointer
  ////////////////

  /** Keeps the fly-out open while the pointer heads for it;  hands over to the row it settles on. */
  private readonly aim = new SubMenuAim({
    row: () => this.focusTarget,
    subMenu: () => (this.isOpen ? this.flyoutBox : undefined),
    onGiveUp: (path) => this.giveUpTo(path)
  })

  /** The pointer over its row:  its fly-out opens, unless the one open beside it is being aimed at. */
  @E.on("pointerover")
  protected onPointerOver(event: PointerEvent) {
    if (event.pointerType !== MOUSE || this.isInFlyout(event) || this.isOpen) return
    const owner = this.ownerElement
    const other = owner && UISubmenu.openByOwner.get(owner)
    if (other && other !== this && !other.aim.wantsToSwitch(event)) return
    this.open({ pointer: event })
  }

  /**
   * While open, the pointer over its menu:  over another row, the fly-out closes, unless the pointer is heading
   * for it (`SubMenuAim`).
   * - Another `<ui-submenu>`'s row opens its own, closing this one (its `onPointerOver()`, first).
   */
  @E.untracked
  private readonly onMenuPointerOver = (event: PointerEvent) => {
    if (event.pointerType !== MOUSE || event.composedPath().includes(this.domElement)) return
    if (this.aim.wantsToSwitch(event)) this.close()
  }

  /** The pointer stopped aiming at the fly-out:  it closes, and a `<ui-submenu>` the pointer is over opens. */
  @E.untracked
  private giveUpTo(path: EventTarget[]) {
    this.close()
    const owner = this.ownerElement
    for (const target of path) {
      const component = (target as E.DOMElement).component
      if (component === this) return
      if (component instanceof UISubmenu && component.ownerElement === owner) return component.open()
    }
  }

  /** The event came from inside its own fly-out (the box drawn round its items is in its shadow root). */
  private isInFlyout(event: Event): boolean {
    return !!this.panel && event.composedPath().includes(this.panel)
  }

  ////////////////
  // ## Keys and clicks
  ////////////////

  /** A right-to-left page:  ← opens, → closes. */
  @E.untracked
  private get isRightToLeft(): boolean {
    return this.domElement.matches(RIGHT_TO_LEFT)
  }

  /** The key that opens the fly-out from the row:  the arrow toward it;  ↓ in a menu whose items run sideways. */
  @E.untracked
  private get openKey(): UIT.Key {
    const menu = this.ownerMenu
    if (menu && !menu.isVertical && !menu.isAFlyout) return UIT.Key.arrowDown
    return this.isRightToLeft ? UIT.Key.arrowLeft : UIT.Key.arrowRight
  }

  /** The key that closes the fly-out from inside it:  the arrow away from it. */
  @E.untracked
  private get closeKey(): UIT.Key {
    return this.isRightToLeft ? UIT.Key.arrowRight : UIT.Key.arrowLeft
  }

  /** A click on its row (Enter and Space click it too):  its fly-out opens;  by keyboard, focus goes in. */
  @E.on("click")
  protected onRowClick(event: MouseEvent) {
    if (this.isInFlyout(event)) return
    this.open({ byKeyboard: event.detail === 0 })
  }

  /** The arrow toward the fly-out, on its row:  it opens, focus on its first item. */
  @E.on("keydown")
  protected onRowKey(event: KeyboardEvent) {
    if (this.isInFlyout(event) || event.key !== this.openKey) return
    event.preventDefault()
    event.stopPropagation()
    this.open({ byKeyboard: true })
  }

  /**
   * Keys inside the fly-out:  the arrow away from it closes it, focus back on its row;  Tab closes it.
   * - Stops there:  an outer fly-out's own keys don't hear it.
   */
  @E.untracked
  private readonly onFlyoutKey = (event: KeyboardEvent) => {
    if (event.key === this.closeKey) {
      event.preventDefault()
      event.stopPropagation()
      this.close({ refocus: true })
    } else if (event.key === UIT.Key.tab) this.close()
  }

  /** An item of its fly-out was chosen (its menu's `ui-choosing`, through the row):  every fly-out closes. */
  @E.on(CHOOSING)
  protected onChoosing() {
    this.close()
  }

  /**
   * An item of the named menu was chosen:  the choice is the row's menu's, as the items inside would be.
   * - It goes on up from the row (sent again, the same detail;  cancelling it cancels the menu's), not from where
   *   the named menu sits in the page.
   */
  @E.untracked
  private readonly onNamedMenuChoosing = (event: Event) => {
    event.stopPropagation()
    const { cancelable, detail } = event as CustomEvent
    const again = new CustomEvent(event.type, { bubbles: true, composed: true, cancelable, detail })
    if (!this.domElement.dispatchEvent(again)) event.preventDefault()
    this.close()
  }

  /** The `ui-choosing` event's name on `menu`'s tag:  a translated one's own (`<es-menu>`). */
  private choosingEventOf(menu: Element): string {
    const component = (menu as E.DOMElement).component as UIMenu | undefined
    return component?.elementDefinition.event(CHOOSING) ?? CHOOSING
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Outside a menu:  its items as they are.  In one:  its row, and the fly-out round the items inside. */
  render(): JSX.Element {
    return (
      <Show when={this.itemContext} fallback={<slot />}>
        {this.box()}
        <Show when={!this.namesAMenu && !isServer}>{this.flyoutPanel()}</Show>
      </Show>
    )
  }

  /** The row's label, then its chevron. */
  protected boxContent(): JSX.Element {
    return (
      <>
        <span class={TITLE} part={this.partForName("title")}>
          {this.label}
        </span>
        <span class={CHEVRON} part={this.submenuPart(CHEVRON)} aria-hidden="true">
          {this.chevronGlyph.svg}
        </span>
      </>
    )
  }

  /**
   * The box round the items inside, and the menu it draws them in:  the row's menu's size and icon column;
   * ticks when the row's menu has them, or an item inside is on or off (`hasOnOrOffItems`).
   * - As wide as its widest item (`UISubmenu.css`), not a vertical menu's fixed width.
   */
  private flyoutPanel(): JSX.Element {
    const menu = () => this.ownerMenu
    return (
      <div
        ref={(element: HTMLElement) => (this.panel = element)}
        class={FLYOUT}
        part={this.submenuPart(FLYOUT)}
        popover="manual"
      >
        <ui-menu
          ref={(element: HTMLElement) => (this.innerMenu = element)}
          direction="vertical"
          size={menu()?.size}
          ticks={menu()?.ticks || this.hasOnOrOffItems ? "" : undefined}
          icon-column={menu()?.iconColumn ? "" : undefined}
          aria-label={this.label}
        >
          <slot />
        </ui-menu>
      </div>
    )
  }

  /** A part of its own, beyond the item's (TypeScript knows only the item's). */
  private submenuPart(name: typeof CHEVRON | typeof FLYOUT): string {
    return this.partForName(name as never)
  }

  ////////////////
  // ## Statics
  ////////////////

  /** The `<ui-submenu>` whose fly-out is open, by its menu's DOM element:  one at a time per menu. */
  private static readonly openByOwner = new Map<Element, UISubmenu>()

  /** Forget which fly-outs are open:  for tests. */
  static reset(): void {
    UISubmenu.openByOwner.clear()
  }

  /**
   * `child` is an item that says whether it's on or off:  its `selected` or `active` written, true or false.
   * - Its component's word (`UIItem.saysOnOrOff`, a translated tag's own names);
   *   the English attributes before it has a component.
   */
  private static isOnOrOff(child: Element): boolean {
    const component = (child as E.DOMElement).component
    if (component instanceof UISubmenu) return false
    if (component instanceof UIItem) return component.saysOnOrOff
    return child.hasAttribute(UIT.SELECTED) || child.hasAttribute(UIT.ACTIVE)
  }

  /**
   * Frame and place a NAMED menu as a fly-out (`FLYOUT_STYLE`), inline;  returns what puts its own style back.
   * - Inline, and only while open:  a named menu is the page's element, and no sheet of this one reaches it.
   * - The box drawn round the items inside has the same rules in its sheet instead (`FLYOUT_SHEET`).
   * - STATIC:  needs no instance, only the box.
   */
  private static frame(box: HTMLElement): () => void {
    const { style } = box
    const before = Object.keys(FLYOUT_STYLE).map((name) => [name, style.getPropertyValue(name)] as const)
    for (const [name, value] of Object.entries(FLYOUT_STYLE)) style.setProperty(name, value)
    return () => {
      for (const [name, value] of before) {
        if (value) style.setProperty(name, value)
        else style.removeProperty(name)
      }
    }
  }
}
/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UISubmenu extends E.AttributeValues<typeof itemVocabulary> {}

/** How a fly-out was opened. */
type OpenedBy = {
  /** by a key:  focus goes to its first item */
  byKeyboard?: boolean
  /** by the pointer over the row:  where the aim starts */
  pointer?: PointerEvent
}

/** `pointerType` of a mouse:  the only pointer whose hover opens a fly-out (a touch taps the row). */
const MOUSE = "mouse"

/** The popover kind of the fly-out's box:  it opens and closes only as the row says. */
const MANUAL = "manual"

/**
 * The `UI.overlays` pools of the fly-outs, one each:  only the topmost entry of a pool hears an outside click,
 * so the fly-outs open inside each other, and a popup round the menu, all hear it.
 */
const FLYOUT_POOL = "ui-submenu"

/** Selector of an element in a right-to-left page. */
const RIGHT_TO_LEFT = ":dir(rtl)"

/** The chevron's icon, turned round in a right-to-left page (`UISubmenu.css`). */
const CHEVRON_ICON = "chevron right"

/** Class words and parts of the row's pieces and the fly-out's box. */
const TITLE = "title"
const CHEVRON = "chevron"
const FLYOUT = "flyout"
