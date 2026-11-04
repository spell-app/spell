import {
  TREE_DIAGRAM_METRICS,
  type TreeDiagramBox,
  type TreeDiagramDirection,
  type TreeDiagramEdge,
  type TreeDiagramEdgeLabel,
  type TreeDiagramLayout,
  type TreeDiagramLayoutOptions,
  type TreeDiagramMetrics,
  type TreeDiagramNode,
  type TreeDiagramNodeSize,
  type TreeDiagramPoint
} from "./UITreeDiagram.types"

/****************
 * ### `TreeLayout`
 * A tree laid out as `<ui-tree-diagram>` draws it, top-down or left to right:  `TreeLayout.of(tree, options)`.
 * - PURE:  numbers in, numbers out, no DOM, no Solid;  so the maths is tested alone, and the same tree always gets
 *   the same layout.
 * - Two axes, so one algorithm does both directions:
 *   - the MAIN axis runs from parent to child:  down, or to the right
 *   - the CROSS axis runs between siblings:  across, or down
 * - Levels:  each depth is a level;  every box in a level is as long on the main axis as its longest, so edges leave a
 *   level at one place and every edge label between two levels sits at one place.
 * - Tidy:  a parent is centred over its first and last child;  sibling subtrees are pushed apart, depth by depth,
 *   until no two boxes of the same level are closer than `siblingGap` (contours, after Reingold-Tilford).
 *   - Small subtrees between two big ones spread evenly, rather than packing against the left one:
 *     Reingold-Tilford's "apportion" step, as Buchheim and Walker tell it (`spreadBetween()`).
 * - Edge labels sit at their edge's midpoint, and the edge stops under them (`gap`).
 *   A node's FOOTPRINT, what its level keeps clear, is its box or twice its edge label, whichever is wider:
 *   so no edge label ever overlaps another, nor another edge (sibling's or cousin's), and no line runs under text.
 * - Sizes:  each node's real ones, measured by whoever has a DOM and handed in (`options.sizes`, `TreeMeasure`).
 *   What's not handed in is estimated from character counts (`TreeDiagramMetrics`):  a static server render's case.
 * - A folded node is drawn as a leaf (`options.folded`).
 ****************/
export class TreeLayout {
  /** Sizes it works in. */
  readonly metrics: TreeDiagramMetrics
  /** Which way it grows. */
  readonly direction: TreeDiagramDirection
  /** The measured sizes:  none, all estimated. */
  readonly sizes: ReadonlyMap<TreeDiagramNode, TreeDiagramNodeSize> | undefined
  /** The nodes drawn as leaves. */
  readonly folded: ReadonlySet<TreeDiagramNode> | undefined

  constructor(options: TreeDiagramLayoutOptions = {}) {
    this.metrics = options.metrics ?? TREE_DIAGRAM_METRICS
    this.direction = options.direction ?? "top-down"
    this.sizes = options.sizes
    this.folded = options.folded
  }

  /** `tree` laid out, in user units (`TREE_DIAGRAM_METRICS`, unless `options.metrics` says otherwise).  NEVER throws. */
  static of(tree: TreeDiagramNode, options?: TreeDiagramLayoutOptions): TreeDiagramLayout {
    return new TreeLayout(options).layout(tree)
  }

