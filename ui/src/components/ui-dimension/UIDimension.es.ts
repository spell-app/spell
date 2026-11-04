import type { E } from "spell/ui/core"

/**
 * `<ui-dimension>` in Spanish:  `<es-dimension>`, with the names and texts only it uses (from `UIDimension.en.ts`).
 * - The names it shares with other tags are translated once, for every tag:  in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const dimensionEs = {
  lang: "es",
  tag: "ui-dimension",
  name: "dimension",
  aka: ["medida", "dimensión", "unidad", "número con unidades", "longitud", "peso", "temperatura"],
  attributes: { dimension: "dimension", unit: "unidad", in: "en" },
  parts: { measure: "medida" },
  texts: { and: "y" }
} as const satisfies E.TagDictionary
