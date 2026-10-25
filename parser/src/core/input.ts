/**
 * The mouse and the keys, readable ANYWHERE (epic `elemental-spell` P9, Q31, Q32;  HyperCard's `the shiftKey`):
 * `core.input`, what `the shift key is down` compiles to.
 *
 * ```ts
 * core.input.shiftKey            // `the shift key is down`
 * core.input.metaKey             // `the meta key is down`:  command on a Mac, control elsewhere
 * core.input.button              // `the mouse is down`, the left button
 * core.input.mouseStillDown      // `the mouse is still down`:  held a second, barely moving
 * core.input.isKeyDown(" ")      // `space is down`
 * core.input.thingUnderMouse     // `the thing under the mouse`, and every mouse event's original target
 * ```
 *
 * - NOT carried on an event:  a handler that waits reads what's true THEN, so it notes what it needs before it waits.
 * - The page keeps it up to date:  `core.input.listen(window)`, called once by the page that runs the program
 *   (spell-app's runner), from the browser's own key and mouse events, early (capture), before any handler.
 *   - `spell run` and tests have no page:  everything is up, nothing under the mouse;  a test may `set()` it.
 * - Reactive:  each read is tracked, so a drawing that shows `the shift key is down` redraws as it changes,
 *   and a `while` handler's condition is checked again (`whileHolds()`).
 * - Imports only `spell/util`:  core's own, no browser global but the target `listen()` is handed.
 */
import { Cell } from "spell/util"

/** How long the mouse must stay down, barely moving, to be `still down` (Owen:  "more than (1?) second"). */
export const STILL_DOWN_MS = 1000

/** How far the mouse may move, in pixels, and still be `still down`. */
export const STILL_DOWN_SLOP = 4

/** The input state's fields, as `set()` takes them. */
export type InputFields = {
  /** command on a Mac, control elsewhere */
  metaKey: boolean
  shiftKey: boolean
  /** option on a Mac, alt elsewhere */
  optionKey: boolean
  controlKey: boolean
  /** the left (main) button */
  button: boolean
  rightButton: boolean
  centerButton: boolean
  /** held `STILL_DOWN_MS`, moving under `STILL_DOWN_SLOP` */
  mouseStillDown: boolean
  /** the thing whose element the mouse is over, if a view's element said so (`pointAt()`) */
  thingUnderMouse: object | undefined
}

/** The mouse and keys:  see the module's docs.  ONE per running core, `core.input`. */
export class InputState {
  private fields: InputFields = upFields()
  private keys = new Set<string>()
  private cell = new Cell()
  /** Where the mouse went down, and its timer, while it's down. */
  private press: { x: number; y: number; timer?: ReturnType<typeof setTimeout> } | undefined
  /** Called as the mouse becomes still down, with what's under it:  the page sends `mouse still down` there. */
  onStillDown: ((thing: object | undefined) => void) | undefined

  get metaKey() {
    return this.read().metaKey
  }
  get shiftKey() {
    return this.read().shiftKey
  }
  get optionKey() {
    return this.read().optionKey
  }
  get controlKey() {
    return this.read().controlKey
  }
  get button() {
    return this.read().button
  }
  get rightButton() {
    return this.read().rightButton
  }
  get centerButton() {
    return this.read().centerButton
  }
  get mouseStillDown() {
    return this.read().mouseStillDown
  }
  get thingUnderMouse() {
    return this.read().thingUnderMouse
  }

  /** Is the key named `key` down, by the browser's name for it (`"a"`, `" "`, `"Enter"`, `"ArrowUp"`)? */
  isKeyDown(key: string): boolean {
    this.cell.read()
    return this.keys.has(key.toLowerCase())
  }

  /** SIDE EFFECT:  change some fields, e.g. a test's `core.input.set({ shiftKey: true })`;  readers re-run. */
  set(fields: Partial<InputFields>): void {
    const next = { ...this.fields, ...fields }
    if (Object.keys(next).every((key) => next[key as keyof InputFields] === this.fields[key as keyof InputFields])) {
      return
    }
    this.fields = next
    this.cell.changed()
  }

