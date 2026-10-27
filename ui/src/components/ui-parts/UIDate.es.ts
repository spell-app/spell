import type { E } from "spell/ui/core"

/**
 * `<ui-date>` in Spanish:  `<es-fecha>`, with the names and texts only it uses (from `UIDate.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const dateEs = {
  lang: "es",
  tag: "ui-date",
  name: "fecha",
  aka: ["fecha", "marca de tiempo", "hace tiempo", "fecha de publicación"],
  attributes: { datetime: "fecha-hora" },
  parts: { date: "fecha" }
} as const satisfies E.TagDictionary
