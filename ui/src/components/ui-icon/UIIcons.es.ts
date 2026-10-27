import type { E } from "spell-ui/core"

/**
 * `<ui-icons>` in Spanish:  `<es-iconos>`, with the names and texts only it uses (from `UIIcons.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const iconsEs = {
  lang: "es",
  tag: "ui-icons",
  name: "iconos",
  aka: ["iconos", "grupo de iconos", "iconos apilados", "pila de iconos"],
  parts: { icons: "iconos" }
} as const satisfies E.TagDictionary
