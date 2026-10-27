import type { E } from "spell/ui/core"

/**
 * `<ui-toolbar>` in Spanish:  `<es-barra-herramientas>`, with the names and texts only it uses (from `UIToolbar.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-select` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const toolbarEs = {
  lang: "es",
  tag: "ui-toolbar",
  name: "barra-herramientas",
  aka: ["barra de herramientas", "pestañas desplazables", "menú desplazable"],
  attributes: { pagination: "paginacion", interactive: "interactivo", shrinkable: "encogible" },
  slots: { title: "titulo", center: "centro", right: "derecha", overflow: "desborde" },
  parts: { center: "centro", right: "derecha", overflow: "desborde", "overflow-menu": "menu-desborde" },
  texts: { more: "Más", scrollStart: "Desplazar atrás", scrollEnd: "Desplazar adelante" }
} as const satisfies E.TagDictionary
