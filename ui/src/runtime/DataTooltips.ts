import { after, TopLayerTip, type CancelablePromise } from "spell/ui/util"

import type { Browser } from "./Browser"

/****************
 * ### `DataTooltips`
 * Shows `data-tooltip` in the browser's top layer once the runtime has loaded, so no parent frame can cut it off.
 * - The markup stays as it was:  `<button data-tooltip="Add users" data-position="bottom left" data-inverted>`.
 * - `native.css` draws it with `::before` and `::after`, which can't enter the top layer.
 *   So `start()` marks the root (`STAND_DOWN`), those rules stand down, and ONE shared bubble shows instead.
 *   - A page with no script, or a browser with no popovers or anchor positioning, keeps the CSS tooltip.
 *   - `data-variation="visible"` also stays CSS:  it's always showing, and there's one bubble.
 * - The bubble and a box over the target live at the end of `<body>`:
 *   an anchor name only reaches its own tree, and a target may be in a shadow root.
 * - It takes the target's `--ui-tooltip-*` values as they resolve there, so a theme around the target still shows.
 * - When it shows:
 *   - the pointer on a target:  after `--ui-tooltip-delay` (by default `--ui-hover-delay`)
 *   - on to another target while one is showing:  at once
 *   - keyboard focus:  at once
 *   - Escape hides it, until the pointer or the focus comes back
 * - In the runtime, not `core`:  it's page-wide, and it only ever runs once the runtime's chunk has loaded.
 * - Plain DOM:  no Solid.  Listens on the document, for the life of the page.
 * - Pairs with `TopLayerTip`, a component's own tip:  this is for a tip anywhere on a page, by attribute.
 ****************/
export class DataTooltips {
  /** Feature flags:  what says whether it can run at all. */
  private readonly browser: Browser

  /** The shared bubble;  made when one first shows. */
  private bubble: HTMLElement | undefined
  /** The box over the target that the bubble's anchored to;  made with it. */
  private box: HTMLElement | undefined
  /** The target the bubble's showing. */
  private shown: Element | undefined
  /** The target under the pointer. */
  private hovered: Element | undefined
  /** The target holding keyboard focus. */
  private focused: Element | undefined
  /** A hover waiting out its delay. */
  private pending: CancelablePromise<void> | undefined
  /** Follows the shown target's attributes:  a changed tooltip shows as it changes. */
  private observer: MutationObserver | undefined

  constructor({ browser }: { browser: Browser }) {
    this.browser = browser
  }

  /**
   * Start listening, and have the CSS tooltip stand down.
   * - Does nothing without popovers and anchor positioning, or on a server.
   * - NEVER throws.
   */
  start(): void {
    const { popover, anchorPositioning } = this.browser.supports
    if (!popover || !anchorPositioning) return
    document.documentElement.setAttribute(STAND_DOWN, "")
    document.addEventListener("pointerover", this.onPointerOver, true)
    document.addEventListener("pointerout", this.onPointerOut, true)
    document.addEventListener("focusin", this.onFocusIn, true)
    document.addEventListener("focusout", this.onFocusOut, true)
    document.addEventListener("keydown", this.onKeyDown, true)
    window.addEventListener("scroll", this.follow, { capture: true, passive: true })
    window.addEventListener("resize", this.follow, { passive: true })
  }

  ////////////////
  // ## What should show
  ////////////////

  private readonly onPointerOver = (event: Event) => {
    this.hovered = tooltipTargetIn(event)
    this.update()
  }

  /** The pointer left the window:  no `pointerover` comes to say so. */
  private readonly onPointerOut = (event: Event) => {
    if ((event as PointerEvent).relatedTarget) return
    this.hovered = undefined
    this.update()
  }

  /** Only keyboard focus, so a click on a button doesn't pin its tooltip open. */
  private readonly onFocusIn = (event: Event) => {
    const isFromKeyboard = (event.composedPath()[0] as Element | undefined)?.matches?.(":focus-visible")
    this.focused = isFromKeyboard ? tooltipTargetIn(event) : undefined
    this.update()
  }

