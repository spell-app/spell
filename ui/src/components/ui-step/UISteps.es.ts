import type { E } from "spell-ui/core"

/**
 * `<ui-steps>` in Spanish:  `<es-pasos>`, with the names and texts only it uses (from `UISteps.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const stepsEs = {
  lang: "es",
  tag: "ui-steps",
  name: "pasos",
  aka: ["pasos", "asistente", "indicador de pasos", "pasos de compra"],
  parts: { steps: "pasos" }
} as const satisfies E.TagDictionary
