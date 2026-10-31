import type { E } from "spell/ui/core"

/**
 * `<ui-split-panel>` in Spanish:  `<es-panel-dividido>`, with the names and texts only it uses (from `UISplitPanel.en.ts`).
 * - The names it shares with other tags (`columns`, `ui-changed` ...) are translated once, for every tag,
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const splitPanelEs = {
  lang: "es",
  tag: "ui-split-panel",
  name: "panel-dividido",
  aka: ["vista dividida", "paneles", "divisor", "paneles redimensionables"],
  attributes: { rows: "filas", resizable: "redimensionable", "min-size": "tamano-minimo" },
  parts: { bar: "barra", "last-bar": "ultima-barra" },
  texts: { resizePanes: "Cambiar el tamaño de estos paneles" }
} as const satisfies E.TagDictionary
