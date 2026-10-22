import type { E } from "spell-ui/core"

/**
 * `<ui-divider>` in Spanish:  `<es-divisor>`, with the names and texts only it uses (from `UIDivider.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const dividerEs = {
  lang: "es",
  tag: "ui-divider",
  name: "divisor",
  aka: ["divisor", "separador", "línea horizontal", "regla", "línea"],
  attributes: { spacer: "espaciador", section: "seccion" }
} as const satisfies E.TagDictionary
