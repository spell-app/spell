import type { E } from "spell-ui/core"

/**
 * `<ui-label>` in Spanish:  `<es-etiqueta>`, with the names and texts only it uses (from `UILabel.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const labelEs = {
  lang: "es",
  tag: "ui-label",
  name: "etiqueta",
  aka: ["etiqueta", "insignia", "chip", "distintivo", "contador"],
  attributes: { ribbon: "cinta", empty: "vacio", prompt: "aviso", detail: "detalle", removable: "quitable" },
  parts: { delete: "eliminar" },
  texts: { remove: "Quitar" }
} as const satisfies E.TagDictionary
