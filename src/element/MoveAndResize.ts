/****************
 * ### `MoveAndResize`
 * The shared `movable` and `resizable` of every element (Spell UI's `SharedVocabulary`;  epic `mockup` P14, J35):
 * people drag the element to a new place inside its container, or drag its corner to resize it.
 *
 * - Which way, as `movable` writes it:  bare or `both`, `horizontally`, `vertically` (`MoveAndResize.wayOf()`).
 * - Which way, as `resizable` writes it:  the sizes people drag, a comma list,
 *   `width`, `height` or `width, height`;  bare, the family's own default (`both`, a segment's `height`);
 *   the move words still mean the same (`MoveAndResize.resizeWayOf()`).
 * - Resizing:  the browser's own grip in the bottom right corner (CSS `resize`), so plain CSS limits it:
 *   `max-width: 50%`, `min-height: 4em` on the element, or the shared `min-height` / `max-height`.
 *   - It resizes the element's own box, or the box handed in (`box`):  a `display: contents` element draws none,
 *     so its family's top box is resized instead (a segment's, a modal's `<dialog>`).
 * - Moving:  a press anywhere on it but a control of its own (a button, a field, a link) and the resize grip;
 *   it moves by its `translate`, held inside its parent's box, along one axis when the attribute says so.
 * - Remembered, for an element with an `id`:  where it was put and the size it was given, for each person
 *   (`ui-element:<id>` in the browser's storage), and given back when it's next drawn.
 * - The drag is the kit's `Dragging`, its owner placing it (`placing`):  so a drag starts past the same few
 *   pixels, Escape puts it back, and the click after a real drag is swallowed, as every drag in Spell does.
 * - Plain DOM, no Solid:  `UIComponent` hands it the element and the two ways, and stops it when they change.
 * - `Dragging` and `PrefStore` are loaded on the first press or the first remembered element:
 *   every page loads this folder, and few move anything.
 * - NOTE: a `<ui-diagram-node>` keeps its own `resizable`:  its host draws nothing (`display: contents`),
 *   so it resizes its content box, with the same words (`wayOf()`).
 ****************/
export class MoveAndResize {
  /**
   * What `movable` or `resizable` says:  `both`, `horizontally`, `vertically`, or `undefined` (off).
   * - Bare (`""`) and `"both"` are both ways;  `"false"` and anything else unknown is off.
   */
  static wayOf(value: unknown): MoveWay | undefined {
    if (value === undefined || value === null || value === false) return undefined
    if (value === "" || value === true || value === "both") return "both"
    return MOVE_WAYS.includes(value as MoveWay) ? (value as MoveWay) : undefined
  }

  /**
   * What `resizable` says, as a way:  `width` is `horizontally`, `height` `vertically`, `width, height` `both`.
   * - A comma (or space) list, either order:  `"height, width"` is `both` too.
   * - Bare (`""`):  `bare`, the family's own default (`elementSetup.resizable`).
   * - The move words (`both`, `horizontally`, `vertically`) mean what they always did;
   *   `"false"`, and a list with any word it doesn't know, is off.
   */
  static resizeWayOf(value: unknown, bare: MoveWay = "both"): MoveWay | undefined {
    if (value === "" || value === true) return bare
    const way = MoveAndResize.wayOf(value)
    if (way || typeof value !== "string") return way
    const words = new Set(value.split(/[\s,]+/).filter(Boolean))
    if (!words.size || [...words].some((word) => word !== WIDTH && word !== HEIGHT)) return undefined
    if (words.size === 2) return "both"
    return words.has(WIDTH) ? "horizontally" : "vertically"
  }

  /**
   * Make `element` movable and / or resizable, the ways given;  returns what stops it.
   * - `box`:  the box resized, where it isn't `element` itself (a `display: contents` element's top box).
   * - SIDE EFFECT:  writes its `style` (`resize`, `overflow`, `translate`, `width` / `height`, `cursor`, `touch-action`),
   *   and the box's;  the cleanup takes back what it wrote.
   * - NEVER throws:  storage that can't be read is no remembered place.
   */
  static start(element: HTMLElement, { move, resize, box }: MoveAndResizeWays): () => void {
    if (!move && !resize) return () => {}
    return new MoveAndResize(element, move, resize, box ?? element).stop
  }

