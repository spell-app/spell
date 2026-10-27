import type { E } from "spell-ui/core"

/**
 * `<ui-toc>` in Spanish:  `<es-indice>` (epic `epic-engine` Q23), with the names and texts only it uses
 * (from `UIToc.en.ts`).
 * - The names it shares with other tags (`heading`, `size`, `ui-drawn` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const tocEs = {
  lang: "es",
  tag: "ui-toc",
  name: "indice",
  aka: ["índice", "tabla de contenidos", "en esta página", "contenido de la página", "menú que sigue"],
  attributes: { for: "de", expanded: "expandido" },
  events: { "ui-scrolled-to": "desplazado-a" },
  parts: {
    toc: "indice",
    head: "cabecera",
    "toggle-all": "alternar-todo",
    "section-row": "fila-seccion",
    fold: "plegar",
    entries: "entradas",
    entry: "entrada"
  },
  texts: {
    label: "En esta página",
    foldSection: "Plegar {section}",
    openSection: "Abrir {section}",
    expandAll: "Expandir todo",
    collapseAll: "Plegar todo"
  }
} as const satisfies E.TagDictionary
