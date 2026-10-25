/**
 * What the `epic-send-buttons` family's files and their owners share:  the event a send asks with, its detail, the
 * Send's states, and the tag in JSX.
 * - Types and constants only, plus the JSX declaration:  `<epic-page>` and `<epic-send>` draw the tag in their shadow
 *   roots.
 */

import type { EpicJSXAttributes } from "spell-epic/components/epic-page/EpicPage.types"

/** A send asked for:  the event the owner hears and sends on (`@E.on(SEND_ASKED)`, `on-epic-send-asked`). */
export const SEND_ASKED = "epic-send-saving"

/** `epic-send-saving`'s detail:  who asked. */
export type SendAskedDetail = {
  /** the countdown ran out (countdown mode);  `false`:  Owen pressed the paper plane */
  auto: boolean
}

/** Where what the owner sends stands, by the fill rule:  nothing to send, something not sent, all of it sent. */
export const SEND_STATES = ["idle", "unsent", "sent"] as const

/** One of `SEND_STATES`. */
export type SendState = (typeof SEND_STATES)[number]

// the tag its owners draw in their shadow roots
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-send-buttons": EpicJSXAttributes
    }
  }
}
