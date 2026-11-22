import { E } from "spell/ui/core"

/****************
 * ### `ScrollShades`
 * Which ends of a pane's body have more to scroll to:  what `<ui-panel appearance="pane">`'s scroll shades show by.
 * - The body is the first of the panel's own children that scrolls (`overflow-y` `auto` or `scroll`):
 *   a pane's content box doesn't scroll itself, what's put in it does (the editor's Inspector cards).
 * - Measured on every scroll, every resize of the body or of what's directly in it,
 *   whenever what's directly in the body changes, and whenever the panel's own children change
 *   (`refresh()`, which picks the body again).
 * - Reads as few styles as it can (epic `solid-2-final` P3):  a busy Inspector card once read every child's style
 *   on each change deep inside it, 3.5 s of the editor's load on a phone.
 *   - It keeps the body it found while that's still one of the panel's children.
 *   - It reads the style of a child only once:  a child that didn't scroll isn't asked again.
 *   - A change deeper in than the body's own children only changes sizes, which the resize watcher sees.
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
  /** Watches what's directly in `body` come and go:  made with `resizes`. */
  private rows: MutationObserver | undefined
  /** The panel's children already read that don't scroll:  not read again until `stop()`. */
  private notScrolling = new WeakSet<Element>()

  constructor(
    /** the panel's DOM element:  its own children are searched for the body */
    private readonly domElement: HTMLElement,
    /** told each measure's answer:  `start`, scrolled from the top;  `end`, more below */
    private readonly onChange: (ends: E.ScrollEnds) => void
  ) {}

  /** Pick the body again, watch it and what's in it, and measure. */
  refresh(): void {
    const body = this.findBody()
    if (body !== this.body) {
      this.listening?.abort()
      this.listening = undefined
      this.body = body
      // oxlint-disable-next-line spell-ui/no-mutation-observer -- watches the body, another element, and only its rows
      this.rows ??= new MutationObserver(() => this.watchRows())
      this.rows.disconnect()
      if (body) {
        this.listening = new AbortController()
        body.addEventListener("scroll", () => this.measure(), { passive: true, signal: this.listening.signal })
        this.rows.observe(body, { childList: true })
      }
    }
    this.watchRows()
  }

  /** Stop watching:  no shades until the next `refresh()`. */
  stop(): void {
    this.listening?.abort()
    this.listening = undefined
    this.resizes?.disconnect()
    this.rows?.disconnect()
    this.body = undefined
    this.notScrolling = new WeakSet()
    this.onChange(NO_ENDS)
  }

  /** Watch the body and what's directly in it change size, and measure. */
  private watchRows(): void {
    const resizes = (this.resizes ??= new ResizeObserver(() => this.measure()))
    resizes.disconnect()
    if (this.body) {
      resizes.observe(this.body)
      for (const child of this.body.children) resizes.observe(child)
    }
    this.measure()
  }

  /** Tell `onChange` which ends of the body can still scroll. */
  private measure(): void {
    this.onChange(this.body ? E.scrollEnds(this.body, "block") : NO_ENDS)
  }

  /**
   * The first of the panel's own children in its content (no `slot`) that scrolls up and down, if any.
   * - The body found before, while it's still one of them:  no style read.
   * - Else reads only the children it hasn't read before.
   */
  private findBody(): HTMLElement | undefined {
    if (this.body?.parentElement === this.domElement) return this.body
    for (const child of this.domElement.children) {
      if (child.slot || this.notScrolling.has(child)) continue
      const { overflowY } = getComputedStyle(child)
      if (overflowY === "auto" || overflowY === "scroll") return child as HTMLElement
      this.notScrolling.add(child)
    }
    return undefined
  }
}

/** Neither end:  no shade. */
const NO_ENDS: E.ScrollEnds = { start: false, end: false }
