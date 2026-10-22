import type { E } from "spell-ui/core"

/**
 * `<ui-meta>` in Spanish:  `<es-meta>`, its own names and texts (`UIMeta.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const metaEs = {
  lang: "es",
  tag: "ui-meta",
  name: "meta",
  aka: ["metadatos", "subtítulo", "firma", "pie de foto"]
} as const satisfies E.TagDictionary
