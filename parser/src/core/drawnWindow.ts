/**
 * A long list draws what fits, and more as you scroll:  what every loop in a drawing stands on (epic `data` T76, T43).
 * - No program says so, or writes a Show more:  `for each ... draw`, `draw each card in the deck` and a read of a place all come here.
 * - A program can say how many at a time:  `show them 12 at a time` (`atOnce`);  else `MOST_AT_ONCE`.
 * - Up to `MOST_AT_ONCE` items:  all of them, at once, exactly as a plain `<For>` draws them.
 *   So a list that fits in that is drawn as it always was:  no extra element, no waiting.
 * - Past that:  the first `MOST_AT_ONCE`, then a small empty element after them, which says when it comes near the view.
 *   Each time it does, `MOST_AT_ONCE` more, until it's out of reach again.  When there's nothing more it's gone,
 *   so a list drawn to its end is the same elements a plain `<For>` would have drawn.
 * - What's drawn stays drawn:  it's never taken down again, so keys, focus and what's in a form stay as they are.
 *   - NOTE:  so a list scrolled through to the end of 50,000 is 50,000 elements after all (`data` T43's limit).
 * - Why not `content-visibility`:  it saves a browser's layout and painting, and drawing's cost is making the things and elements.
 *   Measured on 5,000 and 50,000 views:  the epic page, T76.
 * - A place that pages:  reads its next page when what it has is drawn (`more`).
 * - Find (⌘F, Ctrl-F) and printing draw the rest first, up to `MOST_FOR_FIND`:  a browser can only find what's there.
 * - Coming back to a long list that's still the same list (going back from a page) draws as many as were drawn, and scrolls back to
 *   where it was, unless the program just said `scroll to the top`.
 * - With no `IntersectionObserver` (under node, `spell run`):  all of them.
 * - Imported by `drawing.ts` and `saved.ts`;  knows nothing of Things or places.
 */
import { createComponent, type JSX } from "@solidjs/web"
import { For, createEffect, createMemo, onCleanup } from "solid-js"

import { Cell } from "spell/util/reactive"

import { isGoingToTheTop } from "./ui"

/** How many items are drawn at a time. */
export const MOST_AT_ONCE = 24

/** How many a Find or a print draws, at most:  5,000 views take about 1.7 s. */
const MOST_FOR_FIND = 5_000

/** How many frames it tries to go back to where a list was. */
const FRAMES_TO_GO_BACK = 60

/** How far ahead of the view the end of the list starts more drawing. */
const AHEAD_OF_THE_VIEW = "800px"

/** The element at the end of a list with more to come:  empty, and only there while there is more. */
const MORE_BELOW_TAG = "spell-more-below"

/** What it takes to draw a long list, from `drawnInWindow()`. */
export type DrawnWindow<Item> = {
  /** Every item there is now, tracked. */
  items: () => readonly Item[]
  /** Item drawn, with its position counting from 0. */
  drawItem: (item: Item, position: () => number) => JSX.Element
  /**
   * What it remembers by, for coming back:  the list itself.
   * - Asked as the list is first read, never by the caller's drawing:  reading it there would draw everything again when it changes.
   */
  key?: () => object | undefined
  /** A place's further pages. */
  more?: () => MorePages | undefined
  /** How many it draws at a time, when it isn't `MOST_AT_ONCE`:  `show them 12 at a time`. */
  atOnce?: number
}

/** A list whose next page hasn't been read. */
export type MorePages = {
  /** Is there another page? */
  hasMorePages: boolean
  /** Read it.  NEVER rejects. */
  readNextPage(): Promise<void>
}

/** What's remembered of a long list while it isn't drawn. */
type Remembered = {
  /** How many it had drawn. */
  count: number
  /** How far it was scrolled. */
  scrollTop: number
  /** What scrolls it. */
  scroller: WeakRef<Element> | undefined
}

/** A long list that's drawn now, for Find and printing. */
type LiveWindow = {
  /** Draw as many as Find needs. */
  drawForFind(): void
}

/** Each long list's memory, by the list. */
const REMEMBERED = new WeakMap<object, Remembered>()

/** Every long list drawn now, this page's. */
const LIVE = new Set<LiveWindow>()

/** Can this page tell when something comes near the view? */
export function canDrawInWindows(): boolean {
  return typeof IntersectionObserver !== "undefined" && typeof document !== "undefined"
}

/**
 * The list, drawn as much as fits:  see the file's docs.
 * - Kept by identity:  an item added, removed or moved changes only its own node.
 * - Call in an owner:  a component, or a drawing's memo.
 */
