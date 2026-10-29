/**
 * What the `epic-state-filter` family's files and their owners share:  the events a click sends, and the tags in JSX.
 * - Types only, plus the JSX declaration:  `<epic-section>` and `<epic-page>` draw the tag in their shadow roots.
 */

import type { EpicJSXAttributes } from "spell/epic/components/epic-page/EpicPage.types"
import type { ChipPick } from "spell/epic/components/epic-section/StateFilter"

/** A chip's click:  the event its owners hear (`@E.on(STATE_PICK)`). */
export const STATE_PICK = "epic-state-changed"

/** `<epic-hidden-note>`'s click:  the event its owners hear (`@E.on(SHOW_ALL)`), no detail. */
export const SHOW_ALL = "epic-all-showing"

/**
 * `epic-state-changed`'s detail:  the state whose chip was clicked, how, and what should show next
 * (`StateFilter.nextShown()`).
 */
export type StatePickDetail = {
  /** the clicked chip's state:  `attention` ... */
  state: string
  /** the states that should show after the click, in the filter's order */
  shown: string[]
  /** a plain click, or an ⌥-click (`only` its state:  epic `epic-engine` I166) */
  how: ChipPick
}

// the tag its owners draw in their shadow roots
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-state-filter": EpicJSXAttributes
      "epic-hidden-note": EpicJSXAttributes
    }
  }
}
