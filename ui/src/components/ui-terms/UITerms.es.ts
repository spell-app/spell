import type { E } from "spell-ui/core"

/**
 * `<ui-terms>` in Spanish:  `<es-terminos>`, with the names and texts only it uses (from `UITerms.en.ts`).
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const termsEs = {
  lang: "es",
  tag: "ui-terms",
  name: "terminos",
  aka: ["términos", "lista de definiciones", "propiedades", "detalles"]
} as const satisfies E.TagDictionary
