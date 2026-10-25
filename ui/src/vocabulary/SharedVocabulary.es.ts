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
    tooltip: "ayuda",
    label: "etiqueta"
  }
} as const satisfies SharedDictionary
