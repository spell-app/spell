/**
 * Loose types and constants of the `epic-cards` family:  the page server's answer it draws, and its groups.
 * - Data only:  nothing here runs.  The route that answers (`$/epics/tool/SagaEpics`) imports these types too.
 */

import type { JSX } from "@solidjs/web"

import type { EpicFacts } from "$/epics/list/EpicState"

/** Where the cards come from:  `GET /api/epics/saga?saga=<id>` (`$/epics/tool/epicRoutes.ts`). */
export const SAGA_EPICS_API = "/api/epics/saga"

/** One epic serving a saga, as the page server answers it. */
export type SagaEpic = {
  /** the epic's id, its folder in `epics/`:  `python-target` */
  name: string
  /** its epic page's title:  `Python Target` */
  title: string
  /** its epic page, from the saga page's folder:  `../../epics/python-target/python-target.plan.html` */
  href: string
  /** its `<epic-summary>`, as text;  `""` with none */
  summary: string
  /** what its state is read from (`$/epics/list/EpicState`) */
  facts: EpicFacts
  /** when it was last worked on, local ISO (`2026-10-09T14:34-04:00`);  none when nothing says */
  worked?: string
  /** Owen starred it (`epics/favorites.json5`):  its card's star */
  favorite?: boolean
}

/** `GET /api/epics/saga`'s answer:  the saga's id, and every epic naming it, by title. */
export type SagaEpicsAnswer = { saga: string; epics: SagaEpic[] }

/** Why no cards show:  opened from disk, the page server wouldn't answer, or no epic names the saga. */
export type CardsProblem = "file" | "server" | "none"

/** An epic page's file, as the page server announces a change (`spell-server:file`):  the cards ask again. */
export const EPIC_FILE = /\/epics\/[^/]+\/(?:parts\/[^/]+|[^/]+\.plan)\.html$/

/** Loose attributes of a tag drawn in JSX:  HTML attributes, plus any attribute. */
type UIJSXAttributes = JSX.HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }

declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      // the Epics page's list and cards, which it draws (epic `epic-engine` I39)
      "epic-list": UIJSXAttributes
      "epic-card": UIJSXAttributes
    }
  }
}
