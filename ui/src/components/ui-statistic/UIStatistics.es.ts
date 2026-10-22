import type { E } from "spell-ui/core"

/**
 * `<ui-statistics>` in Spanish:  `<es-estadisticas>`, its own names and texts (`UIStatistics.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const statisticsEs = {
  lang: "es",
  tag: "ui-statistics",
  name: "estadisticas",
  aka: ["estadísticas", "indicadores", "métricas", "cifras del panel"]
} as const satisfies E.TagDictionary
