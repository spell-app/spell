/**
 * The English vocabulary of `<ui-labels>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots and parts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - How the family's attributes become class words:  `UILabel.en.ts`.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `labelsVocabulary`
 * The names of `<ui-labels>`, a group of labels sharing one look:  `<div class="ui … labels">`.
 ****************/
export const labelsVocabulary = {
  tag: "ui-labels",
  topics: ["status", "lists", "elements"],
  aka: ["badges", "chips", "tags", "tag list"],
  noun: "labels",
  description: "Labels can be grouped to share a look.",
  attributes: [
    { name: "size", group: "appearance", kind: "size", description: "Size of every label in the group." },
    { name: "color", group: "appearance", kind: "color", description: "Hue of every label in the group." },
    { name: "tag", group: "appearance", kind: "keyOnly", description: "Every label shaped like a price tag." },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      // the words are the classes:  no key after them (`ClassBuilder`)
      classes: {},
      values: ["basic", "tinted", "circular"],
      replaces: [
        { from: "basic", value: "basic" },
        { from: "tinted", value: "tinted" },
        { from: "circular", value: "circular" }
      ],
      description:
        "Every label's look, several words at once:  `basic` (outlined), `tinted` (the colour's soft fill and text), " +
        "`circular` (a round badge).  Old names:  `basic`, `tinted`, `circular` written alone."
    },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["horizontal"],
      replaces: [{ from: "horizontal", value: "horizontal" }],
      description: "`horizontal`:  every label a fixed-width tag.  Its old name was `horizontal`."
    },
    { name: "image", group: "content", kind: "keyOnly", description: "Every label an image label." },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Every label full width." },
    {
      name: "align",
      group: "layout",
      kind: "valueOnly",
      values: ["center"],
      classes: { center: "centered" },
      replaces: [{ from: "centered", value: "center" }],
      description: "`center`:  every label centred.  Its old name was `centered`."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "Every label for dark backgrounds." },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Every label dimmed and inert." }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-label>`s." }],
  parts: [{ name: "group", description: "The group box." }],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
