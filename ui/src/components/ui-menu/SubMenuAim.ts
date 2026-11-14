import { E } from "spell/ui/core"

/****************
 * ### `SubMenuAim`
 * Keeps a menu's open sub-menu open while the pointer heads for it,
 * so a diagonal move from a row to its sub-menu doesn't open the sub-menus of the rows it crosses.
 * - The menu asks it before switching sub-menus on hover (`wantsToSwitch()`):  "no" while the pointer is aiming.
 * - It hands the menu back the row under the pointer once the pointer stops aiming (`onGiveUp`):
 *   - two moves in a row that don't head for the sub-menu
 *   - or the pointer resting for `RESTING_SECONDS`, not over the open row and not in the sub-menu
 * - How it tells, on each mouse move (at most one check a frame, `CHECK_EVERY_MS`;  `isAiming()`):
 *   - the move's direction, from the last position checked
 *   - against the directions from there to the sub-menu's two corners on the side facing the row,
 *     widened by `SLACK_DEGREES` each way
 *   - a move away from the sub-menu's side counts as missing it, with no angles worked out
 * - Mouse only:  a touch or a pen has no hover to follow, so it never blocks one (`pointerType`).
 * - Either side:  the sub-menu's box, right or left of its row's, says which way it opens.
 * - Tracks from `start()`, when a sub-menu opens, until `stop()`, when it closes, or the pointer reaches it.
 * - Plain DOM, no Solid, no element of its own:  any menu that opens sub-menus beside rows can use it
 *   (the editor's bar menus, `<BarMenu>`).
 * - A geometry check, as React Aria chose, not an invisible overlay or a clip-path over the gap.
 *   SEE:  https://react-aria.adobe.com/blog/creating-a-pointer-friendly-submenu-experience
 ****************/
export class SubMenuAim {
  /** the open sub-menu's row, its sub-menu, and who hears it give up */
  private readonly setup: SubMenuAimSetup

  constructor(setup: SubMenuAimSetup) {
    this.setup = setup
  }

  /** It's tracking a sub-menu just opened, and the pointer hasn't missed it twice yet. */
  get isTracking(): boolean {
    return this.moves !== undefined
  }

  ////////////////
  // ## Starting and stopping
  ////////////////

  /**
   * Start tracking the sub-menu just opened:  call it every time one opens, the same one again too.
   * - `from`:  where the pointer is now, if known (the event that opened it);  else the next move's position.
   * - Measures the sub-menu's box now (it may have scrolled since), and again on the first move if it wasn't drawn yet.
   * - Restarts cleanly if already tracking.
   */
  start(from?: { clientX: number; clientY: number }): void {
    this.stop()
    const document = this.setup.row()?.ownerDocument
    if (!document) return
    this.moves = new AbortController()
    document.addEventListener("pointermove", this.onMove, { capture: true, signal: this.moves.signal })
    this.target = this.measure()
    this.last = from ? { x: from.clientX, y: from.clientY } : undefined
    this.lastCheck = -Infinity
  }

  /**
   * Stop tracking:  the sub-menu closed, or the pointer reached it.
   * - Safe to call when not tracking.
   */
  stop(): void {
    this.moves?.abort()
    this.moves = undefined
    this.resting?.cancel()
    this.resting = undefined
    this.target = undefined
    this.last = undefined
    this.misses = 0
    this.path = []
  }

  ////////////////
  // ## Asking
  ////////////////

  /**
   * May the menu switch to the row this pointer event is over (`pointerover`)?
   * - `false` while the pointer is aiming at the open sub-menu:  keep it open, leave the row alone.
   * - `true` when it isn't tracking, and for a touch or a pen.
   */
  wantsToSwitch(event: PointerEvent): boolean {
    if (event.pointerType !== MOUSE) return true
    return !this.isTracking
  }

  /**
   * Is a move from `from` by `delta` heading for the sub-menu `target`?
   * - `true` when its direction is between the directions to the target's two near corners,
   *   `slack` degrees wider each way.
   * - `false` at once for a move away from the target's side (right:  `delta.x < 0`;  left:  `delta.x > 0`).
   * - Pure:  no DOM.
   */
  static isAiming(from: Point, delta: Point, target: AimTarget, slack = SLACK_DEGREES): boolean {
    // Mirror a sub-menu on the left onto the right, so one comparison does both
    const flip = target.side === "left" ? -1 : 1
    const dx = delta.x * flip
    if (dx < 0) return false
    if (dx === 0 && delta.y === 0) return true
    // Already level with the edge (beside the sub-menu, above or below it):  its corners straight up or down
    const edgeX = Math.max((target.edge - from.x) * flip, 1)
    const move = Math.atan2(delta.y, dx)
    const top = Math.atan2(target.top - from.y, edgeX)
    const bottom = Math.atan2(target.bottom - from.y, edgeX)
    const widen = (slack * Math.PI) / 180
    return move >= top - widen && move <= bottom + widen
  }

