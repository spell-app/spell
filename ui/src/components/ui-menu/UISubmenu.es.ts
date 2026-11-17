import type { E } from "spell/ui/core"

/**
 * `<ui-submenu>` in Spanish:  `<es-submenu>`, with the names and texts only it uses (from `UISubmenu.en.ts`).
 * - The names it shares with other tags (`label`, `icon`, `disabled` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const submenuEs = {
  lang: "es",
  tag: "ui-submenu",
  name: "submenu",
  aka: ["submenú", "menú desplegable lateral", "menú en cascada", "menú anidado"],
  attributes: { menu: "menu", split: "dividido", "flyout-label": "etiqueta-panel" },
  parts: { chevron: "flecha", flyout: "panel-flotante" }
} as const satisfies E.TagDictionary
