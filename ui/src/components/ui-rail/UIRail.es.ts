import type { E } from "spell-ui/core"

/**
 * `<ui-rail>` in Spanish:  `<es-riel>`, with the names and texts only it uses (from `UIRail.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const railEs = {
  lang: "es",
  tag: "ui-rail",
  name: "riel",
  aka: ["carril", "carril lateral", "columna lateral", "margen"],
  attributes: { internal: "interno", close: "cercano" },
  parts: { rail: "riel" }
} as const satisfies E.TagDictionary
