/**
 * What `<epic-run-row>` and its owner, `<epic-run>`, share:  the event a row answers with, its detail, and the tag in
 * JSX.
 * - Types and constants only, plus the JSX declaration:  `<epic-run>` draws the tag in its shadow root.
 */

import type { RunOutcome } from "spell/server/runs/runs.types"

import type { EpicJSXAttributes } from "spell-epic/components/epic-page/EpicPage.types"

/** A row answered:  the event its owner hears and saves on (`@E.on(RUN_ANSWER)`). */
export const RUN_ANSWER = "epic-run-answered"

/** `epic-run-answered`'s detail:  the row, its answer, and whether to save it at once. */
export type RunAnswerDetail = {
  /** the row's id */
  rowId: string
  /** how it was answered */
  outcome: RunOutcome
  /** what it comes to */
  value: string
  /** its tick box, when it has one */
  ticked?: boolean
  /** save at once (a pick, a tick);  `false`:  a keystroke, saved a moment after the last */
  now: boolean
}

// the tag `<epic-run>` draws in its shadow root
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-run-row": EpicJSXAttributes
    }
  }
}
