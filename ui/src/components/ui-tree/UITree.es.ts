import type { E } from "spell/ui/core"

/**
 * `<ui-tree>` in Spanish:  `<es-arbol>`, with the names and texts only it uses (from the Spanish epic's rule).
 * - The names it shares with other tags (`label`, `ui-changed` ...) are translated once, for every tag,
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter.
 */
export const treeEs = {
  lang: "es",
  tag: "ui-tree",
  name: "arbol",
  aka: ["vista de arbol", "esquema", "jerarquia", "arbol de archivos"],
  attributes: { filter: "filtro", "sticky-path": "ruta-fija" },
  values: { appearance: { nav: "navegacion" } },
  events: { "ui-selecting": "ui-seleccionando" },
  slots: { empty: "vacio" },
  parts: { empty: "vacio", path: "ruta", "path-row": "fila-de-ruta" },
  texts: { noMatches: "Nada coincide" }
} as const satisfies E.TagDictionary
