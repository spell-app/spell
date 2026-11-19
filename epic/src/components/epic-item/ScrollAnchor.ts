import { beforeNextPaint } from "spell/util/timing"

/****************
 * ### `ScrollAnchor`
 * Keeps what the reader was looking at in the same spot on screen while a click folds, filters or opens much of the
 * page at once (epic `epic-engine` I350).
 * - The clicks:  a state chip in the page's toolbar or on a section's title, "show all" under a filtered list, the
 *   toolbar's expand-all / collapse-all.
 * - Before the change, it notes the ANCHOR:  the first section, phase or item that shows, whose top is at or below
 *   where the titles stuck over it end (the page header, its toolbar, the stuck section titles:  `--epic-stack`).
 *   - none starts below that line (the reader is inside a long item):  the innermost one that crosses it
 * - After, it scrolls so the anchor's top is back where it was, every frame for `KEEP_MS`, and on while the page's
 *   height still changes:  lines draw a frame late (`NearScreen`, I333), and parts load later still.
 *   - the anchor hidden by the change:  the nearest one before it that still shows (an item above it, or its section),
 *     put where the anchor was
 *   - the reader scrolling, pressing a key or clicking stops it;  so does a newer keep
 * - Why:  hiding many items above the reader made the page much shorter, and the browser kept the old scroll
 *   position, clamped to the new end:  the reader landed at the very bottom, and the page looked gone
 *   (Owen, 2026-11-18:  "Keep the current top item scrolled into view instead").
 * - Plain DOM, no Solid:  the page and its sections call it around their own changes.
 * - NEVER throws:  without a DOM, or with nothing to anchor on, it only makes the change.
 ****************/
export class ScrollAnchor {
  /**
   * Make `change` (a filter, a fold), keeping the anchor under `root` (default:  the whole page) where it is on screen.
   * - `change` runs at once, synchronously;  the scroll follows over the next frames
   * - resolves once it stops:  the page settled, or the reader moved
   */
  static keep(change: () => void, root?: Element): Promise<void> {
    if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") {
      change()
      return Promise.resolve()
    }
    root ??= document.documentElement
    const keeper = new ScrollAnchor(root)
    change()
    return keeper.follow()
  }

  /**
   * The anchor under `root`, and its top now (px from the window's top), for `keep()` and the tests;  `undefined`
   * when nothing under it shows.
   * - in document order:  the first that shows whose top is at or below its stuck titles (`stackOf()`), in the window
   * - else the last that crosses that line:  the innermost the reader is inside
   */
  static anchorOf(root: Element): { element: Element; top: number; index: number; candidates: Element[] } | undefined {
    const candidates = Array.from(root.querySelectorAll(CANDIDATES))
    let inside: { element: Element; top: number; index: number } | undefined
    for (const [index, element] of candidates.entries()) {
      if (!ScrollAnchor.shows(element)) continue
      const box = element.getBoundingClientRect()
      const line = ScrollAnchor.stackOf(element)
      if (box.top >= line - 1) {
        if (box.top >= window.innerHeight) break
        return { element, top: box.top, index, candidates }
      }
      if (box.bottom > line) inside = { element, top: box.top, index }
    }
    return inside && { ...inside, candidates }
  }

  /** Whether `element` draws a box:  not hidden, nor in a folded or filtered-out box. */
  static shows(element: Element): boolean {
    return element.getClientRects().length > 0
  }

  /**
   * Where the titles stuck over `element` end, px from the window's top:  the `--epic-stack` it inherits (the page
   * header and its toolbar, and the titles of the sections it's in);  0 outside an epic page.
   */
  static stackOf(element: Element): number {
    return parseFloat(getComputedStyle(element).getPropertyValue(STACK)) || 0
  }

  /** The keep running now:  a newer one stops it. */
  private static current: ScrollAnchor | undefined

  /** The anchor, as it was before the change;  `undefined`:  nothing to keep. */
  private readonly before: ReturnType<typeof ScrollAnchor.anchorOf>
  /** Set when the reader moves, or a newer keep starts. */
  private stopped = false

  private constructor(root: Element) {
    ScrollAnchor.current?.stop()
    ScrollAnchor.current = this
    this.before = ScrollAnchor.anchorOf(root)
  }

  /**
   * Put the anchor back every frame for `KEEP_MS`, and on while the page still grows or shrinks (parts loading as
   * expand-all opens them:  a minute on epic-engine's page), up to `MAX_MS`;  until the reader moves or a newer keep.
   */
  private follow(): Promise<void> {
    if (!this.before) return Promise.resolve()
    const stop = () => this.stop()
    for (const type of READER_MOVES) window.addEventListener(type, stop, { capture: true, passive: true })
    const started = performance.now()
    let height = document.documentElement.scrollHeight
    let still = started
    return new Promise<void>((resolve) => {
      const frame = (now: number) => {
        if (!this.stopped) this.putBack()
        const nowHeight = document.documentElement.scrollHeight
        if (nowHeight !== height) [height, still] = [nowHeight, now]
        const settled = now - started >= KEEP_MS && now - still >= STILL_MS
        if (this.stopped || settled || now - started >= MAX_MS) {
          for (const type of READER_MOVES) window.removeEventListener(type, stop, { capture: true })
          if (ScrollAnchor.current === this) ScrollAnchor.current = undefined
          resolve()
        } else beforeNextPaint(frame)
      }
      beforeNextPaint(frame)
    })
  }

  /** Scroll so the anchor (or the nearest before it that shows) is where the anchor was. */
  private putBack() {
    const { top } = this.before!
    const element = this.shown()
    if (!element) return
    const moved = element.getBoundingClientRect().top - top
    if (Math.abs(moved) >= 0.5) window.scrollBy({ top: moved, behavior: "instant" })
  }

  /** The anchor, if it still shows;  else the nearest candidate before it that does. */
  private shown(): Element | undefined {
    const { element, index, candidates } = this.before!
    if (ScrollAnchor.shows(element)) return element
    for (let at = index - 1; at >= 0; at--) {
      const candidate = candidates[at]!
      if (candidate.isConnected && ScrollAnchor.shows(candidate)) return candidate
    }
    return undefined
  }

  private stop() {
    this.stopped = true
  }
}

/** What can be an anchor:  the page's sections and blocks, its phases and its items. */
const CANDIDATES = "epic-overview, epic-section, epic-phase, epic-item"

/** The custom property an epic page sets for where the titles stuck over each box end. */
const STACK = "--epic-stack"

/** How long the anchor is kept after the change at least, ms:  lines drawn a frame late. */
const KEEP_MS = 1200

/** How long the page's height must stay the same before the keep ends, ms:  parts still loading move it. */
const STILL_MS = 500

/** The longest a keep runs, ms. */
const MAX_MS = 120_000

/** The reader's own moves, which stop a keep. */
const READER_MOVES = ["wheel", "touchstart", "keydown", "pointerdown"] as const
