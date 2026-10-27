import type { E } from "spell/ui/core"

/**
 * `<ui-row>` in Spanish:  `<es-fila>`, with the names and texts only it uses (from `UIRow.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const rowEs = {
  lang: "es",
  tag: "ui-row",
  name: "fila",
  aka: ["fila", "fila de cuadrícula", "fila de tabla"],
  attributes: { header: "encabezado", footer: "pie" }
} as const satisfies E.TagDictionary
