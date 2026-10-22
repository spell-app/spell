import type { E } from "spell-ui/core"

/**
 * `<ui-checkbox>` in Spanish:  `<es-casilla>`, its own names and texts (`UICheckbox.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const checkboxEs = {
  lang: "es",
  tag: "ui-checkbox",
  name: "casilla",
  aka: ["casilla de verificación", "casilla", "interruptor", "conmutador"],
  attributes: { type: "tipo", "off-value": "valor-apagado" }
} as const satisfies E.TagDictionary
