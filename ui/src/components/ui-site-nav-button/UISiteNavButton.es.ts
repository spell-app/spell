import type { E } from "spell/ui/core"

/**
 * `<ui-site-nav-button>` in Spanish:  `<es-boton-de-navegacion>`, with the names and texts only it uses
 * (from `UISiteNavButton.en.ts`).
 * - The names it shares with `<ui-item>` and other tags are translated once:  in `UIItem.es.ts` and
 *   `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const siteNavButtonEs = {
  lang: "es",
  tag: "ui-site-nav-button",
  name: "boton-de-navegacion",
  aka: ["botón de barra lateral", "botón del cajón", "hamburguesa", "alternar navegación"],
  attributes: { flag: "bandera" },
  texts: { label: "Mostrar u ocultar la barra lateral", menuLabel: "Mostrar u ocultar el menú" }
} as const satisfies E.TagDictionary
