import type { E } from "spell/ui/core"

/**
 * `<ui-zoom>` in Spanish:  `<es-ampliacion>` (epic `epic-engine` Q23), with the names and texts only it uses
 * (from `UIZoom.en.ts`).
 * - The names it shares with other tags (`open`, `caption`, `image` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const zoomEs = {
  lang: "es",
  tag: "ui-zoom",
  name: "ampliacion",
  aka: ["ampliación", "lupa", "tamaño completo", "visor de imágenes", "captura"],
  attributes: { "max-width": "ancho-max", "max-height": "alto-max", shrink: "reduccion" },
  parts: { view: "vista", base: "base" },
  texts: {
    show: "Ver a tamaño completo",
    zoomed: "{alt}, a tamaño completo",
    untitled: "Imagen a tamaño completo"
  }
} as const satisfies E.TagDictionary
