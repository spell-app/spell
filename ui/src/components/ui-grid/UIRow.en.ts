/**
 * The English vocabulary of `<ui-row>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots and parts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-grid columns="3" divided="vertically" stackable>` => `ui stackable vertically divided three column grid`,
 *   `<ui-column width="4" width-mobile="16">` => `ui four wide sixteen wide mobile column`.
 * - Rows and columns keep the leading `ui` (unlike Fomantic's bare `.column`), so the generic colour remap reaches
 *   them;  see `UIGrid.css`.
 * - No `ownsParts`:  Fomantic's grid styles no content parts.  What a grid hands its rows and columns is
 *   inherited tokens (`--_grid-*`), see `UIGrid.css`.
 */

import type { E } from "spell-ui/core"
import { OnlyDevices } from "./UIGrid.types"

/** `reversed` targets on a row:  its columns only. */
const ROW_REVERSALS = ["mobile", "tablet", "computer"] as const

/****************
 * ### `rowVocabulary`
 * The names of `<ui-row>`, a line of columns:  `<div class="ui ... row" part="row">` around a slot.
 ****************/
export const rowVocabulary = {
  tag: "ui-row",
  topics: ["layout", "collections"],
  aka: ["grid row"],
  noun: "row",
  description: "A row is a horizontal grouping of columns.",
  attributes: [
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
      name: "relaxed",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["very"],
      description: 'Wider gutters;  `relaxed="very"` wider still.'
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
      name: "text-align",
      group: "layout",
      kind: "textAlign",
      values: "alignments",
      description: "Aligns its columns' text."
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
  slots: [{ name: "", description: "`<ui-column>`s." }],
  parts: [{ name: "row", description: "The row box (a flex line)." }],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
