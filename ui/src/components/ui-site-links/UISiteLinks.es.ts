import type { E } from "spell/ui/core"

/**
 * `<ui-site-links>` in Spanish:  `<es-enlaces-del-sitio>`, with the names and texts only it uses.
 * - The names it shares with other tags (`pages`, `current` ...) are translated once, for every tag,
 *   in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter.
 */
export const siteLinksEs = {
  lang: "es",
  tag: "ui-site-links",
  name: "enlaces-del-sitio",
  aka: ["enlaces de la página", "informar de un error", "página original", "enlaces externos"],
  attributes: { pages: "paginas", current: "actual", report: "informe" },
  parts: { links: "enlaces", original: "original", report: "informe" },
  texts: { original: "La página original", report: "Informar de un error" }
} as const satisfies E.TagDictionary
