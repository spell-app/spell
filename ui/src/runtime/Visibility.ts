import type {
  Disposer,
  LazyImageOptions,
  VisibilityCalculations,
  VisibilityCallbacks,
  VisibilityOptions
} from "./runtime.types"
import type { Transitions } from "./Transitions"

/**
 * Scroll position callbacks for elements, as `UI.visibility` (and the `UI.observeVisibility()` shortcut):  Fomantic's
 * visibility behaviour on `IntersectionObserver` -- no scroll listener.
 * - `observe(element, { onTopVisible, onBottomPassed, onOnScreen ..., once, continuous, offset, context })`
 *   returns the undo.  See `VisibilityCallbacks` for the names;  the calculations are Fomantic's.
 * - Checks happen when something CROSSES:  the element entering / leaving the screen, and its top or bottom edge
 *   crossing the screen top or bottom (two 1px "line" observers).  So `continuous` fires at each crossing, not on
 *   every scrolled pixel, and `onUpdate` likewise.
 * - `once` (default, as Fomantic's):  each callback fires at most once;  `once: false`:  again each time its condition
 *   turns true.  `...Reverse` callbacks fire when their condition turns false after being true.
 * - `lazyImage(img)`:  Fomantic's `type: 'image'` -- an `<img data-src>` (and `data-srcset`) gets its source once on
 *   screen, preloaded then faded in (`UI.transitions`).  Native `loading="lazy"` needs none of this;  this is for the
 *   fade and the callback.
 */
export class Visibility {
  /** runs the fade of `lazyImage()` */
  private readonly transitions: Pick<Transitions, "animate">

  constructor({ transitions }: VisibilityProps) {
    this.transitions = transitions
  }

  /** Watch `element` against the screen;  see class docs.  Returns the undo. */
  observe(element: Element, options: VisibilityOptions = {}): Disposer {
    const watch = new VisibilityWatch(element, options)
    return () => watch.dispose()
  }

  /**
   * Give `image` its `data-src` (and `data-srcset`) once it's on screen, then fade it in.
   * - Returns the undo;  a no-op (and a no-op undo) without `data-src`.
   */
  lazyImage(image: HTMLImageElement, options: LazyImageOptions = {}): Disposer {
    const src = image.getAttribute(DATA_SRC)
    if (!src) return () => undefined
    // the callback runs a task after `observe()` returns (checks are queued), so `stop` is set by then
    const stop: Disposer = this.observe(image, {
      once: true,
      offset: options.offset,
      context: options.context,
      onOnScreen: () => {
        stop()
        void this.load(image, src, options)
      }
    })
    return stop
  }

  /** Preload `src`, set it, run the transition, report. */
  private async load(image: HTMLImageElement, src: string, options: LazyImageOptions) {
    const srcset = image.getAttribute(DATA_SRCSET)
    const probe = new Image()
    if (srcset) probe.srcset = srcset
    probe.src = src
    try {
      await probe.decode()
    } catch {
      // a broken image:  set it anyway, the browser shows its own broken state
    }
    if (srcset) image.srcset = srcset
    image.src = src
    if (options.transition !== false) {
      await this.transitions.animate(image, options.transition ?? FADE, IN, {
        duration: options.duration ?? DEFAULT_DURATION
      })
    }
    options.onLoad?.(image)
  }
}

/** Constructor props for `Visibility`. */
export type VisibilityProps = {
  transitions: Pick<Transitions, "animate">
}

/****************
 * ### `VisibilityWatch`
 * One `observe()` call:  three observers on the element (the screen, a 1px line at the screen top, one at the
 * bottom), a check when any fires, and the callbacks the check calls.
 * - Checks are coalesced to one per task:  the three observers report the same crossing together.
 * - The line observers' margins are px (a root margin can't say "all but 1px"), so they're rebuilt when the
 *   screen resizes.
 ****************/
class VisibilityWatch {
  /** watched element */
  private readonly element: Element
  /** callbacks and options */
  private readonly options: VisibilityOptions
  /** live observers */
  private observers: IntersectionObserver[] = []
  /** callbacks that have fired (and, unless `continuous`, won't again while their condition holds) */
  private readonly occurred = new Set<keyof VisibilityCallbacks>()
  /** last calculations, for reverse callbacks */
  private previous?: VisibilityCalculations
  /** element top at the last check, for `direction` */
  private lastTop?: number
  /** a check is queued */
  private pending = false
  /** stops watching the screen size */
  private readonly unwatchSize: () => void

  constructor(element: Element, options: VisibilityOptions) {
    this.element = element
    this.options = options
    this.build()
    const context = options.context
    if (context) {
      const resize = new ResizeObserver(() => this.build())
      resize.observe(context)
      this.unwatchSize = () => resize.disconnect()
    } else {
      const view = element.ownerDocument.defaultView
      const onResize = () => this.build()
      view?.addEventListener(RESIZE, onResize)
      this.unwatchSize = () => view?.removeEventListener(RESIZE, onResize)
    }
  }

  /** Stop:  observers and size watching. */
  dispose() {
    for (const observer of this.observers.splice(0)) observer.disconnect()
    this.unwatchSize()
  }

  ////////////////
  // ## Observers
  ////////////////

