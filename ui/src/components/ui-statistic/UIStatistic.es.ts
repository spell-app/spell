import type { E } from "spell-ui/core"

/**
 * `<ui-statistic>` in Spanish:  `<es-estadistica>`, its own names and texts (`UIStatistic.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const statisticEs = {
  lang: "es",
  tag: "ui-statistic",
  name: "estadistica",
  aka: ["estadística", "indicador", "métrica", "contador", "cifra"],
  parts: { statistic: "estadistica" }
} as const satisfies E.TagDictionary
