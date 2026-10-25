import type { E } from "spell-ui/core"

/**
 * `<ui-card>` in Spanish:  `<es-tarjeta>`, with the names and texts only it uses (from `UICard.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const cardEs = {
  lang: "es",
  tag: "ui-card",
  name: "tarjeta",
  aka: ["tarjeta", "ficha", "panel", "tarjeta de perfil"],
  attributes: { dashed: "discontinuo", meta: "meta", extra: "extra" },
  parts: { card: "tarjeta" },
  texts: { loading: "Cargando…" }
} as const satisfies E.TagDictionary