  /**
   * Where sub-menu `subMenu` sits beside `row`:  which side, its near edge, its top and bottom.
   * - Its side is where its middle is, against the row's middle:  right, else left.
   * - Pure:  boxes in, no DOM read.
   */
  static targetFor(row: DOMRectReadOnly, subMenu: DOMRectReadOnly): AimTarget {
    const side: AimSide = subMenu.left + subMenu.width / 2 >= row.left + row.width / 2 ? "right" : "left"
    return { side, edge: side === "right" ? subMenu.left : subMenu.right, top: subMenu.top, bottom: subMenu.bottom }
  }

  ////////////////
  // ## Tracking
  ////////////////

  /** Each mouse move while tracking:  reached the sub-menu, aiming at it, or missed it. */
  private readonly onMove = (event: PointerEvent) => {
    if (event.pointerType !== MOUSE) return
    const subMenu = this.setup.subMenu()
    const row = this.setup.row()
    this.path = event.composedPath()
    if (!subMenu || !row) return this.stop()
    if (this.path.includes(subMenu)) return this.stop()
    this.restartResting()

    const now = performance.now()
    const here = { x: event.clientX, y: event.clientY }
    if (!this.last) {
      this.last = here
      this.lastCheck = now
      return
    }
    if (now - this.lastCheck < CHECK_EVERY_MS) return
    if (!this.target || this.target.top === this.target.bottom) this.target = this.measure()
    if (!this.target) return

    const delta = { x: here.x - this.last.x, y: here.y - this.last.y }
    const isAiming = SubMenuAim.isAiming(this.last, delta, this.target)
    this.last = here
    this.lastCheck = now
    // Over its own row there's nothing else to switch to
    if (isAiming || this.path.includes(row)) this.misses = 0
    else if (++this.misses >= MISSES_TO_GIVE_UP) this.giveUp()
  }

  /** The pointer has rested:  over its row or nowhere new, keep waiting;  anywhere else, give up. */
  private onRest() {
    const row = this.setup.row()
    if (row && this.path.includes(row)) return
    this.giveUp()
  }

  /** Stop tracking, and hand the menu what the pointer is over now, to switch to. */
  private giveUp() {
    const path = this.path
    this.stop()
    this.setup.onGiveUp(path)
  }

  /** Wait `RESTING_SECONDS` again from this move. */
  private restartResting() {
    this.resting?.cancel()
    const resting = E.after(RESTING_SECONDS, () => this.onRest())
    // A cancel rejects with an `AbortError`, which is expected;  anything else is `onGiveUp`'s own throw
    resting.catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error)
    })
    this.resting = resting
  }

  /** The sub-menu's place beside its row, read from their boxes now;  `undefined` while either is missing. */
  private measure(): AimTarget | undefined {
    const row = this.setup.row()
    const subMenu = this.setup.subMenu()
    if (!row || !subMenu) return undefined
    return SubMenuAim.targetFor(row.getBoundingClientRect(), subMenu.getBoundingClientRect())
  }

  /** Stops the move listener;  `undefined` while not tracking. */
  private moves: AbortController | undefined

  /** The rest timer, restarted on every move. */
  private resting: ReturnType<typeof E.after> | undefined

  /** The sub-menu's place, measured at `start()`. */
  private target: AimTarget | undefined

  /** Where the pointer was at the last check. */
  private last: Point | undefined

  /** When the last check ran (`performance.now()`), for the one-a-frame limit. */
  private lastCheck = -Infinity

  /** Moves in a row that missed the sub-menu. */
  private misses = 0

  /** The last move's event path:  what the pointer is over, deepest first. */
  private path: EventTarget[] = []
}

/** What a `SubMenuAim` reads and tells. */
export type SubMenuAimSetup = {
  /** The row whose sub-menu is open, if one is. */
  row: () => Element | undefined
  /** The open sub-menu's box, if one is open. */
  subMenu: () => Element | undefined
  /**
   * The pointer stopped aiming:  switch to what it's over now.
   * - `path`:  the last move's `composedPath()`, deepest first, so a row inside a shadow root is found too;
   *   empty when no move came after `start()`.
   * - Tracking has stopped:  showing a sub-menu again calls `start()` again.
   */
  onGiveUp: (path: EventTarget[]) => void
}

/** A point on the page, in client coordinates. */
export type Point = { x: number; y: number }

/** Which side of its row a sub-menu opens on. */
export type AimSide = "right" | "left"

/** A sub-menu's place:  its side, the x of its edge facing the row, and its top and bottom. */
export type AimTarget = { side: AimSide; edge: number; top: number; bottom: number }

/** `pointerType` of a mouse:  the only pointer that hovers. */
const MOUSE = "mouse"

/** How much wider than the sub-menu's corners a move may head, each way:  React Aria's. */
const SLACK_DEGREES = 15

/** Moves in a row that miss the sub-menu before the row under the pointer takes over:  React Aria's. */
const MISSES_TO_GIVE_UP = 2

/** At most one check this often (a frame at 60Hz):  closer moves are too short for a direction. */
const CHECK_EVERY_MS = 16

/**
 * How long the pointer may rest before the row under it takes over, in seconds.
 * - The article gives no number.
 * - 0.4s:  long enough for a slow, careful move to pause on the way without losing the sub-menu,
 *   short enough that resting on a new row feels like hovering it, half the page's hover delay (0.8s).
 */
const RESTING_SECONDS = 0.4
