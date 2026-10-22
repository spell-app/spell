import type { E } from "spell-ui/core"

/**
 * `<ui-feed>` in Spanish:  `<es-actividad>`, with the names and texts only it uses (from `UIFeed.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
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