  private constructor(
    private readonly element: HTMLElement,
    private readonly move: MoveWay | undefined,
    private readonly resize: MoveWay | undefined,
    /** the box resized:  `element`, or its family's top box */
    private readonly box: HTMLElement
  ) {
    const { style } = box
    if (resize) {
      style.resize = RESIZE_CSS[resize]
      // the browser draws its grip only where the content may overflow
      if (getComputedStyle(box).overflow === "visible") style.overflow = "auto"
    }
    if (move) {
      element.style.cursor = "grab"
      element.style.touchAction = MOVE_TOUCH_ACTION[move]
      // loaded now, so the first press drags at once
      void MoveAndResize.dragging()
    }
    element.addEventListener("pointerdown", this.onPress, { signal: this.listening.signal })
    // a box in the element's shadow root:  its presses reach the element too, but not past a closed root's
    if (box !== element) box.addEventListener("pointerdown", this.onPress, { signal: this.listening.signal })
    void this.giveBackRemembered()
  }

  /** Ends its listeners. */
  private readonly listening = new AbortController()

  /** The last press heard, so a press heard on both the box and the element counts once. */
  private pressed: PointerEvent | undefined

  /** Where it's been moved to, from where it was drawn, in pixels. */
  private moved = { x: 0, y: 0 }

  /** Stop:  the listeners end, and its style is as it was, but for a size or place a person gave it. */
  private readonly stop = () => {
    this.listening.abort()
    if (this.resize) {
      this.box.style.resize = ""
      this.box.style.overflow = ""
    }
    if (this.move) {
      this.element.style.cursor = ""
      this.element.style.touchAction = ""
    }
  }

  ////////////////
  // ## Pressing
  ////////////////

  /** A press:  on the resize grip, the browser's;  on a control of its own, the control's;  else maybe a move. */
  private readonly onPress = (event: PointerEvent) => {
    // heard on the box and again on the element:  once
    if (event.button !== 0 || this.pressed === event) return
    this.pressed = event
    if (this.resize && this.isOnGrip(event)) {
      // the browser resizes it:  keep the size it ends at
      window.addEventListener("pointerup", () => void this.remember(), { once: true, signal: this.listening.signal })
      return
    }
    if (!this.move || this.isOnOwnControl(event)) return
    void this.startMove(event)
  }

  /** A move:  the kit's drag, which leaves the placing to this. */
  private async startMove(event: PointerEvent) {
    const Dragging = MoveAndResize.loadedDragging ?? (await MoveAndResize.dragging())
    const from = { ...this.moved }
    const { clientX, clientY } = event
    const box = this.element.getBoundingClientRect()
    const room = this.element.parentElement?.getBoundingClientRect()
    new Dragging(this.element, event, {
      follows: false,
      placing: (x, y) => {
        let dx = this.move === "vertically" ? 0 : x - clientX
        let dy = this.move === "horizontally" ? 0 : y - clientY
        // held inside its parent's box
        if (room) {
          dx = clamp(dx, room.left - box.left, room.right - box.right)
          dy = clamp(dy, room.top - box.top, room.bottom - box.bottom)
        }
        this.placeAt({ x: from.x + dx, y: from.y + dy })
      },
      onDrop: () => void this.remember(),
      onCancel: () => this.placeAt(from)
    })
  }

  /** Show it moved `moved` from where it was drawn. */
  private placeAt(moved: { x: number; y: number }) {
    this.moved = moved
    this.element.style.translate = moved.x || moved.y ? `${moved.x}px ${moved.y}px` : ""
  }

  /** Is the press on the browser's resize grip, its bottom right corner? */
  private isOnGrip({ clientX, clientY }: PointerEvent): boolean {
    const box = this.box.getBoundingClientRect()
    return clientX > box.right - GRIP_PX && clientY > box.bottom - GRIP_PX
  }

