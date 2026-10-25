import type { E } from "spell-ui/core"

/**
 * `<ui-content>` in Spanish:  `<es-contenido>`, with the names and texts only it uses (from `UIContent.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const contentEs = {
  lang: "es",
  tag: "ui-content",
  name: "contenido",
  aka: ["contenido", "cuerpo", "área de contenido", "cuerpo de tarjeta"]
} as const satisfies E.TagDictionary
