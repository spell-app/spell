import type { E } from "spell/ui/core"

/**
 * `<ui-extra>` in Spanish:  `<es-extra>`, with the names and texts only it uses (from `UIExtra.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const extraEs = {
  lang: "es",
  tag: "ui-extra",
  name: "extra",
  aka: ["extra", "pie", "pie de tarjeta", "contenido adicional"]
} as const satisfies E.TagDictionary
