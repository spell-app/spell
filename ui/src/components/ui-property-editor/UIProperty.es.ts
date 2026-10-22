import type { E } from "spell-ui/core"

/**
 * `<ui-property>` in Spanish:  `<es-propiedad>`, its own names and texts (`UIProperty.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const propertyEs = {
  lang: "es",
  tag: "ui-property",
  name: "propiedad",
  aka: ["campo", "propiedad", "ajuste", "fila del inspector", "campo de esquema"],
  attributes: { as: "como" },
  texts: { info: "Más sobre {label}", mixed: "Varios" }
} as const satisfies E.TagDictionary
