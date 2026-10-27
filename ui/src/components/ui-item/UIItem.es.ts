import type { E } from "spell-ui/core"

/**
 * `<ui-item>` in Spanish:  `<es-elemento>`, with the names and texts only it uses (from `UIItem.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const itemEs = {
  lang: "es",
  tag: "ui-item",
  name: "elemento",
  aka: ["elemento", "elemento de lista", "objeto multimedia", "fila"],
  attributes: { flag: "bandera" }
} as const satisfies E.TagDictionary
