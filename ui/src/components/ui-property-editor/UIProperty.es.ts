import type { E } from "spell/ui/core"

/**
 * `<ui-property>` in Spanish:  `<es-propiedad>`, with the names and texts only it uses (from `UIProperty.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const propertyEs = {
  lang: "es",
  tag: "ui-property",
  name: "propiedad",
  aka: ["campo", "propiedad", "ajuste", "fila del inspector", "campo de esquema"],
  attributes: { as: "como", default: "predeterminado" },
  texts: { info: "Más sobre {label}", mixed: "Varios", none: "ninguno", flags: "Opciones" }
} as const satisfies E.TagDictionary
