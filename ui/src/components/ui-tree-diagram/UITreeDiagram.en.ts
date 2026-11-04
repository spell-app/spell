/**
 * The English vocabulary of `<ui-tree-diagram>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), parts and texts.
 *   The shape is `ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Ours, not Fomantic's:  first drawn for spell's parse trees, but GENERIC.
 * - One rich property, `tree` (a `TreeDiagramNode`, `UITreeDiagram.types.ts`);
 *   a static page gives it as a `<ui-json>` or `<script type="application/json">` child instead.
 * - No class words:  the class grammar is `ui tree diagram`, plus `empty` with nothing to draw.
 */

import type { ComponentVocabulary } from "spell/ui/vocabulary"
import { TreeDiagramDirections } from "./UITreeDiagram.types"

/****************
 * ### `treeDiagramVocabulary`
 * The names of `<ui-tree-diagram>`, a tree drawn as an SVG:
 * `<svg class="ui tree diagram" part="diagram" role="img" aria-label>`.
 ****************/
export const treeDiagramVocabulary = {
  tag: "ui-tree-diagram",
  icon: "project diagram",
  topics: ["data display", "images", "views"],
  aka: [
    "tree",
    "tree chart",
    "hierarchy",
    "hierarchy diagram",
    "org chart",
    "parse tree",
    "syntax tree",
    "AST",
    "dendrogram"
  ],
  skeleton: "12 tall",
  noun: "tree diagram",
  description:
    "A tree diagram draws a tree:  a box for each node, a line to each of its children.  Write it as nested tags or as JSON.",
  attributes: [
    {
      name: "tree",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "The tree to draw, a `TreeDiagramNode`:  `label`, and optional `detail`, `edgeLabel`, `title`, `color`, `kind`, `folded` and `children`.  A " +
        'JS property (JSON in the attribute);  wins over `<ui-tree-node>`, `<ui-json>` or `<script type="application/json">` children.  Set a NEW ' +
        "tree to redraw."
    },
    {
      name: "direction",
      group: "layout",
      kind: "enum",
      values: TreeDiagramDirections,
      default: "top-down",
      description: "Which way it grows:  `top-down`, children under their parent, or `left-right`, children after it."
    },
    {
      name: "foldable",
      group: "behaviour",
      kind: "boolean",
      description:
        "A node with children gets a button that folds them away, and opens them again;  `ui-node-toggled` says so."
    },
    {
      name: "clickable",
      group: "behaviour",
      kind: "boolean",
      description:
        "Its nodes look clickable and can be reached by keyboard:  Enter or Space sends `ui-node-clicked`, as a click does."
    }
  ],
  events: [
    {
      name: "ui-node-clicked",
      detail: "{ node: { label: string, element?: Element }, path: string, originalEvent: Event }",
      description:
        "A node was clicked, with or without `clickable`.  `path` is its place, its child index at each depth:  `0.2.1`.  " +
        "A nested tag's node has its `element`."
    },
    {
      name: "ui-node-toggled",
      detail: "{ node: { label: string, element?: Element }, path: string, folded: boolean, originalEvent: Event }",
      description: "A person folded a node, or opened it again."
    }
  ],
  slots: [{ name: "", description: "The tree's root, a `<ui-tree-node>`, with the nodes under it inside it." }],
  parts: [
    { name: "diagram", description: "The `<svg>`." },
    { name: "node", description: "Each node's `<g>`:  its box, label and detail." },
    { name: "root-node", description: "The root's `<g>`, also part `node`." },
    { name: "edge", description: "Each line from a parent to a child." },
    { name: "edge-label", description: "Each edge label, on its line." },
    { name: "toggle", description: "Each fold button, with `foldable`." }
  ],
  states: [],
  texts: [
    {
      key: "summary",
      text: "Tree:  {label}, with {count} children",
      description: "Name of a tree whose root has children."
    },
    {
      key: "summaryOne",
      text: "Tree:  {label}, with 1 child",
      description: "Name of a tree whose root has one child."
    },
    { key: "summaryLeaf", text: "Tree:  {label}", description: "Name of a tree of one node." },
    { key: "foldNode", text: "Fold {label}", description: "A fold button's name, while the node's open." },
    { key: "unfoldNode", text: "Open {label}", description: "A fold button's name, while the node's folded." }
  ]
} as const satisfies ComponentVocabulary
