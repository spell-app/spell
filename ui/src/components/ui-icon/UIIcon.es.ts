import type { E } from "spell-ui/core"

/**
 * `<ui-icon>` in Spanish:  `<es-icono>`, its own names and texts (`UIIcon.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const iconEs = {
  lang: "es",
  tag: "ui-icon",
  name: "icono",
  aka: ["icono", "ícono", "símbolo", "glifo", "icono svg"],
  attributes: { outline: "contorno", flipped: "volteado", rotated: "girado" }
} as const satisfies E.TagDictionary
