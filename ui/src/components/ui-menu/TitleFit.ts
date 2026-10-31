import { E } from "spell/ui/core"

/****************
 * ### `TitleFit`
 * How a `shrinkable` menu (`<ui-menu shrinkable>`, `<ui-toolbar shrinkable>`) fits its items' titles to its row,
 * in four stages as it gets narrower (epic `ui-gaps` P13, from the docs toolbars' own;  epic `epic-engine` Q29-Q38):
 *   1. every title whole, while they fit
 *   2. the longest titles cut first, down to one width, each ending in `…` (`cap()`)
 *   3. once any title would be cut under `--ui-menu-title-min` (50px):  icons only, every title gone
 *   4. once even the icons don't fit (a button under `--ui-menu-item-min`, 34px):  the items fold into ONE overflow
 *      button, whose menu holds them all
 * - A `segmented` menu has two:  whole, else a dropdown (its overflow button showing the chosen item).
 *   - A toolbar's `scroll-first` puts one between them:  the row scrolls while it has `--ui-toolbar-scroll-min`.
 * - Plain DOM, no Solid, shaped like `SegmentedThumb`:  `<ui-menu>` hands it its box and a way to find its items,
 *   starts it, and hears each new answer (`onAnswer`).
 * - The maths are pure statics (`cap()`, `fit()`), tested on their own.
 * - What it writes, on the menu's box and DOM element (`present()`):
 *   - `--_menu-fit`:  `whole`, `cut`, `icons` or `overflow`, which the item rules query (`UIMenu.css`)
 *   - `--_menu-title-max`:  the widest a title may be now, while `cut`
 *   - the DOM element's `:state(icons-only)`, `:state(overflow)` or `:state(dropdown)`
 * - It measures every stage for real, the same way whichever stage shows now (`measure()`):
 *   - for each stage it writes that stage's look, reads the sizes, then writes back the stage that shows,
 *     all before the next paint, so nothing flashes and a page's own CSS for `:state(icons-only)` counts
 *   - so a width between two stages never flips back and forth
 * - It refits (`update()`) whenever a size could have changed:  the box, an item's box or title, anything else in
 *   the row (`ResizeObserver`), the fonts loading;  the menu also asks when its items or their words change.
 *   - It writes only when the answer changed, so the sizes it causes can't set it off again.
 ****************/
export class TitleFit {
  /** the menu's box its items sit in:  where the stage is written */
  readonly box: HTMLElement

  /** what it measures and writes, from the menu */
  private readonly setup: TitleFitSetup

  constructor(setup: TitleFitSetup) {
    this.box = setup.box
    this.setup = setup
  }

  /** The stage showing now. */
  answer: FitAnswer = WHOLE

  /** Watches the sizes while started. */
  private resizes: ResizeObserver | undefined

  /** What the observer watches now. */
  private readonly watched = new Set<Element>()

  /** Stops the fonts' listener. */
  private fonts: AbortController | undefined

  /** `refit()` just before the next paint, once however often `update()` asks. */
  private readonly refits = new E.Queued({ when: E.beforeNextPaint, run: () => this.refit() })

  ////////////////
  // ## Starting and stopping
  ////////////////

  /**
   * Fit now, and refit whenever a size could have changed.
   * - Returns `stop()`, for an effect's cleanup.
   */
  start(): () => void {
    this.stop()
    this.resizes = new ResizeObserver(() => this.update())
    this.fonts = new AbortController()
    const fonts = document.fonts
    fonts?.addEventListener("loadingdone", () => this.update(), { signal: this.fonts.signal })
    void fonts?.ready.then(() => this.update())
    this.refit()
    return () => this.stop()
  }

  /** Refit just before the next paint, once whatever changed has drawn. */
  update(): void {
    if (this.resizes) this.refits.ask()
  }

  /** Stop watching, and take its look away:  every title whole again. */
  stop(): void {
    this.refits.cancel()
    this.resizes?.disconnect()
    this.resizes = undefined
    this.watched.clear()
    this.fonts?.abort()
    this.fonts = undefined
    this.answer = WHOLE
    this.box.style.removeProperty(FIT)
    this.box.style.removeProperty(TITLE_MAX)
    for (const name of STAGE_STATES) this.setup.domElement.setState(name, false)
  }

  ////////////////
  // ## Fitting
  ////////////////

