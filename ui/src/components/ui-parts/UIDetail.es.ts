import type { E } from "spell-ui/core"

/**
 * `<ui-detail>` in Spanish:  `<es-detalle>`, its own names and texts (`UIDetail.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const detailEs = {
  lang: "es",
  tag: "ui-detail",
  name: "detalle",
  aka: ["detalle", "texto secundario", "nota"]
} as const satisfies E.TagDictionary
