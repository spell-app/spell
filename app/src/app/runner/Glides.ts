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
 * - The list a thing LEAVES keeps its gap until the thing has gone (`closeGap()`):
 *   the other elements beside it stay where they were while it waits, then slide together as it glides away.
 *   - Without it, a column's cards below a card taken from its middle jump up under it at once,
 *     and hide that it rose.
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
    Glides.elements.set(thing, new WeakRef(element))
    if (Glides.startedAt.has(thing)) E.beforeNextPaint(() => Glides.glide(thing))
  }

  /**
   * Note where each of `things` is on screen, just before it moves -- what `core.beforeMove` calls.
   * - A thing with no element on the page is skipped:  it has nowhere to glide from.
   * - NEVER throws.
   */
  static noteWhereThingsAre(things: unknown[]): void {
    const noted = Glides.note(things)
    const moving = new Set(noted.map((thing) => Glides.elementOf(thing)))
    for (const thing of noted) {
      // where its list's other elements are, to close its gap once it has gone (`closeGap()`)
      const element = Glides.elementOf(thing)
      if (element) Glides.gapAround.set(thing, Glides.whereSiblingsAre(element, moving))
    }
    for (const thing of noted) {
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
      const element = Glides.elementOf(thing)
      if (!element?.isConnected) continue
      Glides.startedAt.set(thing, element.getBoundingClientRect())
      Glides.gapAround.delete(thing)
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
    const element = Glides.elementOf(thing)
    const gap = Glides.gapAround.get(thing) ?? []
    if (!from || !element?.isConnected) return
    const wasSide = Glides.sideAt.get(thing)
    Glides.startedAt.delete(thing)
    Glides.sideAt.delete(thing)
    Glides.gapAround.delete(thing)
    const to = element.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (!dx && !dy) return Glides.closeGap(gap, { waitMs: 0, durationMs: GLIDE_MS, easing: GLIDE_EASING })
    const side = element.getAttribute(SIDE_ATTRIBUTE)
    if (wasSide && side && side !== wasSide) {
      Glides.closeGap(gap, { waitMs: TURN_BEAT_MS, durationMs: TURN_MS, easing: TURN_EASING })
      return Glides.turnAndGlide(element, `${dx}px ${dy}px`, wasSide, side)
    }
    Glides.closeGap(gap, { waitMs: 0, durationMs: GLIDE_MS, easing: GLIDE_EASING })
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

  /**
   * Where each element beside `element` is now, in the list it's about to leave:  its gap, for `closeGap()`.
   * - Every other child of its parent:  its list's other things' elements, and whatever else the list draws there.
   * - Not those `moving` too:  each glides on its own.
   */
  private static whereSiblingsAre(element: HTMLElement, moving: Set<HTMLElement | undefined>): NotedElement[] {
    const siblings = element.parentElement ? [...element.parentElement.children] : []
    return siblings
      .filter((sibling): sibling is HTMLElement => sibling instanceof HTMLElement && !moving.has(sibling))
      .map((sibling) => ({ element: sibling, at: sibling.getBoundingClientRect() }))
  }

  /**
   * The elements beside a thing that left (`gap`) stay where they were for `waitMs`, then slide to where they are now:
   * the list closes up once the thing has gone, not the moment it moved.
   * - One that moved too (taken in the same step, so no longer on the page), or didn't shift, is left alone.
   */
  private static closeGap(gap: NotedElement[], how: { waitMs: number; durationMs: number; easing: string }): void {
    for (const { element, at } of gap) {
      if (!element.isConnected) continue
      const now = element.getBoundingClientRect()
      const dx = at.left - now.left
      const dy = at.top - now.top
      if (!dx && !dy) continue
      element.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
        delay: how.waitMs,
        duration: how.durationMs,
        easing: how.easing,
        fill: "backwards"
      })
    }
  }

  /** Does the person want no motion?  Then nothing glides. */
  private static get isStill(): boolean {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  /** `thing`'s latest element, while something else keeps it:  see `elements`. */
  private static elementOf(thing: object): HTMLElement | undefined {
    return Glides.elements.get(thing)?.deref()
  }

  /**
   * Each thing's latest element, held weakly:  a thing outlives its drawings (a site's page, drawn again on each visit),
   * and holding the element kept every drawing it was ever in (epic `solid-2-final` I34).
   */
  private static readonly elements = new WeakMap<object, WeakRef<HTMLElement>>()

  /** Where each moving thing's element was, noted just before it moved;  gone once it has glided. */
  private static readonly startedAt = new WeakMap<object, DOMRect>()

  /** The elements beside each moving thing where it was, and where they were:  its gap (`closeGap()`). */
  private static readonly gapAround = new WeakMap<object, NotedElement[]>()

  /** The side each moving thing showed where it was (`SIDE_ATTRIBUTE`), if it has sides. */
  private static readonly sideAt = new WeakMap<object, string>()
}

/** An element, and where it was on screen when noted. */
interface NotedElement {
  /** the element */
  element: HTMLElement
  /** where it was */
  at: DOMRect
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