  /** Measure every stage, and show the one that fits;  tell the menu when that changed. */
  refit(): void {
    if (!this.resizes || !this.box.isConnected) return
    const next = this.fitNow()
    this.present(next)
    if (next === this.answer) return
    this.answer = next
    this.setup.onAnswer(next)
  }

  /** The stage that fits now, measured. */
  private fitNow(): FitAnswer {
    const { rows, others } = this.setup.children()
    this.watch([...rows.flatMap(({ box, title }) => [box, title]), ...others.flatMap(TitleFit.boxesOf)])
    if (!rows.length) return WHOLE
    const sizes = this.measure(rows, others)
    if (sizes.fitsWhole) return WHOLE
    const titlesRoom = sizes.room - sizes.fixed.reduce((sum, width) => sum + width, 0)
    if (this.setup.isSegmented()) {
      if (TitleFit.cap(sizes.titles, titlesRoom) === undefined) return WHOLE
      return this.setup.scrollsFirst?.() && sizes.room >= sizes.scrollMin ? WHOLE : OVERFLOW
    }
    return TitleFit.fit(sizes.titles, titlesRoom, sizes.titleMin, {
      widths: sizes.icons,
      room: sizes.room,
      min: sizes.itemMin
    })
  }

  /**
   * The sizes each stage needs, each measured in its own look:
   * - `fitsWhole`:  every title whole, nothing cut and nothing past the row's end:  the rest needn't be read
   * - `room`:  the row's width for its items, less its padding, its gaps and everything else in it
   *   (with their margins:  once the row is full, an `auto` margin has nothing left to take)
   * - `titles`:  each title's natural width;  `fixed`:  the rest of each item (padding, icon, badge), titles whole
   * - `icons`:  each item's width with its icon only
   * - `titleMin`, `itemMin`:  the two minimums, read from the menu's tokens
   * - SIDE EFFECT:  writes each look in turn, then writes back the one showing;  no paint in between.
   */
  private measure(rows: readonly FitRow[], others: readonly Element[]): FitSizes {
    const { box } = this
    this.present(WHOLE)
    const style = getComputedStyle(box)
    const fontSize = parseFloat(style.fontSize) || DEFAULT_FONT_SIZE
    const shown = others.filter(TitleFit.isShown)
    const gaps = (parseFloat(style.columnGap) || 0) * Math.max(0, rows.length + shown.length - 1)
    const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
    const fitsWhole =
      box.scrollWidth <= box.clientWidth &&
      rows.every(({ title }) => title.scrollWidth - title.getBoundingClientRect().width <= HAIR)
    const othersWidth = shown.reduce((sum, element) => sum + TitleFit.widthOf(element) + TitleFit.marginsOf(element), 0)
    const room = box.clientWidth - padding - gaps - othersWidth
    const titles = rows.map(({ title }) => title.scrollWidth)
    const fixed = rows.map(
      ({ box: itemBox, title }) => TitleFit.outerWidthOf(itemBox) - title.getBoundingClientRect().width
    )
    const titleMin = TitleFit.lengthOf(style.getPropertyValue(TITLE_MIN), fontSize, DEFAULT_TITLE_MIN)
    const itemMin = TitleFit.lengthOf(style.getPropertyValue(ITEM_MIN), fontSize, DEFAULT_ITEM_MIN)
    const scrollMin = TitleFit.lengthOf(style.getPropertyValue(SCROLL_MIN), fontSize, DEFAULT_SCROLL_MIN)
    let icons: number[] = []
    if (!this.setup.isSegmented()) {
      this.present(ICONS)
      icons = rows.map(({ box: itemBox }) => TitleFit.outerWidthOf(itemBox))
    }
    this.present(this.answer)
    return { fitsWhole, room, titles, fixed, icons, titleMin, itemMin, scrollMin }
  }

  /** Write `answer`'s look:  `--_menu-fit` and `--_menu-title-max` on the box, the stage's `:state()`. */
  private present(answer: FitAnswer): void {
    const { box, setup } = this
    const isSegmented = setup.isSegmented()
    box.style.setProperty(FIT, typeof answer === "number" ? CUT : answer)
    if (typeof answer === "number") box.style.setProperty(TITLE_MAX, `${answer}px`)
    else box.style.removeProperty(TITLE_MAX)
    setup.domElement.setState(ICONS_ONLY_STATE, answer === ICONS)
    setup.domElement.setState(OVERFLOW_STATE, answer === OVERFLOW && !isSegmented)
    setup.domElement.setState(DROPDOWN_STATE, answer === OVERFLOW && isSegmented)
  }

