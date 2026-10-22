import type { E } from "spell-ui/core"

/**
 * `<ui-flyout>` in Spanish:  `<es-panel-flotante>`, with the names and texts only it uses (from `UIFlyout.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const flyoutEs = {
  lang: "es",
  tag: "ui-flyout",
  name: "panel-flotante",
  aka: ["panel lateral", "cajón", "panel deslizante", "hoja lateral"],
  values: { closedby: { none: "none" } },
  parts: { flyout: "panel-flotante" },
  texts: { close: "Cerrar" }
} as const satisfies E.TagDictionary
