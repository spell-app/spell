import type { E } from "spell-ui/core"

/**
 * `<ui-author>` in Spanish:  `<es-autor>`, its own names and texts (`UIAuthor.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const authorEs = {
  lang: "es",
  tag: "ui-author",
  name: "autor",
  aka: ["autor", "nombre de usuario", "firma", "autoría"],
  parts: { author: "autor" }
} as const satisfies E.TagDictionary
