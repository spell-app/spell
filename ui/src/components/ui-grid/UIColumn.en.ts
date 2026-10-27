/**
 * The English vocabulary of `<ui-column>`:  every name the tag uses.
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

/****************
 * ### `columnVocabulary`
 * The names of `<ui-column>`, a cell of the grid:  `<div class="ui ... column" part="column">` around a slot.
 ****************/
export const columnVocabulary = {
  tag: "ui-column",
  topics: ["layout", "collections"],
  aka: ["grid column", "col", "cell"],
  noun: "column",
  description: "A column is a vertical cell of a grid, N of 16 wide.",
  attributes: [
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Fills the column with a hue, contrast text on top."
    },
    {
      name: "width",
      group: "layout",
      kind: "width",
      values: "widths",
      description: "Width in columns of 16:  `4`, `1/4` or `25%`."
    },
    {
      name: "width-mobile",
      group: "appearance",
      kind: "width",
      values: "widths",
      widthClass: "wide mobile",
      description: "Width while the grid is narrower than 768px."
    },
    {
      name: "width-tablet",
      group: "appearance",
      kind: "width",
      values: "widths",
      widthClass: "wide tablet",
      description: "Width while the grid is 768px ... 991px wide."
    },
    {
      name: "width-computer",
      group: "appearance",
      kind: "width",
      values: "widths",
      widthClass: "wide computer",
      description: "Width while the grid is 992px wide or more."
    },
    {
      name: "width-large",
      group: "appearance",
      kind: "width",
      values: "widths",
      widthClass: "wide large screen",
      description: "Width while the grid is 1200px ... 1919px wide."
    },
    {
      name: "width-widescreen",
      group: "appearance",
      kind: "width",
      values: "widths",
      widthClass: "wide widescreen",
      description: "Width while the grid is 1920px wide or more."
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["left", "right"],
      classes: { left: "left attached", right: "right attached" },
      replaces: ["attached"],
      description: "No gutter on the `left` / `right` side.  Its old name was `attached`."
    },
    { name: "centered", group: "layout", kind: "keyOnly", description: "Centred in its line." },
    {
      name: "stretched",
      group: "layout",
      kind: "keyOnly",
      description: "Fills the line's height;  its content grows."
    },
    {
      name: "only",
      group: "layout",
      kind: "multiple",
      values: OnlyDevices,
      description: "Shown only on these devices (by the viewport)."
    },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      values: "alignments",
      replaces: ["text-align"],
      description: "Aligns its text `left`, `center`, `right` or `justified`.  Its old name was `text-align`."
    },
    {
      name: "vertical-align",
      group: "layout",
      kind: "verticalAlign",
      values: "verticalAlignments",
      description: "Sits at the `top`, `middle` or `bottom` of its line."
    }
  ],
  events: [],
  slots: [{ name: "", description: "Content." }],
  parts: [{ name: "column", description: "The column box (a flex item)." }],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
