/**
 * A long list draws what fits, and more as you scroll;  a huge one lets go of what's far from the view:
 * every long list Spell draws stands on it (epic `data` T76, T43;  a column of `<ui-tree>`, a long `<ui-table>`).
 * - In a Spell program no one says so, or writes a Show more:
 *   `for each ... draw`, `draw each card in the deck` and a read of a place all come here.
 * - A program can say how many at a time:  `show them 12 at a time` (`atOnce`);  else `MOST_AT_ONCE`.
 *   The items are drawn and taken down in LOTS of that many, counted from the list's first item.
 * - Up to `MOST_AT_ONCE` items:  all of them, at once, exactly as a plain `<For>` draws them.
 *   So a list that fits in that is drawn as it always was:  no extra element, no waiting.
 * - Past that:  the first `MOST_AT_ONCE`, then a small empty element after them, which says when it comes near the view.
 *   Each time it does, `MOST_AT_ONCE` more, until it's out of reach again.  When there's nothing more it's gone,
 *   so a list drawn to its end is the same elements a plain `<For>` would have drawn.
 * - Up to `MOST_KEPT` items, what's drawn stays drawn:  keys, focus and what's in a form stay as they are.
 * - Past `MOST_KEPT` items (epic `solid-2-final` P17), the list is WINDOWED:
 *   - only the lots within a few screens of the view are drawn (`SCREENS_KEPT`);
 *     the rest are taken down as they scroll away, and drawn again as they come back
 *   - an empty element stands in for each run of lots not drawn, as tall as they were (`standIn`):
 *     each lot's height is kept as it's measured, and a lot never drawn counts as the average, so the scroll bar
 *     stays steady
 *   - scrolled far away at once (the scroll bar dragged):  the lots at the view are drawn, and the rest stand in
 *   - NEVER taken down:  the lot holding the focus, a lot whose form was typed into, the item the caller asked for
 *     (`through`);  they're drawn wherever they are, with stand-ins around them
 *   - a lot is taken down only where it starts a line of its own:  in a grid whose lots don't end their rows, or a
 *     list laid out sideways, nothing is taken down
 *   - An item's state lives in the program's things, not its elements:  an item drawn again shows what it showed.
 *     State only an element holds (a field's text nobody kept) is kept by the lot being kept.
 *   - Screen readers hear each item's place in the whole list from the caller's drawing (`position`):
 *     `<ui-tree>`'s rows say `aria-posinset` / `aria-setsize`, `<ui-table>`'s `aria-rowindex` / `aria-rowcount`.
 * - An item the caller needs drawn (a picked row, where a key moved to):  everything up to it, at once (`through`);
 *   in a windowed list, the lots around it, the ones between standing in.
 * - What it drew last took no room (items still reading from a server, or drawing nothing):  it waits a moment before more,
 *   `WAIT_WHEN_NOTHING_MOVED_MS`, so such a list doesn't read every item at once (epic `mockup` T42, the Met's artworks).
 * - Why not `content-visibility`:  it saves a browser's layout and painting, and drawing's cost is making the things and elements.
 *   Measured on 5,000 and 50,000 views:  the epic page, T76.
 * - A place that pages:  reads its next page when what it has is drawn (`more`).
 * - Find (⌘F, Ctrl-F) and printing draw the rest first, up to `MOST_FOR_FIND`:  a browser can only find what's there.
 *   Nothing is taken down again until the person wheels, touches or clicks.
 * - Coming back to a long list that's still the same list (going back from a page):
 *   it draws the lots that were drawn, and scrolls back to where it was,
 *   unless the caller says it's going to the top (`isGoingToTheTop`:  a Spell program's `scroll to the top`).
 * - With no `IntersectionObserver` (under node, `spell run`, a server render):  all of them.
 * - Its place:  a leaf of `spell/element`, NOT in its barrel, reached by path (`spell/element/drawnWindow`),
 *   as Spell UI's `<ui-tree>` and `<ui-table>` and the parser's core (`drawing.ts`, `saved.ts`) all draw with it.
 *   - It imports only Solid and util's generic `dom.ts`:  it knows nothing of Things, places or Spell UI.
 *   - Spell's core hands it what's Spell's own:
 *     its `Cell` to say the count changed (`changes`), and `scroll to the top`.
 *     It lived in the parser's core until an epic moved it here.
 */
