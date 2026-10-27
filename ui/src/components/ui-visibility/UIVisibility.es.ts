import type { E } from "spell-ui/core"

/**
 * `<ui-visibility>` in Spanish:  `<es-visibilidad>`, with the names and texts only it uses (from `UIVisibility.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const visibilityEs = {
  lang: "es",
  tag: "ui-visibility",
  name: "visibilidad",
  aka: ["visibilidad", "en pantalla", "a la vista", "carga diferida", "detección de desplazamiento"],
  attributes: { once: "una-vez", continuous: "continuo", type: "tipo" },
  events: {
    "ui-in-view": "en-vista",
    "ui-out-of-view": "fuera-de-vista",
    "ui-top-in-view": "arriba-en-vista",
    "ui-bottom-in-view": "abajo-en-vista",
    "ui-top-passed": "arriba-pasado",
    "ui-bottom-passed": "abajo-pasado",
    "ui-passing": "pasando"
  },
  parts: { visibility: "visibilidad" }
} as const satisfies E.TagDictionary
