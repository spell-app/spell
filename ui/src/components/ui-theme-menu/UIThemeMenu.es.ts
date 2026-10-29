import type { E } from "spell/ui/core"

/**
 * `<ui-theme-menu>` in Spanish:  `<es-menu-temas>`, with the names and texts only it uses (from `UIThemeMenu.en.ts`).
 * - The names it shares with other tags (`size`, `inverted`, `compact`, `ui-changed` ...) are translated once,
 *   for every tag:  in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 * - The themes' own names (Spell, Glass, Fruity, Merlot, Paper, Midnight, Crisp, Pop, Matrix) stay as they are:  they're names.
 */
export const themeMenuEs = {
  lang: "es",
  tag: "ui-theme-menu",
  name: "menu-temas",
  aka: ["selector de tema", "cambiar tema", "modo oscuro", "esquema de color", "apariencia", "aspecto"],
  attributes: { show: "mostrar" },
  values: { show: { both: "ambos", theme: "tema", scheme: "esquema", menu: "menu" } },
  parts: {
    controls: "controles",
    scheme: "esquema",
    palette: "paleta",
    overlay: "superpuesto",
    menu: "menu",
    option: "opcion",
    schemes: "esquemas",
    "scheme-option": "opcion-esquema",
    tip: "consejo",
    theme: "tema"
  },
  texts: {
    themeLabel: "Tema {title}",
    themeName: "Tema",
    spellDescription: "La marca Spell",
    glassDescription: "Cristal translúcido sobre una página lisa",
    fruityDescription: "Cristal sobre un fondo pastel",
    merlotDescription: "Un estudio color vino",
    paperDescription: "Cálido y de libro, para leer",
    midnightDescription: "Oscuro ante todo, sereno y luminoso",
    crispDescription: "Alto contraste, para quien lo necesite",
    popDescription: "Alegre y colorido",
    matrixDescription: "Una consola de operaciones oscura",
    toDark: "Pasar a oscuro",
    toLight: "Pasar a claro",
    palette: "Tema y claro / oscuro:  {title}, {scheme}",
    overlayName: "Tema y esquema de color",
    schemeName: "Claro u oscuro",
    light: "Claro",
    dark: "Oscuro",
    auto: "Auto",
    bench: "Banco de temas",
    benchTip: "Abrir el banco de temas en una ventana nueva, con este tema"
  }
} as const satisfies E.TagDictionary
