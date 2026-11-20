/**
 * Small DOM helpers that know about shadow roots and custom element upgrade timing.
 * - Every helper is safe to IMPORT outside a browser (SSR, node tooling);  only calling them needs a DOM,
 *   except `isBrowser()` which exists to ask.
 * - NEVER `instanceof Node` / `Element` / `ShadowRoot`:  `ui`'s server render calls these on linkedom elements in
 *   node, which has no such globals.  Compare `nodeType` against `NodeType` instead.
 */

////////////////
// ## Node types
////////////////

/**
 * `Node.nodeType` values we test, without the `Node` global (node has none):  `node.nodeType === NodeType.text`.
 */
export const NodeType = {
  element: 1,
  text: 3,
  documentFragment: 11
} as const
/** One of `NodeType`'s values, e.g. `3`. */
export type NodeType = (typeof NodeType)[keyof typeof NodeType]

////////////////
// ## Order
////////////////

/** `Node.DOCUMENT_POSITION_FOLLOWING`, without the `Node` global (node has none). */
const DOCUMENT_POSITION_FOLLOWING = 4

/**
 * Sort comparator for document order:  `elements.sort(byDocumentOrder)`.
 * - Negative when `a` comes first, else positive:  never `0`, as a sort never compares a node with itself.
 * - The one comparator `ui`'s radio groups, form fields and control labels share.
 */
export function byDocumentOrder(a: Node, b: Node): number {
  return a.compareDocumentPosition(b) & DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

////////////////
// ## Environment
////////////////

/**
 * True when running with a real DOM and custom element registry.
 * - Checks `customElements` too, not just `window`:  some SSR shims fake `window` but have no registry.
 */
export function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined" && typeof customElements !== "undefined"
}

////////////////
// ## Timing
////////////////

/**
 * Resolve on the next animation frame, with its timestamp;  `count`:  after that many frames, with the last one's.
 * - Use to let layout / style settle, e.g. after inserting an element and before measuring it
 *   (an element drawn on a microtask, then rendered on the next frame:  `nextFrame(2)`).
 */
export async function nextFrame(count = 1): Promise<number> {
  let time = performance.now()
  for (let left = count; left > 0; left--) time = await new Promise<number>((resolve) => requestAnimationFrame(resolve))
  return time
}

/**
 * The first of `properties` set on `element`, as a CSS time in seconds:  `800ms` => `0.8`, `1.5s` => `1.5`.
 * - `undefined` when none is set, or what's set isn't a time.
 * - The wait a hover reads, as it starts:  `cssSecondsFor(target, "--ui-tooltip-delay", "--ui-hover-delay")`.
 * - Read live, each call:  so a page that changes the property (Settings… › Popup delay) is followed at once.
 */
export function cssSecondsFor(element: Element, ...properties: string[]): number | undefined {
  const style = getComputedStyle(element)
  for (const property of properties) {
    const match = CSS_TIME.exec(style.getPropertyValue(property).trim())
    if (match) return Number(match[1]) / (match[2] === "ms" ? 1000 : 1)
  }
  return undefined
}

/** A CSS time:  `800ms`, `2s`, `1.5s`. */
const CSS_TIME = /^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/

////////////////
// ## Clipboard
////////////////

/**
 * Put `text` on the clipboard;  true when it got there.
 * - the browser's clipboard call first
 * - where that's refused (VS Code's side bar, a webview without the permission):
 *   the old `execCommand("copy")` from a hidden textarea
 * - The one copy every repo's pages share:  Spell UI's code block and theme editor, the brand's colour pickers,
 *   the epic pages.
 * - NEVER throws
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement("textarea")
      area.value = text
      area.setAttribute("readonly", "")
      area.style.cssText = "position: fixed; opacity: 0; pointer-events: none"
      document.body.append(area)
      area.select()
      const copied = document.execCommand("copy")
      area.remove()
      return copied
    } catch {
      return false
    }
  }
}

////////////////
// ## Custom elements
////////////////

/**
 * Resolve with the class for custom element `tag` once it's defined -- immediately if it already is.
 * - Thin cover over `customElements.whenDefined()` so callers needn't know about the registry,
 *   and a translated registry (`ie-*` tags) can later be swapped in here.
 */
export function whenDefined(tag: string): Promise<CustomElementConstructor> {
  return customElements.whenDefined(tag)
}

////////////////
// ## Traversal
////////////////

/**
 * Like `element.closest(selector)`, but keeps climbing out of shadow roots, following the FLAT tree.
 * - Why:  a generic part (`<ui-header>`) slotted into a component, or rendered inside its shadow root,
 *   must find its owner (`ui-card`) however it got there -- `closest()` stops at the shadow boundary.
 * - Order at each step:
 *   - `assignedSlot` -- a slotted element's rendered parent is its slot, inside the owner's shadow
 *   - `parentElement` -- ordinary light-DOM parent
 *   - shadow root's `host` -- step out of a shadow tree
 * - Includes `element` itself, as `closest()` does.
 * - NOTE: closed shadow roots hide `assignedSlot`, so a slotted element climbs through its light parent instead.
 */
