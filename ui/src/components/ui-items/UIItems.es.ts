import type { E } from "spell-ui/core"

/**
 * `<ui-items>` in Spanish:  `<es-elementos>`, with the names and texts only it uses (from `UIItems.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const itemsEs = {
  lang: "es",
  tag: "ui-items",
  name: "elementos",
  aka: ["elementos", "lista de elementos", "lista de productos", "resultados"],
  parts: { items: "elementos" }
} as const satisfies E.TagDictionary
