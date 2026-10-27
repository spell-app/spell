import type { E } from "spell/ui/core"

/**
 * `<ui-select>` in Spanish:  `<es-selector>`, with the names and texts only it uses (from `UISelect.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const selectEs = {
  lang: "es",
  tag: "ui-select",
  name: "selector",
  aka: ["selector", "lista de selección", "lista desplegable", "lista de opciones"],
  parts: { select: "selector", option: "opcion" }
} as const satisfies E.TagDictionary
