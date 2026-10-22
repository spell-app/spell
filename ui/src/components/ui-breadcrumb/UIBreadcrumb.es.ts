import type { E } from "spell-ui/core"

/**
 * `<ui-breadcrumb>` in Spanish:  `<es-ruta>`, with the names and texts only it uses (from `UIBreadcrumb.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
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
