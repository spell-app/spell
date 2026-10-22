import type { E } from "spell-ui/core"

/**
 * `<ui-label>` in Spanish:  `<es-etiqueta>`, its own names and texts (`UILabel.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
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
