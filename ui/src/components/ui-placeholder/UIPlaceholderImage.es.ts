import type { E } from "spell-ui/core"

/**
 * `<ui-placeholder-image>` in Spanish:  `<es-esqueleto-imagen>`, its own names and texts (`UIPlaceholderImage.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const placeholderImageEs = {
  lang: "es",
  tag: "ui-placeholder-image",
  name: "esqueleto-imagen",
  aka: ["imagen", "imagen esqueleto", "marcador de imagen"],
  attributes: { square: "cuadrado", rectangular: "rectangular" }
} as const satisfies E.TagDictionary
