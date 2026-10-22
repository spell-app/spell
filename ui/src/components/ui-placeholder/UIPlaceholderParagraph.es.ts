import type { E } from "spell-ui/core"

/**
 * `<ui-placeholder-paragraph>` in Spanish:  `<es-esqueleto-parrafo>`, its own names and texts (`UIPlaceholderParagraph.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const placeholderParagraphEs = {
  lang: "es",
  tag: "ui-placeholder-paragraph",
  name: "esqueleto-parrafo",
  aka: ["párrafo", "texto esqueleto", "párrafo esqueleto"],
  parts: { paragraph: "parrafo" }
} as const satisfies E.TagDictionary
