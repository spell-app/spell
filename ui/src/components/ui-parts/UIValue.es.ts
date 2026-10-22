import type { E } from "spell-ui/core"

/**
 * `<ui-value>` in Spanish:  `<es-valor>`, its own names and texts (`UIValue.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const valueEs = {
  lang: "es",
  tag: "ui-value",
  name: "valor",
  aka: ["valor", "valor estadístico", "número", "métrica"]
} as const satisfies E.TagDictionary
