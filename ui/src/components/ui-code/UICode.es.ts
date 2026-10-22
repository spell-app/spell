import type { E } from "spell-ui/core"

/**
 * `<ui-code>` in Spanish:  `<es-codigo>`, with the names and texts only it uses (from `UICode.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const codeEs = {
  lang: "es",
  tag: "ui-code",
  name: "codigo",
  aka: ["código", "bloque de código", "resaltado de sintaxis", "fragmento", "código fuente"],
  attributes: {
    language: "idioma",
    "line-numbers": "numeros-linea",
    start: "inicio",
    wrap: "ajustar-lineas",
    copy: "copiar"
  },
  events: { "ui-highlight": "resaltar", "ui-copy": "copiar" },
  parts: { pre: "pre", code: "codigo", copy: "copiar" },
  texts: {
    sourceLoading: "Cargando {source}",
    sourceLoadError: "No se pudo cargar {source}.",
    sourceCrossOrigin: "No se puede mostrar {source}:  solo se pueden mostrar archivos de este sitio.",
    sourceFileProtocol:
      "No se puede cargar {source}:  esta página se abrió desde el disco.  Ábrela desde un servidor web para verla.",
    sourceRenderError: "No se pudo mostrar {source}.",
    codeCopy: "Copiar",
    codeCopied: "Copiado",
    codeLabel: "Código {language}",
    codeLabelPlain: "Código"
  }
} as const satisfies E.TagDictionary