  /** SIDE EFFECT:  the mouse is over `thing`'s element now (a view's element says so as the mouse enters it). */
  pointAt(thing: object | undefined): void {
    this.set({ thingUnderMouse: thing })
  }

  /** SIDE EFFECT:  everything up, nothing under the mouse:  a new run, or the window losing the focus. */
  reset(): void {
    this.endPress()
    this.keys.clear()
    this.set(upFields())
  }

  /**
   * Keep up with the page's keys and mouse:  listens on `target` (the window), early, before any handler.
   * - `isMac`:  whether the meta key is command (a Mac) or control;  the page's system says.
   * - Returns what stops listening.
   */
  listen(target: EventTarget, { isMac = false }: { isMac?: boolean } = {}): () => void {
    const keys = (event: Event) => this.noteKeys(event as KeyboardEvent, isMac)
    const mouse = (event: Event) => this.noteMouse(event as MouseEvent, isMac)
    const reset = () => this.reset()
    const listeners: Array<[string, (event: Event) => void]> = [
      ["keydown", keys],
      ["keyup", keys],
      ["mousedown", mouse],
      ["mouseup", mouse],
      ["mousemove", mouse],
      ["blur", reset],
      ["focus", reset]
    ]
    for (const [type, listener] of listeners) target.addEventListener(type, listener, { capture: true })
    return () => {
      for (const [type, listener] of listeners) target.removeEventListener(type, listener, { capture: true })
    }
  }

  ////////////////
  // ## From the browser's events
  ////////////////

  /** A key went down or up:  the modifiers, and the key itself. */
  private noteKeys(event: KeyboardEvent, isMac: boolean): void {
    const key = event.key?.toLowerCase()
    if (key && event.type === "keydown") this.keys.add(key)
    else if (key) this.keys.delete(key)
    this.set(modifiersOf(event, isMac))
    this.cell.changed()
  }

  /** The mouse went down, up or moved:  its buttons, the modifiers, and whether it's still down. */
  private noteMouse(event: MouseEvent, isMac: boolean): void {
    const buttons = event.buttons ?? 0
    this.set({
      ...modifiersOf(event, isMac),
      button: (buttons & 1) !== 0,
      rightButton: (buttons & 2) !== 0,
      centerButton: (buttons & 4) !== 0
    })
    if (event.type === "mousedown" && event.button === 0) this.startPress(event.clientX, event.clientY)
    else if (event.type === "mouseup" && event.button === 0) this.endPress()
    else if (event.type === "mousemove" && this.press) {
      const moved = Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y)
      if (moved > STILL_DOWN_SLOP) this.endPress()
    }
  }

  /** The left button went down at (`x`, `y`):  after `STILL_DOWN_MS` without moving off, it's still down. */
  private startPress(x: number, y: number): void {
    this.endPress()
    this.press = { x, y }
    this.press.timer = setTimeout(() => {
      this.set({ mouseStillDown: true })
      this.onStillDown?.(this.fields.thingUnderMouse)
    }, STILL_DOWN_MS)
  }

  /** The press is over (up, or moved off):  no longer still down. */
  private endPress(): void {
    if (this.press?.timer) clearTimeout(this.press.timer)
    this.press = undefined
    this.set({ mouseStillDown: false })
  }

  /** The fields, read as a reactive value:  a reader re-runs as they change. */
  private read(): InputFields {
    this.cell.read()
    return this.fields
  }
}

/** Every key and button up, nothing under the mouse. */
function upFields(): InputFields {
  return {
    metaKey: false,
    shiftKey: false,
    optionKey: false,
    controlKey: false,
    button: false,
    rightButton: false,
    centerButton: false,
    mouseStillDown: false,
    thingUnderMouse: undefined
  }
}

/** The modifier keys on a browser event:  the meta key is command on a Mac (`isMac`), control elsewhere. */
function modifiersOf(event: KeyboardEvent | MouseEvent, isMac: boolean): Partial<InputFields> {
  return {
    metaKey: isMac ? event.metaKey : event.ctrlKey,
    shiftKey: event.shiftKey,
    optionKey: event.altKey,
    controlKey: event.ctrlKey
  }
}