  /** `tree` laid out. */
  layout(tree: TreeDiagramNode): TreeDiagramLayout {
    const { margin, levelGap } = this.metrics
    const root = this.measure(tree, 0, ROOT_PATH)
    const levelLengths: number[] = []
    // room each level leaves before it, for an edge label laid along the main axis
    const gaps: number[] = []
    TreeLayout.visit(root, (node) => {
      levelLengths[node.depth] = Math.max(levelLengths[node.depth] ?? 0, node.mainLength)
      gaps[node.depth] = Math.max(gaps[node.depth] ?? levelGap, this.gapFor(node))
    })
    const levelStarts = [margin]
    for (let depth = 1; depth < levelLengths.length; depth++)
      levelStarts[depth] = levelStarts[depth - 1]! + levelLengths[depth - 1]! + gaps[depth]!
    this.place(root)
    // centres, from the root at 0, then shifted so the first thing drawn starts at the margin
    const centres = new Map<Measured, number>([[root, 0]])
    TreeLayout.visit(root, (node) => {
      for (const child of node.children) centres.set(child, centres.get(node)! + child.offset)
    })
    let low = Infinity
    let high = -Infinity
    TreeLayout.visit(root, (node) => {
      const centre = centres.get(node)!
      low = Math.min(low, centre - node.crossLength / 2)
      high = Math.max(high, centre + node.crossLength / 2)
      for (const child of node.children) {
        if (!child.edgeLabel) continue
        const middle = (centre + centres.get(child)!) / 2
        low = Math.min(low, middle - child.edgeLabelCross / 2)
        high = Math.max(high, middle + child.edgeLabelCross / 2)
      }
    })
    const shift = margin - low
    const boxes: TreeDiagramBox[] = []
    const edges: TreeDiagramEdge[] = []
    TreeLayout.visit(root, (node, parent) => {
      const cross = centres.get(node)! + shift
      const start = levelStarts[node.depth]!
      boxes.push(this.box(node, cross, start, levelLengths[node.depth]!))
      if (!parent) return
      const from = this.point(levelStarts[parent.depth]! + levelLengths[parent.depth]!, centres.get(parent)! + shift)
      edges.push(this.edge(node, from, this.point(start, cross)))
    })
    const last = levelLengths.length - 1
    const crossTotal = TreeLayout.round(high - low + 2 * margin)
    const mainTotal = TreeLayout.round(levelStarts[last]! + levelLengths[last]! + margin)
    return {
      width: this.isTopDown ? crossTotal : mainTotal,
      height: this.isTopDown ? mainTotal : crossTotal,
      boxes,
      edges
    }
  }

  ////////////////
  // ## Measuring
  ////////////////

  /** Does it grow downward?  Else to the right. */
  private get isTopDown(): boolean {
    return this.direction === "top-down"
  }

  /** `node` and its subtree, sized:  box, edge label, footprint. */
  private measure(node: TreeDiagramNode, depth: number, path: string): Measured {
    const { fontSize, detailFontSize, edgeLabelFontSize, charWidth, edgeLabelCharWidth, lineHeight } = this.metrics
    const { paddingX, paddingY, minBoxWidth, edgeLabelPaddingX, edgeLabelPaddingY } = this.metrics
    const size = this.sizes?.get(node)
    const labelWidth = size?.labelWidth ?? TreeLayout.chars(node.label) * charWidth * fontSize
    const detailWidth = node.detail
      ? (size?.detailWidth ?? TreeLayout.chars(node.detail) * charWidth * detailFontSize)
      : 0
    const contentWidth = size?.contentWidth ?? 0
    const contentHeight = size?.contentHeight ?? 0
    const width = Math.max(minBoxWidth, Math.max(labelWidth, detailWidth, contentWidth) + 2 * paddingX)
    const labelLine = node.label || !contentHeight ? fontSize * lineHeight : 0
    const detailLine = node.detail ? detailFontSize * lineHeight : 0
    const height = 2 * paddingY + labelLine + detailLine + contentHeight
    const edgeLabel = node.edgeLabel || undefined
    const edgeLabelWidth = edgeLabel
      ? (size?.edgeLabelWidth ?? TreeLayout.chars(edgeLabel) * edgeLabelCharWidth * edgeLabelFontSize) +
        2 * edgeLabelPaddingX
      : 0
    const edgeLabelHeight = edgeLabel ? edgeLabelFontSize * lineHeight + 2 * edgeLabelPaddingY : 0
    const edgeLabelCross = this.isTopDown ? edgeLabelWidth : edgeLabelHeight
    const crossLength = this.isTopDown ? width : height
    const isFolded = !!this.folded?.has(node)
    return {
      node,
      depth,
      path,
      width,
      height,
      labelLine,
      detailLine,
      contentWidth,
      contentHeight,
      crossLength,
      mainLength: this.isTopDown ? height : width,
      edgeLabel,
      edgeLabelWidth,
      edgeLabelHeight,
      edgeLabelCross,
      footprint: Math.max(crossLength, 2 * edgeLabelCross),
      isFolded,
      children: isFolded
        ? []
        : (node.children ?? []).map((child, index) => this.measure(child, depth + 1, `${path}.${index}`)),
      offset: 0
    }
  }

  /**
   * The room `node`'s level leaves before it:  `levelGap`, or across a left-to-right tree its edge label's width.
   * - A top-down tree's label is short across the gap, and `levelGap` is always room enough.
   */
  private gapFor(node: Measured): number {
    return this.isTopDown ? this.metrics.levelGap : node.edgeLabelWidth + LABEL_LEAD
  }

