import type { E } from "spell-ui/core"

/**
 * `<ui-header>` in Spanish:  `<es-encabezado>`, its own names and texts (`UIHeader.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const headerEs = {
  lang: "es",
  tag: "ui-header",
  name: "encabezado",
  aka: ["encabezado", "título", "cabecera", "titular"],
  attributes: { sub: "sub" }
} as const satisfies E.TagDictionary
