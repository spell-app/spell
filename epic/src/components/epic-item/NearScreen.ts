/****************
 * ### `NearScreen`
 * Tells an element, ONCE, that it has come near the screen:  within a screen's height above or below it.
 * - Why (epic `epic-engine` I333):  an epic page holds hundreds of items, most of them in folded sections.
 *   Each one drew its review buttons up front, ~30 elements and their Solid bookkeeping apiece:
 *   epic-engine's page built 190,000 nodes and held ~490 MB, and VS Code's side bar hung on it.
 *   Now an item draws its line's buttons only once it's near the screen, and keeps them from then on.
 * - ONE `IntersectionObserver` for the whole page, however many elements it watches.
 * - An element that draws no box (in a folded section, filtered out) never comes near:  nothing fires until it's shown.
 * - No `IntersectionObserver` (linkedom, an old browser):  it fires at once.
 * - Plain DOM, no Solid:  the component turns the call into its own state.
 ****************/
export class NearScreen {
  /** Watch `element`;  `onNear()` runs once, the first time it comes near the screen.  Returns the undo. */
  static once(element: Element, onNear: () => void): () => void {
    if (typeof IntersectionObserver !== "function") {
      onNear()
      return () => undefined
    }
    const observer = NearScreen.observer()
    NearScreen.waiting.set(element, onNear)
    observer.observe(element)
    return () => {
      NearScreen.waiting.delete(element)
      observer.unobserve(element)
    }
  }

  /** What each watched element runs when it comes near. */
  private static readonly waiting = new WeakMap<Element, () => void>()

  /** The page's one observer, made on first use. */
  private static shared: IntersectionObserver | undefined

  private static observer(): IntersectionObserver {
    NearScreen.shared ??= new IntersectionObserver(NearScreen.onEntries, { rootMargin: NEAR_MARGIN })
    return NearScreen.shared
  }

  private static onEntries(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const onNear = NearScreen.waiting.get(entry.target)
      NearScreen.waiting.delete(entry.target)
      NearScreen.shared?.unobserve(entry.target)
      onNear?.()
    }
  }
}

/** How near counts:  a screen's height above and below it. */
const NEAR_MARGIN = "100% 0px 100% 0px"
