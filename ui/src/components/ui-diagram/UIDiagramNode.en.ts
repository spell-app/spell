/**
 * The English vocabulary of `<ui-diagram-node>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `diagramNodeVocabulary`
 * The names of `<ui-diagram-node>`, what one box of a `<ui-diagram>` holds in place of its texts.
 ****************/
export const diagramNodeVocabulary = {
  tag: "ui-diagram-node",
  icon: "square outline",
  topics: ["data display", "images"],
  aka: ["diagram box", "box content", "flip card in a diagram"],
  noun: "diagram node",
  description:
    "A diagram node holds what one box of a diagram shows instead of its texts, e.g. a `<ui-shape>` that flips:  the " +
    "box takes its size, and its lines follow when it changes.",
  attributes: [
    {
      name: "name",
      group: "content",
      kind: "string",
      description: "The box it fills:  a node's `name` in the diagram's spec."
    },
    {
      name: "resizable",
      group: "behaviour",
      kind: "string",
      description:
        "People can drag its corner to resize it, and the box and its lines follow:  bare or `both`, " +
        "`horizontally` or `vertically`.  Limit it with plain CSS on what it holds (`max-width: 50%`, `min-height`)."
    }
  ],
  events: [],
  slots: [{ name: "", description: "What the box shows." }],
  parts: [{ name: "content", description: "The box around what it holds." }],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
