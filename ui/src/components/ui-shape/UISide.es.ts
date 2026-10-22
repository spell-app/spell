import type { E } from "spell-ui/core"

/**
 * `<ui-side>` in Spanish:  `<es-cara>`, with the names and texts only it uses (from `UISide.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const sideEs = {
  lang: "es",
  tag: "ui-side",
  name: "cara",
  aka: ["cara", "lado", "cara de la forma"],
  parts: { side: "cara" }
} as const satisfies E.TagDictionary