import { createComponent, type JSX } from "@solidjs/web"
import { For, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js"

import { flatParentFor } from "spell/util/dom"

/** How many items are drawn at a time. */
export const MOST_AT_ONCE = 24

/** Past how many items a list is windowed:  it lets go of the lots far from the view. */
export const MOST_KEPT = 300

/** How many a Find or a print draws, at most:  5,000 views take about 1.7 s. */
const MOST_FOR_FIND = 5_000

/** How many frames it tries to go back to where a list was. */
const FRAMES_TO_GO_BACK = 60

/** How far ahead of the view the end of the list starts more drawing. */
const AHEAD_OF_THE_VIEW = "800px"

/** `AHEAD_OF_THE_VIEW`, in pixels:  how near the view a windowed list draws the lots before and after it. */
const AHEAD_PX = 800

/** How many screens away from the view a windowed list's lot is taken down;  at least twice `AHEAD_PX`. */
const SCREENS_KEPT = 3

/** An item's height before any is measured. */
const ITEM_PX_GUESS = 24

/** How many lots past the window a key's move (`through`) draws on to, rather than jumping. */
const LOTS_DRAWN_ON = 4

/**
 * How long it waits before drawing more, when what it drew last took no room:  items still reading, or drawing nothing.
 * - Else a list whose items each read from a server (the Met's artworks), and draw nothing till then, or at all, would
 *   draw every one at once:  the end never moves away from the view.  So at most `MOST_AT_ONCE` reads a second.
 */
export const WAIT_WHEN_NOTHING_MOVED_MS = 1000

/** The element at the end of a list with more to come:  empty, and only there while there is more. */
const MORE_BELOW_TAG = "spell-more-below"

/** The element standing in for a run of items not drawn, by default. */
const NOT_DRAWN_TAG = "spell-not-drawn"

/** What it takes to draw a long list, from `drawnInWindow()`. */
export type DrawnWindow<Item> = {
  /** Every item there is now, tracked. */
  items: () => readonly Item[]
  /** Item drawn, with its position in the whole list, counting from 0. */
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
  /**
   * The position of an item that must be drawn now, tracked:  everything up to it is drawn at once.
   * - A picked row, or where a key moved to, past what's drawn;  `-1` or `undefined` for none.
   * - Never taken down while it's asked for.
   */
  through?: () => number | undefined
  /**
   * What tells the drawing that how many to draw changed, when that isn't a Solid signal:
   * Spell's core hands its `Cell`.
   * - Why:  a signal's write waits for whatever else is pending on the page,
   *   and a Spell action may be waiting all this while;
   *   a cell's write reaches the drawing at once, through the page's cells bridge.
   */
  changes?: () => CountChanges
  /** Is the page going to its top, so a list coming back stays there rather than scrolling to where it was? */
  isGoingToTheTop?: () => boolean
  /**
   * An empty element that stands in the list's place, where the list's parent takes only some elements:
   * a table's body takes rows (`<tr class="spacer"><td colspan="3">`).
   * - Used for the runs of items not drawn, sized by its `style.height`, and for the end that draws more.
   * - Default:  a block a whole grid row wide, `<spell-not-drawn>` or `<spell-more-below>`.
   */
  standIn?: () => HTMLElement
}

/** What says how many are drawn changed:  `read()` where it's read, `changed()` after it changes. */
export type CountChanges = {
  /** It's being read:  the drawing reading it follows it. */
  read(): void
  /** It changed. */
  changed(): void
}

/** A list whose next page hasn't been read. */
export type MorePages = {
  /** Is there another page? */
  hasMorePages: boolean
  /** Read it.  NEVER rejects. */
  readNextPage(): Promise<void>
}

/** Says the count changed through a Solid signal:  the default, for a page with no cells bridge. */
function signalChanges(): CountChanges {
  const [read, write] = createSignal(undefined, { equals: false })
  return {
    read() {
      read()
    },
    changed() {
      write(undefined)
    }
  }
}

/** Can this page tell when something comes near the view? */
export function canDrawInWindows(): boolean {
  return typeof IntersectionObserver !== "undefined" && typeof document !== "undefined"
}

/**
 * The list, drawn as much as fits:  see the file's docs.
 * - Kept by identity:  an item added, removed or moved changes only its own node.
 * - Call in an owner:  a component, or a drawing's memo.
 */
export function drawnInWindow<Item>(settings: DrawnWindow<Item>): JSX.Element {
  if (!canDrawInWindows()) return drawnFor(settings.items, settings.drawItem)
  // made untracked:  what the caller's `standIn` reads mustn't make the list again where it's called
  return untrack(() => new ListWindow(settings).drawing)
}

/** A plain `<For>` over `list`, each entry drawn by `drawEntry`. */
function drawnFor<Entry>(
  list: () => readonly Entry[],
  drawEntry: (entry: Entry, index: () => number) => JSX.Element
): JSX.Element {
  return createComponent(
    For as never,
    {
      get each() {
        return list()
      },
      children: drawEntry
    } as never
  ) as JSX.Element
}

/**
 * A `<For>` row:  `draw`'s drawing of it, given its position only when `draw` takes one (`takesPosition`).
 * - `<For>`'s position changes as rows are added, removed or moved, and its row function reads nothing reactive
 *   (Solid's `STRICT_READ_UNTRACKED`:  read there, it's read once and never followed).
 * - Takes it:  read in the row's own tracked scope, so the row draws again when it moves;
 *   everything else its drawing reads is read once (`untrack()`), as every row's is.
 * - Doesn't (`(job) => ...`, nearly every row):  never read, and the row is drawn once.
 */
export function rowAt(
  position: () => number,
  takesPosition: boolean,
  draw: (position: number) => JSX.Element
): JSX.Element {
  if (!takesPosition) return draw(NO_POSITION)
  return (() => {
    const at = position()
    return untrack(() => draw(at))
  }) as unknown as JSX.Element
}

/** What `rowAt()` hands a drawing that takes no position:  never read. */
const NO_POSITION = -1

/****************
 * ### `ListWindow`
 * One long list as it's drawn:  which lots are drawn, the stand-ins for the rest, and what keeps it up to date.
 * - The drawn lots:  the WINDOW, `from` up to `to`, and any lot kept outside it (`kept`:  focus, typing, `through`).
 * - Grows down as its end comes near the view (`moreBelow`, watched);  windowed, a check before the next paint after
 *   each scroll (`check()`) draws lots coming near, takes down the far ones, and jumps to where the view is.
 * - Not exported:  `drawnInWindow()` is its one way in.
 ****************/
class ListWindow<Item> {
  /** What it was asked to draw. */
  readonly settings: DrawnWindow<Item>

  /** How many items a lot holds. */
  readonly atOnce: number

  /** The first lot of the window. */
  from = 0

  /** The lot after the window's last. */
  to = 1

  /** Lots drawn outside the window, which mustn't be taken down. */
  kept = new Set<number>()

  /** Each lot's height, in pixels, as last measured. */
  heights = new Map<number, number>()

  /** Items whose lot had a form typed into:  never taken down. */
  readonly edited = new Set<Item>()

  /** Since Find or a print drew the rest:  nothing is taken down till the person scrolls themselves. */
  isFinding = false

  /** What's remembered of it for coming back:  the same object `REMEMBERED` holds. */
  remembered: Remembered = { from: 0, to: 1, heights: this.heights, scrollTop: 0, scroller: undefined }

  /** What it draws:  the `<For>` over its entries. */
  readonly drawing: JSX.Element

  /** Its entries now:  the items drawn, with the stand-ins and lot marks between them. */
  readonly layout: () => Layout<Item>

  /** Says how many are drawn changed. */
  private readonly countChanged: CountChanges

  /** Has it read its key yet, so a list coming back finds what it drew? */
  private isKeyed: boolean

  /** The end of the list while there's more:  watched, it draws the next lot. */
  private readonly moreBelow: Piece

  /** Each drawn lot's mark, a comment before its first item:  by lot. */
  private readonly marks = new Map<number, Piece>()

  /** Each stand-in, by the first lot it stands for. */
  private readonly standIns = new Map<number, Piece>()

  /** Where the end was before it drew more:  if it hasn't moved, what it drew took no room. */
  private endBefore: number | undefined

  /** The wait before drawing more, when what it drew took no room. */
  private waiting: ReturnType<typeof setTimeout> | undefined

  /** No growing by `check()` before this time (ms):  what it drew last took no room. */
  private growsAfter = 0

  /** Is it gone? */
  private isGone = false

  /** The frame a `check()` waits for. */
  private checkFrame: number | undefined

  /** Stops following its scroller. */
  private stopFollowingScroll: (() => void) | undefined

  /** Stops hearing typing in its parent. */
  private stopHearingTyping: (() => void) | undefined

  /** Tells when its end comes near the view. */
  private readonly observer: IntersectionObserver

  constructor(settings: DrawnWindow<Item>) {
    this.settings = settings
    this.atOnce = settings.atOnce ?? MOST_AT_ONCE
    this.countChanged = (settings.changes ?? signalChanges)()
    this.isKeyed = !settings.key
    this.moreBelow = new Piece("more", this.standIn(MORE_BELOW_TAG))
    const more = this.moreBelow.node as HTMLElement
    more.style.height = "1px"
    more.style.pointerEvents = "none"
    this.observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && this.drawMore(),
      {
        rootMargin: AHEAD_OF_THE_VIEW,
        // the same reach inside something that scrolls:  a browser without it just reaches the end of the list first
        scrollMargin: AHEAD_OF_THE_VIEW
      } as IntersectionObserverInit
    )
    this.layout = createMemo(() => {
      const all = settings.items()
      if (!this.isKeyed) this.comeBack()
      this.countChanged.read()
      this.drawThrough(settings.through?.() ?? -1, all.length)
      return this.layoutOf(all)
    })
    this.followLayout()
    const live: LiveWindow = { drawForFind: () => this.drawForFind() }
    addLive(live)
    onCleanup(() => {
      this.isGone = true
      clearTimeout(this.waiting)
      if (this.checkFrame !== undefined) cancelAnimationFrame(this.checkFrame)
      this.observer.disconnect()
      this.stopFollowingScroll?.()
      this.stopHearingTyping?.()
      removeLive(live)
    })
    this.drawing = drawnFor(
      () => this.layout().entries,
      (entry, index) =>
        entry instanceof Piece
          ? (entry.node as unknown as JSX.Element)
          : // its own memo:  a row that follows its position moves only when it does, not each time the window does
            settings.drawItem(entry, createMemo(() => this.layout().positions[index()] ?? -1))
    )
  }

  ////////////////
  // ## What's drawn
  ////////////////

  /** How many lots `length` items make. */
  lotsIn(length: number): number {
    return Math.ceil(length / this.atOnce)
  }

  /** Is a list of `length` items windowed? */
  isWindowed(length: number): boolean {
    return length > MOST_KEPT
  }

  /**
   * The entries to draw, from the window and the kept lots:  see `Layout`.
   * - Not windowed:  the first `to` lots, then the end while there's more, exactly as before epic `solid-2-final` P17.
   */
  private layoutOf(all: readonly Item[]): Layout<Item> {
    const total = this.lotsIn(all.length)
    const isWindowed = this.isWindowed(all.length)
    if (!isWindowed) this.from = 0
    this.to = Math.max(Math.min(this.to, total), Math.min(1, total))
    this.from = Math.min(this.from, Math.max(0, this.to - 1))
    const hasMore = this.to < total || !!this.settings.more?.()?.hasMorePages
    const lots = new Set<number>()
    for (let lot = this.from; lot < this.to; lot++) lots.add(lot)
    if (isWindowed) for (const lot of this.kept) if (lot < total) lots.add(lot)
    const entries: Array<Item | Piece> = []
    const positions: number[] = []
    const add = (entry: Item | Piece, position = -1) => {
      entries.push(entry)
      positions.push(position)
    }
    const used = new Set<Piece>()
    const standFor = (first: number, end: number) => {
      const piece = this.standInFor(first)
      piece.lots = [first, end]
      used.add(piece)
      add(piece)
    }
    let next = 0
    for (const lot of [...lots].sort((one, other) => one - other)) {
      if (isWindowed && lot > next) standFor(next, lot)
      if (isWindowed) add(this.markFor(lot))
      const end = Math.min(all.length, (lot + 1) * this.atOnce)
      for (let position = lot * this.atOnce; position < end; position++) add(all[position]!, position)
      next = lot + 1
      if (lot === this.to - 1 && hasMore) add(this.moreBelow)
    }
    if (!lots.size && hasMore) add(this.moreBelow)
    if (isWindowed && next < total) standFor(next, total)
    for (const [first, piece] of this.standIns) if (!used.has(piece)) this.standIns.delete(first)
    for (const lot of this.marks.keys()) if (!lots.has(lot)) this.marks.delete(lot)
    this.remembered.from = this.from
    this.remembered.to = this.to
    return { entries, positions, hasMore, isWindowed, total, standIns: [...used] }
  }

  /**
   * Draw what `position` is in now, in whole lots.
   * - Not windowed:  everything up to it.
   * - Windowed:  on to it when it's just past the window, else the lots around it (a jump).
   * - Called in the list's own memo, so it gives no notice:  what follows how many are drawn reads that memo.
   */
  private drawThrough(position: number, length: number) {
    // asked again for what it was asked for:  it's kept (`lotsToKeep()`), and the window stays where it is
    const isNew = position !== this.throughBefore
    this.throughBefore = position
    if (!isNew || position < 0 || position >= length) return
    const lot = Math.floor(position / this.atOnce)
    if (lot >= this.from && lot < this.to) return
    if (!this.isWindowed(length)) this.to = Math.max(this.to, lot + 1)
    else if (lot >= this.to && lot < this.to + LOTS_DRAWN_ON) this.to = lot + 1
    else if (lot < this.from && lot >= this.from - LOTS_DRAWN_ON) this.from = lot
    else [this.from, this.to] = [Math.max(0, lot - 1), Math.min(this.lotsIn(length), lot + 2)]
  }

  /** What `through` asked for last. */
  private throughBefore = -1

  /** Draw more:  the next lot in hand, else the next page. */
  private drawMore() {
    const total = this.lotsIn(this.settings.items().length)
    if (this.to < total) {
      this.endBefore = (this.moreBelow.node as Element).getBoundingClientRect().top
      this.to++
      this.countChanged.changed()
    } else void this.settings.more?.()?.readNextPage()
  }

  /** Find or a print:  everything drawn, up to `MOST_FOR_FIND`, and kept till the person scrolls. */
  private drawForFind() {
    const length = this.settings.items().length
    const wanted = this.lotsIn(Math.min(length, MOST_FOR_FIND))
    if (this.from === 0 && this.to >= wanted) return
    this.from = 0
    this.to = Math.max(this.to, wanted)
    if (this.isWindowed(length) && !this.isFinding) {
      this.isFinding = true
      const theirs = () => {
        this.isFinding = false
        stop()
      }
      const options = { capture: true, passive: true }
      const stop = () => {
        for (const type of THEIR_SCROLLS) removeEventListener(type, theirs, options)
      }
      for (const type of THEIR_SCROLLS) addEventListener(type, theirs, options)
    }
    this.countChanged.changed()
  }

  /** The list's first answer is here:  as many as it had drawn, and back to where it was. */
  private comeBack() {
    this.isKeyed = true
    const list = this.settings.key!()
    if (!list) return
    const kept = REMEMBERED.get(list)
    REMEMBERED.set(list, this.remembered)
    if (!kept) return
    Object.assign(this.remembered, kept, { heights: this.heights })
    for (const [lot, height] of kept.heights) this.heights.set(lot, height)
    this.from = kept.from
    this.to = Math.max(kept.to, 1)
    if (kept.scrollTop && !this.settings.isGoingToTheTop?.()) goBackTo(this.remembered)
  }

  ////////////////
  // ## Following the page
  ////////////////

  /**
   * After each change to what's drawn:  the stand-ins sized, the end watched again, the scroll followed.
   * - Watching the end again says at once whether it's still in reach:  the observer only tells of changes otherwise.
   */
  private followLayout() {
    createEffect(
      () => this.layout(),
      (layout) => {
        for (const piece of layout.standIns) this.size(piece)
        const { observer } = this
        const more = this.moreBelow.node as Element
        observer.unobserve(more)
        clearTimeout(this.waiting)
        const before = this.endBefore
        this.endBefore = undefined
        if (layout.hasMore) {
          // what it just drew took no room yet:  ask again in a moment, not at once
          if (before !== undefined) {
            requestAnimationFrame(() => {
              const hasMoved = Math.abs(more.getBoundingClientRect().top - before) >= 1
              if (hasMoved) this.watchEnd()
              else this.waiting = setTimeout(() => this.watchEnd(), WAIT_WHEN_NOTHING_MOVED_MS)
            })
          } else observer.observe(more)
        }
        // only a list long enough to scroll has anywhere to come back to, or to let go of
        const isFollowing = layout.isWindowed || (!!this.settings.key && (layout.hasMore || !!this.remembered.scroller))
        if (isFollowing) this.stopFollowingScroll ??= this.followScroll()
        if (layout.isWindowed) this.checkSoon()
      }
    )
  }

  /** Watch the end again, unless the list is gone. */
  private watchEnd() {
    if (!this.isGone) this.observer.observe(this.moreBelow.node as Element)
  }

  /**
   * Keep `remembered` up to date with how far the thing the list is in is scrolled, and check a windowed list on each
   * scroll.  Returns how to stop.
   */
  private followScroll(): () => void {
    let stop: (() => void) | undefined
    // on the next frame:  the list has to be on the page, to find what scrolls it
    const frame = requestAnimationFrame(() => {
      const scroller = this.scroller
      if (!scroller || this.isGone) return
      this.remembered.scroller = new WeakRef(scroller)
      const isPage = scroller === document.scrollingElement
      const events: EventTarget = isPage ? document : scroller
      const onScroll = () => {
        this.remembered.scrollTop = scroller.scrollTop
        if (this.layout().isWindowed) this.checkSoon()
      }
      events.addEventListener("scroll", onScroll, { passive: true })
      stop = () => events.removeEventListener("scroll", onScroll)
    })
    return () => {
      cancelAnimationFrame(frame)
      stop?.()
    }
  }

  /** What scrolls the list:  as remembered, else found from its parent. */
  get scroller(): Element | null {
    const remembered = this.remembered.scroller?.deref()
    if (remembered) return remembered
    const parent = this.parent
    if (!parent) return null
    const element = parent instanceof Element ? parent : (parent as ShadowRoot).host
    return element && isScroller(element) ? element : element ? scrollerOf(element) : null
  }

  /** The element (or shadow root) the list is drawn into, once it's on the page. */
  get parent(): ParentNode | null {
    for (const piece of [this.moreBelow, ...this.marks.values(), ...this.standIns.values()]) {
      if (piece.node.parentNode) return piece.node.parentNode
    }
    return null
  }

  /** Check a windowed list before the next paint, once. */
  private checkSoon() {
    if (this.checkFrame !== undefined || this.isGone) return
    this.checkFrame = requestAnimationFrame(() => {
      this.checkFrame = undefined
      if (!this.isGone) this.check()
    })
  }

  ////////////////
  // ## Windowed:  the lots near the view
  ////////////////

  /**
   * A windowed list against the view:  each drawn lot measured, then at most one change.
   * - the window far from the view (scrolled far at once):  the lots at the view, the rest standing in
   * - else:  a lot drawn above or below when the window's edge comes near the view,
   *   and the lots more than `SCREENS_KEPT` screens away taken down
   * - the lots that mustn't go (focus, typing, `through`) kept
   * - Run before the next paint, after each scroll and each change to what's drawn.
   */
  private check() {
    const layout = untrack(() => this.layout())
    const parent = this.parent
    if (!layout.isWindowed || !parent) return
    this.hearTyping(parent)
    const view = viewOf(this.scroller)
    const reach = Math.max(SCREENS_KEPT * (view.bottom - view.top), 2 * AHEAD_PX)
    const boxes = this.measure(parent)
    const kept = this.lotsToKeep(parent)
    const changedKept = !sameSet(kept, this.kept)
    this.kept = kept
    const first = boxes.get(this.from)
    const last = boxes.get(this.to - 1)
    let changed = false
    if (!first || !last) {
      // not laid out (hidden):  nothing to measure against
    } else if (!this.isFinding && (last.bottom < view.top - reach || first.top > view.bottom + reach)) {
      changed = this.jumpTo(view.top - (first.top - this.heightOf(0, this.from)), layout.total)
    } else if (this.from > 0 && first.top > view.top - AHEAD_PX) {
      this.from--
      changed = true
    } else if (this.to < layout.total && last.bottom < view.top - AHEAD_PX && performance.now() >= this.growsAfter) {
      // the view went past the end the observer watches, out of its reach
      changed = this.growBelow(last.bottom)
    } else if (!this.isFinding) {
      changed = this.takeDown(boxes, view, reach)
    }
    if (changed || changedKept) this.countChanged.changed()
  }

  /**
   * Draw the next lot below;  if what it drew last took no room, wait a moment instead.
   * - Returns whether it drew one.
   */
  private growBelow(bottom: number): boolean {
    const before = this.lastBottom
    this.lastBottom = bottom
    if (before !== undefined && Math.abs(bottom - before) < 1) {
      this.growsAfter = performance.now() + WAIT_WHEN_NOTHING_MOVED_MS
      this.lastBottom = undefined
      return false
    }
    this.to++
    return true
  }

  /** The window's bottom when it last grew below. */
  private lastBottom: number | undefined

  /**
   * Take down the window's far lots:  those above or below more than `reach` from the view,
   * each only where the lot after it starts a line of its own (a grid's row).
   * - Returns whether it took any.
   */
  private takeDown(boxes: Map<number, Box>, view: Box, reach: number): boolean {
    let changed = false
    while (this.to - this.from > 1) {
      const box = boxes.get(this.from)
      const after = boxes.get(this.from + 1)
      if (!box || !after || box.bottom >= view.top - reach || after.top < box.bottom - 0.5) break
      this.from++
      changed = true
    }
    while (this.to - this.from > 1) {
      const box = boxes.get(this.to - 1)
      const before = boxes.get(this.to - 2)
      if (!box || !before || box.top <= view.bottom + reach || box.top < before.bottom - 0.5) break
      this.to--
      changed = true
    }
    return changed
  }

  /**
   * The window moved to the lots at `offset` pixels from the list's top:  the one there, one before, one after.
   * - Returns whether it moved.
   */
  private jumpTo(offset: number, total: number): boolean {
    const perItem = this.itemHeight()
    let lot = 0
    for (let top = 0; lot < total - 1; lot++) {
      const height = this.heightOf(lot, lot + 1, perItem)
      if (top + height > offset) break
      top += height
    }
    const [from, to] = [Math.max(0, lot - 1), Math.min(total, lot + 2)]
    if (from === this.from && to === this.to) return false
    ;[this.from, this.to] = [from, to]
    return true
  }

  /**
   * Each drawn lot's box, and its height kept:  from its first item's top to where the next thing after it starts.
   * - A lot is what's between its mark and the next piece (mark, stand-in or end).
   */
  private measure(parent: ParentNode): Map<number, Box> {
    const boxes = new Map<number, Box>()
    const range = document.createRange()
    let lot: number | undefined
    let start: Node | undefined
    const close = (end: Node | null) => {
      if (lot === undefined || !start) return
      if (end) range.setEndBefore(end)
      else range.setEndAfter(parent.lastChild!)
      range.setStartAfter(start)
      const { top, bottom } = range.getBoundingClientRect()
      boxes.set(lot, { top, bottom })
      lot = undefined
    }
    for (let node = parent.firstChild; node; node = node.nextSibling) {
      const piece = PIECES.get(node)
      if (!piece) continue
      close(node)
      if (piece.kind === "mark") [lot, start] = [piece.lots[0], node]
    }
    close(null)
    // a lot's height:  to the next lot's top, or the next stand-in's, else its own bottom
    for (const [at, box] of boxes) {
      const nextBox = boxes.get(at + 1)
      const mark = this.marks.get(at)?.node
      let next: number | undefined = nextBox?.top
      if (next === undefined && mark) {
        for (let node = mark.nextSibling; node; node = node.nextSibling) {
          const piece = PIECES.get(node)
          if (piece && piece.kind !== "mark") {
            next = (node as Element).getBoundingClientRect().top
            break
          }
          if (piece) break
        }
      }
      this.heights.set(at, Math.max(0, (next ?? box.bottom) - box.top))
    }
    return boxes
  }

  /**
   * The lots that mustn't be taken down now:  the one holding the focus, those typed into, the one `through` asks for.
   * - Drawn with the window's, wherever they are:  the window moves on without them.
   */
  private lotsToKeep(parent: ParentNode): Set<number> {
    const kept = new Set<number>()
    const focused = this.lotHolding(parent, deepActiveElement())
    if (focused !== undefined) kept.add(focused)
    const all = this.settings.items()
    const through = untrack(() => this.settings.through?.() ?? -1)
    if (through >= 0 && through < all.length) kept.add(Math.floor(through / this.atOnce))
    for (const item of this.edited) {
      const position = all.indexOf(item)
      if (position < 0) this.edited.delete(item)
      else kept.add(Math.floor(position / this.atOnce))
    }
    return kept
  }

  /** The lot `node` is in, when it's in this list:  the mark before its top-level node. */
  private lotHolding(parent: ParentNode, node: Node | null): number | undefined {
    let at = node
    while (at && at.parentNode !== parent) at = at.parentNode ?? (at as ShadowRoot).host ?? null
    for (; at; at = at.previousSibling) {
      const piece = PIECES.get(at)
      if (piece) return piece.kind === "mark" ? piece.lots[0] : undefined
    }
    return undefined
  }

  /** Once on the page:  typing in a lot's form keeps that lot's items drawn. */
  private hearTyping(parent: ParentNode) {
    if (this.stopHearingTyping) return
    const onInput = (event: Event) => {
      const lot = this.lotHolding(parent, event.composedPath()[0] as Node)
      if (lot === undefined) return
      const all = this.settings.items()
      for (const item of all.slice(lot * this.atOnce, (lot + 1) * this.atOnce)) this.edited.add(item)
    }
    parent.addEventListener("input", onInput, { capture: true })
    this.stopHearingTyping = () => parent.removeEventListener("input", onInput, { capture: true })
  }

  ////////////////
  // ## Stand-ins and marks
  ////////////////

  /** The height of lots `first` up to `end`:  each as measured, else the average. */
  heightOf(first: number, end: number, perItem = this.itemHeight()): number {
    let height = 0
    for (let lot = first; lot < end; lot++) height += this.heights.get(lot) ?? perItem * this.itemsIn(lot)
    return height
  }

  /** An item's height on average, of the lots measured;  `ITEM_PX_GUESS` before any is. */
  itemHeight(): number {
    let measured = 0
    let items = 0
    for (const [lot, height] of this.heights) {
      measured += height
      items += this.itemsIn(lot)
    }
    return items ? measured / items : ITEM_PX_GUESS
  }

  /** How many items lot `lot` holds:  `atOnce`, but the last. */
  itemsIn(lot: number): number {
    const all = untrack(() => this.settings.items().length)
    return Math.max(0, Math.min(this.atOnce, all - lot * this.atOnce))
  }

  /** `piece`, a stand-in, as tall as the lots it stands for. */
  private size(piece: Piece) {
    const [first, end] = piece.lots
    ;(piece.node as HTMLElement).style.height = `${Math.round(this.heightOf(first, end))}px`
  }

  /** The stand-in for the lots from `first`. */
  private standInFor(first: number): Piece {
    let piece = this.standIns.get(first)
    if (!piece) this.standIns.set(first, (piece = new Piece("stand-in", this.standIn(NOT_DRAWN_TAG))))
    return piece
  }

  /** Lot `lot`'s mark. */
  private markFor(lot: number): Piece {
    let piece = this.marks.get(lot)
    if (!piece) this.marks.set(lot, (piece = new Piece("mark", document.createComment(""), [lot, lot + 1])))
    return piece
  }

  /** A new empty element standing in the list's place:  the caller's, else a `tag` a whole grid row wide. */
  private standIn(tag: string): HTMLElement {
    const made = this.settings.standIn?.()
    if (made) return made
    const element = document.createElement(tag)
    element.setAttribute("aria-hidden", "true")
    // a whole row of a grid, and nothing to see
    element.style.cssText = "display: block; grid-column: 1 / -1; width: 100%; pointer-events: none"
    return element
  }
}

