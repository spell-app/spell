/**
 * A small Spanish dictionary for the translation mechanism's test:
 * `<ie-boton primario color="rojo">`, `<ie-desplegable seleccion marcador="Género">` dispatching `ie-cambio`.
 * - Keys are canonical English;  values are what a Spanish author writes (see `Dictionary`).
 * - NOT Spell UI's Spanish (`spell-ui/components/components.es`, `<es-boton>`):  a few names, under `ie-`,
 *   so a test of `define(tag, dictionary)` never meets the page's language.
 */

import type { Dictionary } from "spell-ui/vocabulary"

/** Spanish names for the button and dropdown. */
export const es = {
  lang: "es",
  tags: { "ui-button": "boton", "ui-dropdown": "desplegable" },
  attributes: {
    primary: "primario",
    size: "tamano",
    placeholder: "marcador",
    selection: "seleccion",
    search: "busqueda",
    toggle: "alternable"
  },
  values: { hues: { red: "rojo", blue: "azul", green: "verde" }, sizes: { small: "pequeno", large: "grande" } },
  events: { "ui-change": "cambio", "ui-toggle": "alternar" }
} as const satisfies Dictionary