export function closestAcrossShadow<T extends Element = Element>(element: Element, selector: string): T | null {
  for (let current: Element | undefined = element; current; current = flatParentFor(current)) {
    if (current.matches(selector)) return current as T
  }
  return null
}

/**
 * `element`'s parent in the FLAT tree:  its slot when it's slotted, else its parent element, else its shadow root's
 * host;  `undefined` at the top.
 * - The one climb `closestAcrossShadow()`, `ui`'s owner and settings lookups and `<ui-sticky>` share.
 * - NOTE: a closed shadow root hides `assignedSlot`, so a slotted element climbs through its light parent instead.
 */
export function flatParentFor(element: Element): Element | undefined {
  if (element.assignedSlot) return element.assignedSlot
  if (element.parentElement) return element.parentElement
  const root = element.getRootNode() as Partial<ShadowRoot>
  return root.nodeType === NodeType.documentFragment && root.host ? root.host : undefined
}

/**
 * Scroll `element` into view in the box that scrolls it, as a list's selected row does:
 * - already wholly in view:  nothing moves
 * - partly in view:  the least scrolling that shows it (`nearest`)
 * - out of view:  to the box's middle, so what's around it shows too
 * - The box:  its nearest scrolling ancestor, across shadow roots (`flatParentFor()`), else the window.
 */
export function scrollIntoSight(element: Element): void {
  const box = element.getBoundingClientRect()
  const view = scrollingBoxFor(element)?.getBoundingClientRect() ?? {
    top: 0,
    bottom: element.ownerDocument.defaultView?.innerHeight ?? 0
  }
  if (box.top >= view.top && box.bottom <= view.bottom) return
  const isPartlyIn = box.bottom > view.top && box.top < view.bottom
  element.scrollIntoView({ block: isPartlyIn ? "nearest" : "center" })
}

/** The nearest ancestor of `element` that scrolls up and down, across shadow roots:  `undefined` if none does. */
export function scrollingBoxFor(element: Element): Element | undefined {
  for (let at = flatParentFor(element); at; at = flatParentFor(at)) {
    if (at.scrollHeight > at.clientHeight && /auto|scroll/.test(getComputedStyle(at).overflowY)) return at
  }
  return undefined
}

////////////////
// ## Rows that scroll sideways
////////////////

/** How much of a row's width one `scrollByRow()` step scrolls. */
const ROW_STEP = 0.8

/** The person asked for less motion. */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

/**
 * Which ends of `box` can still scroll:  `start` while it's scrolled from its start,
 * `end` while there's more past its end.
 * - `axis`:  `inline`, sideways (the default), or `block`, up and down.
 * - Sideways:  what a row's `‹` / `›` keys show by (Spell UI's `<ui-toolbar>`, the kit's site header).
 * - Up and down:  what a pane's scroll shades show by (Spell UI's `<ui-panel appearance="pane">`).
 * - A pixel of slack each way:  fractional sizes leave the end a hair short.
 * - NOTE: left-to-right only, sideways:  in a right-to-left row `scrollLeft` counts the other way.
 */
export function scrollEnds(box: Element, axis: ScrollAxis = "inline"): ScrollEnds {
  if (axis === "block") {
    return { start: box.scrollTop > 1, end: box.scrollTop + box.clientHeight < box.scrollHeight - 1 }
  }
  return { start: box.scrollLeft > 1, end: box.scrollLeft + box.clientWidth < box.scrollWidth - 1 }
}

/**
 * Scroll `row` sideways by most of its width:  `-1` back, `1` on.
 * - Most, not all (`ROW_STEP`):  the item cut at the end shows whole after the step.
 * - Smoothly, unless the person asked for less motion (`prefers-reduced-motion`):  then at once.
 */
export function scrollByRow(row: Element, direction: -1 | 1): void {
  const isReduced = !!row.ownerDocument.defaultView?.matchMedia(REDUCED_MOTION).matches
  row.scrollBy({ left: direction * row.clientWidth * ROW_STEP, behavior: isReduced ? "instant" : "smooth" })
}

/** Which way `scrollEnds()` looks:  `inline`, sideways;  `block`, up and down. */
export type ScrollAxis = "inline" | "block"

/** `scrollEnds()`'s answer:  which ends of a box can still scroll. */
export type ScrollEnds = {
  /** it's scrolled away from its start:  a row's `‹` key shows, a pane's top shade */
  start: boolean
  /** there's more past its end:  a row's `›` key shows, a pane's bottom shade */
  end: boolean
}
