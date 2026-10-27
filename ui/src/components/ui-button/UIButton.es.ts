import type { E } from "spell/ui/core"

/**
 * `<ui-button>` in Spanish:  `<es-boton>`, with the names and texts only it uses (from `UIButton.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const buttonEs = {
  lang: "es",
  tag: "ui-button",
  name: "boton",
  aka: ["botón", "acción", "enviar", "botón de enlace"],
  attributes: {
    "active-text": "texto-activo",
    "inactive-text": "texto-inactivo",
    ellipsis: "elipsis"
  },
  events: { "ui-selected": "seleccionado", "ui-deselected": "deseleccionado" },
  texts: { loading: "Cargando…" }
} as const satisfies E.TagDictionary
