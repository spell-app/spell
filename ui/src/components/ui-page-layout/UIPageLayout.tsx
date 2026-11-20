import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { pageLayoutVocabulary } from "./UIPageLayout.en"

import pageLayoutCSS from "./UIPageLayout.css?inline"

// Above the class:  `@E.watches` reads them while the class is defined

/** What a change to its light DOM may move:  an element in or out, or a `slot` changed. */
const LIGHT_DOM_CHANGES = { childList: true, subtree: true, attributes: true, attributeFilter: ["slot"] }

/** A `<ui-site-nav-button>`'s attribute naming what it shows and hides:  `@E.watches` reads it too. */
const TOGGLES = "toggles"

/****************
 * ### `DOMPageLayoutElement`
 * The DOM element of `<ui-page-layout>`:  its script API, `toggleDrawer()`.
 * Its component (`UIPageLayout`) carries it out.
 ****************/
export class DOMPageLayoutElement extends E.DOMElement<UIPageLayout> {
  /**
   * Show or hide the drawer, as its button does:  narrow, slide it over the page or away;  wide, switch it between
   * its icons only and all of it (`drawer`), or with `drawer-hides`, between hidden and all of it;
   * and say so (`ui-toggle`).
   */
  toggleDrawer() {
    this.component?.toggleDrawer()
  }

