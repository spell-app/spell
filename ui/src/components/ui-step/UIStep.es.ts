import type { E } from "spell/ui/core"

/**
 * `<ui-step>` in Spanish:  `<es-paso>`, with the names and texts only it uses (from `UIStep.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const stepEs = {
  lang: "es",
  tag: "ui-step",
  name: "paso",
  aka: ["paso", "etapa", "paso del asistente"],
  attributes: { completed: "completado" },
  parts: { step: "paso" },
  texts: { stepCompleted: "Completado" }
} as const satisfies E.TagDictionary
