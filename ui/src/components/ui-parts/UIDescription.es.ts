import type { E } from "spell-ui/core"

/**
 * `<ui-description>` in Spanish:  `<es-descripcion>`, its own names and texts (`UIDescription.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const descriptionEs = {
  lang: "es",
  tag: "ui-description",
  name: "descripcion",
  aka: ["descripción", "texto", "resumen", "detalles"]
} as const satisfies E.TagDictionary
