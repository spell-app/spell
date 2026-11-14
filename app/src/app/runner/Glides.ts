import { E } from "spell/ui/core"

/****************
 * ### `Glides`
 * A view that MOVES glides from where it was on screen to where it lands,
 * e.g. a card played from a tableau onto a foundation.
 *
 * - How:  note where it was, let it move, then slide it back from there (the "FLIP" technique).
 *   1. just before the move, core asks the page (`core.beforeMove`, set by `installSpellElements()`):
 *      we note where each moving thing's element is (`noteWhereThingsAre()`)
 *   2. the move draws the thing again, in its new list's element:
 *      a NEW element, which tells us it's drawn (`drawn()`)
 *   3. before the next paint, the new element starts where the old one was, and slides home (`glide()`)
 * - The slide is the element's `translate`, not its `transform`:
 *   a pile's layout may rotate its cards (`fanned`), and `translate` adds to that, where a `transform` would replace it.
 * - A list being reordered (epic `outline-spell` P30):
 *   - it notes where its items are (`noteForLater()`)
 *   - it glides them once its children are drawn again (`glideNoted()`)
 *   - which may be later:  a program running elsewhere, e.g. in Python, moves them when its patch comes
 * - A thing TURNED OVER as it moves (a card turned face up and put on the discards, in one step):
 *   it rises over everything where it was, still showing the side it showed there, for a beat (`TURN_BEAT_MS`),
 *   then turns as it glides, both in one motion (epic `editor` I100).
 *   - Its side is its element's `direction` attribute, a two sided view's (`up`, `down`):
 *     the one thing it reads of what an element draws.
 * - None with reduced motion:  the thing just lands.
 * - STATIC and page-wide on purpose:  every runtime copy on a page shares the page's elements.
 * - Knows nothing of core:  core hands it things, and its elements say what they draw.
 ****************/
export class Glides {
  /**
   * Thing `thing` is drawn in `element`, now its latest:  if it was moving, it glides there before the next paint.
   * - SIDE EFFECT:  `element` is the one `noteWhereThingsAre()` measures next time `thing` moves.
   */
  static drawn(thing: object, element: HTMLElement): void {
    Glides.elements.set(thing, element)
    if (Glides.startedAt.has(thing)) E.beforeNextPaint(() => Glides.glide(thing))
  }

  /**
   * Note where each of `things` is on screen, just before it moves -- what `core.beforeMove` calls.
   * - A thing with no element on the page is skipped:  it has nowhere to glide from.
   * - NEVER throws.
   */
  static noteWhereThingsAre(things: unknown[]): void {
    for (const thing of Glides.note(things)) {
      // drawn again in the same element (moved within its list):  `drawn()` never hears of it
      E.beforeNextPaint(() => Glides.glide(thing))
    }
  }

  /**
   * Note where each of `things` is on screen, to glide them when told (`glideNoted()`), not before the next paint:
   * a list's items, about to be reordered, maybe by a program running elsewhere.
   * - Forgotten after `NOTE_KEPT_S` seconds, if nothing glides them:  a move that changed nothing.
   * - NEVER throws.
   */
  static noteForLater(things: unknown[]): void {
    const noted = Glides.note(things)
    // never canceled, and forgetting can't throw:  the catch is only for the lint
    E.after(NOTE_KEPT_S, () => noted.forEach((thing) => Glides.startedAt.delete(thing))).catch(() => {})
  }

  /** Each of `things` noted (`noteForLater()`) slides from there to where it is now, before the next paint. */
  static glideNoted(things: unknown[]): void {
    E.beforeNextPaint(() => {
      for (const thing of things) if (thing && typeof thing === "object") Glides.glide(thing)
    })
  }

  /** Note where each of `things` with an element on the page is now:  returns them -- none with reduced motion. */
  private static note(things: unknown[]): object[] {
    if (Glides.isStill) return []
    const noted: object[] = []
    for (const thing of things) {
      if (!thing || typeof thing !== "object") continue
      const element = Glides.elements.get(thing)
      if (!element?.isConnected) continue
      Glides.startedAt.set(thing, element.getBoundingClientRect())
      const side = element.getAttribute(SIDE_ATTRIBUTE)
      if (side) Glides.sideAt.set(thing, side)
      else Glides.sideAt.delete(thing)
      noted.push(thing)
    }
    return noted
  }

