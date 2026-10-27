import type { E } from "spell/ui/core"

/**
 * `<ui-placeholder-line>` in Spanish:
 * `<es-esqueleto-linea>`, with the names and texts only it uses (from `UIPlaceholderLine.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const placeholderLineEs = {
  lang: "es",
  tag: "ui-placeholder-line",
  name: "esqueleto-linea",
  aka: ["línea", "línea esqueleto"],
  attributes: { length: "longitud" },
  parts: { line: "linea" }
} as const satisfies E.TagDictionary
