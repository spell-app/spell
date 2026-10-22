import type { E } from "spell-ui/core"

/**
 * `<ui-transition>` in Spanish:  `<es-transicion>`, its own names and texts (`UITransition.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const transitionEs = {
  lang: "es",
  tag: "ui-transition",
  name: "transicion",
  aka: ["transición", "animación", "fundido", "deslizamiento", "efecto"],
  attributes: {
    interrupt: "interrumpir",
    "allow-repeats": "permitir-repeticiones",
    looping: "en-bucle",
    pulsating: "pulsante"
  },
  parts: { transition: "transicion" }
} as const satisfies E.TagDictionary
