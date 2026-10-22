import type { E } from "spell-ui/core"

/**
 * `<ui-container>` in Spanish:  `<es-contenedor>`, its own names and texts (`UIContainer.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const containerEs = {
  lang: "es",
  tag: "ui-container",
  name: "contenedor",
  aka: ["contenedor", "envoltorio", "ancho de página", "ancho de contenido"],
  attributes: { grid: "cuadricula" },
  parts: { container: "contenedor" }
} as const satisfies E.TagDictionary
