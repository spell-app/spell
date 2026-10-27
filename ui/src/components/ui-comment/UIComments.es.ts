import type { E } from "spell-ui/core"

/**
 * `<ui-comments>` in Spanish:  `<es-comentarios>`, with the names and texts only it uses (from `UIComments.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const commentsEs = {
  lang: "es",
  tag: "ui-comments",
  name: "comentarios",
  aka: ["comentarios", "discusión", "hilo", "respuestas"],
  attributes: { threaded: "en-hilos" },
  parts: { comments: "comentarios" }
} as const satisfies E.TagDictionary