  private readonly onFocusOut = () => {
    this.focused = undefined
    this.update()
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !(this.shown || this.pending)) return
    this.hovered = this.focused = undefined
    this.update()
  }

  /** Show what should show, or hide:  the one place that decides. */
  private update() {
    const wanted = this.focused ?? this.hovered
    if (wanted === this.shown) {
      this.cancelPending()
      return
    }
    this.cancelPending()
    if (!wanted) return this.hide()
    if (this.focused || this.shown) return this.show(wanted)
    this.pending = after(delayOf(wanted), () => {
      this.pending = undefined
      this.show(wanted)
    })
  }

  private cancelPending() {
    this.pending?.cancel()
    this.pending = undefined
  }

  ////////////////
  // ## The bubble
  ////////////////

  private show(target: Element) {
    this.shown = target
    const bubble = this.ensureBubble()
    this.fill(target, bubble)
    if (!this.shown) return
    this.place(target)
    TopLayerTip.setShown(bubble, true)
    this.pointArrow(target, bubble)
    this.observer ??= new MutationObserver(() => this.onTargetChanged())
    this.observer.disconnect()
    this.observer.observe(target, { attributes: true, attributeFilter: [...COPIED_ATTRIBUTES, TEXT_ATTRIBUTE] })
  }

  private hide() {
    this.shown = undefined
    this.observer?.disconnect()
    if (this.bubble) TopLayerTip.setShown(this.bubble, false)
  }

  /** Make the bubble and its box, and put them back if the page took them away (`<body>` replaced). */
  private ensureBubble(): HTMLElement {
    const bubble = (this.bubble ??= makeElement(BUBBLE_CLASS))
    const box = (this.box ??= makeElement(BOX_CLASS))
    bubble.setAttribute("role", "tooltip")
    box.setAttribute("aria-hidden", "true")
    if (!box.isConnected) document.body.append(box)
    if (!bubble.isConnected) document.body.append(bubble)
    return bubble
  }

  /** Copy what `target` says onto the bubble:  the text, its position and variations, its resolved colours. */
  private fill(target: Element, bubble: HTMLElement) {
    const text = target.getAttribute(TEXT_ATTRIBUTE)
    if (!text) return this.hide()
    bubble.textContent = text
    for (const name of COPIED_ATTRIBUTES) {
      const value = target.getAttribute(name)
      if (value === null) bubble.removeAttribute(name)
      else bubble.setAttribute(name, value)
    }
    const style = getComputedStyle(target)
    for (const token of COPIED_TOKENS) {
      const value = style.getPropertyValue(token)
      if (value) bubble.style.setProperty(token, value)
      else bubble.style.removeProperty(token)
    }
  }

  /** Put the box over `target`:  the browser's own anchor positioning does the rest, flips included. */
  private place(target: Element) {
    const { left, top, width, height } = target.getBoundingClientRect()
    this.box!.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`
  }

  /**
   * Say which side of the target the bubble ended up on, and where along it the arrow goes.
   * - Measured:  a flip is the browser's, and nothing else says it happened.
   * - The arrow points at the middle of what the bubble and the target share.
   */
  private pointArrow(target: Element, bubble: HTMLElement) {
    const tip = bubble.getBoundingClientRect()
    const box = target.getBoundingClientRect()
    const side =
      tip.bottom <= box.top + 1
        ? "top"
        : tip.top >= box.bottom - 1
          ? "bottom"
          : tip.right <= box.left + 1
            ? "left"
            : "right"
    const isAcross = side === "top" || side === "bottom"
    const [start, end, tipStart, length] = isAcross
      ? [Math.max(tip.left, box.left), Math.min(tip.right, box.right), tip.left, tip.width]
      : [Math.max(tip.top, box.top), Math.min(tip.bottom, box.bottom), tip.top, tip.height]
    const along = Math.min(Math.max((start + end) / 2 - tipStart, ARROW_INSET), length - ARROW_INSET)
    bubble.setAttribute(SIDE_ATTRIBUTE, side)
    bubble.style.setProperty(ARROW_TOKEN, `${along}px`)
  }

  /** The shown target moved with a scroll or a resize, or has gone. */
  private readonly follow = () => {
    const { shown, bubble } = this
    if (!shown || !bubble) return
    if (!shown.isConnected) {
      this.hovered = this.focused = undefined
      return this.update()
    }
    this.place(shown)
    this.pointArrow(shown, bubble)
  }

  private onTargetChanged() {
    const { shown, bubble } = this
    if (!shown || !bubble) return
    this.fill(shown, bubble)
    if (this.shown) this.pointArrow(shown, bubble)
  }
}

/** On the root once the service runs:  `native.css`'s `::before` and `::after` tooltip stands down. */
const STAND_DOWN = "data-ui-top-layer-tooltips"
/** The attribute that makes a tooltip. */
const TEXT_ATTRIBUTE = "data-tooltip"
/** What the bubble's look reads, copied from its target. */
const COPIED_ATTRIBUTES = ["data-position", "data-inverted", "data-variation"]
/** What a target's theme says, resolved on the target:  a shadow root's target has none, so the bubble's own apply. */
const COPIED_TOKENS = [
  "--ui-tooltip-background",
  "--ui-tooltip-color",
  "--ui-tooltip-edge",
  "--ui-font-size",
  "--ui-font-family"
]
/** The shared bubble's class (`native.css`). */
const BUBBLE_CLASS = "ui-tooltip-bubble"
/** The class of the box over the target (`native.css`). */
const BOX_CLASS = "ui-tooltip-target"
/** Which side of the target the bubble's on, for its arrow (`native.css`). */
const SIDE_ATTRIBUTE = "data-side"
/** Where along that side the arrow goes (`native.css`). */
const ARROW_TOKEN = "--ui-tooltip-arrow-at"
/** The nearest an arrow comes to the bubble's corner, so it stays on the straight edge. */
const ARROW_INSET = 12

/** A new element, by class. */
function makeElement(className: string): HTMLElement {
  const element = document.createElement("div")
  element.className = className
  return element
}

/**
 * The innermost element on `event`'s path with a tooltip the bubble should show, across shadow roots.
 * - `data-variation="visible"` stops the search:  it's showing already, in CSS.
 */
function tooltipTargetIn(event: Event): Element | undefined {
  for (const node of event.composedPath()) {
    const text = (node as Element).getAttribute?.(TEXT_ATTRIBUTE)
    if (!text) continue
    const element = node as Element
    return element.getAttribute("data-variation")?.split(" ").includes("visible") ? undefined : element
  }
  return undefined
}

/** How long a hover on `target` waits, in seconds:  `--ui-tooltip-delay`, else `--ui-hover-delay`:  `800ms`, `2s`. */
function delayOf(target: Element): number {
  const style = getComputedStyle(target)
  const value = (style.getPropertyValue("--ui-tooltip-delay") || style.getPropertyValue("--ui-hover-delay")).trim()
  const seconds = parseFloat(value)
  if (Number.isNaN(seconds)) return 0
  return value.endsWith("ms") ? seconds / 1000 : seconds
}
