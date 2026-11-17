// By file:  the drag in progress is all this needs
import { Dragging } from "spell/util/Dragging"

/****************
 * ### `LongPress`
 * A finger held still on a view opens its right-click menu, as a right click does:  a phone has no right click.
 *
 * - Held `LONG_PRESS_MS` without moving more than `LONG_PRESS_MOVE_PX`:  a `contextmenu` event on what was pressed,
 *   at the press point, so every right-click menu opens from it as it is
 *   (`SpellElement.onThingRightClick()`, the editor's own in Edit).
 * - One menu, whatever the phone:
 *   - Android Chrome sends its own `contextmenu` for a long press;  iPhone Safari never does.
 *   - Whichever comes first opens it;  the other is swallowed.
 * - No menu when, before then:
 *   - the finger lifts (a tap), or moves (a drag, a scroll)
 *   - a second finger comes down (a pinch)
 *   - a drag has started (`Dragging.current`)
 * - Once it opens, the press is the menu's:
 *   - whatever else was watching it hears `pointercancel`, so a card held under it never drags
 *   - the click the lift would make is swallowed
 *   - so is the text selection a held finger starts (`selectstart`)
 * - Only fingers:  a mouse and a pen right-click as ever.
 *   Nor a press in a text field:  holding there is the field's, to select and paste.
 * - Page-wide, ONE per page however many runtime copies run on it (`listen()`):
 *   each would otherwise send its own `contextmenu`.
 * - Plain DOM:  no Solid, no core.  Its owner says which presses are its (`isFor`).
 ****************/
export class LongPress {
  /**
   * Open right-click menus on a long press, for each press `isFor` says is a view's, e.g. on a `<solitaire-card>`.
   * - Once per page:  again does nothing, even from another runtime copy.
   */
  static listen(isFor: (path: readonly EventTarget[]) => boolean): void {
    const page = globalThis as typeof globalThis & { [LISTENING]?: true }
    if (page[LISTENING]) return
    page[LISTENING] = true
    new LongPress(isFor)
  }

  private constructor(private readonly isFor: (path: readonly EventTarget[]) => boolean) {
    const capture = { capture: true }
    window.addEventListener("pointerdown", this.onDown, capture)
    window.addEventListener("pointermove", this.onMove, capture)
    window.addEventListener("pointerup", this.onUp, capture)
    window.addEventListener("pointercancel", this.onCancel, capture)
    window.addEventListener("contextmenu", this.onContextMenu, capture)
    window.addEventListener("selectstart", this.onSelectStart, capture)
  }

  /** The finger held down now, till it opens the menu, lifts, moves or is joined by another. */
  private press: Press | undefined

  /** The finger whose press opened a menu, till it lifts:  its click is swallowed. */
  private menuPointer: number | undefined

  /** What we send as the menu opens:  never mistaken for the browser's own. */
  private readonly sent = new WeakSet<Event>()

  /** When we last opened a menu:  the browser's own `contextmenu` for the same press, coming after, is swallowed. */
  private openedAt = -Infinity

  private readonly onDown = (event: PointerEvent) => {
    // a second finger:  a pinch, never a long press
    if (this.press) return this.end()
    if (event.pointerType !== "touch" || !event.isPrimary) return
    const path = event.composedPath()
    if (LongPress.isInATextField(path) || !this.isFor(path)) return
    const timer = setTimeout(() => this.open(), LONG_PRESS_MS)
    this.press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, target: path[0], timer }
  }

  private readonly onMove = (event: PointerEvent) => {
    const { press } = this
    if (!press || event.pointerId !== press.pointerId) return
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > LONG_PRESS_MOVE_PX) this.end()
  }

  private readonly onUp = (event: PointerEvent) => {
    if (event.pointerId === this.press?.pointerId) this.end()
    if (event.pointerId !== this.menuPointer) return
    this.menuPointer = undefined
    LongPress.swallowNextClick()
  }

  // ours, sent as the menu opens, ends nothing:  the menu's press goes on till the finger lifts
  private readonly onCancel = (event: PointerEvent) => {
    if (!this.sent.has(event) && event.pointerId === this.press?.pointerId) this.end()
  }

  /**
   * The browser's own long-press menu event (Android):  it opens the menu, and our timer stops;
   * after ours, it's swallowed.
   */
  private readonly onContextMenu = (event: MouseEvent) => {
    if (this.sent.has(event)) return
    if (this.press) {
      this.menuPointer = this.press.pointerId
      return this.end()
    }
    if (performance.now() - this.openedAt < ECHO_MS) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  /** A finger held down selects text:  not while it may open, or has opened, a menu. */
  private readonly onSelectStart = (event: Event) => {
    if (this.press || this.menuPointer !== undefined) event.preventDefault()
  }

  /**
   * Held long enough:  the right-click menu, where the finger is.
   * - Nothing opens if a drag has started meanwhile.
   */
  private open() {
    const press = this.press!
    this.end()
    if (Dragging.current) return
    this.openedAt = performance.now()
    this.menuPointer = press.pointerId
    const { x: clientX, y: clientY } = press
    const menuEvent = { bubbles: true, cancelable: true, composed: true, button: 2, buttons: 0, clientX, clientY }
    press.target.dispatchEvent(this.send(new MouseEvent("contextmenu", menuEvent)))
    // the press is the menu's now:  e.g. a card held under it never drags (`Dragging`)
    window.dispatchEvent(
      this.send(new PointerEvent("pointercancel", { pointerId: press.pointerId, pointerType: "touch" }))
    )
  }

  /** `event`, marked as ours. */
  private send<E extends Event>(event: E): E {
    this.sent.add(event)
    return event
  }

  /** Stop waiting on the press. */
  private end() {
    clearTimeout(this.press?.timer)
    this.press = undefined
  }

  /** Was the press in a text field?  Holding there selects its text, and offers paste:  the field's, not ours. */
  private static isInATextField(path: readonly EventTarget[]): boolean {
    return path.some((target) => target instanceof Element && target.matches(TEXT_FIELD_SELECTOR))
  }

  /** The click the menu's lift would make is no click:  swallowed, once, before anything hears it. */
  private static swallowNextClick() {
    const swallow = (event: Event) => {
      event.stopPropagation()
      event.preventDefault()
    }
    window.addEventListener("click", swallow, { capture: true, once: true })
    // a lift that makes no click:  stop waiting for one
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), ECHO_MS)
  }
}

/** A finger held down, waiting to be a long press. */
type Press = {
  /** its pointer:  another finger is a pinch */
  pointerId: number
  /** where it came down, in the window */
  x: number
  y: number
  /** what it pressed, innermost:  the menu event goes there */
  target: EventTarget
  /** opens the menu, unless the press ends first */
  timer: ReturnType<typeof setTimeout>
}

/** How long a finger is held still for a right-click menu, in ms:  about what a phone's own long press takes. */
export const LONG_PRESS_MS = 500

/** How far a held finger may wander and still open the menu, in px:  more is a drag or a scroll. */
export const LONG_PRESS_MOVE_PX = 8

/** How long after our menu opens the browser's own events for the same press may still come, in ms. */
const ECHO_MS = 1000

/** Where a long press is the field's own:  selecting text, pasting. */
const TEXT_FIELD_SELECTOR = "input, textarea, [contenteditable]:not([contenteditable=false])"

/** Marks the page as listening:  one `LongPress` per page. */
const LISTENING = Symbol.for("spell-app:long-press")
