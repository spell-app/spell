import type { E } from "spell/ui/core"

/**
 * `<ui-sides>` in Spanish:  `<es-lados>`, with the names and texts only it uses (from `UISides.en.ts`).
 * - The names it shares with other tags (`size`, `value`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const sidesEs = {
  lang: "es",
  tag: "ui-sides",
  name: "lados",
  aka: ["margen", "relleno", "espaciado", "lados"],
  attributes: { sides: "lados" },
  parts: { sides: "lados", side: "lado", letter: "letra" },
  texts: {
    top: "Arriba",
    left: "Izquierda",
    right: "Derecha",
    bottom: "Abajo",
    topLetter: "Ar",
    leftLetter: "Iz",
    rightLetter: "De",
    bottomLetter: "Ab"
  }
} as const satisfies E.TagDictionary
