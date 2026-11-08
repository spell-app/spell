import type { E } from "spell/ui/core"

/**
 * `<ui-diagram>` in Spanish:
 * `<es-diagrama>`, with the names and texts only it uses (from `UIDiagram.en.ts`).
 * - The names it shares with other tags are translated once, for every tag, in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const diagramEs = {
  lang: "es",
  tag: "ui-diagram",
  name: "diagrama",
  aka: [
    "grafo",
    "diagrama de red",
    "cajas y líneas",
    "diagrama entidad relación",
    "modelo de datos",
    "diagrama de flujo"
  ],
  attributes: {
    spec: "especificacion",
    columns: "columnas",
    remember: "recordar",
    fixed: "fijo",
    downloadable: "descargable"
  },
  events: { "ui-node-clicked": "nodo-pulsado", "ui-node-moved": "nodo-movido" },
  parts: { diagram: "diagrama", toolbar: "barra" },
  texts: {
    summary: "Diagrama:  {boxes} cajas, {links} enlaces",
    legend: "Leyenda",
    contains: "contiene",
    refersTo: "se refiere a",
    derived: "(calculado)",
    putBack: "Volver a colocar",
    saveSVG: "Guardar como SVG"
  }
} as const satisfies E.TagDictionary
