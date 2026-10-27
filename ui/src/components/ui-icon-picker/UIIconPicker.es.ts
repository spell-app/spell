import type { E } from "spell-ui/core"

/**
 * `<ui-icon-picker>` in Spanish:  `<es-selector-icono>`, with the names and texts only it uses
 * (from `UIIconPicker.en.ts`).
 * - The names it shares with other tags (`size`, `placeholder`, `ui-changing` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const iconPickerEs = {
  lang: "es",
  tag: "ui-icon-picker",
  name: "selector-icono",
  aka: ["selector de iconos", "elegir icono", "buscador de iconos", "selector de símbolos"],
  parts: { glyph: "glifo", panel: "panel", cell: "celda" },
  texts: { searchIcons: "Buscar iconos", noIcon: "ninguno", noIconsMatch: "Ningún icono coincide", otherIcons: "Otros" }
} as const satisfies E.TagDictionary
