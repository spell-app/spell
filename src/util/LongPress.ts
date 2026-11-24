// By file:  the drag in progress is all this needs
import { Dragging } from "./Dragging"

/****************
 * ### `LongPress`
 * A press held still is a long press:  ONE detector for the page, sending `ui-long-press` (`LONG_PRESS_EVENT`) to what
 * was pressed (epic `editor` T157;  first a finger's alone, epic `language` T154).
 * - Its owners say which presses are theirs, and for which pointers (`listen(isFor)`):
 *   - a program's views, fingers only (`SpellElement`):  `on long press`, `on long-press`, hears it;
 *     with a mouse, a press and hold on a card is still the card's own drag
 *   - the editor in Edit, a mouse too:  a long press picks a part up to move it (I330)
 * - Held `LONG_PRESS_MS` without moving more than `LONG_PRESS_MOVE_PX`:  a cancelable `MouseEvent` at the press point,
 *   bubbling and composed.
 *   - Whoever takes it says so, `preventDefault()`:  the press is that.
 *   - Else, for a finger on a device with no mouse (`hasNoMouse()`):  a `contextmenu` event at the press point, so
 *     every right-click menu opens from it as it is, and `on right click` hears it (`SpellElement.onThingRightClick()`,
 *     the editor's own in Edit;  epic `language` P62).
 *   - With a mouse, a right click stays the mouse's:  a long press is only a long press.
 * - One press, whatever the phone:
 *   - Android Chrome sends its own `contextmenu` for a long press;  iPhone Safari never does.
 *   - Whichever comes first is the long press;  the browser's own is swallowed.
 * - Nothing when, before then:
 *   - the pointer lifts (a tap, a click), or moves (a drag, a scroll)
 *   - a second finger comes down (a pinch)
 *   - a drag has started (`Dragging.current`)
 * - Once it's a long press, the press is its:
 *   - whatever else was watching it hears `pointercancel`, so a card held under it never drags
 *   - the click the lift would make is swallowed
 *   - so is the text selection a held press starts (`selectstart`)
 * - The mouse's main button only;  never a press in a text field:  holding there is the field's, to select and paste.
 * - No keyboard long press:  a key held down repeats.  What a long press does needs another way by keyboard.
 * - Page-wide, ONE per page however many runtime copies run on it, each owner added to it (`listen()`).
 * - Plain DOM:  no Solid, no core.  Taken by file, `spell/util/LongPress`, in no barrel (as `Dragging`).
 ****************/
export class LongPress {
  /**
   * Send a long press for each press `isFor` says is its owner's, e.g. a finger on a `<solitaire-card>`.
   * - The page's ONE detector, made by the first call, even from another runtime copy;  each later `isFor` is added.
   * - The same `isFor` twice is kept once.
   */
  static listen(isFor: LongPressOwner): void {
    const page = globalThis as typeof globalThis & { [LISTENING]?: LongPress }
    const detector = (page[LISTENING] ??= new LongPress())
    if (!detector.owners.includes(isFor)) detector.owners.push(isFor)
  }

  /** Who a press may be a long press for:  any one of them saying so makes it one. */
  private readonly owners: LongPressOwner[] = []

  private constructor() {
    const capture = { capture: true }
    window.addEventListener("pointerdown", this.onDown, capture)
    window.addEventListener("pointermove", this.onMove, capture)
    window.addEventListener("pointerup", this.onUp, capture)
    window.addEventListener("pointercancel", this.onCancel, capture)
    window.addEventListener("contextmenu", this.onContextMenu, capture)
    window.addEventListener("selectstart", this.onSelectStart, capture)
  }

  /** The press held down now, till it's a long press, lifts, moves or a second finger joins it. */
  private press: Press | undefined

  /** The pointer whose press was a long press, till it lifts:  its click is swallowed. */
  private menuPointer: number | undefined

  /** What we send for a long press:  never mistaken for the browser's own. */
  private readonly sent = new WeakSet<Event>()

  /** When the last long press was:  the browser's own `contextmenu` for the same press, coming after, is swallowed. */
  private openedAt = -Infinity

