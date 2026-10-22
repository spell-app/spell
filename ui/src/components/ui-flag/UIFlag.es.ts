import type { E } from "spell-ui/core"

/**
 * `<ui-flag>` in Spanish:  `<es-bandera>`, with the names and texts only it uses (from `UIFlag.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const flagEs = {
  lang: "es",
  tag: "ui-flag",
  name: "bandera",
  aka: ["bandera", "bandera de país", "país", "idioma"],
  attributes: { country: "pais" },
  parts: { flag: "bandera" },
  texts: {
    rainbow: "Bandera arcoíris",
    transgender: "Bandera transgénero",
    pirate: "Bandera pirata",
    gbEng: "Inglaterra",
    gbSct: "Escocia",
    gbWls: "Gales"
  }
} as const satisfies E.TagDictionary
