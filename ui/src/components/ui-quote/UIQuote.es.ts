import type { E } from "spell/ui/core"

/**
 * `<ui-quote>` in Spanish:  `<es-cita>`, with the names and texts only it uses (from `UIQuote.en.ts`).
 * - The names it shares with other tags are translated once, for every tag:  in `components.es.ts`.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const quoteEs = {
  lang: "es",
  tag: "ui-quote",
  name: "cita",
  aka: ["cita", "citación", "cita en bloque"],
  attributes: { inline: "en-linea", cite: "fuente" }
} as const satisfies E.TagDictionary
