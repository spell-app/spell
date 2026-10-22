import type { E } from "spell-ui/core"

/**
 * `<ui-title>` in Spanish:  `<es-titulo>`, with the names and texts only it uses (from `UITitle.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const titleEs = {
  lang: "es",
  tag: "ui-title",
  name: "titulo",
  aka: ["título", "título del acordeón", "resumen", "cabecera desplegable"]
} as const satisfies E.TagDictionary
