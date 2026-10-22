import type { E } from "spell-ui/core"

/**
 * `<ui-select>` in Spanish:  `<es-selector>`, its own names and texts (`UISelect.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const selectEs = {
  lang: "es",
  tag: "ui-select",
  name: "selector",
  aka: ["selector", "lista de selección", "lista desplegable", "lista de opciones"],
  parts: { select: "selector", option: "opcion" }
} as const satisfies E.TagDictionary
