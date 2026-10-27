import type { E } from "spell/ui/core"

/**
 * `<ui-placeholder-header>` in Spanish:
 * `<es-esqueleto-encabezado>`, with the names and texts only it uses (from `UIPlaceholderHeader.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const placeholderHeaderEs = {
  lang: "es",
  tag: "ui-placeholder-header",
  name: "esqueleto-encabezado",
  aka: ["encabezado", "encabezado esqueleto", "título de carga"]
} as const satisfies E.TagDictionary
