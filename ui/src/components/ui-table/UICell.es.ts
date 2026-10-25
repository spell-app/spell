import type { E } from "spell-ui/core"

/**
 * `<ui-cell>` in Spanish:  `<es-celda>`, with the names and texts only it uses (from `UICell.en.ts`).
 * - The names it shares with other tags (`align`, `vertical-align` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const cellEs = {
  lang: "es",
  tag: "ui-cell",
  name: "celda",
  aka: ["celda", "celda de tabla", "celda de encabezado"],
  attributes: { header: "encabezado", span: "abarca" }
} as const satisfies E.TagDictionary