export function drawnInWindow<Item>({
  items,
  drawItem,
  key,
  more,
  atOnce = MOST_AT_ONCE
}: DrawnWindow<Item>): JSX.Element {
  const each = (drawnItems: () => readonly Item[]) =>
    createComponent(
      For as never,
      {
        get each() {
          return drawnItems()
        },
        children: drawItem
      } as never
    ) as JSX.Element
  if (!canDrawInWindows()) return each(items)
  // a cell, not a signal:  a signal's write waits for whatever else is pending on the page, and an action may be waiting all this while
  const countChanged = new Cell()
  let drawnCount = atOnce
  const count = () => {
    countChanged.read()
    return drawnCount
  }
  const setCount = (to: number) => {
    drawnCount = to
    countChanged.changed()
  }
  const remembered: Remembered = { count: drawnCount, scrollTop: 0, scroller: undefined }
  let isKeyed = !key
  /** The list's first answer is here:  as many as it had drawn, and back to where it was. */
  const comeBack = () => {
    isKeyed = true
    const list = key!()
    if (!list) return
    const kept = REMEMBERED.get(list)
    REMEMBERED.set(list, remembered)
    if (!kept) return
    Object.assign(remembered, kept)
    drawnCount = Math.max(kept.count, atOnce)
    if (kept.scrollTop && !isGoingToTheTop()) goBackTo(remembered)
  }
  const shown = createMemo<readonly Item[]>(() => {
    const all = items()
    if (!isKeyed) comeBack()
    return all.length <= count() ? all : all.slice(0, count())
  })
  const morePages = () => more?.()
  const hasMore = createMemo(() => items().length > count() || !!morePages()?.hasMorePages)

  /** Draw more:  what's in hand, else the next page. */
  const drawMore = () => {
    const all = items()
    if (all.length > count()) {
      setCount(count() + atOnce)
      remembered.count = count()
    } else void morePages()?.readNextPage()
  }

  const moreBelow = document.createElement(MORE_BELOW_TAG)
  moreBelow.setAttribute("aria-hidden", "true")
  // a whole row of a grid, and nothing to see:  only there while there's more
  moreBelow.style.cssText = "display: block; grid-column: 1 / -1; width: 100%; height: 1px; pointer-events: none"
  const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && drawMore(), {
    rootMargin: AHEAD_OF_THE_VIEW,
    // the same reach inside something that scrolls:  a browser without it just reaches the end of the list first
    scrollMargin: AHEAD_OF_THE_VIEW
  } as IntersectionObserverInit)

  let stopFollowingScroll: (() => void) | undefined

  // watching it again each time says at once whether it's still in reach:  it only tells of changes otherwise
  createEffect(
    () => [count(), items().length, hasMore()] as const,
    ([, , isMore]) => {
      observer.unobserve(moreBelow)
      if (isMore) observer.observe(moreBelow)
      // only a list long enough to scroll has anywhere to come back to
      if (key && (isMore || remembered.scroller)) stopFollowingScroll ??= followScroll(moreBelow, remembered)
    }
  )
  const live: LiveWindow = {
    drawForFind() {
      const wanted = Math.min(items().length, MOST_FOR_FIND)
      if (wanted > count()) setCount(wanted)
      remembered.count = count()
    }
  }
  addLive(live)
  onCleanup(() => {
    observer.disconnect()
    stopFollowingScroll?.()
    removeLive(live)
  })
  const drawing = each(shown)
  // with nothing more to come, only the list:  exactly what a plain `<For>` draws
  return (() => (hasMore() ? [drawing, moreBelow] : drawing)) as unknown as JSX.Element
}

////////////////
// ## Scrolling
////////////////

/** Keep `remembered` up to date with how far the thing `element` is in is scrolled.  Returns how to stop. */
function followScroll(element: Element, remembered: Remembered): () => void {
  let stop: (() => void) | undefined
  // on the next frame:  the element has to be on the page, to find what scrolls it
  const frame = requestAnimationFrame(() => {
    const scroller = remembered.scroller?.deref() ?? scrollerOf(element)
    if (!scroller) return
    remembered.scroller = new WeakRef(scroller)
    const isPage = scroller === document.scrollingElement
    const events: EventTarget = isPage ? document : scroller
    const note = () => {
      remembered.scrollTop = scroller.scrollTop
    }
    events.addEventListener("scroll", note, { passive: true })
    stop = () => events.removeEventListener("scroll", note)
  })
  return () => {
    cancelAnimationFrame(frame)
    stop?.()
  }
}

/**
 * Back to where it was, as soon as what it's drawn is tall enough:  a read may answer a moment later.
 * - Gives up after about a second, or as soon as the person scrolls themselves.
 */
function goBackTo({ scrollTop: target, scroller }: Remembered): void {
  const element = scroller?.deref()
  if (!element) return
  let framesLeft = FRAMES_TO_GO_BACK
  let isTheirs = false
  const theirs = () => {
    isTheirs = true
  }
  const options = { capture: true, once: true, passive: true }
  addEventListener("wheel", theirs, options)
  addEventListener("touchstart", theirs, options)
  addEventListener("keydown", theirs, options)
  const stop = () => {
    removeEventListener("wheel", theirs, options)
    removeEventListener("touchstart", theirs, options)
    removeEventListener("keydown", theirs, options)
  }
  const step = () => {
    if (isTheirs) return stop()
    element.scrollTop = target
    if (Math.abs(element.scrollTop - target) <= 1 || --framesLeft <= 0) return stop()
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/** What scrolls `element`:  its nearest ancestor that can, through any shadow root;  else the page. */
function scrollerOf(element: Element): Element | null {
  for (let at: Element | null = parentOf(element); at; at = parentOf(at)) {
    const { overflowY } = getComputedStyle(at)
    if (overflowY === "auto" || overflowY === "scroll") return at
  }
  return document.scrollingElement
}

/** `element`'s parent, across a shadow root. */
function parentOf(element: Element): Element | null {
  return element.assignedSlot ?? element.parentElement ?? (element.getRootNode() as ShadowRoot).host ?? null
}

////////////////
// ## Find, and printing
////////////////

/** ⌘F or Ctrl-F:  everything drawn before the browser's Find looks. */
function drawAllOnFind(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") drawAllForFind()
}

/** Every long list drawn, as far as Find goes. */
function drawAllForFind(): void {
  for (const live of LIVE) live.drawForFind()
}

/** One more long list is drawn:  the first starts listening. */
function addLive(live: LiveWindow): void {
  if (!LIVE.size) {
    addEventListener("keydown", drawAllOnFind, { capture: true })
    addEventListener("beforeprint", drawAllForFind)
  }
  LIVE.add(live)
}

/** One's gone:  the last stops listening. */
function removeLive(live: LiveWindow): void {
  LIVE.delete(live)
  if (LIVE.size) return
  removeEventListener("keydown", drawAllOnFind, { capture: true })
  removeEventListener("beforeprint", drawAllForFind)
}
