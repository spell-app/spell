import type { E } from "spell-ui/core"

/**
 * `<ui-panel>` in Spanish:  `<es-panel>`, with the names and texts only it uses (from `UIPanel.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const panelEs = {
  lang: "es",
  tag: "ui-panel",
  name: "panel",
  aka: ["panel", "sección", "inspector", "panel de propiedades", "panel de ajustes"],
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
