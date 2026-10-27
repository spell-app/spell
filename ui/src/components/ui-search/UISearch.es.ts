import type { E } from "spell/ui/core"

/**
 * `<ui-search>` in Spanish:  `<es-busqueda>`, with the names and texts only it uses (from `UISearch.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const searchEs = {
  lang: "es",
  tag: "ui-search",
  name: "busqueda",
  aka: ["búsqueda", "buscador", "autocompletar", "cuadro de búsqueda", "buscar"],
  attributes: {
    category: "categoria",
    "max-results": "max-resultados",
    "search-delay": "retraso-busqueda",
    "full-text-search": "busqueda-texto",
    "search-fields": "campos-busqueda",
    "ignore-diacritics": "ignorar-acentos",
    "highlight-matches": "resaltar-coincidencias",
    "select-first-result": "seleccionar-primero",
    "show-no-results": "mostrar-sin-resultados"
  },
  events: { "ui-replied": "respondido" },
  parts: { prompt: "indicacion", results: "resultados", result: "resultado", category: "categoria", name: "nombre" },
  texts: {
    searchLabel: "Buscar",
    searchNoResultsHeader: "Sin resultados",
    searchNoResults: "La búsqueda no devolvió resultados",
    searchServerError: "Hubo un problema al consultar el servidor.",
    searchOneResult: "1 resultado disponible.",
    searchResultCount: "{count} resultados disponibles."
  }
} as const satisfies E.TagDictionary
