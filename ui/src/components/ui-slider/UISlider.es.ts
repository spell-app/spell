import type { E } from "spell-ui/core"

/**
 * `<ui-slider>` in Spanish:  `<es-deslizador>`, with the names and texts only it uses (from `UISlider.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const sliderEs = {
  lang: "es",
  tag: "ui-slider",
  name: "deslizador",
  aka: ["control deslizante", "deslizador", "rango", "volumen", "barra de desplazamiento"],
  attributes: {
    hover: "al-pasar",
    range: "rango",
    smooth: "suave",
    ticked: "con-marcas",
    "tick-step": "paso-marcas",
    end: "fin",
    "step-labels": "etiquetas-pasos"
  },
  parts: {
    slider: "deslizador",
    track: "carril",
    "track-fill": "relleno-carril",
    thumb: "tirador",
    labels: "etiquetas"
  },
  texts: { sliderMinimum: "Mínimo", sliderMaximum: "Máximo" }
} as const satisfies E.TagDictionary
