import type { E } from "spell-ui/core"

/**
 * `<ui-sticky>` in Spanish:  `<es-pegado>`, with the names and texts only it uses (from `UISticky.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const stickyEs = {
  lang: "es",
  tag: "ui-sticky",
  name: "pegado",
  aka: ["fijo", "adherido", "encabezado fijo", "anclado"],
  attributes: { "bottom-offset": "desplazamiento-inferior", pushing: "empujando" },
  events: { "ui-stick": "fijar", "ui-unstick": "soltar" },
  parts: { sticky: "pegado" }
} as const satisfies E.TagDictionary
