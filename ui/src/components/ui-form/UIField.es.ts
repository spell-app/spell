import type { E } from "spell-ui/core"

/**
 * `<ui-field>` in Spanish:  `<es-campo>`, its own names and texts (`UIField.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const fieldEs = {
  lang: "es",
  tag: "ui-field",
  name: "campo",
  aka: ["campo", "campo de formulario", "grupo de formulario", "etiqueta y entrada", "propiedad"],
  texts: { info: "Más sobre {label}", mixed: "Varios" }
} as const satisfies E.TagDictionary
