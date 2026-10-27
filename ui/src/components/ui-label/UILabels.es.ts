import type { E } from "spell/ui/core"

/**
 * `<ui-labels>` in Spanish:  `<es-etiquetas>`, with the names and texts only it uses (from `UILabels.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const labelsEs = {
  lang: "es",
  tag: "ui-labels",
  name: "etiquetas",
  aka: ["etiquetas", "insignias", "chips", "lista de etiquetas"]
} as const satisfies E.TagDictionary
