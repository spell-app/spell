import type { E } from "spell-ui/core"

/**
 * `<ui-steps>` in Spanish:  `<es-pasos>`, its own names and texts (`UISteps.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const stepsEs = {
  lang: "es",
  tag: "ui-steps",
  name: "pasos",
  aka: ["pasos", "asistente", "indicador de pasos", "pasos de compra"],
  parts: { steps: "pasos" }
} as const satisfies E.TagDictionary
