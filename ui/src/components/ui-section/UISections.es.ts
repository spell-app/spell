import type { E } from "spell-ui/core"

/**
 * `<ui-sections>` in Spanish:  `<es-secciones>`, its own names and texts (`UISections.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const sectionsEs = {
  lang: "es",
  tag: "ui-sections",
  name: "secciones",
  aka: ["secciones", "acordeón", "grupo de secciones", "esquema"]
} as const satisfies E.TagDictionary