  /**
   * Characters in `text`, for an estimate:  code points, so an emoji or accented letter counts once.
   * - NOTE: wide (CJK) characters count one.
   */
  private static chars(text: string): number {
    return Array.from(text).length
  }

  ////////////////
  // ## Placing
  ////////////////

  /**
   * Place `node`'s children (each child's `offset` from `node`'s centre), and return `node`'s subtree's contour:
   * per depth below it (`0` = its own level), the nearest and farthest edge of any footprint, from its centre.
   * - Children are placed in order, each as close to the ones before it as their contours allow;
   *   the ones it had to jump over spread evenly in the room that opens (`spreadBetween()`);
   *   then `node` is centred over its first and last child.
   */
  private place(node: Measured): Contour {
    const half = node.footprint / 2
    if (!node.children.length) return { low: [-half], high: [half] }
    const contours = node.children.map((child) => this.place(child))
    const offsets = [0]
    for (let index = 1; index < contours.length; index++) {
      let needed = -Infinity
      let blocker = index - 1
      let neededByPrevious = -Infinity
      for (let earlier = index - 1; earlier >= 0; earlier--) {
        const distance = offsets[earlier]! + this.clearance(contours[earlier]!, contours[index]!)
        if (earlier === index - 1) neededByPrevious = distance
        if (distance > needed) {
          needed = distance
          blocker = earlier
        }
      }
      offsets[index] = needed
      TreeLayout.spreadBetween(offsets, blocker, index, needed - neededByPrevious)
    }
    const centre = (offsets[0]! + offsets[offsets.length - 1]!) / 2
    for (const [index, child] of node.children.entries()) child.offset = offsets[index]! - centre
    const merged: Contour = { low: [], high: [] }
    for (const [index, contour] of contours.entries()) {
      const at = offsets[index]! - centre
      for (let depth = 0; depth < contour.low.length; depth++) {
        merged.low[depth] = Math.min(merged.low[depth] ?? Infinity, contour.low[depth]! + at)
        merged.high[depth] = Math.max(merged.high[depth] ?? -Infinity, contour.high[depth]! + at)
      }
    }
    return { low: [-half, ...merged.low], high: [half, ...merged.high] }
  }

  /** How far past `before`'s centre `after`'s must be, for the two never to come closer than `siblingGap`. */
  private clearance(before: Contour, after: Contour): number {
    let distance = -Infinity
    const shared = Math.min(before.high.length, after.low.length)
    for (let depth = 0; depth < shared; depth++)
      distance = Math.max(distance, before.high[depth]! - after.low[depth]! + this.metrics.siblingGap)
    return distance
  }

  /**
   * The apportion step:  subtree `last` was pushed `room` further than the one before it needed, because it hit
   * subtree `first`;  the small ones between share that room evenly.
   * - Each moves right by its share of `room`, so each only gets further from the ones before it,
   *   and none reaches `last`:  the one before it had `room` to spare, and moves less than that.
   */
  private static spreadBetween(offsets: number[], first: number, last: number, room: number) {
    const between = last - first
    if (between < 2 || room <= 0) return
    for (let index = first + 1; index < last; index++) offsets[index]! += (room * (index - first)) / between
  }

  ////////////////
  // ## Output
  ////////////////

  /** The point `main` along the main axis, `cross` along the cross axis. */
  private point(main: number, cross: number): TreeDiagramPoint {
    return this.isTopDown ? { x: cross, y: main } : { x: main, y: cross }
  }

  /**
   * `node`'s box, centred on `cross`, in the level from `start`, `length` long on the main axis:
   * its label, detail and content stacked, and centred in it.
   */
  private box(node: Measured, cross: number, start: number, length: number): TreeDiagramBox {
    const { labelLine, detailLine, contentHeight, contentWidth } = node
    const width = this.isTopDown ? node.width : length
    const height = this.isTopDown ? length : node.height
    const x = this.isTopDown ? cross - width / 2 : start
    const y = this.isTopDown ? start : cross - height / 2
    const middle = x + width / 2
    const textTop = y + (height - labelLine - detailLine - contentHeight) / 2
    const round = TreeLayout.round
    const { point: at } = TreeLayout
    const childCount = node.node.children?.length ?? 0
    return {
      node: node.node,
      depth: node.depth,
      path: node.path,
      x: round(x),
      y: round(y),
      width: round(width),
      height: round(height),
      exit: at(this.isTopDown ? { x: middle, y: y + height } : { x: x + width, y: y + height / 2 }),
      label: at({ x: middle, y: textTop + labelLine / 2 }),
      ...(node.node.detail && { detail: at({ x: middle, y: textTop + labelLine + detailLine / 2 }) }),
      ...(contentHeight > 0 && {
        content: {
          ...at({ x: middle, y: textTop + labelLine + detailLine + contentHeight / 2 }),
          width: round(contentWidth),
          height: round(contentHeight)
        }
      }),
      ...(childCount > 0 && { childCount }),
      ...(node.isFolded && childCount > 0 && { isFolded: true })
    }
  }

