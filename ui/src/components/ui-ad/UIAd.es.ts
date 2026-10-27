import type { E } from "spell/ui/core"

/**
 * `<ui-ad>` in Spanish:  `<es-anuncio>`, with the names and texts only it uses (from `UIAd.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const adEs = {
  lang: "es",
  tag: "ui-ad",
  name: "anuncio",
  aka: ["anuncio", "publicidad", "banner publicitario", "espacio publicitario"],
  attributes: { unit: "unidad", test: "prueba" },
  values: { unit: { square: "square" } },
  parts: { ad: "anuncio" },
  texts: { adTest: "Anuncio" }
} as const satisfies E.TagDictionary
