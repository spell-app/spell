import type { E } from "spell-ui/core"

/**
 * `<ui-list>` in Spanish:  `<es-lista>`, its own names and texts (`UIList.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const listEs = {
  lang: "es",
  tag: "ui-list",
  name: "lista",
  aka: ["lista", "lista con viñetas", "lista numerada", "vista de lista"],
  attributes: { bulleted: "con-vinetas", suffixed: "con-sufijo" }
} as const satisfies E.TagDictionary
