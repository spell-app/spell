import type { E } from "spell/ui/core"

/**
 * `<ui-progress>` in Spanish:  `<es-progreso>`, with the names and texts only it uses (from `UIProgress.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const progressEs = {
  lang: "es",
  tag: "ui-progress",
  name: "progreso",
  aka: ["progreso", "barra de progreso", "medidor", "porcentaje", "progreso de subida"],
  attributes: {
    indicating: "indicador",
    total: "total",
    percent: "porcentaje",
    precision: "precision",
    "bar-text": "texto-barra",
    "bar-colors": "colores-barra"
  },
  parts: { "bar-text": "texto-barra" },
  texts: { progressPercent: "{percent} %", progressRatio: "{value} de {total}" }
} as const satisfies E.TagDictionary
