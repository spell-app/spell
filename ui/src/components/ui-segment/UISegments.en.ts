/**
 * The English vocabulary of `<ui-segments>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - How the family's attributes become class words:  `UISegment.en.ts`.
 */

import type { E } from "spell-ui/core"

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
    { name: "horizontal", group: "layout", kind: "keyOnly", description: "Side by side instead of stacked." },
    {
      name: "equal-width",
      group: "layout",
      kind: "keyOnly",
      key: "equal width",
      description: "With `horizontal`:  every segment the same width."
    },
    {
      name: "wrapping",
      group: "layout",
      kind: "keyOnly",
      description: "With `horizontal`:  segments wrap onto more rows."
    },
    { name: "stackable", group: "layout", kind: "keyOnly", description: "With `horizontal`:  stacks on mobile." },
    { name: "raised", group: "appearance", kind: "keyOnly", description: "Lifted off the page with a shadow." },
    {
      name: "stacked",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["tall"],
      description: "A page peeking out below."
    },
    { name: "piled", group: "appearance", kind: "keyOnly", description: "A pile of rotated sheets behind the group." },
    { name: "compact", group: "layout", kind: "keyOnly", description: "Only as wide as its content." },
    { name: "basic", group: "appearance", kind: "keyOnly", description: "No box of its own." },
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
