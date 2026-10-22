import type { E } from "spell-ui/core"

/**
 * `<ui-section>` in Spanish:  `<es-seccion>`, its own names and texts (`UISection.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const sectionEs = {
  lang: "es",
  tag: "ui-section",
  name: "seccion",
  aka: ["sección", "panel", "plegable", "desplegable", "conjunto de campos"],
  texts: {
    loading: "Cargando…",
    fold: "Plegar",
    unfold: "Desplegar",
    sourceLoadError: "No se pudo cargar {source}.",
    sourceCrossOrigin: "No se puede mostrar {source}:  solo se pueden mostrar archivos de este sitio.",
    sourceFileProtocol:
      "No se puede cargar {source}:  esta página se abrió desde el disco.  Ábrela desde un servidor web para verla.",
    sourceRenderError: "No se pudo mostrar {source}."
  }
} as const satisfies E.TagDictionary
