import type { E } from "spell-ui/core"

/**
 * `<ui-term>` in Spanish:  `<es-termino>`, with the names and texts only it uses (from `UITerm.en.ts`).
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const termEs = {
  lang: "es",
  tag: "ui-term",
  name: "termino",
  aka: ["término", "propiedad", "dato"],
  parts: { value: "valor" }
} as const satisfies E.TagDictionary
