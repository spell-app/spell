/**
 * The English vocabulary of `<ui-segments>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - How the family's attributes become class words:  `UISegment.en.ts`.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `segmentsVocabulary`
 * The names of `<ui-segments>`, a group of segments in one box:  `<div class="ui … segments" part="group">`.
 ****************/
export const segmentsVocabulary = {
  tag: "ui-segments",
  topics: ["containers", "layout", "elements"],
  aka: ["panel group", "stacked panels"],
  noun: "segments",
  description: "A group of segments can be formatted to appear together.",
  attributes: [
    { name: "size", group: "appearance", kind: "size", description: "Text size of every segment in the group." },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["horizontal"],
      replaces: [{ from: "horizontal", value: "horizontal" }],
      description: "`horizontal`:  side by side instead of stacked.  Its old name was `horizontal`."
    },
    {
      name: "equal-width",
      group: "layout",
      kind: "keyOnly",
      key: "equal width",
      description: 'With `direction="horizontal"`:  every segment the same width.'
    },
    {
      name: "wrapping",
      group: "layout",
      kind: "keyOnly",
      description: 'With `direction="horizontal"`:  segments wrap onto more rows.'
    },
    {
      name: "stackable",
      group: "layout",
      kind: "keyOnly",
      description: 'With `direction="horizontal"`:  stacks on mobile.'
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["raised", "stacked", "tall-stacked", "piled", "basic"],
      classes: { "tall-stacked": "tall stacked" },
      replaces: [
        { from: "raised", value: "raised" },
        { from: "stacked", value: "stacked", values: { tall: "tall-stacked" } },
        { from: "piled", value: "piled" },
        { from: "basic", value: "basic" }
      ],
      description:
        "The group's look, several words at once:  `raised` (lifted off the page with a shadow), `stacked` (a " +
        "page peeking out below;  `tall-stacked` two), `piled` (a pile of rotated sheets behind the group), " +
        "`basic` (no box of its own).  Their old names were `raised`, `stacked`, `piled`, `basic`."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["compact"],
      replaces: [{ from: "compact", value: "compact" }],
      description: "`compact`:  only as wide as its content.  Its old name was `compact`."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "The dark scheme, for every segment in the group."
    },
    { name: "loading", group: "states", kind: "keyOnly", description: "Dims the group under a spinner." },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Dimmed and inert." }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-segment>`s and nested `<ui-segments>`." }],
  parts: [{ name: "group", description: "The group box." }],
  states: [{ name: "piled", description: "`piled`:  the host is the stacking context the rotated sheets sit behind." }],
  texts: []
} as const satisfies E.ComponentVocabulary