  /** Watch `elements`' sizes:  the new ones from now, the gone ones no more. */
  private watch(elements: readonly Element[]): void {
    const resizes = this.resizes
    if (!resizes) return
    // the menu's parent too:  a segmented one's dropdown is only as wide as its button, so its box can't tell
    // when there's room again
    const parent = this.setup.domElement.parentElement
    const next = new Set([this.box, ...(parent ? [parent] : []), ...elements])
    for (const element of this.watched) {
      if (!next.has(element)) {
        resizes.unobserve(element)
        this.watched.delete(element)
      }
    }
    for (const element of next) {
      if (this.watched.has(element)) continue
      resizes.observe(element)
      this.watched.add(element)
    }
  }

  ////////////////
  // ## The maths
  ////////////////

  /**
   * How titles of natural `widths` (px) fit `room`, and what to show:
   * - `"whole"`:  every one, uncut
   * - a number:  the widest a title may be (`cap()`), the longest giving way first
   * - `"icons"`:  none, the icons only, once a title would be cut under `min`:  a stub like "6 W…" says nothing
   * - `"overflow"`:  not even the icons fit;  needs `icons`, each item's width with its icon only, the row's room for
   *   them and the smallest a button may be:  they fit while every button, at least `icons.min` wide, adds up to no
   *   more than `icons.room`
   * - e.g. `[30, 80, 120]`, `min` 50:  in 230px `"whole"`, in 200px 90, in 120px `"icons"` (45 each)
   * - STATIC:  pure, no DOM
   */
  static fit(widths: readonly number[], room: number, min: number, icons?: IconRow): FitAnswer {
    const cap = TitleFit.cap(widths, room)
    if (cap === undefined) return WHOLE
    if (cap >= min) return cap
    if (!icons) return ICONS
    const needed = icons.widths.reduce((sum, width) => sum + Math.max(width, icons.min), 0)
    return needed > icons.room ? OVERFLOW : ICONS
  }

  /**
   * The widest a title may be so `widths` fit in `room`, the longest giving way first;  `undefined`:  all fit whole.
   * - e.g. `[30, 80, 120]` in 200px:  90 (30 + 80 + 90)
   * - STATIC:  pure, no DOM
   */
  static cap(widths: readonly number[], room: number): number | undefined {
    const sorted = [...widths].sort((a, b) => a - b)
    let left = room
    for (const [index, width] of sorted.entries()) {
      const share = left / (sorted.length - index)
      if (width > share) return Math.max(0, Math.floor(share))
      left -= width
    }
    return undefined
  }

  /**
   * A token's length in px:  `50px`, `3em` (of `fontSize`), or a bare number of px;  `fallback` for anything else.
   * - STATIC:  pure, no DOM
   */
  static lengthOf(text: string, fontSize: number, fallback: number): number {
    const match = LENGTH.exec(text.trim())
    if (!match) return fallback
    const value = parseFloat(match[1]!)
    return match[2] === EM ? value * fontSize : value
  }

  ////////////////
  // ## Measuring
  ////////////////

  /**
   * The width `element` draws, whatever its own `display`:  a `<ui-item>` or `<ui-menu>` is `display: contents`,
   * its box in its shadow root.
   * - Static:  needs no instance.
   */
  static widthOf(element: Element): number {
    const boxes = TitleFit.boxesOf(element)
    if (!boxes.length) return 0
    const rects = boxes.map((box) => box.getBoundingClientRect())
    return Math.max(...rects.map((rect) => rect.right)) - Math.min(...rects.map((rect) => rect.left))
  }

  /**
   * A box's width with its inline margins (an item's, in a `secondary` menu).
   * - Static:  needs no instance.
   */
  static outerWidthOf(box: Element): number {
    return box.getBoundingClientRect().width + TitleFit.marginsOf(box)
  }

  /** `element`'s inline margins, or its boxes' (`boxesOf()`) for one that draws none of its own. */
  private static marginsOf(element: Element): number {
    const style = getComputedStyle(element)
    if (style.display === CONTENTS) {
      const boxes = TitleFit.boxesOf(element)
      return boxes.length === 1 ? TitleFit.marginsOf(boxes[0]!) : 0
    }
    return (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0)
  }

