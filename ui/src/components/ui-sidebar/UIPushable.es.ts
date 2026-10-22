import type { E } from "spell-ui/core"

/**
 * `<ui-pushable>` in Spanish:  `<es-empujable>`, with the names and texts only it uses (from `UIPushable.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const pushableEs = {
  lang: "es",
  tag: "ui-pushable",
  name: "empujable",
  aka: ["desplazable", "contenedor de barra lateral", "área desplazable"],
  parts: { pushable: "empujable" }
} as const satisfies E.TagDictionary
