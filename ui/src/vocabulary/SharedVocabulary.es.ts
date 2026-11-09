import type { SharedDictionary } from "spell/element/vocabulary.types"

/**
 * Spanish names for the attributes every element shares (`SharedVocabulary`):  `<es-boton desactivado>`.
 * - Every Spanish dictionary gets them, so it needn't name them itself;
 *   one that does (`attributes: { disabled: "inactivo" }`) wins.
 * - The states stay English (`:state(disabled)`):  a CSS contract, never translated.
 */
export const sharedEs = {
  lang: "es",
  attributes: {
    disabled: "desactivado",
    loading: "cargando",
    visible: "visible",
    animation: "animacion",
    link: "enlace",
    target: "destino",
    font: "letra",
    shadow: "sombra",
    width: "ancho",
    "min-width": "ancho-min",
    "max-width": "ancho-max",
    tooltip: "ayuda",
    label: "etiqueta",
    movable: "movible",
    resizable: "redimensionable"
  },
  values: {
    // `<es-texto letra="negrita cursiva">`;  a size stays a number (`letra="14"`)
    font: {
      bold: "negrita",
      heavy: "extranegrita",
      italic: "cursiva",
      underline: "subrayado",
      strikethrough: "tachado",
      code: "código",
      highlight: "resaltado",
      subscript: "subíndice",
      superscript: "superíndice",
      "all-caps": "mayúsculas",
      "title-caps": "iniciales",
      headline: "titular",
      subhead: "subtítulo",
      serif: "serifa",
      "sans-serif": "sin-serifa",
      typewriter: "máquina"
    }
  }
} as const satisfies SharedDictionary
