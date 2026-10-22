import type { E } from "spell-ui/core"

/**
 * `<ui-event>` in Spanish:  `<es-evento>`, its own names and texts (`UIFeedEvent.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const eventEs = {
  lang: "es",
  tag: "ui-event",
  name: "evento",
  aka: ["evento", "actividad", "elemento del feed", "entrada de cronología"],
  parts: { event: "evento" }
} as const satisfies E.TagDictionary
