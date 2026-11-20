/**
 * The Spell look for Mermaid, in ONE place:  Spell UI's `<ui-mermaid-diagram>` and the kit's README tool
 * (`yarn mermaid:pretty`) both read it, so their drawings can't drift apart.
 * - Here, in the kit's util, because the README tool is the kit's and imports point down (`spell/no-upward-import`).
 * - The theme names `<ui-mermaid-diagram theme>` takes, and the light preset each dark one twins.
 * - `SpellThemeTokens`:  which Spell UI token fills each of Mermaid's theme variables.
 *   The element reads them from the page, light or dark, so a theme edited in the theme editor reaches the drawing.
 * - `SpellThemeColors`:  the same variables as fixed colours, light and dark, for pictures drawn where there are no
 *   Spell UI tokens:  the READMEs, which GitHub draws.
 * - `SpellDiagramSettings`:  the spacing and curves both use, per kind of diagram.
 * - PURE DATA, importing nothing:  plain `node` loads it as is (the README tool, run with its types stripped),
 *   and the vocabularies read its names.
 */

////////////////
// ## Theme names
////////////////

/**
 * Every value of `theme`, Spell's first:
 * - `spell`, the default:  Mermaid's `base` theme, filled from Spell UI's tokens
 * - Mermaid's own presets, by their own names (`base` is what `spell` is built on, so it isn't offered by name)
 */
export const MermaidThemeNames = [
  "spell",
  "default",
  "neutral",
  "dark",
  "forest",
  "neo",
  "neo-dark",
  "redux",
  "redux-color",
  "redux-dark",
  "redux-dark-color"
] as const

/** One value of `theme`. */
export type MermaidThemeName = (typeof MermaidThemeNames)[number]

/** The theme drawn when none is given, or an unknown one is. */
export const DEFAULT_MERMAID_THEME: MermaidThemeName = "spell"

/**
 * Each light preset's dark twin:  on a dark page a light preset draws as its twin.
 * - A preset with no twin (`neutral`, `forest`), or a dark one named outright, draws the same either way.
 * - The list is the tag's own, so a preset Mermaid renames or adds is one line here.
 */
export const DarkTwins: Partial<Record<MermaidThemeName, MermaidThemeName>> = {
  default: "dark",
  neo: "neo-dark",
  redux: "redux-dark",
  "redux-color": "redux-dark-color"
}

////////////////
// ## Looks, schemes, layouts
////////////////

/** Every value of `look`:  plain lines, sketched by hand, or flatter and softer. */
export const MermaidLooks = ["classic", "hand-drawn", "neo"] as const

/** One value of `look`. */
export type MermaidLook = (typeof MermaidLooks)[number]

/** Each `look` as Mermaid spells it. */
export const MermaidLookNames: Record<MermaidLook, "classic" | "handDrawn" | "neo"> = {
  classic: "classic",
  "hand-drawn": "handDrawn",
  neo: "neo"
}

/** Every value of `scheme`:  follow the page, or hold the drawing light or dark. */
export const MermaidSchemes = ["auto", "light", "dark"] as const

/** One value of `scheme`. */
export type MermaidScheme = (typeof MermaidSchemes)[number]

/**
 * Every value of `layout`:  `auto` lets Mermaid pick per kind of diagram (ELK for flowcharts, state, class and ER),
 * the rest ask for that engine, where Mermaid has it for the kind.
 */
export const MermaidLayouts = ["auto", "elk", "dagre", "cose-bilkent", "swimlane"] as const

/** One value of `layout`. */
export type MermaidLayout = (typeof MermaidLayouts)[number]

////////////////
// ## The Spell look
////////////////

/** Light or dark:  which set of colours. */
export type SpellThemeScheme = "light" | "dark"

/**
 * The Spell UI token that fills each of Mermaid's theme variables (Mermaid's `base` theme).
 * - Read from the page by the element, as the scheme asks (`light-dark()` resolves to one side).
 * - Every colour variable `SpellThemeColors` sets, so a picture and a drawing are made of the same parts.
 */
