import type { E } from "spell-ui/core"

/**
 * `<ui-repeat>` in Spanish:  `<es-repetir>`, its own names and texts (`UIRepeat.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const repeatEs = {
  lang: "es",
  tag: "ui-repeat",
  name: "repetir",
  aka: ["repetidor", "repetir", "lista de campos", "editor de lista", "para cada"]
} as const satisfies E.TagDictionary
