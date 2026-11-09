import type { E } from "spell/ui/core"

/**
 * `<ui-site-nav>` in Spanish:  `<es-navegacion-del-sitio>`, with the names and texts only it uses.
 * - The names it shares with other tags (`label`, `current` ...) are translated once, for every tag,
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter.
 */
export const siteNavEs = {
  lang: "es",
  tag: "ui-site-nav",
  name: "navegacion-del-sitio",
  aka: ["navegacion lateral", "menu lateral", "mapa del sitio", "arbol de paginas"],
  attributes: { pages: "paginas", current: "actual", remember: "recordar" },
  parts: { nav: "navegacion", tree: "arbol" },
  events: { "ui-starred": "ui-marcado" },
  texts: { label: "Sitio", star: "Agregar {title} a favoritos", unstar: "Quitar {title} de favoritos" }
} as const satisfies E.TagDictionary
