import { E } from "spell/ui/core"

/****************
 * ### `ScrollShades`
 * Which ends of a pane's body have more to scroll to:  what `<ui-panel appearance="pane">`'s scroll shades show by.
 * - The body is the first of the panel's own children that scrolls (`overflow-y` `auto` or `scroll`):
 *   a pane's content box doesn't scroll itself, what's put in it does (the editor's Inspector cards).
 * - Measured on every scroll, every resize of the body or of what's directly in it,
 *   and whenever the panel's children change (`refresh()`, which picks the body again).
 * - Plain DOM, no Solid:  it hands each answer to `onChange`, and the panel keeps it in its own state.
 * - Why a script, not a scroll-driven animation (epic `editor` I227):  Chrome doesn't move a scroll timeline when
 *   the content under it shrinks without a scroll, so the top shade stayed on an Inspector card whose long body
 *   was swapped for a short one, scrolled to the top and not scrolling at all.
 ****************/
export class ScrollShades {
  /** The body watched, once `refresh()` found one. */
  private body: HTMLElement | undefined
  /** Stops the scroll listener on `body`. */
  private listening: AbortController | undefined
  /** Watches `body` and what's directly in it change size:  made on the first `refresh()`, as a server has none. */
  private resizes: ResizeObserver | undefined

  constructor(
    /** the panel's DOM element:  its own children are searched for the body */
    private readonly domElement: HTMLElement,
    /** told each measure's answer:  `start`, scrolled from the top;  `end`, more below */
    private readonly onChange: (ends: E.ScrollEnds) => void
  ) {}

  /** Pick the body again, watch it and what's in it, and measure. */
  refresh(): void {
    const body = ScrollShades.bodyOf(this.domElement)
    if (body !== this.body) {
      this.listening?.abort()
      this.listening = undefined
      this.body = body
      if (body) {
        this.listening = new AbortController()
        body.addEventListener("scroll", () => this.measure(), { passive: true, signal: this.listening.signal })
      }
    }
    const resizes = (this.resizes ??= new ResizeObserver(() => this.measure()))
    resizes.disconnect()
    if (body) {
      resizes.observe(body)
      for (const child of body.children) resizes.observe(child)
    }
    this.measure()
  }

  /** Stop watching:  no shades until the next `refresh()`. */
  stop(): void {
    this.listening?.abort()
    this.listening = undefined
    this.resizes?.disconnect()
    this.body = undefined
    this.onChange(NO_ENDS)
  }

  /** Tell `onChange` which ends of the body can still scroll. */
  private measure(): void {
    this.onChange(this.body ? E.scrollEnds(this.body, "block") : NO_ENDS)
  }

  /** The first of `domElement`'s own children in its content (no `slot`) that scrolls up and down, if any. */
  static bodyOf(domElement: HTMLElement): HTMLElement | undefined {
    for (const child of domElement.children) {
      if (child.slot) continue
      const { overflowY } = getComputedStyle(child)
      if (overflowY === "auto" || overflowY === "scroll") return child as HTMLElement
    }
    return undefined
  }
}

/** Neither end:  no shade. */
const NO_ENDS: E.ScrollEnds = { start: false, end: false }
