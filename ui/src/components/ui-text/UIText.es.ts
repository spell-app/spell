import type { E } from "spell/ui/core"

/**
 * `<ui-text>` in Spanish:  `<es-texto>`, with the names and texts only it uses (from `UIText.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const textEs = {
  lang: "es",
  tag: "ui-text",
  name: "texto",
  aka: ["texto", "texto en línea", "texto de color", "etiqueta de texto", "párrafo"],
  attributes: { paragraph: "parrafo" }
} as const satisfies E.TagDictionary
