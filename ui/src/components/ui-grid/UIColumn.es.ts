import type { E } from "spell-ui/core"

/**
 * `<ui-column>` in Spanish:  `<es-columna>`, with the names and texts only it uses (from `UIColumn.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const columnEs = {
  lang: "es",
  tag: "ui-column",
  name: "columna",
  aka: ["columna", "columna de cuadrícula", "celda"],
  attributes: {
    "width-mobile": "ancho-movil",
    "width-tablet": "ancho-tableta",
    "width-computer": "ancho-ordenador",
    "width-large": "ancho-grande",
    "width-widescreen": "ancho-panoramico"
  },
  parts: { column: "columna" }
} as const satisfies E.TagDictionary
