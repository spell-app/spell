import type { E } from "spell/ui/core"

/**
 * `<ui-site-breadcrumbs>` in Spanish:  `<es-migas-del-sitio>`, with the names and texts only it uses.
 * - The names it shares with other tags (`label`, `current` ...) are translated once, for every tag,
 *   in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter.
 */
export const siteBreadcrumbsEs = {
  lang: "es",
  tag: "ui-site-breadcrumbs",
  name: "migas-del-sitio",
  aka: ["migas de pan", "estás aquí", "ruta de la página", "dónde estás"],
  attributes: { pages: "paginas", current: "actual" },
  parts: { breadcrumbs: "migas" },
  texts: { label: "Dónde estás" }
} as const satisfies E.TagDictionary
