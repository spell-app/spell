import type { E } from "spell/ui/core"

/**
 * `<ui-list>` in Spanish:  `<es-lista>`, with the names and texts only it uses (from `UIList.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const listEs = {
  lang: "es",
  tag: "ui-list",
  name: "lista",
  aka: ["lista", "lista con viñetas", "lista numerada", "vista de lista"],
  attributes: { bulleted: "con-vinetas", suffixed: "con-sufijo" }
} as const satisfies E.TagDictionary
