import type { E } from "spell-ui/core"

/**
 * `<ui-textarea>` in Spanish:  `<es-area-texto>`, with the names and texts only it uses (from `UITextarea.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const textareaEs = {
  lang: "es",
  tag: "ui-textarea",
  name: "area-texto",
  aka: ["área de texto", "texto multilínea", "cuadro de comentario", "entrada"],
  attributes: { grow: "crece", "max-rows": "filas-max" }
} as const satisfies E.TagDictionary
