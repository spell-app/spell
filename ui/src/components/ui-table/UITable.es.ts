import type { E } from "spell-ui/core"

/**
 * `<ui-table>` in Spanish:  `<es-tabla>`, its own names and texts (`UITable.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
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
    striped: "rayado",
    structured: "estructurado",
    "stack-by": "apilar-por",
    overflowing: "desbordante",
    stuck: "fijado",
    "sort-column": "columna-orden",
    "sort-direction": "direccion-orden",
    "client-sort": "orden-cliente",
    "column-defs": "definiciones-columnas"
  },
  events: { "ui-sort": "ordenar" },
  texts: { label: "Tabla" }
} as const satisfies E.TagDictionary
