import type { Dictionary } from "$/vocabulary"

/**
 * A small Spanish dictionary for the translation-hook demo and test:  `<ie-boton primario color="rojo">`,
 * `<ie-desplegable seleccion marcador="...">` with `<ie-elemento>`s, firing `ie-cambio`.
 * - Keys are canonical;  values are what Spanish markup writes.  Attribute NAMES stay ASCII (`tamano`).
 */
export const spanish: Dictionary = {
  lang: "es",
  tags: { "ui-button": "boton", "ui-dropdown": "desplegable", "ui-item": "elemento" },
  attributes: {
    primary: "primario",
    secondary: "secundario",
    basic: "basico",
    size: "tamano",
    disabled: "desactivado",
    selection: "seleccion",
    search: "busqueda",
    placeholder: "marcador",
    value: "valor",
    text: "texto",
    clearable: "borrable"
  },
  values: {
    hues: { red: "rojo", blue: "azul", green: "verde" },
    sizes: { small: "pequeno", large: "grande" },
    booleans: { yes: "si" }
  },
  events: { "ui-change": "cambio", "ui-toggle": "alternar", "ui-open": "abrir", "ui-close": "cerrar" },
  slots: { icon: "icono" },
  parts: { button: "boton", trigger: "disparador" }
}
