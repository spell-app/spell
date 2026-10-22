import type { E } from "spell-ui/core"

/**
 * `<ui-feed>` in Spanish:  `<es-actividad>`, its own names and texts (`UIFeed.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const feedEs = {
  lang: "es",
  tag: "ui-feed",
  name: "actividad",
  aka: ["actividad", "feed de actividad", "cronología", "noticias", "flujo de actividad"],
  attributes: { connected: "conectado" },
  parts: { feed: "actividad" }
} as const satisfies E.TagDictionary
