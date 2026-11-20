import type { E } from "spell/ui/core"

/**
 * `<ui-dial>` in Spanish:  `<es-perilla>`, with the names only it uses (from `UIDial.en.ts`).
 * - The names it shares with other tags (`label`, `size`, `color`, `ui-changed` ...) are translated once, for every
 *   tag:  in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const dialEs = {
  lang: "es",
  tag: "ui-dial",
  name: "perilla",
  snippet: '<es-perilla etiqueta="Volumen"></es-perilla>',
  aka: ["perilla", "dial", "mando giratorio", "control circular", "deslizador circular", "indicador"],
  attributes: { ticks: "marcas", unit: "unidad" },
  parts: {
    dial: "perilla",
    track: "carril",
    "track-fill": "relleno-carril",
    handle: "tirador",
    disc: "disco",
    ticks: "marcas"
  }
} as const satisfies E.TagDictionary
