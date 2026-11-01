import type { E } from "spell/ui/core"

/**
 * `<ui-json>` in Spanish:  `<es-json>`, with the names and texts only it uses (from `UIJson.en.ts`).
 * - JSON is JSON in every language.
 * - The names it shares with other source elements (`source`, `load` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 */
export const jsonEs = {
  lang: "es",
  tag: "ui-json",
  name: "json",
  aka: ["datos", "datos json", "isla de datos"]
} as const satisfies E.TagDictionary
