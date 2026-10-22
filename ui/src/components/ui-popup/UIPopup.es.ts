import type { E } from "spell-ui/core"

/**
 * `<ui-popup>` in Spanish:  `<es-emergente>`, its own names and texts (`UIPopup.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const popupEs = {
  lang: "es",
  tag: "ui-popup",
  name: "emergente",
  aka: ["ventana emergente", "información sobre herramientas", "tooltip", "globo", "sugerencia"],
  attributes: {
    flowing: "extendido",
    "open-on": "abrir-al",
    hoverable: "mantener-abierto",
    "show-delay": "retraso-mostrar",
    "hide-delay": "retraso-ocultar"
  }
} as const satisfies E.TagDictionary