  /** Is the press on a control of its own inside (a button, a field, a link), which keeps its press? */
  private isOnOwnControl(event: PointerEvent): boolean {
    for (const node of event.composedPath()) {
      if (node === this.element) return false
      if (node instanceof Element && node.matches(OWN_CONTROLS)) return true
    }
    return false
  }

  ////////////////
  // ## Remembered
  ////////////////

  /** Keep where it is and its size, for an element with an `id`. */
  private async remember() {
    const key = this.key
    if (!key) return
    const kept: Kept = {}
    if (this.move && (this.moved.x || this.moved.y)) kept.moved = this.moved
    if (this.resize) {
      const { width, height } = this.box.style
      if (width) kept.width = width
      if (height) kept.height = height
    }
    const store = await MoveAndResize.store()
    if (Object.keys(kept).length) store.set(key, kept)
    else store.forget(key)
  }

  /** Give back what was kept for it:  where it was put, its size. */
  private async giveBackRemembered() {
    const key = this.key
    if (!key) return
    const kept = (await MoveAndResize.store()).get<Kept>(key)
    if (!kept || this.listening.signal.aborted) return
    if (this.move && kept.moved) this.placeAt(kept.moved)
    if (this.resize) {
      if (kept.width) this.box.style.width = kept.width
      if (kept.height) this.box.style.height = kept.height
    }
  }

  /** Its key in the store:  its `id`;  none without one. */
  private get key(): string | undefined {
    return this.element.id || undefined
  }

  /** The kit's `Dragging`, loaded on the first movable element. */
  private static async dragging() {
    MoveAndResize.loadedDragging ??= (await import("spell/util/Dragging")).Dragging
    return MoveAndResize.loadedDragging
  }
  private static loadedDragging: typeof import("spell/util/Dragging").Dragging | undefined

  /** Where every element keeps its place and size:  `ui-element:<id>`, made on the first use. */
  private static async store() {
    if (!MoveAndResize.prefs) {
      const { PrefStore } = await import("spell/util/persist/PrefStore")
      MoveAndResize.prefs ??= new PrefStore(PREF_STORE)
    }
    return MoveAndResize.prefs
  }
  private static prefs: import("spell/util/persist/PrefStore").PrefStore | undefined
}

/** Which ways `movable` or `resizable` lets it go. */
export type MoveWay = "both" | "horizontally" | "vertically"

/** The two ways `MoveAndResize.start()` takes;  `undefined` for off. */
export type MoveAndResizeWays = {
  /** `movable` */
  move?: MoveWay
  /** `resizable` */
  resize?: MoveWay
  /** the box `resizable` resizes, where it isn't the element itself:  a `display: contents` element's top box */
  box?: HTMLElement
}

/** What's kept for one element. */
type Kept = {
  /** where it was moved to, from where it was drawn, in pixels */
  moved?: { x: number; y: number }
  /** its width, as its `style` had it */
  width?: string
  /** its height, as its `style` had it */
  height?: string
}

/** `value`, kept between `low` and `high`. */
function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, Math.min(low, 0)), Math.max(high, 0))
}

/** The ways, as both attributes write them. */
const MOVE_WAYS: readonly MoveWay[] = ["both", "horizontally", "vertically"]

/** `resizable`'s words:  the sizes people drag. */
const WIDTH = "width"
const HEIGHT = "height"

/** CSS `resize` for each way. */
const RESIZE_CSS: Record<MoveWay, string> = { both: "both", horizontally: "horizontal", vertically: "vertical" }

/** CSS `touch-action` for each way of moving:  a finger moving it doesn't also scroll the page that way. */
const MOVE_TOUCH_ACTION: Record<MoveWay, string> = { both: "none", horizontally: "pan-y", vertically: "pan-x" }

/** How far in from the bottom right corner a press is on the resize grip, in pixels. */
const GRIP_PX = 16

/** What keeps its own press on a movable element:  controls of its own. */
const OWN_CONTROLS =
  "a[href], button, input, select, textarea, label, summary, [contenteditable=''], [contenteditable='true'], " +
  "[role='button'], [role='link'], [role='slider'], [role='textbox']"

/** The pref store every element keeps its place and size in:  `ui-element:<id>`. */
const PREF_STORE = "ui-element"
