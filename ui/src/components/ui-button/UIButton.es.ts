import type { E } from "spell-ui/core"

/**
 * `<ui-button>` in Spanish:  `<es-boton>`, its own names and texts (`UIButton.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
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
    unpadded: "sin-relleno",
    ellipsis: "elipsis"
  },
  events: { "ui-toggle": "alternar" },
  texts: { loading: "Cargando…" }
} as const satisfies E.TagDictionary