/** A node of a list that isn't an item:  a lot's mark, a stand-in for lots not drawn, the end that draws more. */
class Piece {
  /** What it is. */
  readonly kind: "mark" | "stand-in" | "more"
  /** Its node on the page. */
  readonly node: Node
  /** The lots it stands for, or marks:  from the first, up to the end. */
  lots: [number, number]

  constructor(kind: Piece["kind"], node: Node, lots: [number, number] = [0, 0]) {
    this.kind = kind
    this.node = node
    this.lots = lots
    PIECES.set(node, this)
  }
}

/** Each piece, by its node. */
const PIECES = new WeakMap<Node, Piece>()

/**
 * What a long list draws now.
 * - `entries`:  what `<For>` draws, items with pieces between;  `positions`:  each entry's place in the whole list
 *   (`-1` for a piece)
 * - `hasMore`:  more lots, or a place's next page;  `total`:  how many lots there are
 * - `standIns`:  the stand-ins drawn, to size after
 */
type Layout<Item> = {
  entries: ReadonlyArray<Item | Piece>
  positions: readonly number[]
  hasMore: boolean
  isWindowed: boolean
  total: number
  standIns: readonly Piece[]
}

/** A box's top and bottom on the screen, in pixels. */
type Box = { top: number; bottom: number }