export const SpellThemeTokens: Record<string, string> = {
  fontFamily: "--ui-font-family",
  background: "--ui-background",
  primaryColor: "--ui-primary-background",
  primaryBorderColor: "--ui-primary",
  primaryTextColor: "--ui-text-color",
  secondaryColor: "--ui-surface-strong",
  tertiaryColor: "--ui-surface-muted",
  lineColor: "--ui-primary-border",
  textColor: "--ui-text-color",
  clusterBkg: "--ui-surface-muted",
  clusterBorder: "--ui-primary-border",
  titleColor: "--ui-text-color",
  edgeLabelBackground: "--ui-surface-muted",
  actorBkg: "--ui-primary-background",
  actorBorder: "--ui-primary",
  actorTextColor: "--ui-text-color",
  actorLineColor: "--ui-primary-border",
  signalColor: "--ui-primary-text",
  signalTextColor: "--ui-text-color",
  labelBoxBkgColor: "--ui-primary-background",
  labelBoxBorderColor: "--ui-primary",
  labelTextColor: "--ui-text-color",
  loopTextColor: "--ui-text-color",
  noteBkgColor: "--ui-yellow-background",
  noteBorderColor: "--ui-yellow-border",
  noteTextColor: "--ui-text-color",
  activationBkgColor: "--ui-surface-strong",
  activationBorderColor: "--ui-primary",
  sequenceNumberColor: "--ui-primary-on"
}

/** Spell Purple, the brand's seed, and its ink:  the README pictures' colours. */
const PURPLE = "#6550CA"
const INK = "#1A1C27"

/** The system's sans-serif:  no quotes, so the README's directive stays plain JSON. */
const FONT = "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif"

/**
 * The Spell look as fixed colours, for pictures drawn with no Spell UI tokens around them (the READMEs, on GitHub).
 * - `light`, the default:  every text sits on a light box (nodes, edge labels, notes, subgraphs), and what sits on the
 *   page itself (lines, a sequence diagram's messages) is a mid-tone purple, so it reads on light and dark pages.
 * - `dark`:  for a page only ever shown dark.
 */
export const SpellThemeColors: Record<SpellThemeScheme, Record<string, string>> = {
  light: {
    fontFamily: FONT,
    fontSize: "15px",
    primaryColor: "#EFECFB",
    primaryBorderColor: PURPLE,
    primaryTextColor: INK,
    secondaryColor: "#F4F1E9",
    tertiaryColor: "#F7F6FC",
    lineColor: "#7F6FD6",
    textColor: "#7F6FD6",
    clusterBkg: "#F7F6FC",
    clusterBorder: "#B9B0E8",
    titleColor: INK,
    edgeLabelBackground: "#F7F6FC",
    actorBkg: "#EFECFB",
    actorBorder: PURPLE,
    actorTextColor: INK,
    actorLineColor: "#9C90DE",
    signalColor: "#7F6FD6",
    signalTextColor: "#7F6FD6",
    labelBoxBkgColor: "#EFECFB",
    labelBoxBorderColor: PURPLE,
    labelTextColor: INK,
    loopTextColor: "#7F6FD6",
    noteBkgColor: "#F1E7D4",
    noteBorderColor: "#C9B48A",
    noteTextColor: INK,
    activationBkgColor: "#DCD6F7",
    activationBorderColor: PURPLE,
    sequenceNumberColor: "#FFFFFF"
  },
  dark: {
    fontFamily: FONT,
    fontSize: "15px",
    darkMode: "true",
    background: "#16141F",
    primaryColor: "#2B2550",
    primaryBorderColor: "#9C8EF0",
    primaryTextColor: "#EEEBFA",
    secondaryColor: "#2E2A22",
    tertiaryColor: "#1F1C2E",
    lineColor: "#9C8EF0",
    textColor: "#D9D3F7",
    clusterBkg: "#1F1C2E",
    clusterBorder: "#5A4FA0",
    titleColor: "#EEEBFA",
    edgeLabelBackground: "#1F1C2E",
    actorBkg: "#2B2550",
    actorBorder: "#9C8EF0",
    actorTextColor: "#EEEBFA",
    actorLineColor: "#6F63C0",
    signalColor: "#9C8EF0",
    signalTextColor: "#D9D3F7",
    labelBoxBkgColor: "#2B2550",
    labelBoxBorderColor: "#9C8EF0",
    labelTextColor: "#EEEBFA",
    loopTextColor: "#D9D3F7",
    noteBkgColor: "#3A3326",
    noteBorderColor: "#8A7A58",
    noteTextColor: "#F1E7D4",
    activationBkgColor: "#3A3270",
    activationBorderColor: "#9C8EF0",
    sequenceNumberColor: "#16141F"
  }
}

/**
 * The spacing and curves of the Spell look, per kind of diagram (Mermaid's config sections):
 * rounded flowchart lines with room around the boxes, and sequence diagrams with their actors drawn once.
 */
export const SpellDiagramSettings: Record<string, Record<string, unknown>> = {
  flowchart: { curve: "basis", padding: 12, nodeSpacing: 40, rankSpacing: 44 },
  sequence: { mirrorActors: false, messageAlign: "left", noteAlign: "left" }
}
