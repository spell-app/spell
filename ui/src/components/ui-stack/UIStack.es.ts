import type { E } from "spell-ui/core"

/**
 * `<ui-stack>` in Spanish:  `<es-pila>`, with the names and texts only it uses (from `UIStack.en.ts`).
 * - The names it shares with other tags (`direction`, `spacing`, `align` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const stackEs = {
  lang: "es",
  tag: "ui-stack",
  name: "pila",
  aka: ["pila", "grupo", "fila", "columna"],
  attributes: { wrap: "ajustar", justify: "repartir" },
  values: {
    direction: { vertical: "vertical", horizontal: "horizontal" },
    align: { start: "inicio", center: "centro", end: "fin", stretch: "estirar", baseline: "linea-base" },
    justify: { start: "inicio", center: "centro", end: "fin", between: "entre", around: "alrededor" }
  }
} as const satisfies E.TagDictionary