/** What's remembered of a long list while it isn't drawn. */
type Remembered = {
  /** The window it had drawn. */
  from: number
  to: number
  /** Each lot's height. */
  heights: Map<number, number>
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

/** What the person does to scroll themselves. */
const THEIR_SCROLLS = ["wheel", "touchstart", "pointerdown"] as const

/** Are `one` and `other` the same lots? */
function sameSet(one: ReadonlySet<number>, other: ReadonlySet<number>): boolean {
  return one.size === other.size && [...one].every((lot) => other.has(lot))
}

/** The focused element, through every shadow root. */
function deepActiveElement(): Element | null {
  let at = document.activeElement
  while (at?.shadowRoot?.activeElement) at = at.shadowRoot.activeElement
  return at
}

/** What of the page `scroller` shows:  its box within the window's;  the window's for the page. */
function viewOf(scroller: Element | null): Box {
  if (!scroller || scroller === document.scrollingElement) return { top: 0, bottom: innerHeight }
  const box = scroller.getBoundingClientRect()
  return { top: Math.max(0, box.top), bottom: Math.min(innerHeight, box.bottom) }
}

////////////////
// ## Scrolling
////////////////

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
  for (let at = flatParentFor(element); at; at = flatParentFor(at)) if (isScroller(at)) return at
  return document.scrollingElement
}

/** Does `element` scroll its content up and down? */
function isScroller(element: Element): boolean {
  const { overflowY } = getComputedStyle(element)
  return overflowY === "auto" || overflowY === "scroll"
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
