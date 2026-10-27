import type { E } from "spell/ui/core"

/**
 * `<ui-table>` in Spanish:  `<es-tabla>`, with the names and texts only it uses (from `UITable.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const tableEs = {
  lang: "es",
  tag: "ui-table",
  name: "tabla",
  aka: ["tabla", "tabla de datos", "cuadrícula de datos", "hoja de cálculo"],
  attributes: {
    definition: "definicion",
    selectable: "seleccionable",
    "single-line": "una-linea",
    sortable: "ordenable",
    "stack-by": "apilar-por",
    overflowing: "desbordante",
    stuck: "fijado",
    "sort-column": "columna-orden",
    "sort-direction": "direccion-orden",
    "client-sort": "orden-cliente",
    "column-defs": "definiciones-columnas"
  },
  values: { appearance: { striped: "rayado", structured: "estructurado" } },
  events: { "ui-sorting": "ordenando" },
  texts: { label: "Tabla" }
} as const satisfies E.TagDictionary
