import type { E } from "spell-ui/core"

/**
 * `<ui-reveal>` in Spanish:  `<es-revelar>`, with the names and texts only it uses (from `UIReveal.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const revealEs = {
  lang: "es",
  tag: "ui-reveal",
  name: "revelar",
  aka: ["revelar", "mostrar al pasar", "voltear", "imagen superpuesta"],
  attributes: {
    fade: "desvanecer",
    move: "mover",
    rotate: "girar",
    slide: "deslizar",
    instant: "instantaneo",
    unclipped: "sin-recorte"
  },
  slots: { visible: "visible", hidden: "oculto" },
  parts: { reveal: "revelar", visible: "visible", hidden: "oculto" }
} as const satisfies E.TagDictionary
