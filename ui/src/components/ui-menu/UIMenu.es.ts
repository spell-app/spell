import type { E } from "spell/ui/core"

/**
 * `<ui-menu>` in Spanish:  `<es-menu>`, with the names and texts only it uses (from `UIMenu.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const menuEs = {
  lang: "es",
  tag: "ui-menu",
  name: "menu",
  snippet: "<es-menu>\n\t<es-elemento>Uno</es-elemento>\n\t<es-elemento>Dos</es-elemento>\n</es-menu>",
  aka: ["menú", "barra de navegación", "navegación", "barra de pestañas", "paginación"],
  attributes: {
    pagination: "paginacion",
    interactive: "interactivo",
    shrinkable: "encogible",
    ticks: "marcas",
    "icon-column": "columna-de-iconos",
    tabs: "pestanas"
  },
  slots: { overflow: "desborde" },
  parts: { overflow: "desborde", "overflow-menu": "menu-desborde" },
  texts: { more: "Más" }
} as const satisfies E.TagDictionary
