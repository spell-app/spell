import type { E } from "spell/ui/core"

/**
 * `<ui-link>` in Spanish:  `<es-enlace>`, with the names and texts only it uses (from `UILink.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `link` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const linkEs = {
  lang: "es",
  tag: "ui-link",
  name: "enlace",
  aka: ["enlace", "vínculo", "hipervínculo"]
} as const satisfies E.TagDictionary
