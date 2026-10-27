// `spell/ui/util` by name, never the `spell/ui/core` entry:  plain DOM, as `TocIndex` beside it
import { after, nextFrame } from "spell/ui/util"
import { TocIndex } from "./TocIndex"
import { SECTION_TAG, TABS_TAG } from "./UIToc.types"

/****************
 * ### `HashLanding`
 * Landing on a link's target, below the titles stuck at the top:  ONE way for Spell UI's docs, its site and the epic
 * pages (epic `coherence` P11).
 * - A landing, in order (`land()`):
 *   1. waits until the page is ready (`whenReady`:  by default the `<ui-root>` around the target)
 *   2. opens what hides the target (`reveal`):  selects the tab pane holding it, unfolds the `<ui-section>`s around it
 *   3. waits for that to draw:  the target has a box, then, when something opened, a few frames (`revealFrames`)
 *   4. scrolls its top to its line (`topOf`, `lineFor`), at once or gliding
 *   5. once more after `settleSeconds`, as late layout (images, a fold's last frame) moves it a little;
 *      not when the viewer has scrolled, clicked or typed meanwhile
 * - ONE per document (`forDocument()`):  a newer landing stops an older one still waiting.
 * - Who lands a `#hash`:
 *   - by default its elements, through `landOnHash()`:  `<ui-toc>` as the page opens and on `hashchange`,
 *     `<ui-docs-api>` for a header in its shadow root
 *   - a page that lands its hashes ITSELF (the site's `SiteSections`, the epic pages' runtime) says so with its
 *     rules (`use()`):  then `landOnHash()` leaves them to it, and the page scrolls once, not once per element
 * - The default rules land as the browser's own jump does (`scrollIntoView()`):  the target's top at the document's
 *   `scroll-padding-top` plus its own `scroll-margin-top`.
 * - Plain DOM, no Solid:  the epic pages' runtime bundles it from source, beside Spell UI's `dist/`.
 * - SIDE EFFECT:  the viewer's input (`wheel`, `touchstart`, `keydown`, `pointerdown`) heard on the window, from the
 *   first landing on
 ****************/
export class HashLanding {
  /** The document's one landing, made on first use. */
  static forDocument(document: Document): HashLanding {
    let landing = LANDINGS.get(document)
    if (!landing) LANDINGS.set(document, (landing = new HashLanding(document)))
    return landing
  }

  /** The document it lands in. */
  readonly document: Document

  /** How it lands:  the defaults, or the page's own (`use()`). */
  private rules: HashLandingRules

  /** The page lands its hashes itself (`use()`):  `landOnHash()`, and every element, leave them to it. */
  get isPageOwned(): boolean {
    return this.ownRules
  }

  /** `use()` was called. */
  private ownRules = false

  /** Bumped by every landing:  an older one, still waiting, stops. */
  private landings = 0

  /** The viewer scrolled, clicked or typed since the last landing began:  its settle doesn't land again. */
  private hasViewerMoved = false

  /** The viewer's input is heard (`watchViewer()`). */
  private isWatching = false

  private constructor(document: Document) {
    this.document = document
    this.rules = HashLanding.defaultRules()
  }

  /**
   * The page lands its own hashes, by `rules` (each one left out stays the default's):  the elements' own
   * `landOnHash()` from now on leave them to it.
   */
  use(rules: Partial<HashLandingRules>): this {
    this.rules = { ...this.rules, ...rules }
    this.ownRules = true
    return this
  }

