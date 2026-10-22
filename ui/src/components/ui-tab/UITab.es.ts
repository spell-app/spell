import type { E } from "spell-ui/core"

/**
 * `<ui-tab>` in Spanish:  `<es-solapa>`, its own names and texts (`UITab.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const tabEs = {
  lang: "es",
  tag: "ui-tab",
  name: "solapa",
  aka: ["pestaña", "panel de pestaña", "panel"],
  attributes: { lazy: "diferido" }
} as const satisfies E.TagDictionary
