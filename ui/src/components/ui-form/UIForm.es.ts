import type { E } from "spell-ui/core"

/**
 * `<ui-form>` in Spanish:  `<es-formulario>`, its own names and texts (`UIForm.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const formEs = {
  lang: "es",
  tag: "ui-form",
  name: "formulario",
  aka: ["formulario", "diseño de formulario", "conjunto de campos", "validación"],
  texts: { formDebugBound: "Objeto vinculado", formDebugValues: "Valores" }
} as const satisfies E.TagDictionary
