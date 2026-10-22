import type { E } from "spell-ui/core"

/**
 * `<ui-buttons>` in Spanish:  `<es-botones>`, its own names and texts (`UIButtons.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const buttonsEs = {
  lang: "es",
  tag: "ui-buttons",
  name: "botones",
  aka: ["botones", "grupo de botones", "control segmentado", "barra de herramientas"]
} as const satisfies E.TagDictionary
