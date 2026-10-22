import type { E } from "spell-ui/core"

/**
 * `<ui-loader>` in Spanish:  `<es-cargador>`, its own names and texts (`UILoader.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const loaderEs = {
  lang: "es",
  tag: "ui-loader",
  name: "cargador",
  aka: ["cargador", "indicador de carga", "spinner", "cargando", "indicador de actividad"],
  attributes: { double: "doble", elastic: "elastico" },
  texts: { loading: "Cargando…" }
} as const satisfies E.TagDictionary
