/**
 * The types and constants of the graph family:  the data contract (`GraphData`, `GraphNode`, `GraphEdge` ...),
 * the layout's shapes and its metrics, shared by `GraphLayout` and the component.
 * - Data only:  nothing here runs.
 * - GENERIC:  any node / edge graph from plain data.
 *   A subclass may draw one domain's graphs (a netlist, a pipeline ...);  `ui` knows nothing about them.
 */

////////////////
// ## The data contract
////////////////

/** A graph `<ui-graph>` draws:  its nodes, and the edges between them (or their ports). */
export type GraphData = {
  nodes: GraphNode[]
  edges?: GraphEdge[]
}

/** What a node's `children` may be:  a graph, or a function giving one (or a promise of one), called on first open. */
export type GraphChildren = GraphData | (() => GraphData | Promise<GraphData>)

/** One node of a graph. */
export type GraphNode = {
  /** Unique among its graph's nodes (not across levels:  a node in a child graph is known by its `path`). */
  id: string
  /** The box's text;  none:  its `id`. */
  label?: string
  /** A word for what sort of node it is:  its `<g>` is also class and part `kind-<word>`, for a page's own style. */
  kind?: string
  /** Where edges attach:  drawn on the box's sides. */
  ports?: GraphPort[]
  /** A graph inside it, shown when it's opened:  in place, in a modal or instead of the graph (`child-view`). */
  children?: GraphChildren
  /** How THIS node's children open;  none:  the element's `child-view`. */
  childView?: GraphChildView
  /** Starts open (`inline` only). */
  open?: boolean
  /** Hover text (an SVG `<title>`). */
  title?: string
  /** Anything the page wants to keep with the node:  never read by the graph. */
  data?: unknown
}

/** A place on a node's side where edges attach. */
export type GraphPort = {
  /** Unique among its node's ports. */
  id: string
  /** Text beside it;  none:  no text. */
  label?: string
  /**
   * Which side it's on.
   * - None:  `kind` `in` / `input` => `left`, `out` / `output` => `right`;  else the side most of its edges come from.
   */
  side?: GraphPortSide
  /** A word for what sort of port it is:  class and part `kind-<word>`. */
  kind?: string
}

/**
 * One end of an edge:  a node, and optionally one of its ports.
 * - `node` `""` (or left out) is the ENCLOSING node, the one whose `children` this graph is:  `port` names ITS port.
 *   Drawn on the container's side when opened in place, and as a pin on the graph's edge in a modal or drill view.
 */
export type GraphEnd = {
  node?: string
  port?: string
}

/** One edge, from one end to the other. */
export type GraphEdge = {
  /** Unique among its graph's edges;  none:  its index, `#3`. */
  id?: string
  from: GraphEnd
  to: GraphEnd
  /** A word for what sort of edge it is:  class and part `kind-<word>`. */
  kind?: string
  /** Text at the edge's middle. */
  label?: string
  /** Anything the page wants to keep with it. */
  data?: unknown
}

/** A port's side.  Above its type:  the layout lists them. */
export const GraphPortSides = ["left", "right", "top", "bottom"] as const
export type GraphPortSide = (typeof GraphPortSides)[number]

/** How a node's children are shown when it opens.  Above its type:  the vocabulary lists them. */
export const GraphChildViews = ["inline", "modal", "drill"] as const
export type GraphChildView = (typeof GraphChildViews)[number]

/** What's selected:  a node, an edge or a port, by `path` (a node's ids from the top, joined by `/`). */
export type GraphSelection = {
  kind: "node" | "edge" | "port"
  /** The item's own `id` (an edge without one:  `#<index>`). */
  id: string
  /**
   * Where it is:  the node's path (`cpu/alu`), the edge's graph path then `#` and its id (`cpu#e3`),
   * a port's node path then `:` and its id (`cpu/alu:a`).
   */
  path: string
}

////////////////
// ## Layout
////////////////

