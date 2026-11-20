import type { E } from "spell/ui/core"

/**
 * `<ui-page-layout>` in Spanish:  `<es-diseno-de-pagina>`, with the names and texts only it uses.
 * - The names it shares with other tags (`menu`, `compact` ...) are translated once, for every tag,
 *   in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter.
 */
export const pageLayoutEs = {
  lang: "es",
  tag: "ui-page-layout",
  name: "diseno-de-pagina",
  aka: ["diseño de aplicación", "marco de página", "estructura del sitio", "cajón de navegación"],
  attributes: {
    drawer: "cajon",
    "drawer-hides": "cajon-se-oculta",
    left: "izquierda",
    right: "derecha",
    "page-height": "alto-de-pagina"
  },
  slots: {
    menu: "menu",
    "page-menu": "menu-de-pagina",
    drawer: "cajon",
    left: "izquierda",
    right: "derecha",
    footer: "pie"
  },
  parts: {
    layout: "diseno",
    drawer: "cajon",
    "drawer-box": "caja-del-cajon",
    menu: "menu",
    "page-menu": "menu-de-pagina",
    left: "izquierda",
    page: "pagina",
    right: "derecha",
    footer: "pie",
    "menu-button": "boton-de-menu"
  },
  texts: { menu: "Páginas" }
} as const satisfies E.TagDictionary
