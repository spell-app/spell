import type { E } from "spell-ui/core"

/**
 * `<ui-segments>` in Spanish:  `<es-segmentos>`, its own names and texts (`UISegments.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const segmentsEs = {
  lang: "es",
  tag: "ui-segments",
  name: "segmentos",
  aka: ["segmentos", "grupo de paneles", "paneles apilados"]
} as const satisfies E.TagDictionary
