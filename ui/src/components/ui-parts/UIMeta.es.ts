import type { E } from "spell-ui/core"

/**
 * `<ui-meta>` in Spanish:  `<es-meta>`, with the names and texts only it uses (from `UIMeta.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const metaEs = {
  lang: "es",
  tag: "ui-meta",
  name: "meta",
  aka: ["metadatos", "subtítulo", "firma", "pie de foto"]
} as const satisfies E.TagDictionary
