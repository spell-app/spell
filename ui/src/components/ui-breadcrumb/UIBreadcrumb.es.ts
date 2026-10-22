import type { E } from "spell-ui/core"

/**
 * `<ui-breadcrumb>` in Spanish:  `<es-ruta>`, its own names and texts (`UIBreadcrumb.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const breadcrumbEs = {
  lang: "es",
  tag: "ui-breadcrumb",
  name: "ruta",
  aka: ["migas de pan", "ruta de navegación", "ruta", "ubicación"],
  attributes: { divider: "divisor", "divider-icon": "icono-divisor" },
  parts: { breadcrumb: "ruta" },
  texts: { label: "Ruta de navegación" }
} as const satisfies E.TagDictionary
