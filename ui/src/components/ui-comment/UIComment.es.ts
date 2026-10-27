import type { E } from "spell-ui/core"

/**
 * `<ui-comment>` in Spanish:  `<es-comentario>`, with the names and texts only it uses (from `UIComment.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const commentEs = {
  lang: "es",
  tag: "ui-comment",
  name: "comentario",
  aka: ["comentario", "respuesta", "publicación", "mensaje"],
  parts: { comment: "comentario" }
} as const satisfies E.TagDictionary