  /** The boxes `element` draws:  itself, or for `display: contents` what's inside it (its shadow root's, its slot's). */
  private static boxesOf(element: Element): Element[] {
    const style = getComputedStyle(element)
    if (style.display === NONE) return []
    if (style.display !== CONTENTS) return [element]
    const inside =
      element.localName === SLOT
        ? (element as HTMLSlotElement).assignedElements()
        : [...(element.shadowRoot?.children ?? element.children)]
    return inside.filter((child) => child.localName !== STYLE).flatMap(TitleFit.boxesOf)
  }

  /** Does `element` draw anything (not hidden, not `display: none`)? */
  private static isShown(element: Element): boolean {
    return TitleFit.boxesOf(element).length > 0
  }
}

////////////////
// ## Types
////////////////

/**
 * A stage of `TitleFit`:  `"whole"`, the widest a title may be (px:  cut), `"icons"` or `"overflow"`
 * (a segmented menu's dropdown).
 */
export type FitAnswer = "whole" | number | "icons" | "overflow"

/** One item `TitleFit` fits:  its box and its title box, in its shadow root. */
export type FitRow = {
  /** the item's box (`part="item"`) */
  box: HTMLElement
  /** its title box (`part="title"`) */
  title: HTMLElement
}

/** What `new TitleFit()` is handed. */
export type TitleFitSetup = {
  /** the menu's box its items sit in */
  box: HTMLElement
  /** the menu's DOM element, which shows the stage's `:state()` */
  domElement: E.DOMElement
  /** the items it fits, and everything else in the row (another button, a sub-menu, an item with no words) */
  children: () => { rows: FitRow[]; others: Element[] }
  /** a segmented menu:  whole, else a dropdown */
  isSegmented: () => boolean
  /** a segmented menu scrolls while it has `--ui-toolbar-scroll-min`, rather than become a dropdown (`scroll-first`) */
  scrollsFirst?: () => boolean
  /** the stage changed */
  onAnswer: (answer: FitAnswer) => void
}

/** The icons-only stage's sizes, for `fit()`'s last answer. */
export type IconRow = {
  /** each item's width with its icon only */
  widths: readonly number[]
  /** the row's room for its items */
  room: number
  /** the smallest a button may be before they fold into the overflow menu */
  min: number
}

/** What `measure()` reads. */
type FitSizes = {
  fitsWhole: boolean
  room: number
  titles: number[]
  fixed: number[]
  icons: number[]
  titleMin: number
  itemMin: number
  /** the least room a `scroll-first` row scrolls in */
  scrollMin: number
}

////////////////
// ## Constants
////////////////

/** The stages, as `--_menu-fit` writes them. */
const WHOLE = "whole"
const CUT = "cut"
const ICONS = "icons"
const OVERFLOW = "overflow"

/** Custom property of the stage, on the box. */
const FIT = "--_menu-fit"

/** Custom property of the widest a title may be, on the box. */
const TITLE_MAX = "--_menu-title-max"

/** The two minimums' aliases, declared on the menu's box (`UIMenu.css`). */
const TITLE_MIN = "--_ui-menu-title-min"
const ITEM_MIN = "--_ui-menu-item-min"
/** The token of the least room a `scroll-first` row scrolls in. */
const SCROLL_MIN = "--ui-toolbar-scroll-min"

/** Their defaults, should a token not read as a length. */
const DEFAULT_TITLE_MIN = 50
const DEFAULT_ITEM_MIN = 34
/** `SCROLL_MIN`, unset. */
const DEFAULT_SCROLL_MIN = 200

/** How far past its box a title may run, in px, and still count as whole:  layout's rounding. */
const HAIR = 0.5

/** A font size, should the box's not read. */
const DEFAULT_FONT_SIZE = 14

/** The stages' states on the menu's DOM element. */
const ICONS_ONLY_STATE = "icons-only"
const OVERFLOW_STATE = "overflow"
const DROPDOWN_STATE = "dropdown"
const STAGE_STATES = [ICONS_ONLY_STATE, OVERFLOW_STATE, DROPDOWN_STATE] as const

/** A length a token holds:  a number, then `px`, `em` or nothing. */
const LENGTH = /^(-?\d*\.?\d+)(px|em)?$/

/** The `em` unit. */
const EM = "em"

/** `display` values `widthOf()` looks through. */
const NONE = "none"
const CONTENTS = "contents"

/** Tag names `boxesOf()` treats apart. */
const SLOT = "slot"
const STYLE = "style"
