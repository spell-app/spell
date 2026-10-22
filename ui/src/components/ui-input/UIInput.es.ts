import type { E } from "spell-ui/core"

/**
 * `<ui-input>` in Spanish:  `<es-entrada>`, its own names and texts (`UIInput.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const inputEs = {
  lang: "es",
  tag: "ui-input",
  name: "entrada",
  aka: ["entrada", "campo de texto", "cuadro de texto", "campo de entrada", "cuadro de búsqueda"],
  attributes: { action: "accion" },
  values: {
    type: { text: "text", date: "date", time: "time", month: "month" },
    inputmode: { none: "none", text: "text" }
  },
  slots: { action: "accion" }
} as const satisfies E.TagDictionary
