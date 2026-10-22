import type { E } from "spell-ui/core"

/**
 * `<ui-placeholder>` in Spanish:  `<es-esqueleto>`, with the names and texts only it uses (from `UIPlaceholder.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const placeholderEs = {
  lang: "es",
  tag: "ui-placeholder",
  name: "esqueleto",
  aka: ["marcador de posición", "esqueleto", "skeleton", "carga de contenido", "brillo"]
} as const satisfies E.TagDictionary
