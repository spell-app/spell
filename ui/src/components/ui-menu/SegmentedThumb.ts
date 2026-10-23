import { E } from "spell-ui/core"

/****************
 * ### `SegmentedThumb`
 * The sliding THUMB of a segmented menu (`appearance="segmented"`):  the chosen option's fill, drawn ONCE under the
 * options and moved to the chosen one, as Apple's segmented control slides.
 * - Plain DOM, no Solid:  `<ui-menu>` (its items draw their boxes in their own shadow roots) and `<ui-tabs>` (its tab
 *   buttons are in its own) both use it, each handing it the track and a way to find the chosen option's box.
 * - It writes the chosen box's place on the track as private custom properties (`--_menu-thumb-x`, `-y`, `-width`,
 *   `-height`, `-radius`) and the `thumbed` class;  `UIMenu.css` draws the thumb from them (the track's `::before`)
 *   and clears the chosen option's own fill.
 * - `moving`, from the frame after the first place:  the thumb slides between choices, never in from nowhere.
 * - Follows sizes while started:  a `ResizeObserver` on the track and the chosen box (fonts loading, a wrap).
 * - No chosen option:  no thumb (`thumbed` off), and the options draw as before.
 ****************/
export class SegmentedThumb {
  /** the menu's box the options sit in, which the thumb is drawn in */
  readonly track: HTMLElement

  /** the chosen option's box now, if any */
  private readonly chosenBox: () => HTMLElement | undefined

  constructor({ track, chosenBox }: SegmentedThumbProps) {
    this.track = track
    this.chosenBox = chosenBox
  }

  /** Watches the track's size while started. */
  private resizes: ResizeObserver | undefined

  /** The chosen box the observer watches too. */
  private watchedBox: HTMLElement | undefined

  /** Cancels a queued `update()`. */
  private cancelQueued: (() => void) | undefined

  /**
   * Draw the thumb, and follow sizes.
   * - Returns `stop()`, for an effect's cleanup.
   */
  start(): () => void {
    this.stop()
    this.resizes = new ResizeObserver(() => this.place())
    this.resizes.observe(this.track)
    this.update()
    return () => this.stop()
  }

  /** Move the thumb to the chosen option, just before the next paint (once the option has redrawn). */
  update(): void {
    this.cancelQueued?.()
    this.cancelQueued = E.beforeNextPaint(() => {
      this.cancelQueued = undefined
      this.place()
    })
  }

  /** Take the thumb down:  the options draw their own fill again. */
  stop(): void {
    this.cancelQueued?.()
    this.cancelQueued = undefined
    this.resizes?.disconnect()
    this.resizes = undefined
    this.watchedBox = undefined
    this.track.classList.remove(THUMBED, MOVING)
  }

  /** Measure the chosen box and write its place on the track. */
  private place(): void {
    const box = this.chosenBox()
    if (!box || !box.isConnected || box.offsetWidth === 0) {
      this.track.classList.remove(THUMBED, MOVING)
      return
    }
    this.watch(box)
    const trackRect = this.track.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()
    const x = boxRect.left - trackRect.left - this.track.clientLeft + this.track.scrollLeft
    const y = boxRect.top - trackRect.top - this.track.clientTop + this.track.scrollTop
    const style = this.track.style
    style.setProperty("--_menu-thumb-x", `${x}px`)
    style.setProperty("--_menu-thumb-y", `${y}px`)
    style.setProperty("--_menu-thumb-width", `${boxRect.width}px`)
    style.setProperty("--_menu-thumb-height", `${boxRect.height}px`)
    style.setProperty("--_menu-thumb-radius", getComputedStyle(box).borderRadius)
    if (this.track.classList.contains(THUMBED)) return
    // the first place:  drawn there at once, sliding only from the next one on
    this.track.classList.add(THUMBED)
    E.beforeNextPaint(() => E.beforeNextPaint(() => this.track.classList.add(MOVING)))
  }

  /** Follow `box`'s size too (its text may change width);  the last one chosen is let go. */
  private watch(box: HTMLElement): void {
    if (box === this.watchedBox || !this.resizes) return
    if (this.watchedBox) this.resizes.unobserve(this.watchedBox)
    this.watchedBox = box
    this.resizes.observe(box)
  }
}

/** Props of `new SegmentedThumb()`. */
export type SegmentedThumbProps = {
  /** the menu's box the options sit in */
  track: HTMLElement
  /** the chosen option's box now, if any;  read on every move */
  chosenBox: () => HTMLElement | undefined
}

/** Class on the track while the thumb is drawn. */
const THUMBED = "thumbed"

/** Class on the track once the thumb may slide. */
const MOVING = "moving"
