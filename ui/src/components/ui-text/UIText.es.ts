import type { E } from "spell-ui/core"

/**
 * `<ui-text>` in Spanish:  `<es-texto>`, its own names and texts (`UIText.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const textEs = {
  lang: "es",
  tag: "ui-text",
  name: "texto",
  aka: ["texto", "texto en línea", "texto de color", "etiqueta de texto"]
} as const satisfies E.TagDictionary
