import type { E } from "spell/ui/core"

/**
 * `<ui-tree-node>` in Spanish:  `<es-nodo-arbol>`, with the names and texts only it uses (from `UITreeNode.en.ts`).
 * - The names it shares with other tags (`label`, `detail`, `color` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const treeNodeEs = {
  lang: "es",
  tag: "ui-tree-node",
  name: "nodo-arbol",
  aka: ["nodo", "nodo de árbol", "caja de organigrama"],
  attributes: {
    "edge-label": "etiqueta-arista",
    "hover-text": "texto-flotante",
    kind: "tipo-nodo",
    folded: "plegado"
  },
  parts: { content: "contenido" }
} as const satisfies E.TagDictionary
