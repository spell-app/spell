import type { E } from "spell-ui/core"

/**
 * `<ui-image>` in Spanish:  `<es-imagen>`, its own names and texts (`UIImage.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const imageEs = {
  lang: "es",
  tag: "ui-image",
  name: "imagen",
  aka: ["imagen", "foto", "fotografía", "avatar", "miniatura"],
  parts: { img: "img" }
} as const satisfies E.TagDictionary