  /**
   * Land on what `hash` (with or without its `#`) names, the way an element does:  unless the page lands its own
   * (`use()`), or nothing has that id.
   * - Resolves `true` once it has scrolled there;  `false` when it didn't (a newer landing came, or nothing to land on).
   */
  landOnHash(hash: string, options: HashLandingOptions = {}): Promise<boolean> {
    if (this.isPageOwned) return Promise.resolve(false)
    const id = TocIndex.decode(hash.replace(/^#/, ""))
    const target = id ? TocIndex.elementById(this.document, id) : undefined
    return target ? this.land(target, options) : Promise.resolve(false)
  }

  /**
   * Land on `target` (see the class);  a promise of it, for a target drawn later (a row of an API table).
   * - Resolves `true` once it has scrolled there;  `false` when a newer landing came first, or there's nothing.
   * - NEVER rejects:  a target that never comes is no landing.
   */
  async land(
    target: LandingTarget,
    { scroll = "jump", opensTarget = true }: HashLandingOptions = {}
  ): Promise<boolean> {
    const landing = ++this.landings
    this.hasViewerMoved = false
    this.watchViewer()
    const found = await Promise.resolve(target).catch(() => undefined)
    if (!found || landing !== this.landings) return false
    await this.rules.whenReady(found)
    if (landing !== this.landings) return false
    const hasOpened = this.rules.reveal(found, { opensTarget })
    for (let frame = 0; frame < SHOW_FRAMES && this.rules.topOf(found) === undefined; frame++) await nextFrame()
    if (hasOpened) await nextFrame(this.rules.revealFrames)
    if (landing !== this.landings) return false
    this.scrollTo(found, scroll)
    void after(this.rules.settleSeconds, () => {
      if (landing === this.landings && !this.hasViewerMoved) this.scrollTo(found, scroll)
    })
    return true
  }

  /** Scroll so `target`'s top sits on its line;  then tell the page (`onLanded`). */
  private scrollTo(target: Element, scroll: LandingScroll): void {
    const top = this.rules.topOf(target)
    const view = this.document.defaultView
    if (top === undefined || !view) return
    const glides = scroll === "glide" && !view.matchMedia(REDUCED_MOTION).matches
    view.scrollTo({
      top: Math.max(0, view.scrollY + top - this.rules.lineFor(target)),
      behavior: glides ? "smooth" : "instant"
    })
    this.rules.onLanded?.(target)
  }

  /** From the first landing on, hear the viewer moving the page:  a landing's second try must not pull it back. */
  private watchViewer(): void {
    const view = this.document.defaultView
    if (this.isWatching || !view) return
    this.isWatching = true
    for (const type of VIEWER_INPUT)
      view.addEventListener(type, () => (this.hasViewerMoved = true), { capture: true, passive: true })
  }

  ////////////////
  // ## The default rules
  ////////////////

  /** How a page with no rules of its own lands (see the class). */
  static defaultRules(): HashLandingRules {
    return {
      whenReady: (target) => new Promise((resolve) => TocIndex.whenReady(TocIndex.lightElementOf(target), resolve)),
      reveal: (target, { opensTarget }) => HashLanding.reveal(target, { opensTarget }),
      lineFor: (target) => HashLanding.marginLine(target),
      topOf: (target) => HashLanding.topOf(target),
      revealFrames: REVEAL_FRAMES,
      settleSeconds: SETTLE_SECONDS
    }
  }

  /**
   * Open what hides `target`:  select the pane of each `<ui-tabs>` around it, unfold each `<ui-section>` around it
   * (and itself, with `opensTarget`);  true when anything opened.
   * - A target in a shadow root:  what's around its host.
   * - The unfold is the `open` attribute (`open="false"` taken off), which announces nothing:
   *   never saved as the viewer's own fold.
   */
  static reveal(target: Element, { opensTarget }: { opensTarget: boolean }): boolean {
    const light = TocIndex.lightElementOf(target)
    let hasOpened = false
    for (let tabs = light.parentElement?.closest(TABS_TAG); tabs; tabs = tabs.parentElement?.closest(TABS_TAG)) {
      const pane = TocIndex.paneOf(tabs, light)
      if (!pane || TocIndex.shownPane(tabs) === pane) continue
      ;(tabs as HTMLElement & { value?: string }).value = TocIndex.paneValue(tabs, pane)
      hasOpened = true
    }
    const first = opensTarget ? light.closest(SECTION_TAG) : light.parentElement?.closest(SECTION_TAG)
    for (let section = first; section; section = section.parentElement?.closest(SECTION_TAG)) {
      if (section.getAttribute(OPEN) !== "false") continue
      section.removeAttribute(OPEN)
      hasOpened = true
    }
    return hasOpened
  }

  /**
   * Where `target`'s top is now, px from the viewport's top:  its box;  a box-less one's (`display: contents`) by what
   * it holds;  `undefined` while it draws nothing (a hidden pane).
   */
  static topOf(target: Element): number | undefined {
    if (target.getClientRects().length) return target.getBoundingClientRect().top
    const range = target.ownerDocument.createRange()
    range.selectNodeContents(target)
    const box = range.getBoundingClientRect()
    return box.height || box.width ? box.top : undefined
  }

  /** The browser's own landing line for `target`:  the document's `scroll-padding-top` plus its `scroll-margin-top`. */
  static marginLine(target: Element): number {
    const view = target.ownerDocument.defaultView
    if (!view) return 0
    const padding = parseFloat(view.getComputedStyle(target.ownerDocument.documentElement).scrollPaddingTop) || 0
    return padding + (parseFloat(view.getComputedStyle(target).scrollMarginTop) || 0)
  }
}

////////////////
// ## Types
////////////////

/** What a landing lands on:  the element, or a promise of it (drawn later), `undefined` for none. */
export type LandingTarget = Element | Promise<Element | undefined>

/** How a landing scrolls:  a page arriving at its address jumps;  a link on the page may glide. */
export type LandingScroll = "jump" | "glide"

/** `land()`'s options. */
export type HashLandingOptions = {
  /** `jump` (default) or `glide`:  a smooth scroll, a jump all the same under reduced motion */
  scroll?: LandingScroll
  /** unfold the target itself, not only what's around it (default `true`) */
  opensTarget?: boolean
}

/** How a page lands (`HashLanding.use()`):  each step of a landing, the page's way. */
export type HashLandingRules = {
  /** resolves once the page can be measured (its elements drawn) */
  whenReady: (target: Element) => Promise<void>
  /** open what hides `target`;  true when anything opened, so the landing waits for it to draw */
  reveal: (target: Element, options: { opensTarget: boolean }) => boolean
  /** where `target`'s top should land, px from the viewport's top:  below what's stuck over it */
  lineFor: (target: Element) => number
  /** where `target`'s top is now, px from the viewport's top;  `undefined` while it draws nothing */
  topOf: (target: Element) => number | undefined
  /** told after each scroll:  e.g. to mark the target's entry as the one being read */
  onLanded?: (target: Element) => void
  /** frames to wait after something opened:  what an unfold reveals renders on the next frames */
  revealFrames: number
  /** when to land once more, s, unless the viewer moved */
  settleSeconds: number
}

/** Where `LANDINGS` is kept on `globalThis`. */
const LANDINGS_KEY = Symbol.for("spell-ui:hash-landings")

/**
 * Each document's landing, on `globalThis`:  ONE map a page, though a bundle may hold a second copy of this file
 * (spell-epic's docs runtime imports it by its file, beside the `<ui-toc>` family's own;  epic `ui-gaps` P14).
 */
const LANDINGS: WeakMap<Document, HashLanding> = ((globalThis as { [LANDINGS_KEY]?: WeakMap<Document, HashLanding> })[
  LANDINGS_KEY
] ??= new WeakMap())

/** What the viewer does that stops a landing's second try:  he's moving the page. */
const VIEWER_INPUT = ["wheel", "touchstart", "keydown", "pointerdown"] as const

/** Frames a section takes to draw what an unfold revealed (the write lands on a microtask, the render next frame). */
const REVEAL_FRAMES = 3

/** Frames to wait at most for a target to get a box (its pane swapping in, inside a View Transition). */
const SHOW_FRAMES = 30

/** Land once more after this long, s:  late layout (images, a fold's last frame) moves the target a little. */
const SETTLE_SECONDS = 0.4

/** A section's open attribute, `"false"` when folded (controlled:  writing it announces nothing). */
const OPEN = "open"

/** The viewer asks for less motion:  a glide jumps. */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