  /**
   * The line from `from` (the parent's exit) to `to` (`child`'s entrance), with `child`'s edge label at
   * its midpoint and the stretch under the label left out.
   */
  private edge(child: Measured, from: TreeDiagramPoint, to: TreeDiagramPoint): TreeDiagramEdge {
    const { point } = TreeLayout
    if (!child.edgeLabel) return { from: point(from), to: point(to) }
    const dx = to.x - from.x
    const dy = to.y - from.y
    const middle = { x: from.x + dx / 2, y: from.y + dy / 2 }
    const width = child.edgeLabelWidth
    const height = child.edgeLabelHeight
    // the line meets the label's box at its side or its top / bottom, whichever comes first
    const reach = Math.min(dx ? width / 2 / Math.abs(dx) : Infinity, dy ? height / 2 / Math.abs(dy) : Infinity, 0.5)
    const label: TreeDiagramEdgeLabel = {
      text: child.edgeLabel,
      ...point(middle),
      width: TreeLayout.round(width),
      height: TreeLayout.round(height)
    }
    const gap = {
      from: point({ x: middle.x - reach * dx, y: middle.y - reach * dy }),
      to: point({ x: middle.x + reach * dx, y: middle.y + reach * dy })
    }
    return { from: point(from), to: point(to), label, gap }
  }

  /** `value` to 2 decimals:  short, stable markup. */
  private static round(value: number): number {
    return Math.round(value * 100) / 100
  }

  /** `point`, rounded. */
  private static point(point: TreeDiagramPoint): TreeDiagramPoint {
    return { x: TreeLayout.round(point.x), y: TreeLayout.round(point.y) }
  }

  /** Call `visit` on `node`, then on each node below it, depth first;  with each one's parent. */
  private static visit(node: Measured, visit: (node: Measured, parent?: Measured) => void, parent?: Measured) {
    visit(node, parent)
    for (const child of node.children) TreeLayout.visit(child, visit, node)
  }
}

/** The root's `path`;  a child's adds its index, `0.2.1`. */
const ROOT_PATH = "0"

/** Least room left and right of an edge label across a left-to-right tree's gap, together. */
const LABEL_LEAD = 24

/** A node, sized, while it's laid out. */
type Measured = {
  readonly node: TreeDiagramNode
  readonly depth: number
  readonly path: string
  /** The box's own width. */
  readonly width: number
  /** The box's own height. */
  readonly height: number
  /** Height of its label's line;  `0` for a node that's content alone. */
  readonly labelLine: number
  /** Height of its detail's line;  `0` without one. */
  readonly detailLine: number
  readonly contentWidth: number
  readonly contentHeight: number
  /** The box along the cross axis. */
  readonly crossLength: number
  /** The box along the main axis:  drawn as long as its level. */
  readonly mainLength: number
  /** Its edge label's text, when it has one. */
  readonly edgeLabel: string | undefined
  /** Its edge label's box, padding included;  `0` without one. */
  readonly edgeLabelWidth: number
  readonly edgeLabelHeight: number
  /** Its edge label's box along the cross axis. */
  readonly edgeLabelCross: number
  /** What its level keeps clear:  the box, or twice the edge label, whichever is longer. */
  readonly footprint: number
  /** Drawn as a leaf, though it may have children. */
  readonly isFolded: boolean
  readonly children: Measured[]
  /** Its centre, from its parent's;  set by `place()`. */
  offset: number
}

/**
 * A subtree's outline:  per depth below its root, its nearest and farthest footprint edge, from the root's centre.
 */
type Contour = {
  low: number[]
  high: number[]
}
