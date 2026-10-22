import type { E } from "spell-ui/core"

/**
 * `<ui-rating>` in Spanish:  `<es-valoracion>`, with the names and texts only it uses (from `UIRating.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const ratingEs = {
  lang: "es",
  tag: "ui-rating",
  name: "valoracion",
  aka: ["valoración", "puntuación", "estrellas", "calificación", "corazones"],
  attributes: { "max-rating": "valoracion-maxima" },
  parts: { rating: "valoracion" },
  texts: { ratingItem: "{value} de {max}", ratingValue: "Valorado con {value} de {max}" }
} as const satisfies E.TagDictionary
