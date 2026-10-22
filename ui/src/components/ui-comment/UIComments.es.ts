import type { E } from "spell-ui/core"

/**
 * `<ui-comments>` in Spanish:  `<es-comentarios>`, its own names and texts (`UIComments.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const commentsEs = {
  lang: "es",
  tag: "ui-comments",
  name: "comentarios",
  aka: ["comentarios", "discusión", "hilo", "respuestas"],
  attributes: { threaded: "en-hilos", minimal: "minimo" },
  parts: { comments: "comentarios" }
} as const satisfies E.TagDictionary
