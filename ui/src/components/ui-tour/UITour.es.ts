import type { E } from "spell/ui/core"

/**
 * `<ui-tour>` in Spanish:  `<es-recorrido>`, with the names and texts only it uses (from `UITour.en.ts`).
 * - The names it shares with other tags are translated once, for every tag:  in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const tourEs = {
  lang: "es",
  tag: "ui-tour",
  name: "recorrido",
  aka: ["recorrido", "visita guiada", "tutorial", "guia rapida"],
  attributes: { summary: "resumen", dim: "oscurecer", remember: "recordar", offer: "ofrecer" },
  values: { offer: { ask: "preguntar", start: "empezar", dot: "punto" } },
  events: { "ui-starting": "empezando", "ui-started": "empezado", "ui-stepped": "de-paso", "ui-ended": "terminado" },
  parts: { box: "caja", ring: "anillo", offer: "oferta", dot: "punto" },
  texts: {
    back: "Atrás",
    next: "Siguiente",
    done: "Listo",
    close: "Cerrar el recorrido",
    stepOf: "Paso {step} de {count}",
    waiting: "Hazlo para seguir.",
    offerTitle: "¿Un recorrido rápido?",
    offerSteps: "{count} pasos",
    offerOneStep: "1 paso",
    offerStart: "Empezar el recorrido",
    offerNever: "No, gracias",
    dotLabel: "Haz el recorrido {name}"
  }
} as const satisfies E.TagDictionary
