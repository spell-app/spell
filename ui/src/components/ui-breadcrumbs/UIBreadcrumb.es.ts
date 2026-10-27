import type { E } from "spell/ui/core"

/**
 * `<ui-breadcrumb>` in Spanish:
 * `<es-ruta-seccion>`, with the names and texts only it uses (from `UIBreadcrumb.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const breadcrumbEs = {
  lang: "es",
  tag: "ui-breadcrumb",
  name: "ruta-seccion",
  aka: ["sección", "miga", "elemento de ruta"]
} as const satisfies E.TagDictionary
