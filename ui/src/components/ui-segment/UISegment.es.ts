import type { E } from "spell-ui/core"

/**
 * `<ui-segment>` in Spanish:  `<es-segmento>`, its own names and texts (`UISegment.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const segmentEs = {
  lang: "es",
  tag: "ui-segment",
  name: "segmento",
  aka: ["segmento", "panel", "caja", "sección", "recuadro"],
  parts: { segment: "segmento" },
  texts: { loading: "Cargando…" }
} as const satisfies E.TagDictionary
