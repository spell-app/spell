/**
 * What the `epic-state-filter` family's files and their owners share:  the events a click sends, and the tags in JSX.
 * - Types only, plus the JSX declaration:  `<epic-section>` and `<epic-page>` draw the tag in their shadow roots.
 */

import type { UIJSXAttributes } from "$/epics/components/epic-page/EpicPage.types"

/** A chip's click:  the event its owners hear (`@E.on(STATE_PICK)`). */
export const STATE_PICK = "epic-state-pick"

/** `<epic-hidden-note>`'s click:  the event its owners hear (`@E.on(SHOW_ALL)`), no detail. */
export const SHOW_ALL = "epic-show-all"

/** `epic-state-pick`'s detail:  the state whose chip was clicked, and what should show next (`StateFilter.nextShown()`). */
export type StatePickDetail = {
  /** the clicked chip's state:  `attention` ... */
  state: string
  /** the states that should show after the click, in the filter's order */
  shown: string[]
}

// the tag its owners draw in their shadow roots
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-state-filter": UIJSXAttributes
      "epic-hidden-note": UIJSXAttributes
    }
  }
}