  /**
   * Show or hide side bar `side` (`"left"` or `"right"`), as its button does:  wide, switch its attribute between
   * `hidden` and none, and say so (`ui-toggle`);  narrow, with a button for it, slide it over the page or away.
   */
  toggleSidebar(side: Side) {
    this.component?.toggleSidebar(side)
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
 *         <div class="under-menu">                                      (the drawer's line at its start)
 *           <div part="page-menu"> <slot name="page-menu"> </div>
 *           <div class="row">  left | page (the default slot) | right  </div>
 *           <div part="footer"> <slot name="footer"> </div>
 *         </div>
 *       </div>
 *     </div>
 *
 * - Its OWN box, not the window and not a root:  Run draws a Spell site inside the editor's page.
 *   - So plain boxes, no landmarks:  a second `<main>` or banner inside the editor's page would be wrong;
 *     what's slotted brings its own (the navigation's `<nav>`).
 *   - At least as tall as the box it's in (`min-height: 100%`), the drawer running from top to bottom.
 * - A slot with nothing in it isn't drawn:  no column, no row, no gap.
 * - The page is a font size in from the drawer;  the menu's row is flush against it, on the drawer's fill:
 *   - so the drawer and the menu read as one surface, the bar beside the drawer's top with no line between them
 *   - the drawer's line starts under the menu, the menu's own line turning into it (epic `mockup` I25)
 * - `drawer="compact"`:  the drawer shows only its icons, as the layout sets `collapsed` on each `<ui-site-nav>` in it.
 *   - The pointer resting on it half a second, or the keyboard's focus coming into it, opens it over the page,
 *     all of it, the whole height of its column, without pushing the page:  its column keeps its width.
 *     Leaving it closes it, a moment later (0.15s).
 *   - Its icons stay where they are as it opens and closes:  the navigation keeps their room at the start the same
 *     either way (`UISiteNav.css`, epic `mockup` C1 on J161).
 *   - It grows out from the column's edge and shrinks back into it;  switched to all of it and back, the column
 *     widens and narrows (`UIPageLayout.css`, "Motion").
 * - Below 40em of its own box (a container query):  one column, and the drawer slides over the page from the start
 *   (`:state(open)`), from a `<ui-site-nav-button>` inside it, or its own menu button when it has none.
 *   - Escape closes it;  so does going to a page from it (`ui-navigating` from inside the drawer).
 * - `toggleDrawer()` (the `<ui-site-nav-button>`'s click):  narrow, slides the drawer in or out;  wide, switches
 *   `drawer` and sends `ui-toggle`.  Remembering the choice is the site's:  the layout keeps nothing.
 *   - `drawer-hides`:  wide, it switches the drawer between hidden (`drawer="hidden"`) and all of it, never to its
 *     icons (epic `mockup` T55:  Spell UI's site, whose navigation has no icons).
 * - The side bars close too (epic `mockup` T55):  `right="hidden"` (or `left`) hides one, wide;
 *   `toggleSidebar("right")`, a `<ui-site-nav-button toggles="right">`'s click, switches it and sends `ui-toggle`.
 *   - Below 64em of its own box (`:state(sides-narrow)`), a side bar with such a button in the layout is hidden behind
 *     it, and shows over the page from its side while open (`:state(right-open)`);  one with no button stays in the
 *     row, as before.
 * - `floating`:  the drawer and the side bars float, rounded cards with a soft shadow and room round them, over the
 *   page's own ground (Spell UI's docs site's look);  the page's side is no box of its own then.
 * - `page-height="fluid"`:  as tall as what's seen of the window or its pane
 *   (`viewHeight`), never scrolling it;  the page a column taking what's left, its `height="fluid"` children
 *   sharing it out (`SharedHeights.css`).
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

  /** `floating`:  the drawer and the side bars are cards floating over the page's ground. */
  @E.cssState("floating")
  get isFloating(): boolean {
    return !!this.floating
  }

  /**
   * `page-height="fluid"`:  exactly as tall as what's seen of the window, the page
   * taking what's left under the menus, a column whose `height="fluid"` children share it.
   */
  @E.cssState("page-fluid")
  get isPageFluid(): boolean {
    return this.pageHeight === "fluid"
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

  /**
   * Below 64em of its own box:  a side bar with its button hides behind it, and shows over the page while open.
   * - Read from its style, as `isNarrow` is.
   */
  @E.cssState("sides-narrow") @E.state accessor isSidesNarrow = false

  /** `drawer="hidden"`:  wide, no drawer at all;  its button shows it again. */
  @E.cssState("drawer-hidden")
  get isDrawerHidden(): boolean {
    return this.drawer === HIDDEN
  }

  /**
   * Does the drawer show all of it:  wide and neither compact nor hidden, or open over the page?
   * A drawer button's `aria-expanded`.
   */
  get isDrawerShown(): boolean {
    return this.isNarrow ? this.isOpen : (!this.isCompact && !this.isDrawerHidden) || this.isOpen
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

  /**
   * The navigations show only their icons:  compact, not open over the page, and not moving.
   * - While the column narrows, or the open box shrinks back, they keep all of it, clipped (`isMoving`):
   *   they switch to their icons once it's narrow (epic `mockup` I32, Owen:  "the illusion of collapse is wonky").
   */
  get showsIconsOnly(): boolean {
    return this.isCompact && !this.isOpen && !this.isMoving
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
   * - From all of it to its icons, the column narrows to the width its icons will take (`narrowToIcons()`).
   */
  toggleDrawer() {
    if (this.isNarrow) {
      this.isOpen = !this.isOpen
      return
    }
    if (this.drawerHides || this.isDrawerHidden) {
      this.hideOrShowDrawer()
      return
    }
    const oldState: DrawerState = this.isCompact ? COMPACT : FULL
    const newState: DrawerState = oldState === COMPACT ? FULL : COMPACT
    this.peekTimer?.cancel()
    this.cancelWidening?.()
    this.isWidening = false
    this.isOpen = false
    if (newState === FULL) {
      this.compactWidth = this.drawerColumn?.getBoundingClientRect().width
      this.isWidening = true
      this.cancelWidening = E.beforeNextPaint(() => this.switchDrawer(newState, oldState))
    } else {
      this.narrowToIcons(oldState)
    }
  }

  /**
   * Switch to its icons only:  the column narrows to the width they take, all of it still drawn in it, clipped;
   * the navigations switch to their icons once it's there (`whileDrawerMoves()`).
   * - The width is measured first, just before the next paint:
   *   each navigation shows its icons till then, the column's own width read at `fit-content`,
   *   and all of it is back before anything is painted.
   */
  private narrowToIcons(oldState: DrawerState) {
    const navs = this.drawerNavs
    for (const nav of navs) nav.toggleAttribute(COLLAPSED, true)
    this.cancelWidening = E.beforeNextPaint(() => {
      this.compactWidth = this.iconsWidth()
      this.whileDrawerMoves()
      this.switchDrawer(COMPACT, oldState)
      for (const nav of navs) nav.toggleAttribute(COLLAPSED, this.showsIconsOnly)
    })
  }

  /**
   * The drawer's column's width at `fit-content`, read at once with no move:  what its icons take, while they're shown.
   * - SIDE EFFECT:  the column stops where it is, if it was moving, so it narrows from there.
   */
  private iconsWidth(): number | undefined {
    const column = this.drawerColumn
    if (!column) return undefined
    const now = column.getBoundingClientRect().width
    column.style.transition = "none"
    column.style.inlineSize = "fit-content"
    const width = column.getBoundingClientRect().width
    column.style.inlineSize = `${now}px`
    void getComputedStyle(column).inlineSize
    column.style.transition = ""
    // ... its own width again once the switch reaches its style:  so it moves from `now`
    column.style.inlineSize = ""
    return width
  }

  /** Switch `drawer` to `newState`, and say so (`ui-toggle`). */
  private switchDrawer(newState: DrawerState, oldState: DrawerState) {
    // The column at its held width at once (holding it starts a move of its own), so it's what it widens from
    if (this.isWidening && this.drawerColumn) {
      for (const move of this.drawerColumn.getAnimations()) move.finish()
      void getComputedStyle(this.drawerColumn).inlineSize
    }
    this.drawer = newState === COMPACT ? COMPACT : undefined
    if (newState === FULL) this.whileDrawerMoves()
    this.send("ui-toggle", { region: DRAWER, newState, oldState })
    // ... held till it's no longer compact everywhere (`:state(compact)` follows a moment later)
    if (this.isWidening) this.cancelWidening = E.beforeNextPaint(() => (this.isWidening = false))
  }

  /**
   * Wide, hide the whole drawer (`drawer="hidden"`), or show all of it again, and say so (`ui-toggle`):
   * `drawer-hides`, or a drawer hidden already.
   * - The column narrows to nothing and widens back (`UIPageLayout.css`);  nothing in it switches to its icons.
   */
  private hideOrShowDrawer() {
    const oldState: DrawerState = this.isDrawerHidden ? HIDDEN : this.isCompact ? COMPACT : FULL
    const newState: DrawerState = oldState === HIDDEN ? FULL : HIDDEN
    this.peekTimer?.cancel()
    this.isOpen = false
    this.drawer = newState === HIDDEN ? HIDDEN : undefined
    this.send("ui-toggle", { region: DRAWER, newState, oldState })
  }

  /** Escape closes the drawer or a side bar open over the page. */
  @E.on("keydown")
  protected onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return
    this.close()
    this.closeSidebars()
  }

  /** Going to a page from the drawer, or from a side bar open over the page, closes it. */
  @E.on("ui-navigating")
  protected onNavigating(event: Event) {
    if (this.isInDrawer(event.target)) this.close()
    if (this.sideHolding(event.target)) this.closeSidebars()
  }

  /**
   * Close the drawer open over the page, if it is.
   * - Compact and wide, its box shrinks back into the column with all of it still in it, clipped (`whileDrawerMoves()`).
   */
  private close() {
    if (!this.isOpen) return
    if (this.isCompact && !this.isNarrow) this.whileDrawerMoves()
    this.isOpen = false
  }

  ////////////////
  // ## The side bars:  hidden, open over a narrow page
  ////////////////

  /** `right="hidden"`:  wide, the right side bar isn't shown;  its button shows it again. */
  @E.cssState("right-hidden")
  get isRightHidden(): boolean {
    return this.right === HIDDEN
  }

  /** `left="hidden"`:  wide, the left side bar isn't shown;  its button shows it again. */
  @E.cssState("left-hidden")
  get isLeftHidden(): boolean {
    return this.left === HIDDEN
  }

  /** The right side bar slid over a narrow page, from its button. */
  @E.cssState("right-open") @E.state accessor isRightOpen = false

  /** The left side bar slid over a narrow page, from its button. */
  @E.cssState("left-open") @E.state accessor isLeftOpen = false

  /**
   * The side bars a `<ui-site-nav-button toggles="...">` in its light DOM shows and hides:
   * narrow, those hide behind their button;  the rest stay in the row.
   */
  @E.watches({ ...LIGHT_DOM_CHANGES, attributeFilter: ["slot", TOGGLES], equals: E.isSameList })
  get sidesWithButtons(): readonly Side[] {
    return SIDES.filter((side) => this.domElement.querySelector(`${NAV_BUTTON}[${TOGGLES}="${side}"]`))
  }

  /** Narrow, the right side bar hides behind its button:  `:state(right-closable)`. */
  @E.cssState("right-closable")
  get isRightClosable(): boolean {
    return this.sidesWithButtons.includes(RIGHT)
  }

  /** Narrow, the left side bar hides behind its button:  `:state(left-closable)`. */
  @E.cssState("left-closable")
  get isLeftClosable(): boolean {
    return this.sidesWithButtons.includes(LEFT)
  }

  /** Is side bar `side` hidden (`hidden`) on a wide page? */
  isSideHidden(side: Side): boolean {
    return side === RIGHT ? this.isRightHidden : this.isLeftHidden
  }

  /** Is side bar `side` slid over a narrow page? */
  isSideOpen(side: Side): boolean {
    return side === RIGHT ? this.isRightOpen : this.isLeftOpen
  }

  /**
   * Is side bar `side` shown:  narrow, behind its button, while it's open;  else unless it's hidden.
   * Its button's `aria-expanded`.
   */
  isSideShown(side: Side): boolean {
    const isBehindButton = this.isSidesNarrow && this.sidesWithButtons.includes(side)
    return isBehindButton ? this.isSideOpen(side) : !this.isSideHidden(side)
  }

  /**
   * Show or hide side bar `side`, as its button does:  narrow, behind its button, slide it over the page or away;
   * else switch its attribute between `hidden` and none, and say so (`ui-toggle`, `newState` `hidden` or `shown`).
   * Script API, on the DOM element too.
   */
  toggleSidebar(side: Side) {
    if (this.isSidesNarrow && this.sidesWithButtons.includes(side)) {
      const opens = !this.isSideOpen(side)
      this.closeSidebars()
      this.close()
      if (side === RIGHT) this.isRightOpen = opens
      else this.isLeftOpen = opens
      return
    }
    const oldState: SideState = this.isSideHidden(side) ? HIDDEN : SHOWN
    const newState: SideState = oldState === HIDDEN ? SHOWN : HIDDEN
    if (side === RIGHT) this.right = newState === HIDDEN ? HIDDEN : undefined
    else this.left = newState === HIDDEN ? HIDDEN : undefined
    this.send("ui-toggle", { region: side, newState, oldState })
  }

  /** Close the side bars slid over a narrow page, if any are. */
  private closeSidebars() {
    this.isRightOpen = false
    this.isLeftOpen = false
  }

  /** A link followed from a side bar slid over a narrow page (its table of contents) closes it. */
  @E.on("click")
  protected onClickInSide(event: MouseEvent) {
    if (!this.isRightOpen && !this.isLeftOpen) return
    const isLink = event
      .composedPath()
      .some((node) => node instanceof Element && (node.localName === "a" || node.hasAttribute("link")))
    if (isLink && this.sideHolding(event.target)) this.closeSidebars()
  }

  /** The side bar holding `target`, slotted into it:  `undefined` for none. */
  private sideHolding(target: EventTarget | null): Side | undefined {
    if (!target || typeof (target as Node).nodeType !== "number") return undefined
    const node = target as Node
    return SIDES.find((side) => {
      const name = this.slotForName(side)
      return [...this.domElement.children].some(
        (child) => child.getAttribute("slot") === name && (child === node || child.contains(node))
      )
    })
  }

  ////////////////
  // ## Moving
  ////////////////

  /**
   * The drawer is moving between its icons and all of it:  its column narrowing or widening, or its open box growing
   * or shrinking back.
   * - Meanwhile what's in it is drawn as all of it, at its full width, clipped (`:state(moving)`, `UIPageLayout.css`).
   */
  @E.cssState("moving") @E.state accessor isMoving = false

  /** Stop waiting for the drawer's moves to finish, while it waits. */
  private cancelMoving: (() => void) | undefined

  /** Each run of `whileDrawerMoves()`:  only the latest ends the move. */
  private moveRun = 0

  /**
   * Hold `isMoving` till the drawer's column and box finish the moves the change about to be made starts.
   * - Its moves are read just before the next paint, once the change has reached the style.
   * - None (reduced motion, `animation="none"`):  it ends there, before anything's painted.
   */
  private whileDrawerMoves() {
    const run = ++this.moveRun
    this.isMoving = true
    this.cancelMoving?.()
    this.cancelMoving = E.beforeNextPaint(() => {
      const boxes = [this.drawerColumn, this.drawerColumn?.firstElementChild]
      const moves = boxes.flatMap((box) => box?.getAnimations() ?? [])
      void Promise.allSettled(moves.map((move) => move.finished)).then(() => {
        if (run === this.moveRun) this.isMoving = false
      })
    })
  }

  ////////////////
  // ## Opening the compact drawer
  ////////////////

  /** The wait before the pointer on the compact drawer opens it, or off it closes it, while one runs. */
  private peekTimer: ReturnType<typeof E.after> | undefined

  /** The compact drawer's column width, kept while it's open over the page:  so the page doesn't move. */
  @E.state accessor compactWidth: number | undefined = undefined

  /** Switching from its icons to all of it, for a frame:  the compact column holds its width, to widen from. */
  @E.state accessor isWidening = false

  /** Stop waiting the frame `toggleDrawer()` waits before widening, while one runs. */
  private cancelWidening: (() => void) | undefined

  /**
   * The pointer came onto the compact drawer:  open it after half a second (`OPEN_DELAY`), or stay open.
   * - Not the page's hover delay (`--ui-hover-delay`, 800ms) for pop-ups:  the drawer is where the pointer goes on
   *   purpose, and waiting that long for it read as broken (epic `mockup` I26).
   * - Nor at once (0.1s, J161):  passing over it on the way to the page opened it (Owen, C1:  "a 1/2 second hover").
   */
  private onDrawerEnter(event: PointerEvent) {
    if (!this.isCompact || this.isNarrow || event.pointerType === "touch") return
    this.peekTimer?.cancel()
    if (!this.isOpen) this.peekTimer = E.after(OPEN_DELAY, () => this.peek())
  }

  /** The pointer left the drawer:  stop waiting to open it, or close it after a moment (`CLOSE_DELAY`). */
  private onDrawerLeave() {
    this.peekTimer?.cancel()
    if (this.isCompact && !this.isNarrow && this.isOpen) this.peekTimer = E.after(CLOSE_DELAY, () => this.unpeek())
  }

  /** Close the compact drawer opened over the page. */
  private unpeek() {
    if (this.isCompact && !this.isNarrow) this.close()
  }

  /** The keyboard's focus came into the compact drawer:  open it at once. */
  private onDrawerFocusIn() {
    this.peekTimer?.cancel()
    if (this.isCompact && !this.isNarrow && !this.isOpen) this.peek()
  }

  /** The keyboard's focus left the compact drawer:  close it. */
  private onDrawerFocusOut(event: FocusEvent) {
    if (this.isCompact && !this.isNarrow && !this.isInDrawer(event.relatedTarget)) this.close()
  }

  /** Open the compact drawer over the page, its column kept at the width it has now. */
  private peek() {
    this.compactWidth = this.drawerColumn?.getBoundingClientRect().width
    this.whileDrawerMoves()
    this.isOpen = true
  }

  /**
   * Its inline style:
   * - the compact column's kept width, while it's open over the page, moving, or about to widen
   * - the menu's height, for the navigations in the drawer to line their first row up with it (`menuHeight`)
   * - the height of the box it scrolls in, when that isn't the window (`viewHeight`):  the drawer's least and most
   */
  get layoutStyle(): Record<string, string | undefined> {
    const isHeld = (this.isCompact && !this.isNarrow && (this.isOpen || this.isMoving)) || this.isWidening
    const width = isHeld ? this.compactWidth : undefined
    const menuHeight = this.has("menu") ? this.menuHeight : undefined
    return {
      [COMPACT_WIDTH]: width === undefined ? undefined : `${width}px`,
      [NAV_BAR_HEIGHT]: menuHeight ? `${menuHeight}px` : undefined,
      [VIEW_HEIGHT]: this.viewHeight ? `${this.viewHeight}px` : undefined
    }
  }

  ////////////////
  // ## Narrow
  ////////////////

  /** While connected:  read whether it's narrow, again each time its box changes size. */
  @E.whileConnected
  protected watchWidth() {
    if (isServer) return
    const scroller = UIPageLayout.scrollerAround(this.domElement)
    const resized = new ResizeObserver(() => {
      this.isNarrow = this.isNarrowByStyle(NARROW_FLAG)
      this.isSidesNarrow = this.isNarrowByStyle(SIDES_NARROW_FLAG)
      this.measureMenu()
      this.viewHeight = scroller?.clientHeight
    })
    resized.observe(this.domElement)
    if (scroller) resized.observe(scroller)
    if (this.drawerColumn) resized.observe(this.drawerColumn)
    if (this.menuBox) resized.observe(this.menuBox)
    this.resized = resized
    return () => {
      resized.disconnect()
      this.resized = undefined
    }
  }

  /**
   * The height of the box it scrolls in, in pixels, when that's a box on the page (an editor's pane), not the window:
   * the drawer is as tall as what's seen of it, its foot at the bottom;  `100dvh` overshot
   * by the room above the pane.
   */
  @E.state accessor viewHeight: number | undefined = undefined

  /** The nearest box around `element` that scrolls, across shadow roots;  none for the window's own. */
  private static scrollerAround(element: Element): HTMLElement | undefined {
    const above = (at: Element): Element | undefined =>
      at.parentElement ?? (at.getRootNode() as Partial<ShadowRoot>).host ?? undefined
    for (let at = above(element); at; at = above(at)) {
      if (at === document.scrollingElement || at === document.body) return undefined
      if (at instanceof HTMLElement && /(auto|scroll)/.test(getComputedStyle(at).overflowY)) return at
    }
    return undefined
  }

  /** What watches its box, the drawer's column and the menu for a new size, while connected. */
  private resized: ResizeObserver | undefined

  /** The drawer's column was drawn:  watch it too, as it's what goes narrow. */
  private drawerColumnDrawn(column: HTMLElement) {
    this.drawerColumn = column
    this.resized?.observe(column)
  }

  ////////////////
  // ## The menu beside the drawer's top
  ////////////////

  /**
   * The menu's height, in pixels, while it's drawn:  the navigations in the drawer line their first row up with it,
   * its icon on the menu's middle, beside the drawer's button (epic `mockup` I35, `--ui-site-nav-bar-height`).
   */
  @E.state accessor menuHeight: number | undefined = undefined

  /** The menu's box, while drawn. */
  private menuBox: HTMLElement | undefined

  /** The menu's box was drawn:  watch it for a new height. */
  private menuDrawn(box: HTMLElement) {
    this.menuBox = box
    this.resized?.observe(box)
    this.measureMenu()
  }

  /** Read the menu's height again:  none while it isn't on the page. */
  private measureMenu() {
    const box = this.menuBox
    this.menuHeight = box?.isConnected ? box.getBoundingClientRect().height || undefined : undefined
  }

  /**
   * Is it narrow:  below 40em of its own box (`flag`, `--_page-layout-narrow`), or below 64em, for its side bars
   * (`--_page-layout-sides-narrow`)?  Its style says (`UIPageLayout.css`'s container queries set them on its grid):
   * so a layout with no drawer, only side bars, knows too.
   */
  private isNarrowByStyle(flag: string): boolean {
    const box = this.layoutBox
    return !!box && getComputedStyle(box).getPropertyValue(flag).trim() === "1"
  }

  /** Its grid's box, while drawn. */
  private layoutBox: HTMLElement | undefined

  /** Narrow, it closes as it widens:  wide, the open drawer would sit over the page. */
  @E.onChange("isNarrow", { defer: true })
  protected onNarrowChanged() {
    this.isOpen = false
  }

  /** A side bar open over the page closes as the layout widens, or narrows. */
  @E.onChange("isSidesNarrow", { defer: true })
  protected onSidesNarrowChanged() {
    this.closeSidebars()
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
      <div
        class={LAYOUT}
        part={this.partForName("layout")}
        style={this.layoutStyle}
        ref={(box: HTMLElement) => (this.layoutBox = box)}
      >
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
          <div class={UNDER_MENU}>
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
      </div>
    )
  }

  /** Region `name`'s box around its slot, while it has content. */
  private region(name: Exclude<Region, "drawer">): JSX.Element {
    return (
      <Show when={this.has(name)}>
        <div
          class={name}
          part={this.partForName(name)}
          ref={(box: HTMLElement) => (name === MENU ? this.menuDrawn(box) : undefined)}
        >
          <slot name={this.slotForName(name)} />
        </div>
      </Show>
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIPageLayout extends E.AttributeValues<typeof pageLayoutVocabulary> {}

/** A named region, each its slot's name. */
type Region = "menu" | "page-menu" | "drawer" | "left" | "right" | "footer"

/** What `ui-toggle` says the drawer was and is:  its icons only, hidden (`drawer-hides`), or all of it. */
type DrawerState = typeof COMPACT | typeof HIDDEN | typeof FULL

/** A side bar, by its region's name. */
export type Side = typeof LEFT | typeof RIGHT

/** What `ui-toggle` says a side bar was and is. */
type SideState = typeof HIDDEN | typeof SHOWN

/** `drawer="compact"`, and `ui-toggle`'s word for it. */
const COMPACT = "compact"

/** `ui-toggle`'s word for the whole drawer:  no `drawer`. */
const FULL = "full"

/** `drawer="hidden"`, `right="hidden"`, `left="hidden"`, and `ui-toggle`'s word for them. */
const HIDDEN = "hidden"

/** `ui-toggle`'s word for a side bar shown:  no `hidden`. */
const SHOWN = "shown"

/** The side bars' regions, and `ui-toggle`'s `region` for them. */
const LEFT = "left"
const RIGHT = "right"
const SIDES = [LEFT, RIGHT] as const

/** The navigation's tag, and its attribute for icons only. */
const SITE_NAV = "ui-site-nav"
const COLLAPSED = "collapsed"

/** The drawer's button's tag:  with one inside, the layout draws no menu button of its own. */
const NAV_BUTTON = "ui-site-nav-button"

/** The private custom property holding the compact column's kept width (`UIPageLayout.css`). */
const COMPACT_WIDTH = "--_page-layout-compact-width"

/** The menu's region, whose height the navigations in the drawer line their first row up with. */
const MENU = "menu"

/** `<ui-site-nav>`'s token for the height of the bar beside its top:  the menu's, set on the layout's box. */
const NAV_BAR_HEIGHT = "--ui-site-nav-bar-height"

/** The height of the box it scrolls in, when that's not the window (`viewHeight`):  its drawer's least and most. */
const VIEW_HEIGHT = "--_page-layout-view-height"

/**
 * How long, in seconds, the pointer rests on the compact drawer before it opens:  long enough that passing over it
 * on the way somewhere else doesn't open it (Owen, epic `mockup` C1 on J161:  "Change to a 1/2 second hover").
 * - The keyboard's focus opens it at once (`onDrawerFocusIn()`).
 */
const OPEN_DELAY = 0.5

/** How long, in seconds, the pointer is off the open compact drawer before it closes:  a slip off its edge doesn't. */
const CLOSE_DELAY = 0.15

/** The private custom property its grid has while it's narrow (`UIPageLayout.css`). */
const NARROW_FLAG = "--_page-layout-narrow"

/** The private custom property its grid has while its side bars hide behind their buttons, below 64em. */
const SIDES_NARROW_FLAG = "--_page-layout-sides-narrow"

/** The class words of its boxes (`UIPageLayout.css`). */
const LAYOUT = "layout"
const DRAWER = "drawer"
const DRAWER_BOX = "drawer-box"
const BODY = "body"
const UNDER_MENU = "under-menu"
const ROW = "row"
const PAGE = "page"
const MENU_BUTTON = "menu-button"

/** Its own menu button's look:  today's site's. */
const BARS = "bars"
const BASIC = "basic"
const SMALL = "small"
