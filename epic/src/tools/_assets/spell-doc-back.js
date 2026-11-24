/**
 * The browser's Back on a Feature Set (epic `epic-engine` P80):  back where the reader was -- the section, its folds,
 * the scroll.
 * - Why:  the runtime lands Back on the address's `#hash`, the top of the section, with whatever a link unfolded on
 *   the way still open;  in a long table that's far from the row the link was in.
 * - A place is kept per history entry (`navigation.currentEntry.key`, else the address), in the tab's storage:
 *   as a link is clicked, as Back or Forward leaves it, and as the page goes.
 *   - the second only where the browser has the Navigation API;  without it, Forward after a Back within the page
 *     lands where that place was last kept, else on the address's `#hash`
 * - It's used only by Back and Forward:  a reload, or a link to the page, lands as any page does.
 * - Plain DOM, no Spell UI:  the runtime (`spell-doc-runtime.js`) hands it how folds read and write, and how to hold
 *   a scroll.
 */
import { PrefStore } from "spell/util/persist/PrefStore"

/** A Feature Set's element:  a page without one keeps no places. */
const FEATURE_SET = "epic-feature-set"

/** The storage key of a page's places:  this, then its path. */
const PLACES_KEY_PREFIX = "spell-doc:places:"

/** The most places a page keeps, the newest last. */
const MOST_PLACES = 50

/** What folds and is put back. */
const FOLDING = "ui-section[collapsible][id]"

/** The places of `main`'s page;  `undefined` for a page that keeps none. */
export function backPlacesFor(main) {
  return main.querySelector(FEATURE_SET) ? new BackPlaces(main) : undefined
}

/****************
 * ### `BackPlaces`
 * One page's places, by history entry.
 * - `arrival()` before the page folds and lands, `watch()` at once, `restore()` on `popstate` and `hashchange`.
 ****************/
class BackPlaces {
  constructor(main) {
    this.main = main
    this.key = `${PLACES_KEY_PREFIX}${location.pathname}`
  }

  /** The history entry shown now, as a key. */
  get entry() {
    return globalThis.navigation?.currentEntry?.key ?? `${location.search}${location.hash}`
  }

  /** Every place kept:  `[entry, { scroll, folds }]`, the newest last. */
  get places() {
    const kept = PrefStore.getAt(this.key, "session")
    return Array.isArray(kept) ? kept : []
  }

  /** The place kept for the entry shown now, if any. */
  get placeNow() {
    return this.places.find(([entry]) => entry === this.entry)?.[1]
  }

  /** The place to open at, when Back or Forward loaded this page;  else `undefined`. */
  arrival() {
    return performance.getEntriesByType("navigation")[0]?.type === "back_forward" ? this.placeNow : undefined
  }

  /**
   * Keep the place as a link is clicked, as Back or Forward leaves it, and as the page goes.
   * - `isFolded(section)`:  how the runtime reads a fold
   * - the click in the window's capture:  before the runtime follows a `#id`, which makes the next entry
   * - Back and Forward by `navigate`:  it comes before the history moves, so the entry is still the one being left
   */
  watch(isFolded) {
    const keep = () => {
      const { entry } = this
      const folds = {}
      for (const section of this.main.querySelectorAll(FOLDING)) folds[section.id] = !isFolded(section)
      const others = this.places.filter(([each]) => each !== entry).slice(1 - MOST_PLACES)
      PrefStore.setAt(this.key, [...others, [entry, { scroll: scrollY, folds }]], "session")
    }
    const onClick = (event) => {
      const isLink = event.composedPath().some((node) => node instanceof HTMLAnchorElement && node.hasAttribute("href"))
      if (isLink) keep()
    }
    addEventListener("click", onClick, { capture: true })
    addEventListener("pagehide", keep)
    globalThis.navigation?.addEventListener("navigate", (event) => event.navigationType === "traverse" && keep())
  }

  /**
   * Put the entry shown now back as it was left;  `false` when it has no place (the runtime then lands its `#hash`).
   * - `setFolded(section, isFolded)`, `hold(scroll)`:  the runtime's
   * - SIDE EFFECT:  folds, unfolds and scrolls the page
   */
  restore({ setFolded, hold }) {
    const place = this.placeNow
    if (!place) return false
    for (const section of this.main.querySelectorAll(FOLDING))
      if (section.id in place.folds) setFolded(section, !place.folds[section.id])
    hold(place.scroll)
    return true
  }
}
