import type { E } from "spell-ui/core"

/**
 * `<ui-summary>` in Spanish:  `<es-resumen>`, with the names and texts only it uses (from `UISummary.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const summaryEs = {
  lang: "es",
  tag: "ui-summary",
  name: "resumen",
  aka: ["resumen", "resumen del evento", "titular"],
  parts: { summary: "resumen" }
} as const satisfies E.TagDictionary
