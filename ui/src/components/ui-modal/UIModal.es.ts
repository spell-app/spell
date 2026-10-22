import type { E } from "spell-ui/core"

/**
 * `<ui-modal>` in Spanish:  `<es-modal>`, with the names and texts only it uses (from `UIModal.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const modalEs = {
  lang: "es",
  tag: "ui-modal",
  name: "modal",
  aka: ["modal", "diálogo", "ventana emergente", "confirmación", "cuadro de diálogo"],
  values: { closedby: { none: "none" } },
  parts: { modal: "modal" },
  texts: { close: "Cerrar", ok: "Aceptar", cancel: "Cancelar" }
} as const satisfies E.TagDictionary
