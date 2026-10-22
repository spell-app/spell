import type { E } from "spell-ui/core"

/**
 * `<ui-segments>` in Spanish:  `<es-segmentos>`, with the names and texts only it uses (from `UISegments.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const segmentsEs = {
  lang: "es",
  tag: "ui-segments",
  name: "segmentos",
  aka: ["segmentos", "grupo de paneles", "paneles apilados"]
} as const satisfies E.TagDictionary
