import type { E } from "spell-ui/core"

/**
 * `<ui-item>` in Spanish:  `<es-elemento>`, its own names and texts (`UIItem.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const itemEs = {
  lang: "es",
  tag: "ui-item",
  name: "elemento",
  aka: ["elemento", "elemento de lista", "objeto multimedia", "fila"],
  attributes: { flag: "bandera", type: "tipo" }
} as const satisfies E.TagDictionary
