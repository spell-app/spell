import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { pageLayoutVocabulary } from "./UIPageLayout.en"

import pageLayoutCSS from "./UIPageLayout.css?inline"

// Above the class:  `@E.watches` reads them while the class is defined

/** What a change to its light DOM may move:  an element in or out, or a `slot` changed. */
const LIGHT_DOM_CHANGES = { childList: true, subtree: true, attributes: true, attributeFilter: ["slot"] }

/****************
 * ### `DOMPageLayoutElement`
 * The DOM element of `<ui-page-layout>`:  its script API, `toggleDrawer()`.
 * Its component (`UIPageLayout`) carries it out.
 ****************/
export class DOMPageLayoutElement extends E.DOMElement<UIPageLayout> {
  /**
   * Show or hide the drawer, as its button does:  narrow, slide it over the page or away;  wide, switch it between
   * its icons only and all of it (`drawer`), and say so (`ui-toggle`).
   */
  toggleDrawer() {
    this.component?.toggleDrawer()
  }
}

/****************
 * ### `<ui-page-layout>`
 * The component behind `<ui-page-layout>`:  what stays on screen around a site's pages (epic `mockup` T39).
 * A site draws it once and puts each page in it, so going between pages redraws only the page.
 *
 *     <div class="layout" part="layout">                               (a grid:  the drawer's column, then the rest)
 *       <div class="drawer" part="drawer">                             (the whole height, at the start)
 *         <div class="drawer-box" part="drawer-box"> <slot name="drawer"> </div>
 *       </div>
 *       <div class="body">
 *         <ui-button part="menu-button">                              (narrow, with no `<ui-site-nav-button>`)
 *         <div part="menu"> <slot name="menu"> </div>                   (flush against the drawer)
 *         <div part="page-menu"> <slot name="page-menu"> </div>
 *         <div class="row">  left | page (the default slot) | right  </div>
 *         <div part="footer"> <slot name="footer"> </div>
 *       </div>
 *     </div>
 *
 * - Its OWN box, not the window and not a root:  Run draws a Spell site inside the editor's page.
 *   - So plain boxes, no landmarks:  a second `<main>` or banner inside the editor's page would be wrong;
 *     what's slotted brings its own (the navigation's `<nav>`).
 *   - At least as tall as the box it's in (`min-height: 100%`), the drawer running from top to bottom.
 * - A slot with nothing in it isn't drawn:  no column, no row, no gap.
 * - The page is a font size in from the drawer;  the menu's row is flush against it, the drawer's line their only
 *   edge.
 * - `drawer="compact"`:  the drawer shows only its icons, as the layout sets `collapsed` on each `<ui-site-nav>` in it.
 *   - The pointer resting on it (`--ui-hover-delay`), or the keyboard's focus coming into it, opens it over the page,
 *     all of it, without pushing the page:  its column keeps its width.  Leaving it closes it.
 *   - It grows out from the column's edge and shrinks back into it;  switched to all of it and back, the column
 *     widens and narrows (`UIPageLayout.css`, "Motion").
 * - Below 40em of its own box (a container query):  one column, and the drawer slides over the page from the start
 *   (`:state(open)`), from a `<ui-site-nav-button>` inside it, or its own menu button when it has none.
 *   - Escape closes it;  so does going to a page from it (`ui-navigating` from inside the drawer).
 * - `toggleDrawer()` (the `<ui-site-nav-button>`'s click):  narrow, slides the drawer in or out;  wide, switches
 *   `drawer` and sends `ui-toggle`.  Remembering the choice is the site's:  the layout keeps nothing.
 * - It finds its navigations and buttons by their English tags (`ui-site-nav`, `ui-site-nav-button`).
 ****************/
