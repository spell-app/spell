/**
 * The English vocabulary of `<ui-row>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots and parts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-grid columns="3" divided="vertically" stackable>` => `ui stackable vertically divided three column grid`,
 *   `<ui-column width="4" width-mobile="16">` => `ui four wide sixteen wide mobile column`.
 * - Rows and columns keep the leading `ui` (unlike Fomantic's bare `.column`), so the generic colour remap reaches
 *   them;  see `UIGrid.css`.
 * - In a `<ui-table>` it's a TABLE row instead (epic `ui-gaps` P7):  its `<ui-cell>`s, `header` or `footer`;
 *   the grid's attributes then do nothing, and the table's class words style it.
 * - No `ownsParts`:  Fomantic's grid styles no content parts.  What a grid hands its rows and columns is
 *   inherited tokens (`--_grid-*`), see `UIGrid.css`.
 */

import type { E } from "spell-ui/core"
import { OnlyDevices } from "./UIGrid.types"

/** `reversed` targets on a row:  its columns only. */
const ROW_REVERSALS = ["mobile", "tablet", "computer"] as const

/****************
 * ### `rowVocabulary`
 * The names of `<ui-row>`, a line of columns:  `<div class="ui ... row" part="row">` around a slot;
 * in a `<ui-table>`, a table row of `<ui-cell>`s.
 ****************/
export const rowVocabulary = {
  tag: "ui-row",
  topics: ["layout", "collections"],
  aka: ["grid row", "table row", "tr"],
  noun: "row",
  description: "A row is a horizontal grouping of columns;  in a table, of cells.",
  attributes: [
    {
      name: "header",
      group: "content",
      kind: "boolean",
      description: "In a table:  the header row, its cells the column headers."
    },
    {
      name: "footer",
      group: "content",
      kind: "boolean",
      description: "In a table:  a footer row, under the body (totals, notes)."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Fills the row with a hue, contrast text on top."
    },
    {
      name: "columns",
      group: "layout",
      kind: "width",
      values: "widths",
      widthClass: "column",
      canEqual: true,
      description: 'Columns in this row, overriding the grid\'s;  `"equal"` shares the line equally.'
    },
    {
      name: "equal-width",
      group: "layout",
      kind: "keyOnly",
      key: "equal width",
      description: 'Columns share the line equally;  same as `columns="equal"`.'
    },
    { name: "divided", group: "layout", kind: "keyOnly", description: "Hairlines between its columns." },
    {
      name: "spacing",
      group: "layout",
      kind: "valueOnly",
      values: ["lg", "xl"],
      classes: { lg: "relaxed", xl: "very relaxed" },
      replaces: [{ from: "relaxed", value: "lg", values: { very: "xl" } }],
      description: "Wider gutters:  `lg`, `xl` wider still.  Its old name was `relaxed`."
    },
    { name: "centered", group: "layout", kind: "keyOnly", description: "Centres its columns." },
    { name: "stretched", group: "layout", kind: "keyOnly", description: "Columns fill the row's height." },
    { name: "stackable", group: "layout", kind: "keyOnly", description: "Stacks its columns when the grid is narrow." },
    {
      name: "doubling",
      group: "layout",
      kind: "keyOnly",
      description: "Halves its column count at tablet and mobile widths."
    },
    {
      name: "only",
      group: "layout",
      kind: "multiple",
      values: OnlyDevices,
      description: "Shown only on these devices (by the viewport)."
    },
    {
      name: "reversed",
      group: "layout",
      kind: "multiple",
      values: ROW_REVERSALS,
      description: "Reverses its columns at these grid widths."
    },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      values: "alignments",
      replaces: ["text-align"],
      description: "Aligns its columns' text.  Its old name was `text-align`."
    },
    {
      name: "vertical-align",
      group: "layout",
      kind: "verticalAlign",
      values: "verticalAlignments",
      description: "Aligns its columns to the `top`, `middle` or `bottom`."
    }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-column>`s;  in a table, `<ui-cell>`s." }],
  parts: [{ name: "row", description: "The row box (a flex line)." }],
  states: [
    { name: "header", description: "Set while it's a table's header row (`header`)." },
    { name: "footer", description: "Set while it's a table's footer row (`footer`)." },
    { name: "in-table", description: "Set while it's a row of a `<ui-table>`." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
