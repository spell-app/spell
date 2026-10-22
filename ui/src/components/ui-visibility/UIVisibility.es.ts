import type { E } from "spell-ui/core"

/**
 * `<ui-visibility>` in Spanish:  `<es-visibilidad>`, its own names and texts (`UIVisibility.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const visibilityEs = {
  lang: "es",
  tag: "ui-visibility",
  name: "visibilidad",
  aka: ["visibilidad", "en pantalla", "a la vista", "carga diferida", "detección de desplazamiento"],
  attributes: { once: "una-vez", continuous: "continuo", type: "tipo" },
  events: {
    "ui-visible": "visible",
    "ui-hidden": "oculto",
    "ui-top-visible": "arriba-visible",
    "ui-bottom-visible": "abajo-visible",
    "ui-top-passed": "arriba-pasado",
    "ui-bottom-passed": "abajo-pasado",
    "ui-passing": "pasando"
  },
  parts: { visibility: "visibilidad" }
} as const satisfies E.TagDictionary
