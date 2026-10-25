/**
 * Every name `<ui-buttons>` uses:  tag, attributes (kind + allowed values), events, slots, parts, states,
 * texts.  Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The family's grammar notes are in `UIButton.en.ts`.
 */

import type { E } from "spell-ui/core"
import { ATTACH_CLASSES, COLOR_SWITCHES } from "./UIButton.types"

/****************
 * ### `<ui-buttons>`
 * A group of buttons (and `<ui-or>`s) sharing one look:  `<div class="ui ... buttons" role="group">`.
 ****************/
export const buttonsVocabulary = {
  tag: "ui-buttons",
  topics: ["buttons", "controls", "layout", "elements"],
  aka: ["button group", "segmented control", "toolbar"],
  noun: "buttons",
  description: "Buttons can exist together as a group.",
  attributes: [
    { name: "size", group: "appearance", kind: "size", description: "Size of every button in the group." },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      replaces: COLOR_SWITCHES,
      description:
        "The hue of every button in the group:  any hue, or one of the four a button takes (`primary` ...).  " +
        "Those four also work written alone, their old names."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      // the words are the classes:  no key after them (`ClassBuilder`)
      classes: {},
      values: ["basic", "tertiary", "circular"],
      replaces: [
        { from: "basic", value: "basic" },
        { from: "tertiary", value: "tertiary" },
        { from: "circular", value: "circular" }
      ],
      description:
        "The look of every button, several words at once.  " +
        "`basic` puts them inside one outer border, and `tertiary` is text only.  " +
        "`circular` makes them separate pill-shaped buttons.  " +
        "Each word also works written alone, its old name."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "Inverted buttons, for dark backgrounds." },
    { name: "icon", group: "content", kind: "keyOnly", description: "Icon-only buttons:  square padding." },
    {
      name: "labeled",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["left", "right"],
      description: 'With `icon`, labeled icon buttons.  `labeled="right"` puts the icons at the end.'
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["compact"],
      replaces: [{ from: "compact", value: "compact" }],
      description: "Room inside every button:  `compact` (reduced).  Its old name is `compact`."
    },
    {
      name: "toggle",
      group: "appearance",
      kind: "keyOnly",
      description: "`selected` buttons show in the positive colour."
    },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["vertical"],
      replaces: [{ from: "vertical", value: "vertical" }],
      description: "Which way the buttons run:  `vertical` stacks them.  Its old name is `vertical`."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    {
      name: "equal",
      group: "layout",
      kind: "keyOnly",
      description:
        "Every button the same width, from the buttons themselves (no count):  each as wide as the widest;  with " +
        "`fluid`, an equal share of the row each."
    },
    { name: "wrapping", group: "layout", kind: "keyOnly", description: "Buttons wrap onto more rows." },
    {
      name: "spacing",
      group: "layout",
      kind: "valueOnly",
      values: ["md"],
      classes: { md: "spaced" },
      replaces: [{ from: "spaced", value: "md" }],
      description: "Room between the buttons:  `md` separates them with gaps.  Its old name is `spaced`."
    },
    { name: "stackable", group: "layout", kind: "keyOnly", description: "Stacks vertically on mobile." },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom", "left", "right"],
      classes: ATTACH_CLASSES,
      replaces: [{ from: "attached", value: "both" }],
      description:
        "Joins it to the edge of a segment:  the side its value names, or `both`.  Its old name is `attached`."
    },
    {
      name: "floated",
      group: "layout",
      kind: "valueAndKey",
      values: "floats",
      description: "Floats `left` or `right`."
    },
    {
      name: "width",
      group: "layout",
      kind: "width",
      widthClass: "",
      canEqual: true,
      values: "widths",
      description:
        "The older, count-based way to write `equal fluid`:  equal-width buttons that fill the row.  " +
        'A count draws its word (`width="3"` draws `three buttons`).  ' +
        '`"equal"` draws `equal width buttons`.'
    }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-button>`s and `<ui-or>`s." }],
  parts: [{ name: "group", description: "The group box." }],
  states: [
    {
      name: "fluid",
      description: "The host is block-level:  `fluid`, `width`, or attached top, bottom or both."
    },
    { name: "left-floated", description: "The host floats left." },
    { name: "right-floated", description: "The host floats right." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
