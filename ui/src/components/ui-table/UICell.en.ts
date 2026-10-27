/**
 * The English vocabulary of `<ui-cell>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A cell of a `<ui-row>` in a `<ui-table>` (epic `ui-gaps` P7):  a table with no native `<table>`,
 *   for a drawing, which holds no native HTML.
 * - Its look is the table's, from its class words (`celled`, `striped`, `padding` ...):  no look of its own.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `cellVocabulary`
 * The names of `<ui-cell>`, one cell of a table row:  its content, or a header.
 ****************/
export const cellVocabulary = {
  tag: "ui-cell",
  topics: ["tables", "collections"],
  aka: ["table cell", "td", "th", "header cell"],
  noun: "cell",
  description: "A cell holds one value of a table row;  a header cell names its column or row.",
  attributes: [
    {
      name: "header",
      group: "content",
      kind: "boolean",
      description:
        "A header cell:  in a `header` row it names its column;  in a body row, its row (the first cell, say)."
    },
    {
      name: "span",
      group: "layout",
      kind: "number",
      description: "How many columns it covers;  default 1.  Cells never span rows."
    },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      values: "alignments",
      description: "Aligns its text:  `left`, `center`, `right` or `justified`."
    },
    {
      name: "vertical-align",
      group: "layout",
      kind: "verticalAlign",
      values: "verticalAlignments",
      description: "Aligns its content to the `top`, `middle` or `bottom` of the row."
    }
  ],
  events: [],
  slots: [{ name: "", description: "The cell's content:  text, or any element." }],
  parts: [],
  states: [
    { name: "header", description: "Set while it's a header cell (`header`)." },
    { name: "in-table", description: "Set while it's in a `<ui-table>`." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