  /**
   * Slide `thing`'s element from where it was noted to where it is now.
   * - Once:  the note is used up, so a second call does nothing.
   * - Raised above everything while it slides, so it passes over the piles between.
   */
  private static glide(thing: object): void {
    const from = Glides.startedAt.get(thing)
    const element = Glides.elements.get(thing)
    if (!from || !element?.isConnected) return
    const wasSide = Glides.sideAt.get(thing)
    Glides.startedAt.delete(thing)
    Glides.sideAt.delete(thing)
    const to = element.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (!dx && !dy) return
    const side = element.getAttribute(SIDE_ATTRIBUTE)
    if (wasSide && side && side !== wasSide) return Glides.turnAndGlide(element, `${dx}px ${dy}px`, wasSide, side)
    element.animate(
      [
        { translate: `${dx}px ${dy}px`, zIndex: GLIDING_Z_INDEX },
        { translate: "0 0", zIndex: GLIDING_Z_INDEX }
      ],
      { duration: GLIDE_MS, easing: GLIDE_EASING }
    )
  }

  /**
   * `element` turned over as it moved:  raised where it was (`from`, a `translate`), showing `wasSide`, for a beat;
   * then it turns to `side` as it glides home.
   * - Its own turn (a two sided view's `transition` on `transform`) is cancelled:  this one turns it, in step with the glide.
   */
  private static turnAndGlide(element: HTMLElement, from: string, wasSide: string, side: string): void {
    for (const animation of element.getAnimations()) {
      if (animation instanceof CSSTransition && animation.transitionProperty === "transform") animation.cancel()
    }
    const beat = TURN_BEAT_MS / (TURN_BEAT_MS + TURN_MS)
    element.animate(
      [
        { offset: 0, translate: from, transform: turnedTo(wasSide), zIndex: GLIDING_Z_INDEX },
        { offset: beat, translate: from, transform: turnedTo(wasSide), zIndex: GLIDING_Z_INDEX, easing: TURN_EASING },
        { offset: 1, translate: "0 0", transform: turnedTo(side), zIndex: GLIDING_Z_INDEX }
      ],
      { duration: TURN_BEAT_MS + TURN_MS }
    )
  }

  /** Does the person want no motion?  Then nothing glides. */
  private static get isStill(): boolean {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  /** Each thing's latest element. */
  private static readonly elements = new WeakMap<object, HTMLElement>()

  /** Where each moving thing's element was, noted just before it moved;  gone once it has glided. */
  private static readonly startedAt = new WeakMap<object, DOMRect>()

  /** The side each moving thing showed where it was (`SIDE_ATTRIBUTE`), if it has sides. */
  private static readonly sideAt = new WeakMap<object, string>()
}

/** How long a slide takes, in milliseconds. */
const GLIDE_MS = 250

/** How it slides:  quickly at first, settling into place. */
const GLIDE_EASING = "cubic-bezier(0.2, 0.7, 0.3, 1)"

/** How long a note kept for later lasts, in seconds, if nothing glides it (`noteForLater()`). */
const NOTE_KEPT_S = 3

/** Above the board while it slides. */
const GLIDING_Z_INDEX = 1000

/** The attribute saying which side a two sided view shows:  `up` or `down`. */
const SIDE_ATTRIBUTE = "direction"

/** How long a thing turned over as it moves waits, raised where it was, before it turns and glides, in milliseconds. */
const TURN_BEAT_MS = 150

/** How long it then takes to turn and glide home, in milliseconds:  a two sided view's turn (`--spell-turn-time`). */
const TURN_MS = 300

/** How it turns and glides:  as a two sided view turns. */
const TURN_EASING = "ease-in-out"

/** A two sided view's `transform` showing `side`, as its own styles turn it (`TwoSidedView.css`). */
function turnedTo(side: string): string {
  const turn = side === "up" ? "0deg" : "180deg"
  return `perspective(var(--spell-turn-perspective, 100em)) rotateY(${turn})`
}
