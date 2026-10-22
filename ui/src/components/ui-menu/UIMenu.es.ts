import type { E } from "spell-ui/core"

/**
 * `<ui-menu>` in Spanish:  `<es-menu>`, its own names and texts (`UIMenu.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const menuEs = {
  lang: "es",
  tag: "ui-menu",
  name: "menu",
  aka: ["menú", "barra de navegación", "navegación", "barra de pestañas", "paginación"],
  attributes: { pagination: "paginacion", borderless: "sin-borde", interactive: "interactivo" }
} as const satisfies E.TagDictionary
