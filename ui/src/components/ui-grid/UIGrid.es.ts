import type { E } from "spell/ui/core"

/**
 * `<ui-grid>` in Spanish:  `<es-cuadricula>`, with the names and texts only it uses (from `UIGrid.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const gridEs = {
  lang: "es",
  tag: "ui-grid",
  name: "cuadricula",
  aka: ["cuadrícula", "rejilla", "columnas", "fila", "diseño en cuadrícula"]
} as const satisfies E.TagDictionary
