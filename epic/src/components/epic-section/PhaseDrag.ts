import { E } from "spell/ui/core"

/****************
 * ### `PhaseDrag`
 * Dragging a TO-DO phase by its title row to another place in the Phases section (epic `epic-engine` P34;  Owen:
 * "Open phases are reordered by dragging one by its title;  done phases never move", no up / down buttons, Q20 B).
 * - pointer events, not the browser's drag and drop:  an element made `draggable` stops text selection in its whole
 *   body, and a phase's body is prose
 * - a press on the title row (the fold button, the title, its badge) that MOVES 6px starts the drag;  a press that
 *   doesn't stays a click and folds as before;  after a drag the click that follows is swallowed, so it doesn't fold
 * - never from the row's buttons (the review pills, the collapse-all), a link, or anything typed in
 * - while dragging:  a line on the phase it would land before or after (`data-drop`), only where the tool would let it
 *   go (every phase between its place and the new one still to do:  `PlanDoc.movePhase()`);  Escape calls it off
 * - a drop moves the phase AT ONCE, on the page, and hands `move(id, to)` its new place (1-based):  a mark that waits for
 *   Send, which `inbox apply` turns into the file's order;  dragged back, the next drop's mark replaces it
 * - `pending()`:  the moves still waiting (marks not yet applied):  put back after a live patch (the file's order) and
 *   whenever the marks change (`reapply()`), so the page never snaps back before Claude has applied them
 * - plain DOM, no Solid:  `EpicSection` wires it on the Phases section (`wire()`), its tests drive it with pointer events
 ****************/
export class PhaseDrag {
  /** The Phases section's host element. */
  readonly host: Element

  /** Is a drag allowed now (the page reviewed)? */
  readonly enabled: () => boolean

  /** Hand a dropped phase's new place on (`ReviewClient.move()`). */
  readonly move: (id: string, to: number) => void

  /** The moves still waiting, oldest first:  the phase's id and its place. */
  readonly pending: () => readonly { id: string; to: number }[]

  /** The drag under way, once the press has moved far enough;  `undefined` before. */
  private drag: { phase: Element; from: number; place?: { to: number; target: Element; side: DropSide } } | undefined

  constructor(host: Element, options: PhaseDragOptions) {
    this.host = host
    this.enabled = options.enabled
    this.move = options.move
    this.pending = options.pending ?? (() => [])
  }

  /** Wire `host` (the Phases section) for dragging its phases;  returns the undo. */
  static wire(host: Element, options: PhaseDragOptions): () => void {
    const drag = new PhaseDrag(host, options)
    const listeners = new AbortController()
    const signal = listeners.signal
    host.addEventListener("pointerdown", (event) => drag.onPress(event as PointerEvent), { signal })
    // a live patch puts the file's order back:  the moves not applied yet go on top of it again
    window.addEventListener("spell-doc:updated", () => drag.reapply(), { signal })
    const unwatch = options.subscribe?.(() => drag.reapply())
    drag.reapply()
    return () => {
      listeners.abort()
      unwatch?.()
      drag.end()
    }
  }

  /** The section's phases, in page order:  its own `<epic-phase>` children, but hidden ones. */
  get phases(): Element[] {
    return Array.from(this.host.children).filter(
      (child) => child.localName === PHASE_TAG && !child.hasAttribute("hidden")
    )
  }