  /** (Re)create the three observers for the current screen height. */
  private build() {
    for (const observer of this.observers.splice(0)) observer.disconnect()
    const { element } = this
    const context = this.options.context ?? null
    const offset = this.options.offset ?? 0
    const height = context ? context.clientHeight : element.ownerDocument.documentElement.clientHeight
    const root = context ?? element.ownerDocument
    const lineBelowTop = Math.max(0, height - offset - 1)
    const lineAboveBottom = Math.max(0, height - 1)
    for (const [rootMargin, threshold] of [
      [`${-offset}px 0px 0px 0px`, [0, 1]],
      [`${-offset}px 0px ${-lineBelowTop}px 0px`, [0]],
      [`${-lineAboveBottom}px 0px 0px 0px`, [0]]
    ] as const) {
      const observer = new IntersectionObserver(() => this.schedule(), { root, rootMargin, threshold: [...threshold] })
      observer.observe(element)
      this.observers.push(observer)
    }
  }

  /** Queue one check for this task. */
  private schedule() {
    if (this.pending) return
    this.pending = true
    setTimeout(() => {
      this.pending = false
      if (this.observers.length) this.check()
    })
  }

  ////////////////
  // ## Checking
  ////////////////

  /** Measure, then call what the calculations call for (reverse callbacks first, as Fomantic). */
  private check() {
    const rect = this.element.getBoundingClientRect()
    if (!rect.width && !rect.height) return
    const calculations = this.calculate(rect)
    const previous = this.previous
    this.previous = calculations
    for (const name of EDGES) {
      if (previous?.[name] && !calculations[name]) this.reverse(REVERSE_KEYS[name], calculations)
    }
    for (const name of CONDITIONS) this.forward(FORWARD_KEYS[name], calculations[name], calculations)
    this.options.onUpdate?.(calculations)
  }

  /** Fomantic's calculations for `rect`. */
  private calculate(rect: DOMRect): VisibilityCalculations {
    const context = this.options.context
    const top = (context ? context.getBoundingClientRect().top + context.clientTop : 0) + (this.options.offset ?? 0)
    const bottom = context
      ? context.getBoundingClientRect().top + context.clientTop + context.clientHeight
      : this.element.ownerDocument.documentElement.clientHeight
    const topPassed = top >= rect.top
    const bottomPassed = top >= rect.bottom
    const topVisible = bottom >= rect.top && !topPassed
    const bottomVisible = bottom >= rect.bottom && !bottomPassed
    const passing = topPassed && !bottomPassed
    const onScreen = (topVisible || passing) && !bottomPassed
    const last = this.lastTop
    this.lastTop = rect.top
    const direction = last === undefined || last === rect.top ? STATIC : rect.top < last ? DOWN : UP
    return {
      topPassed,
      bottomPassed,
      topVisible,
      bottomVisible,
      passing,
      onScreen,
      offScreen: !onScreen,
      pixelsPassed: passing ? top - rect.top : 0,
      percentagePassed: passing && rect.height ? (top - rect.top) / rect.height : 0,
      direction
    }
  }

  /** A forward callback:  fire while `on` (once, or every check when `continuous`);  re-arm when off unless `once`. */
  private forward(key: keyof VisibilityCallbacks, on: boolean, calculations: VisibilityCalculations) {
    const { once = true, continuous = false } = this.options
    if (!on) {
      if (!once) this.occurred.delete(key)
      return
    }
    if (!continuous && this.occurred.has(key)) return
    this.occurred.add(key)
    this.options[key]?.(calculations)
  }

  /** A reverse callback:  fire on the turn to false (only the first time, with `once`). */
  private reverse(key: keyof VisibilityCallbacks, calculations: VisibilityCalculations) {
    if ((this.options.once ?? true) && this.occurred.has(key)) return
    this.occurred.add(key)
    this.options[key]?.(calculations)
  }
}

/** Conditions with a forward callback, in Fomantic's order. */
const CONDITIONS = [
  "onScreen",
  "offScreen",
  "passing",
  "topVisible",
  "bottomVisible",
  "topPassed",
  "bottomPassed"
] as const

/** Conditions with a reverse callback. */
const EDGES = ["passing", "topVisible", "bottomVisible", "topPassed", "bottomPassed"] as const

/** Forward callback of each condition. */
const FORWARD_KEYS: Record<(typeof CONDITIONS)[number], keyof VisibilityCallbacks> = {
  onScreen: "onOnScreen",
  offScreen: "onOffScreen",
  passing: "onPassing",
  topVisible: "onTopVisible",
  bottomVisible: "onBottomVisible",
  topPassed: "onTopPassed",
  bottomPassed: "onBottomPassed"
}

/** Reverse callback of each edge condition. */
const REVERSE_KEYS: Record<(typeof EDGES)[number], keyof VisibilityCallbacks> = {
  passing: "onPassingReverse",
  topVisible: "onTopVisibleReverse",
  bottomVisible: "onBottomVisibleReverse",
  topPassed: "onTopPassedReverse",
  bottomPassed: "onBottomPassedReverse"
}

/** Directions. */
const UP = "up"
const DOWN = "down"
const STATIC = "static"

/** Screen resize event. */
const RESIZE = "resize"

/** Lazy image attributes (Fomantic's `metadata.src`). */
const DATA_SRC = "data-src"
const DATA_SRCSET = "data-srcset"

/** Lazy image transition (Fomantic's `fade in`, 1000ms). */
const FADE = "fade"
const IN = "in"
const DEFAULT_DURATION = 1000
