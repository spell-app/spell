import type { E } from "spell-ui/core"

/**
 * `<ui-tabs>` in Spanish:  `<es-solapas>`, with the names and texts only it uses (from `UITabs.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const tabsEs = {
  lang: "es",
  tag: "ui-tabs",
  name: "solapas",
  aka: ["pestañas", "barra de pestañas", "panel con pestañas", "fichas"],
  attributes: { activation: "activacion", history: "historial" }
} as const satisfies E.TagDictionary
