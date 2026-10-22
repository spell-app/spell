import type { E } from "spell-ui/core"

/**
 * `<ui-fields>` in Spanish:  `<es-campos>`, its own names and texts (`UIFields.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const fieldsEs = {
  lang: "es",
  tag: "ui-fields",
  name: "campos",
  aka: ["campos", "grupo de campos", "fila de formulario", "campos en línea"],
  attributes: { grouped: "agrupado" },
  parts: { fields: "campos" }
} as const satisfies E.TagDictionary
