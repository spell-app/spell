import type { E } from "spell-ui/core"

/**
 * `<ui-or>` in Spanish:  `<es-o>`, its own names and texts (`UIOr.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const orEs = {
  lang: "es",
  tag: "ui-or",
  name: "o",
  aka: ["o", "separador de botones", "divisor"],
  parts: { or: "o" },
  texts: { or: "o" }
} as const satisfies E.TagDictionary