export class UIPageLayout extends E.UIComponent<typeof pageLayoutVocabulary> {
  @E.proto static vocabulary = pageLayoutVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "page-layout": pageLayoutCSS },
    DOMElement: DOMPageLayoutElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Regions
  ////////////////

  /** Which named slots have content. */
  readonly slots = new E.SlotContent(this.domElement)

  /** Has region `name` content?  An empty one isn't drawn. */
  has(name: Region): boolean {
    return this.slots.hasContent(this.slotForName(name))
  }

  ////////////////
  // ## The drawer:  compact, open
  ////////////////

  /** `drawer="compact"`:  the drawer shows only its icons. */
  @E.cssState("compact")
  get isCompact(): boolean {
    return this.drawer === COMPACT
  }

  /**
   * The drawer is open over the page:  slid in at a narrow width, or opened from its icons (`compact`).
   * - Wide and not compact, it changes nothing:  the drawer is all there.
   */
  @E.cssState("open") @E.state accessor isOpen = false

  /**
   * Below 40em of its own box:  one column, the drawer slid out of the way.
   * - Read from its style, where the width is decided (a container query in `UIPageLayout.css`):
   *   so the sheet stays the one truth.
   */
  @E.cssState("narrow") @E.state accessor isNarrow = false

  /** Does the drawer show all of it:  wide and not compact, or open over the page?  A drawer button's `aria-expanded`. */
  get isDrawerShown(): boolean {
    return this.isNarrow ? this.isOpen : !this.isCompact || this.isOpen
  }

  /**
   * The `<ui-site-nav>`s in the drawer:  slotted into it, or inside what is.
   * - English tags only, as `<ui-site-tabs>` finds its navigation.
   */
  @E.watches({ ...LIGHT_DOM_CHANGES, equals: E.isSameList })
  get drawerNavs(): readonly Element[] {
    return this.drawerElements().flatMap((element) =>
      element.localName === SITE_NAV ? [element] : [...element.querySelectorAll(SITE_NAV)]
    )
  }

  /** The navigations show only their icons:  compact, and not open over the page. */
  get showsIconsOnly(): boolean {
    return this.isCompact && !this.isOpen
  }

  /** SIDE EFFECT:  each navigation in the drawer is `collapsed` while it shows only its icons. */
  @E.onChange("drawerNavs", "showsIconsOnly", { writesDOMElement: true })
  protected onIconsOnlyChanged(navs: readonly Element[], showsIconsOnly: boolean) {
    for (const nav of navs) nav.toggleAttribute(COLLAPSED, showsIconsOnly)
  }

  /**
   * Show or hide the drawer:  narrow, slide it in or out (`:state(open)`);  wide, switch `drawer` between its icons
   * only and all of it, and send `ui-toggle`.  Script API, on the DOM element too.
   * - From its icons to all of it, the switch waits a frame:
   *   the column first holds the width it has, so it has a width to widen from (`isWidening`).
   */
  toggleDrawer() {
    if (this.isNarrow) {
      this.isOpen = !this.isOpen
      return
    }
    const oldState: DrawerState = this.isCompact ? COMPACT : FULL
    const newState: DrawerState = oldState === COMPACT ? FULL : COMPACT
    this.peekTimer?.cancel()
    this.cancelWidening?.()
    this.isOpen = false
    if (newState === FULL) {
      this.compactWidth = this.drawerColumn?.getBoundingClientRect().width
      this.isWidening = true
      this.cancelWidening = E.beforeNextPaint(() => this.switchDrawer(newState, oldState))
    } else {
      this.switchDrawer(newState, oldState)
    }
  }

  /** Switch `drawer` to `newState`, and say so (`ui-toggle`). */
  private switchDrawer(newState: DrawerState, oldState: DrawerState) {
    // The column at its held width at once (holding it starts a move of its own), so it's what it widens from
    if (this.isWidening && this.drawerColumn) {
      for (const move of this.drawerColumn.getAnimations()) move.finish()
      void getComputedStyle(this.drawerColumn).inlineSize
    }
    this.drawer = newState === COMPACT ? COMPACT : undefined
    this.send("ui-toggle", { newState, oldState })
    // ... held till it's no longer compact everywhere (`:state(compact)` follows a moment later)
    if (this.isWidening) this.cancelWidening = E.beforeNextPaint(() => (this.isWidening = false))
  }

  /** Escape closes the drawer open over the page. */
  @E.on("keydown")
  protected onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && this.isOpen) this.isOpen = false
  }

  /** Going to a page from the drawer closes it. */
  @E.on("ui-navigating")
  protected onNavigating(event: Event) {
    if (this.isOpen && this.isInDrawer(event.target)) this.isOpen = false
  }

  ////////////////
  // ## Opening the compact drawer
  ////////////////

  /** The wait before the pointer resting on the compact drawer opens it, while one runs. */
  private peekTimer: ReturnType<typeof E.after> | undefined

  /** The compact drawer's column width, kept while it's open over the page:  so the page doesn't move. */
  @E.state accessor compactWidth: number | undefined = undefined

  /** Switching from its icons to all of it, for a frame:  the compact column holds its width, to widen from. */
  @E.state accessor isWidening = false

  /** Stop waiting the frame `toggleDrawer()` waits before widening, while one runs. */
  private cancelWidening: (() => void) | undefined

  /** The pointer came onto the compact drawer:  open it after the page's hover delay (`--ui-hover-delay`). */
  private onDrawerEnter(event: PointerEvent) {
    if (!this.isCompact || this.isNarrow || this.isOpen || event.pointerType === "touch") return
    this.peekTimer?.cancel()
    this.peekTimer = E.after(UIPageLayout.hoverDelayOf(this.domElement), () => this.peek())
  }

  /** The pointer left the drawer:  close it, or stop waiting to open it. */
  private onDrawerLeave() {
    this.peekTimer?.cancel()
    if (this.isCompact && !this.isNarrow) this.isOpen = false
  }

  /** The keyboard's focus came into the compact drawer:  open it at once. */
  private onDrawerFocusIn() {
    if (this.isCompact && !this.isNarrow && !this.isOpen) this.peek()
  }

  /** The keyboard's focus left the compact drawer:  close it. */
  private onDrawerFocusOut(event: FocusEvent) {
    if (this.isCompact && !this.isNarrow && !this.isInDrawer(event.relatedTarget)) this.isOpen = false
  }

  /** Open the compact drawer over the page, its column kept at the width it has now. */
  private peek() {
    this.compactWidth = this.drawerColumn?.getBoundingClientRect().width
    this.isOpen = true
  }

  /** Its inline style:  the compact column's kept width, while it's open over the page or about to widen. */
  get layoutStyle(): Record<string, string | undefined> {
    const isHeld = (this.isCompact && !this.isNarrow && this.isOpen) || this.isWidening
    const width = isHeld ? this.compactWidth : undefined
    return { [COMPACT_WIDTH]: width === undefined ? undefined : `${width}px` }
  }

  ////////////////
  // ## Narrow
  ////////////////

  /** While connected:  read whether it's narrow, again each time its box changes size. */
  @E.whileConnected
  protected watchWidth() {
    if (isServer) return
    const resized = new ResizeObserver(() => (this.isNarrow = this.isSlidOver()))
    resized.observe(this.domElement)
    if (this.drawerColumn) resized.observe(this.drawerColumn)
    this.resized = resized
    return () => {
      resized.disconnect()
      this.resized = undefined
    }
  }

  /** What watches its box and the drawer's column for a new size, while connected. */
  private resized: ResizeObserver | undefined

  /** The drawer's column was drawn:  watch it too, as it's what goes narrow. */
  private drawerColumnDrawn(column: HTMLElement) {
    this.drawerColumn = column
    this.resized?.observe(column)
  }

  /** Is the drawer slid over the page, rather than beside it?  Its style says (`UIPageLayout.css`). */
  private isSlidOver(): boolean {
    return !!this.drawerColumn && getComputedStyle(this.drawerColumn).position === ABSOLUTE
  }

  /** Narrow, it closes as it widens:  wide, the open drawer would sit over the page. */
  @E.onChange("isNarrow", { defer: true })
  protected onNarrowChanged() {
    this.isOpen = false
  }

  /**
   * Does it draw its own menu button:  a drawer, and no `<ui-site-nav-button>` anywhere in its light DOM?
   * - Shown only at a narrow width (`UIPageLayout.css`).
   */
  @E.watches(LIGHT_DOM_CHANGES)
  get drawsMenuButton(): boolean {
    return this.has("drawer") && !this.domElement.querySelector(NAV_BUTTON)
  }

  ////////////////
  // ## The drawer's boxes
  ////////////////

  /** The drawer's column, while drawn. */
  private drawerColumn: HTMLElement | undefined

  /** The drawer's slot, while drawn. */
  private drawerSlot: HTMLSlotElement | undefined

  /** The elements slotted into the drawer:  its light-DOM children with its slot's name. */
  private drawerElements(): Element[] {
    const name = this.slotForName("drawer")
    return [...this.domElement.children].filter((child) => child.getAttribute("slot") === name)
  }

  /** Is `target` in the drawer:  its own boxes, or what's slotted into it? */
  private isInDrawer(target: EventTarget | null): boolean {
    if (!target || typeof (target as Node).nodeType !== "number") return false
    const node = target as Node
    if (this.drawerColumn?.contains(node)) return true
    const slotted = this.drawerSlot?.assignedElements({ flatten: true }) ?? this.drawerElements()
    return slotted.some((element) => element === node || element.contains(node))
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class={LAYOUT} part={this.partForName("layout")} style={this.layoutStyle}>
        <Show when={this.has("drawer")}>
          <div
            class={DRAWER}
            part={this.partForName("drawer")}
            ref={(element: HTMLElement) => this.drawerColumnDrawn(element)}
            onPointerEnter={(event: PointerEvent) => this.onDrawerEnter(event)}
            onPointerLeave={() => this.onDrawerLeave()}
            onFocusIn={() => this.onDrawerFocusIn()}
            onFocusOut={(event: FocusEvent) => this.onDrawerFocusOut(event)}
          >
            <div class={DRAWER_BOX} part={this.partForName("drawer-box")}>
              <slot name={this.slotForName("drawer")} ref={(slot: HTMLSlotElement) => (this.drawerSlot = slot)} />
            </div>
          </div>
        </Show>
        <div class={BODY}>
          <Show when={this.drawsMenuButton}>
            <ui-button
              class={MENU_BUTTON}
              part={this.partForName("menu-button")}
              icon={BARS}
              appearance={BASIC}
              size={SMALL}
              aria-label={this.translationForKey("menu")}
              title={this.translationForKey("menu")}
              aria-expanded={this.isOpen ? "true" : "false"}
              onClick={() => this.toggleDrawer()}
            />
          </Show>
          {this.region("menu")}
          {this.region("page-menu")}
          <div class={ROW}>
            {this.region("left")}
            <div class={PAGE} part={this.partForName("page")}>
              <slot />
            </div>
            {this.region("right")}
          </div>
          {this.region("footer")}
        </div>
      </div>
    )
  }

  /** Region `name`'s box around its slot, while it has content. */
  private region(name: Exclude<Region, "drawer">): JSX.Element {
    return (
      <Show when={this.has(name)}>
        <div class={name} part={this.partForName(name)}>
          <slot name={this.slotForName(name)} />
        </div>
      </Show>
    )
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * How long, in seconds, the pointer rests on the drawer before it opens:  the page's `--ui-hover-delay` (`800ms`,
   * `2s`), as every hover pop-up waits.
   * - REFACTOR:  the third reader of the token (`UIPopup.hoverDelay`, `DataTooltips`' `delayOf()`):
   *   one `hoverDelayOf(element)` in `spell/ui/util` for all three.
   */
  private static hoverDelayOf(element: Element): number {
    const value = getComputedStyle(element).getPropertyValue(HOVER_DELAY_TOKEN).trim()
    const seconds = parseFloat(value)
    if (Number.isNaN(seconds)) return 0
    return value.endsWith("ms") ? seconds / 1000 : seconds
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIPageLayout extends E.AttributeValues<typeof pageLayoutVocabulary> {}

/** A named region, each its slot's name. */
type Region = "menu" | "page-menu" | "drawer" | "left" | "right" | "footer"

/** What `ui-toggle` says the drawer was and is:  its icons only, or all of it. */
type DrawerState = typeof COMPACT | typeof FULL

/** `drawer="compact"`, and `ui-toggle`'s word for it. */
const COMPACT = "compact"

/** `ui-toggle`'s word for the whole drawer:  no `drawer`. */
const FULL = "full"

/** The navigation's tag, and its attribute for icons only. */
const SITE_NAV = "ui-site-nav"
const COLLAPSED = "collapsed"

/** The drawer's button's tag:  with one inside, the layout draws no menu button of its own. */
const NAV_BUTTON = "ui-site-nav-button"

/** The private custom property holding the compact column's kept width (`UIPageLayout.css`). */
const COMPACT_WIDTH = "--_page-layout-compact-width"

/** The page's hover delay (`styles.en.ts`'s `hoverDelay`). */
const HOVER_DELAY_TOKEN = "--ui-hover-delay"

/** The drawer's column's `position` while it's slid over a narrow page. */
const ABSOLUTE = "absolute"

/** The class words of its boxes (`UIPageLayout.css`). */
const LAYOUT = "layout"
const DRAWER = "drawer"
const DRAWER_BOX = "drawer-box"
const BODY = "body"
const ROW = "row"
const PAGE = "page"
const MENU_BUTTON = "menu-button"

/** Its own menu button's look:  today's site's. */
const BARS = "bars"
const BASIC = "basic"
const SMALL = "small"
