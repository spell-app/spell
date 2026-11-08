/**
 * The English vocabulary of `<ui-diagram>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, parts and texts.
 *   The shape is `ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Ours, not Fomantic's:  the NERD skill's drawing (epic `mockup` P10), for any boxes-and-lines picture.
 * - One rich property, `spec` (a `DiagramSpec`, `UIDiagram.types.ts`);
 *   a static page gives it as a `<ui-json>` or `<script type="application/json">` child instead.
 */

import type { ComponentVocabulary } from "spell/ui/vocabulary"

/****************
 * ### `diagramVocabulary`
 * The names of `<ui-diagram>`, boxes and the links between them drawn as an SVG:
 * `<svg class="ui diagram" part="diagram" role="img" aria-label>`.
 ****************/
export const diagramVocabulary = {
  tag: "ui-diagram",
  icon: "sitemap",
  topics: ["data display", "images", "views"],
  aka: [
    "graph",
    "node graph",
    "network diagram",
    "boxes and lines",
    "entity relationship diagram",
    "ERD",
    "NERD",
    "data model",
    "flowchart",
    "concept map"
  ],
  skeleton: "14 tall",
  noun: "diagram",
  description:
    "A diagram draws boxes in columns and the links between them, solid for what a box contains and dashed for " +
    "what it refers to.  Drag a box to move it.",
  attributes: [
    {
      name: "spec",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "What to draw, a `DiagramSpec`:  `columns` of `groups` (each a `label`, a `color`, and `nodes` or side-by-side " +
        '`lanes`), and `edges`, each `{ from: "Box.field", to: "Other", kind: "contains" | "ref" }`.  ' +
        "Or a flat `{ nodes, edges }`, put in columns for you.  A JS property (JSON in the attribute);  wins over a " +
        '`<ui-json>` or `<script type="application/json">` child.  Set a NEW spec to redraw.'
    },
    {
      name: "columns",
      group: "layout",
      kind: "number",
      default: 3,
      description:
        "A flat spec's most columns:  what would go further stacks in the last.  A spec with `columns` says its own."
    },
    {
      name: "remember",
      group: "behaviour",
      kind: "string",
      description:
        "Keep where each person dragged the boxes, under this name, across reloads and visits.  None:  only while the page is open."
    },
    {
      name: "fixed",
      group: "behaviour",
      kind: "boolean",
      description: "Its boxes can't be dragged."
    },
    {
      name: "downloadable",
      group: "behaviour",
      kind: "boolean",
      description: "A button saves it as an SVG file, the same file the NERD skill's script writes."
    }
  ],
  events: [
    {
      name: "ui-node-clicked",
      detail: "{ name: string, originalEvent: Event }",
      description: "A box was clicked (not dragged):  `name` is the box's name."
    },
    {
      name: "ui-node-moved",
      detail: "{ name: string, dx: number, dy: number }",
      description:
        "A box was dragged and let go:  `dx`, `dy` is how far it now is from where the layout put it, in user units."
    }
  ],
  slots: [
    {
      name: "",
      description:
        "`<ui-diagram-node name>`s:  what each holds shows in that box instead of its texts (a `<ui-shape>` that flips), " +
        "the box sized to it."
    }
  ],
  parts: [
    { name: "diagram", description: "The `<svg>`." },
    { name: "toolbar", description: "The buttons over its top right corner:  Put back, Save as SVG." }
  ],
  states: [{ name: "moved", description: "A box has been dragged from where the layout put it." }],
  texts: [
    { key: "summary", text: "Diagram:  {boxes} boxes, {links} links", description: "Name of the drawing." },
    { key: "legend", text: "Legend", description: "The legend's label." },
    { key: "contains", text: "contains", description: "A solid line in the legend." },
    { key: "refersTo", text: "refers to", description: "A dashed line in the legend." },
    { key: "derived", text: "(derived)", description: "After a field that's worked out, not kept." },
    { key: "putBack", text: "Put back", description: "The button that puts every dragged box back." },
    { key: "saveSVG", text: "Save as SVG", description: "The button that saves it as an SVG file." }
  ]
} as const satisfies ComponentVocabulary