  /**
   * A press:  on a to-do phase's title row, and not on one of its controls, it MAY become a drag (`DRAG_PX`);
   * the window follows the pointer from here until it's let go.
   */
  onPress(event: PointerEvent) {
    if (event.button !== 0 || !this.enabled()) return
    const phase = PhaseDrag.phaseFrom(event, this.host)
    if (!phase || !PhaseDrag.isToDo(phase)) return
    const start = { x: event.clientX, y: event.clientY }
    const listeners = new AbortController()
    const signal = listeners.signal
    const onMove = (move: PointerEvent) => {
      if (!this.drag && Math.hypot(move.clientX - start.x, move.clientY - start.y) < DRAG_PX) return
      if (!this.drag) this.begin(phase)
      move.preventDefault()
      this.over(move.clientY)
    }
    const onUp = () => {
      listeners.abort()
      if (this.drag) this.drop()
    }
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== "Escape" || !this.drag) return
      listeners.abort()
      this.end()
      swallowClick()
    }
    window.addEventListener("pointermove", onMove, { signal })
    window.addEventListener("pointerup", onUp, { signal })
    window.addEventListener("pointercancel", () => (listeners.abort(), this.end()), { signal })
    window.addEventListener("keydown", onKey, { signal })
  }

  /** Put every move still waiting back on the page (`pending()`), oldest first:  each phase at its place. */
  reapply() {
    for (const { id, to } of this.pending()) {
      const phases = this.phases
      const phase = phases.find((each) => each.id === id)
      const at = phase ? phases.indexOf(phase) + 1 : 0
      if (!phase || at === to || to < 1 || to > phases.length) continue
      PhaseDrag.place(phase, phases[to - 1]!, to > at ? "after" : "before")
    }
  }

  ////////////////
  // ## The drag
  ////////////////

  /** The drag starts:  the phase marked as dragged, the section as dragging (no text selection). */
  private begin(phase: Element) {
    this.drag = { phase, from: this.phases.indexOf(phase) + 1 }
    phase.setAttribute(DRAGGED, "")
    this.host.setAttribute(DRAGGING, "")
  }

  /** The pointer is at `y`:  where it would land, drawn as a line on that phase (`data-drop`);  none where it can't. */
  private over(y: number) {
    const drag = this.drag!
    for (const phase of this.host.querySelectorAll(`[${DROP}]`)) phase.removeAttribute(DROP)
    drag.place = this.placeAt(y)
    if (drag.place) drag.place.target.setAttribute(DROP, drag.place.side)
    // near the window's edges, the page scrolls with it
    if (y < EDGE_PX) scrollBy(0, -SCROLL_STEP)
    else if (y > innerHeight - EDGE_PX) scrollBy(0, SCROLL_STEP)
  }

  /**
   * Where a drop at `y` would put the dragged phase:  before or after the phase under it, and its place then (1-based);
   * `undefined` where it can't go (its own place, or past a phase that has started).
   */
  private placeAt(y: number): { to: number; target: Element; side: DropSide } | undefined {
    const { phase: dragged, from } = this.drag!
    const phases = this.phases
    const target = phases.find((each) => each.getBoundingClientRect().bottom >= y) ?? phases.at(-1)
    if (!target || target === dragged) return undefined
    const box = target.getBoundingClientRect()
    const side: DropSide = y < box.top + Math.min(box.height, TITLE_PX) / 2 ? "before" : "after"
    const index = phases.indexOf(target) + 1
    const to = side === "before" ? (index > from ? index - 1 : index) : index >= from ? index : index + 1
    if (to === from) return undefined
    const [low, high] = from < to ? [from, to] : [to, from]
    if (phases.slice(low - 1, high).some((each) => !PhaseDrag.isToDo(each))) return undefined
    return { to, target, side }
  }

  /** Let go:  moved at once, on the page, and handed on (`move()`);  nothing where it can't go. */
  private drop() {
    const { phase, place } = this.drag!
    this.end()
    swallowClick()
    if (!place) return
    PhaseDrag.place(phase, place.target, place.side)
    this.move(phase.id, place.to)
  }

  /** The drag is over:  its marks off the page. */
  end() {
    this.drag?.phase.removeAttribute(DRAGGED)
    this.host.removeAttribute(DRAGGING)
    for (const phase of this.host.querySelectorAll(`[${DROP}]`)) phase.removeAttribute(DROP)
    this.drag = undefined
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** `phase` put `side` of `target`. */
  static place(phase: Element, target: Element, side: DropSide) {
    if (side === "before") target.before(phase)
    else target.after(phase)
  }

  /** Is `phase` still to do (`status`, `todo` when it has none)?  Only those move. */
  static isToDo(phase: Element): boolean {
    return (phase.getAttribute("status") ?? "todo") === "todo"
  }

  /**
   * The phase whose TITLE ROW `event` pressed, one of `host`'s own;  `undefined` for anything else:  its body, or one
   * of the row's controls (the review pills, a link, the collapse-all), which keep their clicks.
   */
  static phaseFrom(event: Event, host: Element): Element | undefined {
    const path = event.composedPath() as Element[]
    const phase = path.find((node) => node.localName === PHASE_TAG && node.parentElement === host)
    if (!phase) return undefined
    const inPhase = path.slice(0, path.indexOf(phase))
    const onTitle = inPhase.some((node) => PhaseDrag.parts(node).includes("title"))
    const onControl = inPhase.some(
      (node) =>
        CONTROLS.has(node.localName) ||
        PhaseDrag.parts(node).includes("actions") ||
        (node.localName === "button" && !PhaseDrag.parts(node).includes("toggle"))
    )
    return onTitle && !onControl ? phase : undefined
  }

  /** `node`'s `part` names. */
  private static parts(node: Element): string[] {
    return node.getAttribute?.("part")?.split(/\s+/) ?? []
  }
}

/** `PhaseDrag.wire()`'s options. */
export type PhaseDragOptions = {
  /** is a drag allowed now:  the page reviewed */
  enabled: () => boolean
  /** a dropped phase's new place, 1-based:  saved as its move mark */
  move: (id: string, to: number) => void
  /** the moves still waiting, oldest first */
  pending?: () => readonly { id: string; to: number }[]
  /** call `listener` when the waiting moves may have changed;  returns the undo */
  subscribe?: (listener: () => void) => () => void
}

/** Which side of the phase under the pointer a drop lands. */
export type DropSide = "before" | "after"

/** A phase's tag. */
const PHASE_TAG = "epic-phase"

/** On the phase being dragged. */
export const DRAGGED = "data-dragged"

/** On the section while a phase is dragged:  no text selection, the grabbing cursor. */
export const DRAGGING = "data-dragging"

/** On the phase a drop would land beside:  `before` or `after` (the line's side). */
export const DROP = "data-drop"

/** How far a press moves before it's a drag, not a click. */
const DRAG_PX = 6

/** A phase's title row, about:  an open phase's top half decides "before", not half of its whole body. */
const TITLE_PX = 48

/** How near the window's top or bottom the page scrolls along. */
const EDGE_PX = 48

/** How far it scrolls each move there. */
const SCROLL_STEP = 12

/** What keeps its own click in a title row. */
const CONTROLS = new Set(["a", "ui-button", "epic-review", "input", "textarea", "select"])

/** Swallow the click that follows a drag's release:  it would fold the phase. */
function swallowClick() {
  const swallow = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }
  window.addEventListener("click", swallow, { capture: true, once: true })
  // a release with no click after it (off the page):  don't eat the next real one
  void E.after(0.3, () => window.removeEventListener("click", swallow, { capture: true }))
}
