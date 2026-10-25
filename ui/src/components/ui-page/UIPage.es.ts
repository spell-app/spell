import type { E } from "spell-ui/core"
import { rootEs } from "spell-ui/components/ui-root/UIRoot.es"

/**
 * `<ui-page>` in Spanish:  `<es-pagina>`, with the names and texts only it uses (from `UIPage.en.ts`),
 * and a root's (`<es-raiz>`'s), since a page is one.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const pageEs = {
  lang: "es",
  tag: "ui-page",
  name: "pagina",
  aka: ["página", "marco de página", "estructura de página", "cuerpo"],
  attributes: rootEs.attributes,
  events: rootEs.events,
  slots: { header: "cabecera", nav: "navegacion", aside: "lateral", footer: "pie" },
  parts: {
    ...rootEs.parts,
    page: "pagina",
    skip: "saltar",
    header: "cabecera",
    nav: "navegacion",
    main: "principal",
    aside: "lateral",
    footer: "pie"
  },
  texts: { ...rootEs.texts, skip: "Saltar al contenido" }
} as const satisfies E.TagDictionary
