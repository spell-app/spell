import type { E } from "spell-ui/core"

/**
 * `<ui-actions>` in Spanish:  `<es-acciones>`, its own names and texts (`UIActions.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const actionsEs = {
  lang: "es",
  tag: "ui-actions",
  name: "acciones",
  aka: ["acciones", "botones de pie", "barra de botones", "acciones del diálogo"]
} as const satisfies E.TagDictionary
