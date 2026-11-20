import type { E } from "spell/ui/core"

/**
 * `<ui-graph>` in Spanish:
 * `<es-grafo>`, with the names and texts only it uses (from `UIGraph.en.ts`).
 * - The names it shares with other tags are translated once, for every tag:  in `components.es.ts`.
 * - Names stay ASCII (no accents).
 */
export const graphEs = {
  lang: "es",
  tag: "ui-graph",
  name: "grafo",
  aka: ["grafo", "diagrama de nodos", "diagrama de red", "esquema", "diagrama de bloques"],
  attributes: { graph: "grafo", "child-view": "vista-hijos", boundary: "frontera" },
  values: { "child-view": { inline: "en-linea", modal: "modal", drill: "adentrar" } },
  events: { "ui-node-toggled": "nodo-abierto" },
  parts: {
    graph: "grafo",
    canvas: "lienzo",
    node: "nodo",
    container: "contenedor",
    edge: "arista",
    "edge-label": "etiqueta-arista",
    port: "puerto",
    pin: "pin",
    toggle: "abridor",
    toolbar: "barra",
    breadcrumbs: "migas"
  },
  texts: {
    graphSummary: "Grafo:  {count} nodos",
    graphOpenNode: "Abrir {label}",
    graphCloseNode: "Cerrar {label}",
    graphFit: "Ajustar",
    graphTop: "Inicio",
    graphLoading: "Cargando …"
  },
  hooks: {
    nodeLabel: "dar la etiqueta de (un nodo)",
    nodeClass: "dar la clase de (un nodo)",
    edgeLabel: "dar la etiqueta de (una arista)",
    edgeClass: "dar la clase de (una arista)"
  }
} as const satisfies E.TagDictionary
