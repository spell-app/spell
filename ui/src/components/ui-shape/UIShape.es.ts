import type { E } from "spell-ui/core"

/**
 * `<ui-shape>` in Spanish:  `<es-forma>`, with the names and texts only it uses (from `UIShape.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const shapeEs = {
  lang: "es",
  tag: "ui-shape",
  name: "forma",
  aka: ["forma", "volteo 3d", "cubo", "tarjeta giratoria", "carrusel"],
  attributes: { cube: "cubo", "active-index": "indice-activo" },
  parts: { shape: "forma", sides: "caras" }
} as const satisfies E.TagDictionary
