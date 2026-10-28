import type { E } from "spell/ui/core"

/**
 * `<ui-space>` in Spanish:  `<es-espacio>`, with the names and texts only it uses (from `UISpace.en.ts`).
 * - The names it shares with other tags (`inline`, `width`, `height`, `fluid` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const spaceEs = {
  lang: "es",
  tag: "ui-space",
  name: "espacio",
  aka: ["espacio", "espaciador", "hueco", "salto de línea", "relleno"],
  attributes: { grow: "crecer", shrink: "encoger" }
} as const satisfies E.TagDictionary
