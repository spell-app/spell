import type { E } from "spell-ui/core"

/**
 * `<ui-pushable>` in Spanish:  `<es-empujable>`, its own names and texts (`UIPushable.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const pushableEs = {
  lang: "es",
  tag: "ui-pushable",
  name: "empujable",
  aka: ["desplazable", "contenedor de barra lateral", "área desplazable"],
  parts: { pushable: "empujable" }
} as const satisfies E.TagDictionary
