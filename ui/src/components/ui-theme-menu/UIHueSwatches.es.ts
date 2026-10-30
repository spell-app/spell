import type { E } from "spell/ui/core"

/**
 * `<ui-hue-swatches>` in Spanish:  `<es-muestras-tono>`, with the names and texts only it uses
 * (from `UIHueSwatches.en.ts`).
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const hueSwatchesEs = {
  lang: "es",
  tag: "ui-hue-swatches",
  name: "muestras-tono",
  aka: ["muestras de color", "selector de color", "color de acento", "tinte"],
  attributes: { hues: "tonos", "none-label": "etiqueta-ninguno", "none-colors": "colores-ninguno", wrap: "ajustar" },
  parts: { swatches: "muestras", swatch: "muestra" },
  texts: {
    label: "Color",
    none: "Ninguno",
    red: "Rojo",
    orange: "Naranja",
    yellow: "Amarillo",
    olive: "Oliva",
    green: "Verde",
    teal: "Verde azulado",
    blue: "Azul",
    violet: "Violeta",
    purple: "Morado",
    pink: "Rosa",
    brown: "Marrón",
    grey: "Gris",
    black: "Negro"
  }
} as const satisfies E.TagDictionary
