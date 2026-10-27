import type { E } from "spell/ui/core"

/**
 * `<ui-markdown>` in Spanish:  `<es-markdown>`, with the names and texts only it uses (from `UIMarkdown.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const markdownEs = {
  lang: "es",
  tag: "ui-markdown",
  name: "markdown",
  aka: ["markdown", "texto enriquecido", "léame", "texto con formato"],
  attributes: {
    breaks: "saltos",
    "heading-offset": "desfase-titulos",
    "skip-title": "omitir-titulo",
    editable: "editable",
    sanitized: "saneado"
  },
  events: { "ui-drawn": "dibujado" },
  parts: { body: "cuerpo" },
  texts: {
    sourceLoading: "Cargando {source}",
    sourceLoadError: "No se pudo cargar {source}.",
    sourceCrossOrigin: "No se puede mostrar {source}:  solo se pueden mostrar archivos de este sitio.",
    sourceFileProtocol:
      "No se puede cargar {source}:  esta página se abrió desde el disco.  Ábrela desde un servidor web para verla.",
    sourceRenderError: "No se pudo mostrar {source}.",
    write: "Escribir",
    preview: "Vista previa",
    editor: "Markdown"
  }
} as const satisfies E.TagDictionary
