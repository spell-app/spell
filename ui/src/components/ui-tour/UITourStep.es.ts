import type { E } from "spell/ui/core"

/**
 * `<ui-tour-step>` in Spanish:  `<es-paso-del-recorrido>`, with the names only it uses (from `UITourStep.en.ts`).
 * - The names it shares with other tags are translated once, for every tag:  in `components.es.ts`.
 */
export const tourStepEs = {
  lang: "es",
  tag: "ui-tour-step",
  name: "paso-del-recorrido",
  aka: ["paso del recorrido", "parada", "punto de interes"],
  attributes: { placement: "lado", dim: "oscurecer", "wait-for": "esperar" },
  values: { placement: { bottom: "abajo", top: "arriba", left: "izquierda", right: "derecha" } }
} as const satisfies E.TagDictionary
