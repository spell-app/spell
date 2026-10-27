import type { E } from "spell/ui/core"

/**
 * `<ui-tree-diagram>` in Spanish:
 * `<es-diagrama-arbol>`, with the names and texts only it uses (from `UITreeDiagram.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const treeDiagramEs = {
  lang: "es",
  tag: "ui-tree-diagram",
  name: "diagrama-arbol",
  aka: ["diagrama de árbol", "árbol", "jerarquía", "organigrama", "árbol sintáctico"],
  parts: {
    diagram: "diagrama",
    node: "nodo",
    "root-node": "nodo-raiz",
    edge: "arista",
    "slot-label": "etiqueta-ranura"
  },
  texts: {
    summary: "Árbol:  {label}, con {count} hijos",
    summaryOne: "Árbol:  {label}, con 1 hijo",
    summaryLeaf: "Árbol:  {label}"
  }
} as const satisfies E.TagDictionary
