/**
 * The English vocabulary of `<ui-stack>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values) and slots.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A plain layout box, with no look of its own (epic `ui-gaps` P8):  Web Awesome's stack and cluster in one tag,
 *   as the `.ui-stack` / `.ui-cluster` utilities are for plain HTML.
 * - No class words:  every attribute is property-only, drawn as the box's own layout.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `stackVocabulary`
 * The names of `<ui-stack>`, a box that lays its children out in a column or a row.
 ****************/
export const stackVocabulary = {
  tag: "ui-stack",
  topics: ["layout", "basic"],
  aka: ["stack", "cluster", "flex box", "row", "column", "hbox", "vbox", "spacer"],
  noun: "stack",
  description:
    "A stack lays its children out in a column, or a row that wraps, evenly spaced.  It has no look of its own.",
  attributes: [
    {
      name: "direction",
      group: "layout",
      kind: "enum",
      values: ["vertical", "horizontal"],
      default: "vertical",
      description: "`vertical`, a column (the default), or `horizontal`, a row."
    },
    {
      name: "wrap",
      group: "layout",
      kind: "boolean",
      description: "A row wraps onto the next line when its children don't fit (Web Awesome's cluster)."
    },
    {
      name: "spacing",
      group: "layout",
      kind: "enum",
      values: ["none", "xs", "sm", "md", "lg", "xl"],
      default: "md",
      description: "The space between children:  `none` to `xl`;  `md` (1em) by default."
    },
    {
      name: "align",
      group: "layout",
      kind: "enum",
      values: ["start", "center", "end", "stretch", "baseline"],
      description:
        "Lines children up ACROSS the stack:  a column's left edges, centres or right edges;  a row's tops, " +
        "middles, bottoms or text baselines.  By default a column stretches them, a row centres them."
    },
    {
      name: "justify",
      group: "layout",
      kind: "enum",
      values: ["start", "center", "end", "between", "around"],
      description:
        "Places children ALONG the stack:  packed at its `start`, `center` or `end`, or spread out " +
        "(`between`:  the first and last at the ends, `around`:  equal space around each).  " +
        '`<ui-stack direction="horizontal" justify="between">` puts one thing left and one right.'
    },
    { name: "fluid", group: "layout", kind: "boolean", description: "Takes the full width of its container." }
  ],
  events: [],
  slots: [{ name: "", description: "What it lays out:  any elements." }],
  parts: [],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
