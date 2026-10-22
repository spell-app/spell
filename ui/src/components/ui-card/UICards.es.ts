import type { E } from "spell-ui/core"

/**
 * `<ui-cards>` in Spanish:  `<es-tarjetas>`, its own names and texts (`UICards.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const cardsEs = {
  lang: "es",
  tag: "ui-cards",
  name: "tarjetas",
  aka: ["tarjetas", "cuadrícula de tarjetas", "grupo de tarjetas", "galería"]
} as const satisfies E.TagDictionary
