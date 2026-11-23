import type { E } from "spell/ui/core"

/**
 * `<ui-tree>` in Spanish:  `<es-arbol>`, with the names and texts only it uses (from the Spanish epic's rule).
 * - The names it shares with other tags (`label`, `ui-changed` ...) are translated once, for every tag,
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter.
 */
export const treeEs = {
  lang: "es",
  tag: "ui-tree",
  name: "arbol",
  aka: ["vista de arbol", "esquema", "jerarquia", "arbol de archivos"],
  attributes: {
    filter: "filtro",
    "sticky-path": "ruta-fija",
    "column-titles": "titulos-de-columnas",
    path: "ruta",
    show: "mostrar",
    "narrow-before": "estrechar-antes",
    "column-min-width": "ancho-minimo-de-columna",
    "column-max-width": "ancho-maximo-de-columna",
    "sticky-detail": "detalle-fijo",
    tools: "herramientas"
  },
  values: { appearance: { nav: "navegacion", columns: "columnas" } },
  events: { "ui-selecting": "ui-seleccionando", "ui-settled": "ui-asentado" },
  slots: { empty: "vacio", detail: "detalle", tools: "herramientas" },
  parts: {
    empty: "vacio",
    path: "ruta",
    "path-row": "fila-de-ruta",
    column: "columna",
    "column-row": "fila-de-columna",
    "narrow-column": "columna-estrecha",
    "column-title": "titulo-de-columna",
    tools: "herramientas",
    tool: "herramienta",
    "matches-title": "titulo-de-coincidencias",
    match: "coincidencia"
  },
  texts: {
    noMatches: "Nada coincide",
    resizeColumn: "Cambiar el ancho de esta columna",
    resizeDetail: "Cambiar el ancho del panel de detalle",
    loading: "Cargando",
    openLevels: "Abrir {levels} niveles",
    closeAll: "Cerrar todo",
    elsewhere: "En otras partes del árbol",
    matchIn: "{label}, en {path}",
    lookingElsewhere: "Buscando en el árbol",
    moreMatches: "{count} más, sin listar",
    stoppedLooking: "Dejó de buscar tras {count} filas"
  },
  hooks: { rowClass: "dar la clase de fila de (un elemento)" }
} as const satisfies E.TagDictionary
