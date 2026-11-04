/**
 * The English vocabulary of `<ui-tree-node>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values) and parts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Ours, not Fomantic's (epic `elemental-spell` P32).
 * - No class words:  the class grammar is `ui tree node`, on the box around its content.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `treeNodeVocabulary`
 * The names of `<ui-tree-node>`, one node of a `<ui-tree-diagram>`, holding the nodes under it as its children.
 ****************/
export const treeNodeVocabulary = {
  tag: "ui-tree-node",
  icon: "circle outline",
  topics: ["data display", "images"],
  aka: ["diagram node", "tree diagram node", "org chart box", "node"],
  noun: "tree node",
  description:
    "A tree node is one box of a tree diagram:  its label, and the nodes under it as its children.  Its text is its " +
    "label;  any other element inside it shows in its box.",
  attributes: [
    { name: "label", group: "content", kind: "string", description: "The box's text.  None:  the node's own text." },
    {
      name: "detail",
      group: "content",
      kind: "string",
      description: "A second, smaller, muted line under the label, e.g. a datatype."
    },
    {
      name: "edge-label",
      group: "content",
      kind: "string",
      property: "edgeLabel",
      description: "Text on the line from its parent, e.g. `condition`:  which part of its parent it is."
    },
    {
      name: "hover-text",
      group: "content",
      kind: "string",
      property: "hoverText",
      description: "What shows when the pointer rests on its box, e.g. the source it came from."
    },
    {
      name: "color",
      group: "appearance",
      kind: "enum",
      values: "hues",
      description: "The box's colour:  its fill and border, in that hue."
    },
    {
      name: "kind",
      group: "appearance",
      kind: "string",
      description:
        "A word for what sort of node it is, for a page's own style:  its box is also part `kind-<word>`, so " +
        "`::part(kind-call)` reaches every node of that kind."
    },
    {
      name: "folded",
      group: "behaviour",
      kind: "boolean",
      description: "Starts folded:  the nodes under it don't show.  A `foldable` diagram can open it again."
    }
  ],
  events: [],
  slots: [{ name: "", description: "What shows in its box, besides its label;  and the `<ui-tree-node>`s under it." }],
  parts: [{ name: "content", description: "The box around what it holds, placed over the node's box in the drawing." }],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
