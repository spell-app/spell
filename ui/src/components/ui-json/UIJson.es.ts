import type { E } from "spell/ui/core"

/**
 * `<ui-json>` in Spanish:  `<es-json>`, with the names and texts only it uses (from `UIJson.en.ts`).
 * - JSON is JSON in every language.
 * - The names it shares with other tags (`source`, `load`, `editable`, `ui-navigating`, `header`, `row` ...) are
 *   translated once, for every tag:  in `components.es.ts`, with the values every tag shares.
 */
export const jsonEs = {
  lang: "es",
  tag: "ui-json",
  name: "json",
  aka: ["datos", "datos json", "isla de datos", "visor json", "árbol json", "inspector de objetos"],
  attributes: {
    depth: "profundidad",
    quotes: "comillas",
    "no-header": "sin-encabezado",
    editors: "editores"
  },
  parts: { viewer: "visor", toggle: "plegador", preview: "vista-previa" },
  texts: {
    sourceLoading: "Cargando {source}",
    sourceLoadError: "No se pudo cargar {source}.",
    sourceCrossOrigin: "No se puede mostrar {source}:  solo se pueden mostrar archivos de este sitio.",
    sourceFileProtocol:
      "No se puede cargar {source}:  esta página se abrió desde el disco.  Ábrela desde un servidor web para verla.",
    sourceRenderError: "No se pudo mostrar {source}.",
    jsonCopy: "Copiar JSON",
    jsonCopied: "Copiado",
    jsonQuotes: "Comillas en las claves",
    jsonQuotesOff: "Quitar las comillas de las claves",
    jsonQuotesOn: "Poner comillas en las claves",
    jsonEditKey: "Clave",
    jsonEditValue: "Valor",
    jsonOpen: "Abrir {key}",
    jsonClose: "Cerrar {key}",
    jsonAllInside: "Alt:  todo lo de dentro",
    jsonTop: "los datos",
    jsonEmpty: "Sin datos",
    jsonInvalid: "Esto no es JSON:  {message}"
  }
} as const satisfies E.TagDictionary