  private readonly onDown = (event: PointerEvent) => {
    // a second finger:  a pinch, never a long press
    if (this.press) return this.end()
    if (!event.isPrimary || (event.pointerType !== "touch" && event.button !== 0)) return
    const path = event.composedPath()
    const { pointerType } = event
    if (LongPress.isInATextField(path) || !this.owners.some((isFor) => isFor(path, pointerType))) return
    const timer = setTimeout(() => this.open(), LONG_PRESS_MS)
    const { pointerId, clientX: x, clientY: y } = event
    this.press = { pointerId, pointerType, x, y, target: path[0], timer }
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

  // ours, sent for a long press, ends nothing:  its press goes on till the finger lifts
  private readonly onCancel = (event: PointerEvent) => {
    if (!this.sent.has(event) && event.pointerId === this.press?.pointerId) this.end()
  }

  /**
   * The browser's own long-press menu event (Android):  the long press, sooner than our timer;  swallowed, as is one
   * coming after ours.
   */
  private readonly onContextMenu = (event: MouseEvent) => {
    if (this.sent.has(event)) return
    if (this.press) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return this.open()
    }
    if (performance.now() - this.openedAt < ECHO_MS) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  /** A finger held down selects text:  not while it may be, or is, a long press. */
  private readonly onSelectStart = (event: Event) => {
    if (this.press || this.menuPointer !== undefined) event.preventDefault()
  }

  /**
   * Held long enough:  the long press, where the press is;  for a finger, with no mouse and nothing taking it, the right-click menu.
   * - Nothing happens if a drag has started meanwhile.
   */
  private open() {
    const press = this.press!
    this.end()
    if (Dragging.current) return
    this.openedAt = performance.now()
    this.menuPointer = press.pointerId
    const { x: clientX, y: clientY } = press
    const at = { bubbles: true, cancelable: true, composed: true, clientX, clientY }
    const longPress = this.send(new MouseEvent(LONG_PRESS_EVENT, at))
    press.target.dispatchEvent(longPress)
    if (!longPress.defaultPrevented && press.pointerType === "touch" && LongPress.hasNoMouse()) {
      press.target.dispatchEvent(this.send(new MouseEvent("contextmenu", { ...at, button: 2, buttons: 0 })))
    }
    // the press is the long press's now:  e.g. a card held under it never drags (`Dragging`)
    window.dispatchEvent(
      this.send(new PointerEvent("pointercancel", { pointerId: press.pointerId, pointerType: press.pointerType }))
    )
  }

  /**
   * No mouse here, nor a trackpad or anything else that points finely:  a phone, a tablet.
   * - So a long press is a right click too;  with one, a right click is the mouse's.
   */
  static hasNoMouse(): boolean {
    return !globalThis.matchMedia?.(FINE_POINTER).matches
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

  /** The click a long press's lift would make is no click:  swallowed, once, before anything hears it. */
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

/** A press held down, waiting to be a long press. */
type Press = {
  /** its pointer:  another finger is a pinch */
  pointerId: number
  /** a finger, a mouse or a pen:  only a finger's may be a right click too */
  pointerType: string
  /** where it came down, in the window */
  x: number
  y: number
  /** what it pressed, innermost:  the long press goes there */
  target: EventTarget
  /** makes it a long press, unless the press ends first */
  timer: ReturnType<typeof setTimeout>
}

/**
 * The event a long press sends to what was pressed, Spell UI's `ui-long-press`, a `MouseEvent` at the press point:
 * a program's `on long press` hears it, and so can any element.
 * - Cancelable:  a view whose thing takes it cancels it, so it's no right click as well.
 */
export const LONG_PRESS_EVENT = "ui-long-press"

/** Some pointer that points finely is here:  a mouse, a trackpad. */
const FINE_POINTER = "(any-pointer: fine)"

/** How long a press is held still for a long press, in ms:  about what a phone's own long press takes. */
export const LONG_PRESS_MS = 500

/** How far a held press may wander and still be a long press, in px:  more is a drag or a scroll. */
export const LONG_PRESS_MOVE_PX = 8

/** How long after a long press the browser's own events for the same press may still come, in ms. */
const ECHO_MS = 1000

/** Where a long press is the field's own:  selecting text, pasting. */
const TEXT_FIELD_SELECTOR = "input, textarea, [contenteditable]:not([contenteditable=false])"

/** Marks the page as listening:  one `LongPress` per page. */
const LISTENING = Symbol.for("spell:long-press")

/**
 * Says whether a press is a long press for its owner:  what it pressed (`composedPath()`), and its pointer,
 * `"touch"`, `"mouse"` or `"pen"`.
 */
export type LongPressOwner = (path: readonly EventTarget[], pointerType: string) => boolean
