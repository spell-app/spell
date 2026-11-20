/**
 * The English vocabulary of `<ui-mermaid-diagram>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - The source pieces (`source`, `load`, `ui-loaded` ... `ui-error`, the loader and error parts, the states and texts)
 *   are shared with `<ui-include>`, `<ui-code>` and `<ui-markdown>`:  `UIT.Source*`, which `LoadableComponent` reads.
 * - The theme, look, scheme and layout names are `MermaidThemes`' (the kit's `spell/util/diagram`), which the README tool reads too.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"
import { MermaidLayouts, MermaidLooks, MermaidSchemes, MermaidThemeNames } from "spell/util/diagram/MermaidThemes"

/****************
 * ### `mermaidDiagramVocabulary`
 * The names of `<ui-mermaid-diagram>`, a diagram drawn from Mermaid text:  the element's own text or a `source` file,
 * drawn as an SVG in Spell UI's colours, or one of Mermaid's.
 ****************/
export const mermaidDiagramVocabulary = {
  tag: "ui-mermaid-diagram",
  icon: "project diagram",
  topics: ["data display", "images", "views"],
  aka: [
    "mermaid",
    "diagram",
    "flowchart",
    "chart",
    "sequence diagram",
    "gantt chart",
    "mind map",
    "timeline",
    "diagram as code",
    "text to diagram"
  ],
  skeleton: "14 tall",
  noun: "diagram",
  partOfSpeech: "thing",
  description:
    "A Mermaid diagram draws a flowchart, a sequence, a timeline or any other kind of diagram Mermaid knows, " +
    "from the element's own text or a file on this site.",
  attributes: [
    ...UIT.SourceAttributes,
    {
      name: "theme",
      group: "appearance",
      kind: "enum",
      values: MermaidThemeNames,
      default: "spell",
      description:
        "The colours.  `spell`, the default:  Spell UI's own, read from the page, light or dark.  Mermaid's:  " +
        "`default` (soft blue and grey), `neutral` (greys, for print), `dark`, `forest` (greens), `neo` and " +
        "`neo-dark` (flat, soft shadows), `redux` and `redux-dark` (black outlines, no fill), `redux-color` and " +
        "`redux-dark-color` (outlines with bold colours).  On a dark page a light one draws as its dark twin " +
        "(`default` as `dark`, `neo` as `neo-dark`, `redux` as `redux-dark`, `redux-color` as " +
        "`redux-dark-color`).  A theme set in the diagram's own text wins."
    },
    {
      name: "scheme",
      group: "appearance",
      kind: "enum",
      values: MermaidSchemes,
      default: "auto",
      description:
        "Light or dark for this drawing alone:  `auto` follows the page;  `light` and `dark` hold it there, " +
        "whatever the page does."
    },
    {
      name: "look",
      group: "appearance",
      kind: "enum",
      values: MermaidLooks,
      default: "classic",
      description:
        "The drawing style:  plain lines (`classic`), sketched by hand (`hand-drawn`), or flatter and softer (`neo`)."
    },
    {
      name: "layout",
      group: "layout",
      kind: "enum",
      values: MermaidLayouts,
      default: "auto",
      description:
        "How the boxes are placed:  `auto` lets Mermaid pick for each kind of diagram (ELK for flowcharts, state, " +
        "class and ER diagrams);  any other asks for that engine, where Mermaid has it for the kind."
    },
    {
      name: "seed",
      group: "appearance",
      kind: "number",
      default: 1,
      description:
        "For `hand-drawn`:  the same seed draws the same wobbles every time, so it doesn't wobble as it redraws."
    },
    {
      name: "controls",
      group: "behaviour",
      kind: "boolean",
      description:
        "A small menu button in the drawing's corner, shown on hover or keyboard focus, so a reader can change " +
        "its colours and light or dark.  Their pick is remembered (`remember`)."
    },
    {
      name: "remember",
      group: "behaviour",
      kind: "string",
      description:
        "The name a reader's picks from the menu are kept under, across reloads and visits.  None:  a name made " +
        "from the page and the drawing's `id`, else its `source`, else its place on the page."
    },
    {
      name: "label",
      group: "name",
      kind: "string",
      description:
        "What a screen reader says for the drawing.  None:  the title in the diagram's own text (`accTitle`, or a " +
        '`title`), else its kind ("Flowchart").'
    }
  ],
  events: [
    ...UIT.SourceEvents,
    {
      name: "ui-drawn",
      detail: "{ diagramType: string }",
      description: "Drawn;  `diagramType` is what Mermaid read the text as (`flowchart-v2`, `sequence` ...)."
    }
  ],
  slots: [],
  parts: [
    ...UIT.SourceParts,
    { name: "drawing", description: "The box holding the drawn `<svg>`." },
    { name: "controls", description: "The menu (`<ui-dropdown>`) in the corner, with `controls`." }
  ],
  states: [
    ...UIT.SourceStates,
    { name: "drawing", description: "A drawing is on its way:  the last one stays until it comes." },
    { name: "dark", description: "It's drawn dark:  its `scheme`, the reader's pick, or the page's." }
  ],
  texts: [
    ...UIT.SourceTexts,
    { key: "mermaidCantDraw", text: "This diagram couldn't be drawn.", description: "First line of the error." },
    {
      key: "mermaidStoppedAt",
      text: "Its text has a mistake on line {line}.",
      description: "Second line of the error:  the line of the text where it went wrong."
    },
    {
      key: "mermaidExpected",
      text: "Something like {expected} may be missing there.",
      description: "Third line of the error:  what Mermaid would have taken there, the choices joined by `mermaidOr`."
    },
    {
      key: "mermaidUnknownKind",
      text: "Start the text with the kind of diagram, on a line of its own:  for example, flowchart TD for boxes and arrows.",
      description: "The error when Mermaid can't tell what kind of diagram the text is."
    },
    { key: "mermaidOr", text: "or", description: "Joins the choices in `mermaidExpected`." },
    {
      key: "mermaidFixIt",
      text: "Fix that line, and the diagram comes back.",
      description: "Last line of the error, after the line it went wrong on."
    },
    { key: "mermaidLabel", text: "{kind} diagram", description: "Accessible name, from the diagram's kind." },
    { key: "mermaidMenu", text: "Diagram colours", description: "The menu button's name and tooltip." },
    { key: "mermaidColors", text: "Colour theme", description: "The menu's heading over the themes." },
    { key: "mermaidSpellTheme", text: "Spell (this site's colours)", description: "The `spell` theme in the menu." },
    { key: "mermaidLightOrDark", text: "Light or dark", description: "The menu's heading over the schemes." },
    { key: "mermaidAuto", text: "Like the page", description: "The `auto` scheme in the menu." },
    { key: "mermaidLight", text: "Light", description: "The `light` scheme in the menu." },
    { key: "mermaidDark", text: "Dark", description: "The `dark` scheme in the menu." },
    { key: "mermaidPutBack", text: "Put back", description: "The menu's last item:  forget the reader's picks." }
  ]
} as const satisfies E.ComponentVocabulary
