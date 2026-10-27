import type { E } from "spell/ui/core"

/**
 * `<ui-event>` in Spanish:  `<es-evento>`, with the names and texts only it uses (from `UIFeedEvent.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const eventEs = {
  lang: "es",
  tag: "ui-event",
  name: "evento",
  aka: ["evento", "actividad", "elemento del feed", "entrada de cronología"],
  parts: { event: "evento" }
} as const satisfies E.TagDictionary
