import type { E } from "spell/ui/core"

/**
 * `<ui-tree-item>` in Spanish:  `<es-rama>`, with the names and texts only it uses.
 * - The names it shares with other tags are translated once, for every tag, in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter.
 */
export const treeItemEs = {
  lang: "es",
  tag: "ui-tree-item",
  name: "rama",
  aka: ["nodo", "fila de arbol"],
  attributes: { which: "cual", expandable: "desplegable", band: "franja", count: "cuenta" },
  values: { band: { heading: "titular", subheading: "subtitular" } },
  parts: { row: "fila", toggle: "triangulo", count: "cuenta" },
  texts: { open: "Abrir", close: "Cerrar" }
} as const satisfies E.TagDictionary
