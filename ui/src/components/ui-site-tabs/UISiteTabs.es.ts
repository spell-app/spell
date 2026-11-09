import type { E } from "spell/ui/core"

/**
 * `<ui-site-tabs>` in Spanish:  `<es-pestanas-del-sitio>`, with the names and texts only it uses.
 * - The names it shares with other tags (`label` ...) are translated once, for every tag, in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter.
 */
export const siteTabsEs = {
  lang: "es",
  tag: "ui-site-tabs",
  name: "pestanas-del-sitio",
  aka: ["pestanas de pagina", "pestanas de seccion", "navegacion secundaria", "paginas hermanas"],
  attributes: { pages: "paginas", current: "actual" },
  parts: { tabs: "pestanas" }
} as const satisfies E.TagDictionary
