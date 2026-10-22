import type { E } from "spell-ui/core"

/**
 * `<ui-divider>` in Spanish:  `<es-divisor>`, its own names and texts (`UIDivider.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const dividerEs = {
  lang: "es",
  tag: "ui-divider",
  name: "divisor",
  aka: ["divisor", "separador", "línea horizontal", "regla", "línea"],
  attributes: { spacer: "espaciador", section: "seccion" }
} as const satisfies E.TagDictionary