/** A point in the drawing's user units. */
export type GraphPoint = { readonly x: number; readonly y: number }

/** A port, placed:  absolute, on its node's side. */
export type GraphPlacedPort = GraphPoint & {
  readonly port: GraphPort
  readonly side: GraphPortSide
  /** Its node's path, then `:` and its id. */
  readonly path: string
}

/** A node, placed:  absolute user units, `x` / `y` its top left corner. */
export type GraphPlacedNode = {
  readonly node: GraphNode
  /** Its ids from the top, joined by `/`. */
  readonly path: string
  /** How deep it is:  `0` for the shown graph's own nodes. */
  readonly depth: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly ports: readonly GraphPlacedPort[]
  /** It has children (loaded or not). */
  readonly hasChildren: boolean
  /** It's open in place:  a container, its child graph drawn inside it. */
  readonly isOpen: boolean
  /** Its children are loading. */
  readonly isLoading?: boolean
}

/** An edge, placed:  absolute points, from its start to its end, drawn as a smooth path through them. */
export type GraphPlacedEdge = {
  readonly edge: GraphEdge
  /** Its id, `#<index>` without one. */
  readonly id: string
  /** Its graph's path (`""` at the top), then `#`, then its id. */
  readonly path: string
  /** The paths of what it joins:  a node's path, or a port's (`node:port`). */
  readonly fromPath: string
  readonly toPath: string
  readonly points: readonly GraphPoint[]
  /** Which way it leaves its start and enters its end:  `1` rightwards, `-1` leftwards, `0` up / down. */
  readonly fromSide: GraphPortSide
  readonly toSide: GraphPortSide
  readonly depth: number
}

/** A boundary pin:  an enclosing node's port, drawn on the graph's own edge (modal and drill views). */
export type GraphPlacedPin = GraphPoint & {
  readonly port: GraphPort
  readonly side: GraphPortSide
  readonly path: string
}

/** A graph laid out:  what `<ui-graph>` draws, every level flattened, in user units. */
export type GraphLayoutResult = {
  readonly width: number
  readonly height: number
  /** Every node, parents before their children. */
  readonly nodes: readonly GraphPlacedNode[]
  readonly edges: readonly GraphPlacedEdge[]
  /** The enclosing node's ports, at the top level's sides. */
  readonly pins: readonly GraphPlacedPin[]
}

/** What `GraphLayout` is told besides the graph. */
export type GraphLayoutOptions = {
  metrics?: GraphMetrics
  /** A text's width in user units at `fontSize`;  default:  estimated from its length. */
  textWidth?: (text: string, fontSize: number) => number
  /** A node's text;  default:  its label, else its id. */
  label?: (node: GraphNode) => string
  /** The child graph of each node open in place, by path. */
  openChildren?: ReadonlyMap<string, GraphData>
  /** Paths of nodes whose children are loading. */
  loading?: ReadonlySet<string>
  /** The enclosing node's ports:  drawn as pins on the graph's sides. */
  boundary?: readonly GraphPort[]
  /** The shown graph's own path, `""` at the top:  what its nodes' paths start with. */
  prefix?: string
}

/** Sizes the layout works in, in user units. */
export const GRAPH_METRICS = {
  fontSize: 12,
  portFontSize: 10,
  /** Estimated advance of one character, per font size. */
  charWidth: 0.6,
  paddingX: 12,
  nodeHeight: 32,
  minNodeWidth: 48,
  /** Space between ports along a side. */
  portSpacing: 18,
  portRadius: 3.5,
  /** Space between layers. */
  layerGap: 56,
  /** Space between nodes in a layer. */
  nodeGap: 18,
  /** A container's header (its label and toggle), and the padding round its child graph. */
  headerHeight: 26,
  containerPadding: 14,
  /** Room for the toggle button, right of a label. */
  toggleWidth: 18,
  margin: 24
} as const

export type GraphMetrics = { readonly [K in keyof typeof GRAPH_METRICS]: number }
