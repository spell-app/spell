import type { E } from "spell-ui/core"

/**
 * `<ui-theme-token>` in Spanish:  `<es-variable-tema>`, with the names and texts only it uses (from
 * `UIThemeToken.en.ts`).
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const themeTokenEs = {
  lang: "es",
  tag: "ui-theme-token",
  name: "variable-tema",
  aka: ["variable de tema", "variable de diseño", "propiedad css"],
  attributes: { row: "fila" },
  events: { "ui-command": "orden" },
  parts: { row: "fila", drawer: "cajon" },
  texts: {
    setHere: "Fijar aquí",
    setHereTip: "Fíjala en este tema, tal como está",
    split: "Separar en claro / oscuro",
    edit: "Editar {token}",
    light: "Claro",
    dark: "Oscuro",
    base: "Base",
    mixIn: "Mezclado",
    amount: "Cantidad",
    pointsAt: "Apunta a",
    pointsAtTip: "Su valor es el de esa variable:  cambia esa, o fija esta aquí",
    value: "Valor",
    alpha: "Opacidad",
    readBy: "La leen",
    clear: "transparente"
  }
} as const satisfies E.TagDictionary
