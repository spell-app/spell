import type { E } from "spell/ui/core"

/**
 * `<ui-components>` in Spanish:  `<es-componentes>`, with the names and texts only it uses (from `UIComponents.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const componentsEs = {
  lang: "es",
  tag: "ui-components",
  name: "componentes",
  aka: ["componentes", "paquete de componentes", "complemento", "extensión", "componentes web"]
} as const satisfies E.TagDictionary
