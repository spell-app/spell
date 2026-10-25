/**
 * Every name `<ui-buttons>` uses:  tag, attributes (kind + allowed values), events, slots, parts, states,
 * texts.  Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The family's grammar notes are in `UIButton.en.ts`.
 */

import type { E } from "spell-ui/core"

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
    { name: "color", group: "appearance", kind: "color", description: "Hue of every button in the group." },
    { name: "primary", group: "appearance", kind: "keyOnly", description: "Every button in the primary colour." },
    { name: "secondary", group: "appearance", kind: "keyOnly", description: "Every button in the secondary colour." },
    { name: "positive", group: "appearance", kind: "keyOnly", description: "Every button in the positive colour." },
    { name: "negative", group: "appearance", kind: "keyOnly", description: "Every button in the negative colour." },
    { name: "basic", group: "appearance", kind: "keyOnly", description: "Basic buttons inside one outer border." },
    { name: "tertiary", group: "appearance", kind: "keyOnly", description: "Tertiary (text only) buttons." },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "Inverted buttons, for dark backgrounds." },
    { name: "icon", group: "content", kind: "keyOnly", description: "Icon-only buttons:  square padding." },
    {
      name: "labeled",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["left", "right"],
      description: 'With `icon`:  `labeled icon` buttons;  `labeled="right"` puts the icons at the end.'
    },
    { name: "compact", group: "layout", kind: "keyOnly", description: "Reduced padding." },
    { name: "circular", group: "appearance", kind: "keyOnly", description: "Separate pill-shaped buttons." },
    {
      name: "toggle",
      group: "appearance",
      kind: "keyOnly",
      description: "`active` buttons show in the positive colour."
    },
    { name: "vertical", group: "layout", kind: "keyOnly", description: "Stacks the buttons vertically." },
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
    { name: "spaced", group: "layout", kind: "keyOnly", description: "Separate buttons with gaps between them." },
    { name: "stackable", group: "layout", kind: "keyOnly", description: "Stacks vertically on mobile." },
    {
      name: "attached",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["top", "bottom", "left", "right"],
      description: "Joined to the edge of a segment:  `top`, `bottom`, `left` or `right`."
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
        'Older, count-based alias of `equal fluid`:  equal-width buttons filling the row, a count (`width="3"` => ' +
        '`three`) or `"equal"` (`equal width`).'
    }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-button>`s and `<ui-or>`s." }],
  parts: [{ name: "group", description: "The group box." }],
  states: [
    { name: "fluid", description: "The host is block-level:  `fluid`, `width`, or attached `top` / `bottom`." },
    { name: "left-floated", description: "The host floats left." },
    { name: "right-floated", description: "The host floats right." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
