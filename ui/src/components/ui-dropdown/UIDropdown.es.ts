import type { E } from "spell/ui/core"

/**
 * `<ui-dropdown>` in Spanish:  `<es-desplegable>`, with the names and texts only it uses (from `UIDropdown.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const dropdownEs = {
  lang: "es",
  tag: "ui-dropdown",
  name: "desplegable",
  aka: ["desplegable", "lista desplegable", "selector", "autocompletar", "selección múltiple"],
  attributes: {
    search: "busqueda",
    button: "boton",
    columnar: "en-columnas",
    "allow-additions": "permitir-adiciones",
    "max-selections": "max-selecciones",
    "no-results-text": "texto-sin-resultados",
    "addition-text": "texto-adicion"
  },
  events: { "ui-added": "agregado" },
  slots: { trigger: "disparador", header: "encabezado" },
  parts: { clear: "borrar" },
  texts: {
    noResults: "No se encontraron resultados.",
    addItem: "Añadir {value}",
    clear: "Borrar",
    removeValue: "Quitar {value}"
  }
} as const satisfies E.TagDictionary
