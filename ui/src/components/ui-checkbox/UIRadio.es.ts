import type { E } from "spell-ui/core"

/**
 * `<ui-radio>` in Spanish:  `<es-radio>`, its own names and texts (`UIRadio.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const radioEs = {
  lang: "es",
  tag: "ui-radio",
  name: "radio",
  aka: ["botón de opción", "botón de radio", "grupo de opciones", "opción"],
  attributes: { type: "tipo" }
} as const satisfies E.TagDictionary
