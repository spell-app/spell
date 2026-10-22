import type { E } from "spell-ui/core"

/**
 * `<ui-property-group>` in Spanish:  `<es-grupo-propiedades>`, its own names and texts (`UIPropertyGroup.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const propertyGroupEs = {
  lang: "es",
  tag: "ui-property-group",
  name: "grupo-propiedades",
  aka: ["sección", "grupo de propiedades", "grupo de ajustes", "sección del inspector"],
  texts: { loading: "Cargando…", fold: "Plegar", unfold: "Desplegar" }
} as const satisfies E.TagDictionary
