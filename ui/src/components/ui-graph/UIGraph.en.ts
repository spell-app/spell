/**
 * The English vocabulary of `<ui-graph>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, parts and texts.
 *   The shape is `ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Ours, not Fomantic's:  GENERIC, any node / edge graph;  netlists are one caller (a subclass restyles it).
 * - Rich properties:  `graph`, `selected` and `boundary` (`UIGraph.types.ts`).
 *   A static page may give `graph` as JSON in the attribute.
 * - NOT `children` for how children open, though that's the word:  it would hide the platform's `Element.children`.
 *   So `child-view`.
 */

import type { ComponentVocabulary } from "spell/ui/vocabulary"
import { GraphChildViews } from "./UIGraph.types"

/****************
 * ### `graphVocabulary`
 * The names of `<ui-graph>`, a node / edge graph drawn as an SVG:
 * `<div class="ui graph">` holding breadcrumbs (when drilled in), a toolbar and `<svg part="canvas">`.
 ****************/
export const graphVocabulary = {
  tag: "ui-graph",
  icon: "project diagram",
  topics: ["data display", "images", "views"],
  aka: [
    "graph",
    "node graph",
    "network diagram",
    "flow chart",
    "dataflow",
    "netlist",
    "schematic",
    "block diagram",
    "DAG"
  ],
  skeleton: "16 tall",
  noun: "graph",
  description:
    "A graph draws nodes joined by edges, laid out left to right.  A node may hold a graph of its own, opened in place, in a modal, or in its stead.",
  attributes: [
    {
      name: "graph",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "The graph to draw, a `GraphData`:  `nodes` (`id`, `label`, `kind`, `ports`, `children`, `data`) and `edges` " +
        "(`from` / `to` `{ node, port }`).  An end with no `node` is the enclosing node's port.  A JS property (JSON in " +
        "the attribute);  set a NEW graph to redraw."
    },
    {
      name: "child-view",
      group: "behaviour",
      kind: "enum",
      values: GraphChildViews,
      default: "inline",
      description:
        "How a node's children show when it's opened:  `inline`, inside the node, which grows round them;  `modal`, a " +
        "graph in a modal;  `drill`, the graph replaced by them, with breadcrumbs back.  A node's own `childView` wins."
    },
    {
      name: "path",
      group: "behaviour",
      kind: "string",
      default: "",
      description:
        'The node whose child graph is shown, drilled to, by its ids from the top joined by `/` (`cpu/alu`);  `""`:  ' +
        "the top.  Setting it drills there, loading lazy children on the way;  drilling and the breadcrumbs set it back, " +
        "with `ui-changed` `{ kind: 'path', path }`."
    },
    {
      name: "selected",
      group: "states",
      kind: "json",
      reflect: false,
      description:
        "PROPERTY:  what's selected, `{ kind: 'node' | 'edge' | 'port', id, path }`;  `undefined`:  nothing.  Clicks set it."
    },
    {
      name: "boundary",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "PROPERTY:  the enclosing node's ports, drawn as pins on the graph's sides, for edges with no `node`.  Set by a " +
        "modal's graph;  a page rarely needs it."
    }
  ],
  events: [
    {
      name: "ui-selecting",
      cancelable: true,
      detail: "{ kind: 'node' | 'edge' | 'port', id: string, path: string, item: object, originalEvent?: Event }",
      description: "A node, edge or port is about to be selected by a click:  cancel it to keep the selection."
    },
    {
      name: "ui-changed",
      detail:
        "{ value: { kind: string, id: string, path: string } | undefined, kind?: string, id?: string, path?: string, item?: object, originalEvent?: Event } | { kind: 'path', path: string, originalEvent?: Event }",
      description:
        "What's selected changed:  `value` is the new `selected`;  `item` the node, edge or port itself.  ALSO when " +
        "the graph shown changes by a drill or a breadcrumb:  `{ kind: 'path', path }` (`path` the new `path`), so one " +
        "listener keeps a page in step with both."
    },
    {
      name: "ui-node-toggled",
      detail:
        "{ node: object, path: string, open: boolean, view: 'inline' | 'modal' | 'drill', originalEvent?: Event }",
      description: "A node with children was opened or closed, by a person or by `open()` / `close()`."
    }
  ],
  slots: [],
  parts: [
    { name: "graph", description: "The box round it all." },
    { name: "canvas", description: "The `<svg>`." },
    { name: "node", description: "Each node's `<g>`." },
    { name: "container", description: "A node opened in place, its child graph inside;  also part `node`." },
    { name: "edge", description: "Each edge's `<path>`." },
    { name: "edge-label", description: "Each edge's label." },
    { name: "port", description: "Each port's `<g>`:  its dot and label." },
    { name: "pin", description: "Each pin, the enclosing node's port, on a modal or drilled graph's side." },
    { name: "toggle", description: "Each node's open / close button." },
    { name: "toolbar", description: "The buttons over the drawing (fit)." },
    { name: "breadcrumbs", description: "The trail back up, when drilled in." }
  ],
  states: [
    { name: "drilled", description: "It shows a node's children instead of its graph." },
    { name: "panning", description: "A drag is moving the view." }
  ],
  texts: [
    { key: "graphSummary", text: "Graph:  {count} nodes", description: "Name of the drawing." },
    { key: "graphOpenNode", text: "Open {label}", description: "A closed node's toggle." },
    { key: "graphCloseNode", text: "Close {label}", description: "An open node's toggle." },
    { key: "graphFit", text: "Fit", description: "The button that fits the drawing to the view." },
    { key: "graphTop", text: "Top", description: "The first breadcrumb, the graph itself." },
    { key: "graphLoading", text: "Loading …", description: "A node whose children are loading." }
  ],
  hooks: [
    {
      name: "nodeLabel",
      words: "give the label of (a node)",
      description: "A node's text;  by default its `label`, else its id."
    },
    {
      name: "nodeClass",
      words: "give the class of (a node)",
      description: "Extra class names on a node, for the subclass's own sheet."
    },
    {
      name: "edgeLabel",
      words: "give the label of (an edge)",
      description: "An edge's text, at its middle;  none:  no text."
    },
    {
      name: "edgeClass",
      words: "give the class of (an edge)",
      description: "Extra class names on an edge, for the subclass's own sheet."
    }
  ]
} as const satisfies ComponentVocabulary
