import type { E } from "spell-ui/core"

/**
 * `<ui-images>` in Spanish:  `<es-imagenes>`, its own names and texts (`UIImages.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const imagesEs = {
  lang: "es",
  tag: "ui-images",
  name: "imagenes",
  aka: ["imágenes", "grupo de imágenes", "galería", "avatares"]
} as const satisfies E.TagDictionary
