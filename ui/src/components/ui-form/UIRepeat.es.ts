import type { E } from "spell-ui/core"

/**
 * `<ui-repeat>` in Spanish:  `<es-repetir>`, with the names and texts only it uses (from `UIRepeat.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const repeatEs = {
  lang: "es",
  tag: "ui-repeat",
  name: "repetir",
  aka: ["repetidor", "repetir", "lista de campos", "editor de lista", "para cada"]
} as const satisfies E.TagDictionary
