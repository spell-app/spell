/**
 * The types and constants of the tree diagram family:  the data contract (`TreeDiagramNode`),
 * the layout's shapes and its metrics, shared by `TreeLayout`, `TreeData` and the component.
 * - Data only:  nothing here runs.
 * - GENERIC:  any tree from plain data.  Spell's parse trees are one caller (docs pages, the app's editor, VS Code);
 *   `ui` never imports spell or the parser.
 */

////////////////
// ## The data contract
////////////////

/** One node of a tree `<ui-tree-diagram>` draws. */
export type TreeDiagramNode = {
  /** The box's text, e.g. `If`, `Variable number`, `Number 15`. */
  label: string
  /** A second, smaller, muted line under the label, e.g. a datatype `number`;  none:  one line. */
  detail?: string
  /** Text on the line from its parent, e.g. `condition`, `body`, `otherwise`.  JSON may say `slot`, its old name. */
  edgeLabel?: string
  /** Hover text (an SVG `<title>`), e.g. the source it came from. */
  title?: string
  /** Its box's colour, a hue of the theme's:  `green`, `blue` ... */
  color?: string
  /** A word for what sort of node it is:  its box is also part `kind-<word>`, for a page's own style. */
  kind?: string
  /** Starts folded:  the nodes under it don't show. */
  folded?: boolean
  /** The `<ui-tree-node>` that wrote it;  none for a tree from JSON. */
  element?: Element
  /** Its children, left to right. */
  children?: TreeDiagramNode[]
}

////////////////
// ## Layout
////////////////

/** A point in the diagram's user units (its `viewBox`). */
export type TreeDiagramPoint = {
  readonly x: number
  readonly y: number
}

/** One node's box, placed:  user units, `x` / `y` its TOP LEFT corner. */
export type TreeDiagramBox = {
  /** The node it draws. */
  readonly node: TreeDiagramNode
  /** Its depth:  `0` for the root. */
  readonly depth: number
  /** Where it is in the tree:  its child index at each depth, `0.2.1`;  `0` for the root. */
  readonly path: string
  readonly x: number
  readonly y: number
  readonly width: number
  /** Every box in a level is as long along the tree as its longest, so edges leave a level at one place. */
  readonly height: number
  /** Where its lines leave it, and its fold button sits. */
  readonly exit: TreeDiagramPoint
  /** Where the label's line is centred (`dominant-baseline: central`). */
  readonly label: TreeDiagramPoint
  /** Where the detail's line is centred;  none without a `detail`. */
  readonly detail?: TreeDiagramPoint
  /** What the node holds besides its text, centred at `x`, `y`;  none when nothing. */
  readonly content?: TreeDiagramPoint & { readonly width: number; readonly height: number }
  /** How many children its node has, folded or not;  none for a leaf. */
  readonly childCount?: number
  /** It's folded:  the nodes under it aren't drawn. */
  readonly isFolded?: boolean
}

/** An edge label, placed:  centred on its edge's midpoint, `width` x `height` the box the edge leaves clear. */
export type TreeDiagramEdgeLabel = {
  readonly text: string
  /** Centre. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** One parent => child line, from where it leaves the parent to where it reaches the child. */
export type TreeDiagramEdge = {
  readonly from: TreeDiagramPoint
  readonly to: TreeDiagramPoint
  /** The child's `edgeLabel`, at the line's midpoint. */
  readonly label?: TreeDiagramEdgeLabel
  /**
   * The stretch of the line NOT drawn, under the edge label:  the line stops at `gap.from`, starts again at `gap.to`.
   */
  readonly gap?: { readonly from: TreeDiagramPoint; readonly to: TreeDiagramPoint }
}

/** A tree laid out:  what `<ui-tree-diagram>` draws, in user units. */
export type TreeDiagramLayout = {
  /** Natural size:  the `viewBox`. */
  readonly width: number
  readonly height: number
  /** Every node's box, depth first (the root first). */
  readonly boxes: readonly TreeDiagramBox[]
  /** Every parent => child line, in the same order as the children's boxes:  `edges[i]` leads to `boxes[i + 1]`. */
  readonly edges: readonly TreeDiagramEdge[]
}

/** Which way a tree grows.  Above the options:  the vocabulary lists them. */
export const TreeDiagramDirections = ["top-down", "left-right"] as const

/** One of `TreeDiagramDirections`. */
export type TreeDiagramDirection = (typeof TreeDiagramDirections)[number]

/** A node's sizes, in user units, as measured (`TreeMeasure`):  what's left out, `TreeLayout` estimates. */
export type TreeDiagramNodeSize = {
  readonly labelWidth?: number
  readonly detailWidth?: number
  readonly edgeLabelWidth?: number
  /** What it holds besides its text. */
  readonly contentWidth?: number
  readonly contentHeight?: number
}

/** What `TreeLayout` is told besides the tree. */
export type TreeDiagramLayoutOptions = {
  /** Sizes it works in.  Default:  `TREE_DIAGRAM_METRICS`. */
  metrics?: TreeDiagramMetrics
  /** Which way it grows.  Default:  `top-down`. */
  direction?: TreeDiagramDirection
  /** Each node's measured sizes, by the node.  Default:  all estimated. */
  sizes?: ReadonlyMap<TreeDiagramNode, TreeDiagramNodeSize>
  /** The nodes drawn as leaves.  Default:  none. */
  folded?: ReadonlySet<TreeDiagramNode>
}

/**
 * Sizes the layout works in, in USER UNITS (the `viewBox`'s):  the label font is `fontSize` units,
 * and the sheet sets the `<svg>`'s width to `width / fontSize` em, so one label `em` on the page is `fontSize` units
 * here.
 * - Text widths are measured in a browser (`TreeMeasure`).  `charWidth` and `edgeLabelCharWidth` are only for a static
 *   server render, with nothing to measure with:  over-estimates, so labels never overflow or collide.
 */
export const TREE_DIAGRAM_METRICS = {
  /** The label's font size;  1em on the page. */
  fontSize: 12,
  /** The detail line's font size. */
  detailFontSize: 10,
  /** The edge label's font size. */
  edgeLabelFontSize: 10,
  /** Estimated advance of one label character, per font size:  a monospace font's, wider than a proportional one's. */
  charWidth: 0.6,
  /** Estimated advance of one edge label character, per font size. */
  edgeLabelCharWidth: 0.56,
  /** Line height, per font size. */
  lineHeight: 1.25,
  /** Space left and right of a box's text. */
  paddingX: 10,
  /** Space above and below a box's text. */
  paddingY: 6,
  /** The narrowest box. */
  minBoxWidth: 32,
  /** Space between one row's boxes and the next row's. */
  levelGap: 36,
  /** Least space between two boxes (or edge labels) side by side. */
  siblingGap: 14,
  /** Space kept clear left and right of an edge label's text. */
  edgeLabelPaddingX: 4,
  /** Space kept clear above and below an edge label's text. */
  edgeLabelPaddingY: 2,
  /** Space around the whole drawing:  room for the root's thicker border. */
  margin: 2
} as const

/** Sizes `TreeLayout` works in:  `TREE_DIAGRAM_METRICS`, or a test's own. */
export type TreeDiagramMetrics = { readonly [K in keyof typeof TREE_DIAGRAM_METRICS]: number }
