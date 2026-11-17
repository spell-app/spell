import type { E } from "spell/ui/core"

/**
 * `<ui-device>` in Spanish:  `<es-dispositivo>`, with the names and texts only it uses (from `UIDevice.en.ts`).
 * - The names it shares with other tags (`closedby`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`.
 * - Names stay ASCII (no accents);  values and texts keep theirs.
 */
export const deviceEs = {
  lang: "es",
  tag: "ui-device",
  name: "dispositivo",
  aka: ["marco de dispositivo", "marco de teléfono", "maqueta", "vista previa de pantalla", "simulador"],
  attributes: { device: "aparato", orientation: "orientacion", controls: "controles", modal: "modal" },
  values: {
    device: { phone: "teléfono", tablet: "tableta", desktop: "escritorio" },
    orientation: { portrait: "vertical", landscape: "horizontal" },
    controls: { all: "todos", rotate: "girar", device: "aparato", none: "ninguno" }
  },
  slots: { buttons: "botones" },
  parts: { device: "dispositivo", screen: "pantalla", buttons: "botones", rotate: "girar", switch: "selector" },
  texts: { rotate: "Girar", switch: "Dispositivo", phone: "Teléfono", tablet: "Tableta", desktop: "Escritorio" }
} as const satisfies E.TagDictionary
