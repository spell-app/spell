/**
 * The English vocabulary of `<ui-divider>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots and parts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-divider horizontal text-align="left">` => `ui horizontal left aligned divider`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `dividerVocabulary`
 * The names of `<ui-divider>`, a line between groups of content:
 * `<div class="ui … divider" role="separator">` around a slot for its text.
 ****************/
export const dividerVocabulary = {
  tag: "ui-divider",
  topics: ["layout", "basic", "typography", "elements"],
  aka: ["separator", "hr", "horizontal rule", "rule", "line"],
  skeleton: "0.25 tall",
  noun: "divider",
  description: "A divider visually segments content into groups.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size of the text, `mini` ... `massive`;  `medium` is the default."
    },
    { name: "color", group: "appearance", kind: "color", description: "Hue of the rule and the text." },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["horizontal", "vertical"],
      replaces: [
        { from: "horizontal", value: "horizontal" },
        { from: "vertical", value: "vertical" }
      ],
      description:
        "`horizontal`:  text (or an icon) between two horizontal rules;  `vertical`:  a vertical rule with optional " +
        "text, centred in a `position: relative` owner (segment, grid).  Its old names are `horizontal`, `vertical`."
    },
    {
      name: "spacer",
      group: "appearance",
      kind: "keyOnly",
      key: "hidden",
      description:
        "The spacing without the line (Fomantic's `hidden` divider:  the class word stays `hidden`).  " +
        "Renamed because `hidden` hides every element, as the platform's does."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none"],
      classes: { none: "fitted" },
      replaces: [{ from: "fitted", value: "none" }],
      description: "`none`:  no space above or below.  Its old name is `fitted`."
    },
    { name: "clearing", group: "appearance", kind: "keyOnly", description: "Clears floated content above it." },
    {
      name: "section",
      group: "appearance",
      kind: "keyOnly",
      description: "More space, to divide sections of content."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds." },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      values: ["left", "center", "right"],
      replaces: ["text-align"],
      description:
        'With `direction="horizontal"`:  where the text sits;  `left` / `right` drop the rule on that side.  Its old name is `text-align`.'
    },
    { name: "icon", group: "content", kind: "icon", description: "Icon name, shown before the text." }
  ],
  events: [],
  slots: [{ name: "", description: "Text between the rules of a `horizontal` or `vertical` divider." }],
  parts: [
    { name: "divider", description: "The divider box." },
    { name: "icon", description: "The icon box." }
  ],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
