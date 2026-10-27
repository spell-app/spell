import type { E } from "spell/ui/core"

/**
 * `<ui-value>` in Spanish:  `<es-valor>`, with the names and texts only it uses (from `UIValue.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const valueEs = {
  lang: "es",
  tag: "ui-value",
  name: "valor",
  aka: ["valor", "valor estadístico", "número", "métrica"]
} as const satisfies E.TagDictionary
