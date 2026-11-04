import type { E } from "spell/ui/core"

/**
 * `<ui-root>` in Spanish:  `<es-raiz>`, with the names and texts only it uses (from `UIRoot.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const rootEs = {
  lang: "es",
  tag: "ui-root",
  name: "raiz",
  aka: ["raíz", "raíz de la aplicación", "estructura de la aplicación", "proveedor de tema", "carga diferida"],
  attributes: {
    display: "visualizacion",
    timeout: "tiempo-limite",
    theme: "tema",
    app: "aplicacion",
    icons: "iconos",
    emoji: "emoji",
    assets: "recursos"
  },
  events: { "ui-ready": "listo" },
  parts: { loading: "cargando", skeleton: "esqueleto" },
  texts: { loading: "Cargando…", label: "Contenido" }
} as const satisfies E.TagDictionary
