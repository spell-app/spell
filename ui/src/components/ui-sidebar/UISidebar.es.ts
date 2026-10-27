import type { E } from "spell/ui/core"

/**
 * `<ui-sidebar>` in Spanish:  `<es-barra-lateral>`, with the names and texts only it uses (from `UISidebar.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const sidebarEs = {
  lang: "es",
  tag: "ui-sidebar",
  name: "barra-lateral",
  aka: ["barra lateral", "cajón", "menú lateral", "menú hamburguesa", "panel de navegación"],
  attributes: { transition: "transicion", persistent: "persistente" },
  values: { closedby: { none: "none" } },
  parts: { sidebar: "barra-lateral" },
  texts: { sidebar: "Barra lateral" }
} as const satisfies E.TagDictionary
