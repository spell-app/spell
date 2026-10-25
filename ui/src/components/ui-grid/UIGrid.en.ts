/**
 * The English vocabulary of `<ui-grid>`:  every name the tag uses.
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
import * as UIT from "spell-ui/components/components.types"
import { OnlyDevices } from "./UIGrid.types"

/** `reversed` targets on a grid:  a device, optionally `vertically` (the lines, not the columns). */
const GRID_REVERSALS = [
  "mobile",
  "tablet",
  "computer",
  "mobile vertically",
  "tablet vertically",
  "computer vertically"
] as const

/****************
 * ### `gridVocabulary`
 * The names of `<ui-grid>`, a 16-column flex grid:  `<div class="ui ...
 * grid" part="grid">` around a slot of rows and columns.
 ****************/
export const gridVocabulary = {
  tag: "ui-grid",
  topics: ["layout", "basic", "collections"],
  aka: ["columns", "row", "flex grid", "layout grid", "responsive grid"],
  noun: "grid",
  description: "A grid is used to harmonize negative space in a layout.",
  attributes: [
    {
      name: "columns",
      group: "layout",
      kind: "width",
      values: "widths",
      widthClass: "column",
      canEqual: true,
      description: 'Columns per line, `1` ... `16` (or `1/4`, `25%`);  `"equal"` shares each line equally.'
    },
    {
      name: "equal-width",
      group: "layout",
      kind: "keyOnly",
      key: "equal width",
      description: 'Columns share each line equally;  same as `columns="equal"`.'
    },
    {
      name: "divided",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["vertically"],
      description: 'Hairlines between columns;  `divided="vertically"` between rows instead.'
    },
    {
      name: "celled",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["internally"],
      description: 'A table-like box with hairlines between every cell;  `"internally"` drops the outer box.'
    },
    {
      name: "padded",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["horizontally", "vertically"],
      description: "Keeps its outer gutters inside its box;  `horizontally` / `vertically` for one axis."
    },
    {
      name: "relaxed",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["very"],
      description: 'Wider gutters;  `relaxed="very"` wider still.'
    },
    {
      name: "compact",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["very"],
      description: 'Narrower gutters and row spacing;  `compact="very"` narrower still.'
    },
    { name: "centered", group: "layout", kind: "keyOnly", description: "Centres its columns in each line." },
    {
      name: "stretched",
      group: "layout",
      kind: "keyOnly",
      description: "Columns fill the line's height;  their content grows."
    },
    {
      name: "stackable",
      group: "layout",
      kind: "keyOnly",
      description: "One full-width column per line when the grid is narrow."
    },
    {
      name: "doubling",
      group: "layout",
      kind: "keyOnly",
      description: "Halves the column count at tablet and mobile widths."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "On a dark surface:  dividers in their on-dark tone."
    },
    {
      name: "only",
      group: "layout",
      kind: "multiple",
      values: OnlyDevices,
      description: 'Shown only on these devices (by the viewport), e.g. `only="mobile tablet"`.'
    },
    {
      name: "reversed",
      group: "layout",
      kind: "multiple",
      values: GRID_REVERSALS,
      description: 'Reverses the column order at these grid widths, e.g. `reversed="mobile tablet vertically"`.'
    },
    {
      name: "stack-with",
      group: "layout",
      kind: "enum",
      values: UIT.StackWithValues,
      description:
        "What `stackable`, `doubling`, `reversed` and per-device widths measure:  `container` (the default) -- the " +
        "grid's own width;  `page` -- the screen's, as in Fomantic.  Unset:  the page-wide `--ui-stack-with` token " +
        "decides (`<ui-root stack-with>`).  Rows and columns follow their grid."
    },
    {
      name: "text-align",
      group: "layout",
      kind: "textAlign",
      values: "alignments",
      description: "Aligns every column's text `left`, `center`, `right` or `justified`."
    },
    {
      name: "vertical-align",
      group: "layout",
      kind: "verticalAlign",
      values: "verticalAlignments",
      description: "Aligns every column to the `top`, `middle` or `bottom` of its line."
    }
  ],
  events: [],
  slots: [
    {
      name: "",
      description:
        "`<ui-row>`s and `<ui-column>`s;  or, with `columns`, any elements, each a cell of its own " +
        '(`<ui-grid columns="3"><div>...</div><div>...</div></ui-grid>`).'
    }
  ],
  parts: [{ name: "grid", description: "The grid box (the flex container)." }],
  states: [
    {
      name: "celled",
      description: "Set while `celled` with its outer box (not `internally`):  the HOST carries the box's outer margin."
    }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
