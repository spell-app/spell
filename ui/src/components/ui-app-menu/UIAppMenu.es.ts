import type { E } from "spell/ui/core"

/**
 * `<ui-app-menu>` in Spanish:  `<es-barra-aplicacion>`, with the names only it uses (from `UIAppMenu.en.ts`).
 * - The names it shares with `<ui-menu>` are the menu's, translated in `UIMenu.es.ts` and `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const appMenuEs = {
  lang: "es",
  tag: "ui-app-menu",
  name: "barra-aplicacion",
  snippet:
    '<es-barra-aplicacion>\n\t<es-elemento slot="inicio">Mi app</es-elemento>\n\t<es-elemento>Inicio</es-elemento>\n' +
    '\t<es-elemento slot="fin" icono="cog"></es-elemento>\n</es-barra-aplicacion>',
  aka: ["barra de aplicación", "barra superior", "barra de título", "cabecera"],
  attributes: {
    pagination: "paginacion",
    interactive: "interactivo",
    shrinkable: "encogible",
    ticks: "marcas",
    "icon-column": "columna-de-iconos",
    tabs: "pestanas"
  },
  slots: { start: "inicio", end: "fin", overflow: "desborde" },
  parts: { start: "inicio", middle: "medio", end: "fin", overflow: "desborde", "overflow-menu": "menu-desborde" },
  texts: { more: "Más" }
} as const satisfies E.TagDictionary
