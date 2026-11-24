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
  /**
   * The columns its nodes' `group`s make, in order, with each one's header;  a group not listed comes after these,
   * its id its header.  Nodes with no `group` go in a last column, no header.
   */
  groups?: GraphGroup[]
  /**
   * The rows its nodes' `row`s make, top to bottom (`groups` arrangement):  each row starts at the same height in
   * every column, as tall as its tallest cell;  a row not listed comes after these, sorted.  Nodes with no `row` go
   * under the rows (at the top of a column that has none).
   */
  rows?: string[]
}

/** A column of the `groups` arrangement:  its id (what nodes' `group` names) and header. */
export type GraphGroup = { id: string; label?: string }

/** How a graph's nodes are arranged.  Above its type:  the vocabulary lists them. */
export const GraphArrangements = ["auto", "layers", "groups"] as const
export type GraphArrangement = (typeof GraphArrangements)[number]

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
  /**
   * Opened in place, drawn with a frame (the default):  a header and padding round its insides.  `false`:  none, its
   * insides alone, as a row of their own (its box, label and toggle up to the page's style).
   */
  frame?: boolean
  /**
   * The column it goes in (`arrange` `groups`, or `auto` when any node has one):  nodes of a group are stacked top
   * to bottom by `order`, then label.
   */
  group?: string
  /** Its place in its group's column, smallest at the top. */
  order?: number
  /** Room above and below it in its column (between two nodes, the larger);  none:  the metrics' `nodeGap`. */
  spacing?: number
  /** The row it goes in, in its column (`groups` arrangement):  rows line up across the columns (a grid). */
  row?: string
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
  /** Anything the page wants to keep with the port:  never read by the graph. */
  data?: unknown
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
  /** Which side of its start it leaves from, and which side of its end it enters by. */
  readonly fromSide: GraphPortSide
  readonly toSide: GraphPortSide
  readonly depth: number
  /** Routed square through the gaps between layers and rows (never under a box):  drawn with rounded corners. */
  readonly routed?: boolean
  /** Where its label goes:  the middle of its longest run. */
  readonly labelAt?: GraphPoint
}

/** A column of the `groups` arrangement, placed:  a band behind its nodes, its header at the top. */
export type GraphPlacedColumn = {
  readonly id: string
  readonly label: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** How deep its graph is:  `0` for the shown graph. */
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
  /** The columns, when nodes were arranged in `groups`. */
  readonly columns: readonly GraphPlacedColumn[]
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
  /**
   * How nodes are arranged:  `layers` (by their edges), `groups` (a column per `group`), `auto` (groups when any node
   * has one).
   * - `groups` with no node in a group draws layers, as `auto` does:  for one headerless column, give every node the
   *   same `group`.
   */
  arrange?: GraphArrangement
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
  /** Space between rows, when nodes have a `row` (a grid of columns and rows). */
  rowGap: 40,
  /** A container's header (its label and toggle), and the padding round its child graph. */
  headerHeight: 26,
  containerPadding: 14,
  /** Room for the toggle button, right of a label. */
  toggleWidth: 18,
  margin: 24
} as const

export type GraphMetrics = { readonly [K in keyof typeof GRAPH_METRICS]: number }
