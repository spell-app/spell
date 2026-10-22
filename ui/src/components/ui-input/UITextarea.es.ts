import type { E } from "spell-ui/core"

/**
 * `<ui-textarea>` in Spanish:  `<es-area-texto>`, its own names and texts (`UITextarea.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const textareaEs = {
  lang: "es",
  tag: "ui-textarea",
  name: "area-texto",
  aka: ["área de texto", "texto multilínea", "cuadro de comentario", "entrada"]
} as const satisfies E.TagDictionary
