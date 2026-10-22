import type { E } from "spell-ui/core"

/**
 * `<ui-breadcrumb-section>` in Spanish:  `<es-ruta-seccion>`, its own names and texts (`UIBreadcrumbSection.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const breadcrumbSectionEs = {
  lang: "es",
  tag: "ui-breadcrumb-section",
  name: "ruta-seccion",
  aka: ["sección", "miga", "elemento de ruta"]
} as const satisfies E.TagDictionary
