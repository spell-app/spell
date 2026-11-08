import { DiagramColumns } from "./DiagramColumns"
import type {
  DiagramBox,
  DiagramColumnSpec,
  DiagramDrawing,
  DiagramEdgeKind,
  DiagramFieldSpec,
  DiagramGroupSpec,
  DiagramMeasure,
  DiagramMove,
  DiagramNodeSpec,
  DiagramShape,
  DiagramShapeRole,
  DiagramSpec,
  DiagramWords
} from "./UIDiagram.types"

/****************
 * ### `DiagramLayout`
 * A diagram's spec laid out:  where every group, box, line and arrowhead goes, in user units.
 * - The NERD skill's layout and routing, ported from its script whole, rule for rule (Owen's skill, epic `mockup`
 *   P10):  the same spec gives the same drawing, so a NERD written for that script opens here.
 *   - boxes:  a coloured header (bold name, a lighter note), a white body of field rows or bullets;
 *     every box in a lane the same width
 *   - groups:  a tinted background, their label above;  side-by-side lanes line up across a column's groups
 *   - lines:  solid for `contains`, dashed for `ref`;  a legend lists only the kinds used
 *   - routing:
 *     - a line leaves from its field's row and lands on its target's HEADER, never a field
 *     - same column, target below:  a right-angle bracket on the right, into the header's right edge
 *     - same column, target above:  a bracket on the left, into the header's bottom centre
 *     - a link to itself:  a short loop on the left, into its own header
 *     - another column:  a curve;  two or more from one column to the same target merge into one "bus"
 *     - lines merge only with the same target, kind AND direction:  else their arrowheads sit side by side
 *     - brackets that don't overlap share a lane;  lines leaving a box to the right start at one x
 * - A box dragged (`moved`) keeps its place in its column, and its lines follow it.
 * - A box holding content (`sizes`):  that size, its lines leaving and landing at its middle.
 * - PURE:  no DOM.  It measures text through `measure`, which defaults to the script's own estimate
 *   (`estimatedWidth()`), so a test needs no browser and gives the script's numbers.
 * - What it does NOT know:  Solid, the element, colours beyond the spec's.  `UIDiagram` draws what it says;
 *   `DiagramSVG` writes it as a file.
 ****************/
export class DiagramLayout {
  /**
   * `spec` laid out.
   * - throws `TypeError` for an edge naming a box or field that isn't there
   */
  static of(spec: DiagramSpec, options: DiagramLayoutOptions = {}): DiagramDrawing {
    return new DiagramLayout(spec, options).drawing()
  }

  /**
   * A text's width in the script's estimate:  Helvetica's widths, scaled for Inter, 6% more for bold.
   * - What a server, a test or a saved SVG measures with;  `UIDiagram` measures in its real font.
   */
  static estimatedWidth(text: string, size: number, bold = false): number {
    let width = 0
    for (const char of text) width += HELVETICA_WIDTHS.get(char) ?? 600
    return (width / 1000) * size * 1.07 * (bold ? 1.06 : 1)
  }

  /** `color`, a `#rrggbb`, mixed with white:  `alpha` of it, the rest white. */
  static tint(color: string, alpha: number): string {
    const hex = /^#([\da-f]{6})$/i.exec(color)?.[1]
    if (!hex) return color
    const channel = (at: number) => {
      const value = Number.parseInt(hex.slice(at, at + 2), 16)
      return Math.round(255 - (255 - value) * alpha)
        .toString(16)
        .padStart(2, "0")
    }
    return `#${channel(0)}${channel(2)}${channel(4)}`
  }

  private constructor(spec: DiagramSpec, options: DiagramLayoutOptions) {
    this.spec = spec
    this.measure = options.measure ?? DiagramLayout.estimatedWidth
    this.words = options.words ?? ENGLISH
    this.moved = options.moved ?? new Map()
    this.sizes = options.sizes ?? new Map()
    this.columns = spec.columns ?? DiagramColumns.of(spec, options.maxColumns ?? DEFAULT_MAX_COLUMNS)
  }

  private readonly spec: DiagramSpec
  private readonly measure: DiagramMeasure
  private readonly words: DiagramWords
  private readonly moved: ReadonlyMap<string, DiagramMove>
  private readonly sizes: ReadonlyMap<string, { width: number; height: number }>
  private readonly columns: readonly DiagramColumnSpec[]

  /** Every box, by name. */
  private readonly nodes = new Map<string, WorkingNode>()
  /** Every lane of every column, left to right:  outer column, then lane. */
  private readonly lanes: WorkingLane[] = []
  /** Every group. */
  private readonly groups: WorkingGroup[] = []
  /** The kinds of line used, in legend order. */
  private kindsUsed: DiagramEdgeKind[] = []
  /** What's drawn, behind and in front. */
  private readonly back: DiagramShape[] = []
  private readonly front: DiagramShape[] = []

  ////////////////
  // ## The steps
  ////////////////

  /** Every step, in order. */
  private drawing(): DiagramDrawing {
    this.sizeNodes()
    this.stackVertically()
    const edges = this.routedEdges()
    let width = this.placeHorizontally(edges)
    this.applyMoves()
    this.drawGroups()
    this.drawNodes()
    this.drawEdges(edges)
    width = this.drawCornerLegend(edges, width)
    const height = Math.max(TOP, ...this.groups.map((group) => group.y1)) + 4
    return this.finished(width + 4, height, edges.all.length)
  }

  /** Each box's size from its texts;  each lane's width, its widest box's. */
  private sizeNodes() {
    const laneOf = new Map<string, WorkingLane>()
    this.columns.forEach((column, columnIndex) => {
      for (const spec of column.groups) {
        const group: WorkingGroup = { spec, column: columnIndex, lanes: [], legendLane: undefined, y0: 0, y1: 0 }
        this.groups.push(group)
        const lanes = spec.legend ? [[]] : (spec.lanes ?? [spec.nodes ?? []])
        lanes.forEach((lane, laneIndex) => {
          if (lane === "legend") group.legendLane = laneIndex
          const key = `${columnIndex}:${laneIndex}`
          let working = laneOf.get(key)
          if (!working) {
            working = { column: columnIndex, lane: laneIndex, width: 0, nodes: [], index: 0, ...ZERO_LANE }
            laneOf.set(key, working)
          }
          const nodes = lane === "legend" ? [] : lane.map((nodeSpec) => this.workingNode(nodeSpec, group, working))
          group.lanes.push(nodes)
          working.nodes.push(...nodes)
        })
      }
    })
    this.lanes.push(...[...laneOf.values()].sort((a, b) => a.column - b.column || a.lane - b.lane))
    this.lanes.forEach((lane, index) => {
      lane.index = index
      const narrowest = lane.nodes.length ? (this.columns[lane.column]!.min_width ?? 150) : 112
      lane.width = Math.max(narrowest, ...lane.nodes.map((node) => node.width))
      const drawn = lane.nodes.filter((node) => !node.hasContent)
      if (!drawn.length && lane.nodes.length) lane.width = Math.max(...lane.nodes.map((node) => node.width))
      for (const node of lane.nodes) {
        // a box holding content keeps that content's width:  its lines leave from its own edge
        if (!node.hasContent) node.width = lane.width
        node.lane = index
      }
    })
    const kinds = new Set((this.spec.edges ?? []).map((edge) => edge.kind ?? "ref"))
    this.kindsUsed = (["contains", "ref"] as const).filter((kind) => kinds.has(kind))
  }

  /** One box, sized. */
  private workingNode(spec: DiagramNodeSpec, group: WorkingGroup, lane: WorkingLane): WorkingNode {
    if (this.nodes.has(spec.name)) {
      throw new TypeError(`DiagramLayout.of():  two boxes are named \`${spec.name}\`;  give each its own name`)
    }
    const fields = (spec.fields ?? []).map((field): DiagramFieldSpec =>
      typeof field === "string" ? { name: field } : field
    )
    const bullets = spec.bullets ?? []
    const content = this.sizes.get(spec.name)
    const rows = fields.length + bullets.length
    const headerHeight = content ? content.height : 22 + (spec.note ? 14 : 0)
    const height = content ? content.height : headerHeight + (rows ? 10 + 18 * rows : 0)
    const width = content
      ? content.width
      : Math.max(
          this.measure(spec.name, 13, true),
          this.measure(spec.note ?? "", 9.5, false),
          ...fields.map((field) => this.measure(this.fieldLabel(field), 10.5, false)),
          ...bullets.map((bullet) => this.measure(`• ${bullet}`, 10.5, false))
        ) + 24
    const node: WorkingNode = {
      spec,
      group,
      color: spec.color ?? group.spec.color ?? DEFAULT_COLOR,
      fields,
      bullets,
      hasContent: !!content,
      headerHeight,
      height,
      width,
      lane: lane.lane,
      x0: 0,
      x1: 0,
      y0: 0,
      headerY: 0,
      fieldY: new Map(),
      tail: 0
    }
    this.nodes.set(spec.name, node)
    return node
  }

  /** A field's row, as drawn:  its name, and `(derived)` when it's worked out. */
  private fieldLabel(field: DiagramFieldSpec): string {
    return field.derived ? `${field.name} ${this.words.derived}` : field.name
  }

  /** Each column's groups stacked from the top, each lane's boxes in each group. */
  private stackVertically() {
    const gap = this.spec.node_gap ?? 22
    const legendRows = this.kindsUsed.length
    this.columns.forEach((_column, columnIndex) => {
      let y = TOP
      for (const group of this.groups.filter((each) => each.column === columnIndex)) {
        y += group.spec.gap_before ?? 0
        group.y0 = y
        y += PAD
        if (group.spec.legend) y += 18 * legendRows - 4
        let lowest = y + (group.legendLane === undefined ? 0 : 18 * legendRows + 10)
        for (const lane of group.lanes) {
          let laneY = y
          lane.forEach((node, index) => {
            laneY += node.spec.gap_before ?? 0
            node.y0 = laneY
            laneY += node.height
            if (index < lane.length - 1) laneY += gap
          })
          lowest = Math.max(lowest, laneY)
        }
        y = lowest + PAD
        group.y1 = y
        y += this.spec.group_gap ?? 40
      }
    })
    for (const node of this.nodes.values()) this.placeRows(node)
  }

  /** Where `node`'s header's middle is, and each field's row. */
  private placeRows(node: WorkingNode) {
    node.headerY = node.y0 + node.headerHeight / 2
    node.fieldY = new Map(
      node.fields.map((field, index) => [
        field.name,
        node.hasContent ? node.headerY : node.y0 + node.headerHeight + 5 + 18 * index + 9
      ])
    )
  }

  /** Each edge's route kind, and the brackets' and buses' lanes. */
  private routedEdges(): RoutedEdges {
    const gap = this.spec.node_gap ?? 22
    const all = (this.spec.edges ?? []).map((spec): WorkingEdge => {
      const dot = spec.from.indexOf(".")
      const fromName = dot < 0 ? spec.from : spec.from.slice(0, dot)
      const field = dot < 0 ? "" : spec.from.slice(dot + 1)
      const from = this.nodes.get(fromName)
      const to = this.nodes.get(spec.to)
      if (!from || !to) {
        throw new TypeError(
          `DiagramLayout.of():  the edge from \`${spec.from}\` to \`${spec.to}\` names a box the diagram has none of`
        )
      }
      const fieldY = dot < 0 ? from.headerY : from.fieldY.get(field)
      if (fieldY === undefined) {
        throw new TypeError(
          `DiagramLayout.of():  box \`${fromName}\` has no field \`${field}\`;  add it to its \`fields\``
        )
      }
      const route: EdgeRoute =
        from === to
          ? "self"
          : from.lane === to.lane
            ? to.y0 > from.y0
              ? "down"
              : "up"
            : to.lane < from.lane
              ? "left"
              : "right"
      return { from, to, field, kind: spec.kind ?? "ref", route, fieldY, laneIndex: 0 }
    })
    const lanesUsed = new Map<string, number>()
    const packed = new Map<string, [number, number, number][]>()
    const pack = (key: string, edges: WorkingEdge[], targetY: number) => {
      const ys = [...edges.map((edge) => edge.fieldY), targetY]
      const low = Math.min(...ys) - 8
      const high = Math.max(...ys) + 8
      const taken = packed.get(key) ?? []
      let index = 0
      while (taken.some(([k, a, b]) => k === index && !(high < a || low > b))) index++
      taken.push([index, low, high])
      packed.set(key, taken)
      for (const edge of edges) edge.laneIndex = index
      lanesUsed.set(key, Math.max(lanesUsed.get(key) ?? -1, index))
    }
    const reach = (edges: WorkingEdge[], to: WorkingNode) =>
      Math.max(...edges.map((edge) => Math.abs(edge.fieldY - to.headerY)))

    const brackets = new Map<string, Bracket>()
    for (const edge of all) {
      if (edge.route !== "down" && edge.route !== "up") continue
      const side = edge.route === "down" ? "R" : "L"
      const key = `${edge.from.lane}|${side}|${edge.to.spec.name}|${edge.kind}`
      const bracket = brackets.get(key) ?? { lane: edge.from.lane, side, to: edge.to, kind: edge.kind, edges: [] }
      bracket.edges.push(edge)
      brackets.set(key, bracket)
    }
    for (const bracket of [...brackets.values()].sort((a, b) => reach(a.edges, a.to) - reach(b.edges, b.to))) {
      const { to } = bracket
      const targetY = bracket.side === "R" ? to.headerY : to.y0 + to.height + gap / 2
      pack(`${bracket.lane}|${bracket.side}`, bracket.edges, targetY)
    }

    const buses = new Map<string, Bracket>()
    for (const edge of all) {
      if (edge.route !== "left") continue
      const key = `${edge.from.lane}|${edge.to.spec.name}|${edge.kind}`
      const bus = buses.get(key) ?? { lane: edge.from.lane, side: "G", to: edge.to, kind: edge.kind, edges: [] }
      bus.edges.push(edge)
      buses.set(key, bus)
    }
    for (const [key, bus] of buses) if (bus.edges.length < 2) buses.delete(key)
    for (const bus of buses.values()) for (const edge of bus.edges) edge.route = "bus"
    for (const bus of [...buses.values()].sort((a, b) => reach(a.edges, a.to) - reach(b.edges, b.to))) {
      pack(`${bus.lane}|G`, bus.edges, bus.to.headerY)
    }

    const selfLoops = new Map<WorkingNode, WorkingEdge[]>()
    for (const edge of all) {
      if (edge.route === "self") selfLoops.set(edge.from, [...(selfLoops.get(edge.from) ?? []), edge])
    }
    return { all, brackets: [...brackets.values()], buses: [...buses.values()], selfLoops, lanesUsed }
  }

  /** Each lane's x, wide enough for its gutters;  returns the drawing's width. */
  private placeHorizontally(edges: RoutedEdges): number {
    const columnGap = this.spec.column_gap ?? 64
    const laneGap = this.spec.lane_gap ?? 56
    const used = (lane: number, side: string) => edges.lanesUsed.get(`${lane}|${side}`)
    let x = 0
    this.lanes.forEach((lane, index) => {
      if (index && lane.column === this.lanes[index - 1]!.column) x += laneGap - columnGap
      const bus = used(index, "G")
      if (bus !== undefined) x += Math.max(0, 30 + LANE * bus + 30 - columnGap)
      const left = used(index, "L")
      let leftGutter = left === undefined ? 0 : LANE0 + LANE * left + 8
      const loops = [...edges.selfLoops].filter(([node]) => node.lane === index).map(([, list]) => list.length)
      if (loops.length) leftGutter = Math.max(leftGutter, 16 + 11 * Math.max(...loops) + 6)
      const right = used(index, "R")
      const rightGutter = right === undefined ? 0 : LANE0 + LANE * right + 8
      lane.groupX0 = x
      lane.nodeX0 = x + PAD + leftGutter
      lane.nodeX1 = lane.nodeX0 + lane.width
      lane.groupX1 = lane.nodeX1 + PAD + rightGutter
      x = lane.groupX1 + columnGap
    })
    for (const node of this.nodes.values()) {
      const lane = this.lanes[node.lane]!
      node.x0 = lane.nodeX0
      node.x1 = lane.nodeX0 + node.width
      node.tail = this.tailOf(node)
    }
    return x - columnGap
  }

  /** Where lines leaving `node` to the right start:  just past its longest field. */
  private tailOf(node: WorkingNode): number {
    if (node.hasContent) return node.x1
    const widths = node.fields.map((field) => this.measure(this.fieldLabel(field), 10.5, false))
    return node.x0 + 12 + Math.max(0, ...widths) + 8
  }

  /** Each dragged box moved by how far it was dragged:  its rows, its tail. */
  private applyMoves() {
    for (const [name, move] of this.moved) {
      const node = this.nodes.get(name)
      if (!node || (!move.dx && !move.dy)) continue
      node.x0 += move.dx
      node.x1 += move.dx
      node.tail += move.dx
      node.y0 += move.dy
      this.placeRows(node)
    }
  }

  ////////////////
  // ## Groups and the legend
  ////////////////

  /** Each group's background and label;  a legend group's, or a legend lane's, rows. */
  private drawGroups() {
    for (const group of this.groups) {
      const { spec } = group
      const color = spec.legend ? (spec.color ?? LEGEND_COLOR) : (spec.color ?? DEFAULT_COLOR)
      const label = spec.legend ? (spec.label ?? this.words.legend) : spec.label
      const usedLanes = group.lanes.map((lane, index) => (lane.length ? index : -1)).filter((index) => index >= 0)
      const first = this.laneAt(group.column, usedLanes[0] ?? 0)
      const last = this.laneAt(group.column, usedLanes.at(-1) ?? 0)
      let x0 = first.groupX0
      let x1 = spec.legend ? x0 + LEGEND_WIDTH : last.groupX1
      let { y0, y1 } = group
      for (const node of group.lanes.flat()) {
        x0 = Math.min(x0, node.x0 - PAD)
        x1 = Math.max(x1, node.x1 + PAD)
        y0 = Math.min(y0, node.y0 - PAD)
        y1 = Math.max(y1, node.y0 + node.height + PAD)
      }
      const background = spec.legend ? (spec.bg ?? LEGEND_BACKGROUND) : (spec.bg ?? DiagramLayout.tint(color, 0.12))
      if (background !== "none") {
        this.rect("back", "group", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 10, fill: background })
      }
      if (spec.legend) this.legendRows(x0, y0)
      if (label)
        this.text("back", spec.legend ? "legend-label" : "group-label", x0 + 4, y0 - 7, label, 12.5, 600, color)
      if (group.legendLane !== undefined) {
        const x = this.laneAt(group.column, group.legendLane).groupX0
        this.legendBox(x, group.y0)
      }
    }
  }

  /** The lane `lane` of column `column`. */
  private laneAt(column: number, lane: number): WorkingLane {
    return this.lanes.find((each) => each.column === column && each.lane === lane) ?? this.lanes[0]!
  }

  /** A legend box of its own, its label above. */
  private legendBox(x: number, y: number) {
    const height = 14 + 18 * this.kindsUsed.length
    this.rect("back", "legend", { x, y, width: LEGEND_WIDTH, height, rx: 10, fill: LEGEND_BACKGROUND })
    this.text("back", "legend-label", x + 4, y - 7, this.words.legend, 12.5, 600, LEGEND_COLOR)
    this.legendRows(x, y)
  }

  /** A row per kind of line used:  a short line, its arrowhead, its name. */
  private legendRows(x: number, y: number) {
    this.kindsUsed.forEach((kind, index) => {
      const rowY = y + 14 + 18 * index
      this.path(`M${n(x + 14)},${n(rowY)} H${n(x + 40)}`, kind)
      this.arrow(x + 47, rowY, "right")
      this.text("front", "legend-text", x + 54, rowY + 3.6, this.wordFor(kind), 10.5, 400, INK)
    })
  }

  /** What a kind of line is called. */
  private wordFor(kind: DiagramEdgeKind): string {
    return kind === "contains" ? this.words.contains : this.words.refersTo
  }

  /** The legend in the top right, when no group places it:  in a column of its own when boxes are there. */
  private drawCornerLegend(edges: RoutedEdges, width: number): number {
    const used = this.kindsUsed.filter((kind) => edges.all.some((edge) => edge.kind === kind))
    const placed = this.groups.some((group) => group.spec.legend || group.legendLane !== undefined)
    if (!used.length || this.spec.legend === false || placed) return width
    const height = 14 + 18 * used.length
    let x = width - LEGEND_WIDTH
    const crowded = [...this.nodes.values()].some((node) => node.x1 > x && node.y0 < TOP + height + 30)
    if (crowded) {
      x = width + 30
      width = x + LEGEND_WIDTH
    }
    this.legendBox(x, TOP)
    return width
  }

  ////////////////
  // ## Boxes
  ////////////////

  /** Each box:  its white body, its coloured header, its outline, its name, note, fields and bullets. */
  private drawNodes() {
    for (const node of this.nodes.values()) {
      const { x0, y0, width, height, headerHeight, color } = node
      const name = node.spec.name
      if (node.hasContent) {
        this.rect("front", "outline", { x: x0, y: y0, width, height, rx: R, fill: "none", node: name })
        continue
      }
      if (height > headerHeight) {
        this.rect("front", "box", { x: x0, y: y0, width, height, rx: R, fill: "#ffffff", node: name })
        const d =
          `M${n(x0)},${n(y0 + headerHeight)} V${n(y0 + R)} Q${n(x0)},${n(y0)} ${n(x0 + R)},${n(y0)} ` +
          `H${n(x0 + width - R)} Q${n(x0 + width)},${n(y0)} ${n(x0 + width)},${n(y0 + R)} V${n(y0 + headerHeight)} Z`
        this.front.push({ type: "path", role: "header", d, fill: color, stroke: color, node: name })
        this.rect("front", "outline", { x: x0, y: y0, width, height, rx: R, fill: "none", stroke: color, node: name })
      } else {
        this.rect("front", "header", { x: x0, y: y0, width, height: headerHeight, rx: R, fill: color, node: name })
      }
      this.text("front", "name", x0 + 12, y0 + 17, name, 13, 600, "#ffffff", name)
      if (node.spec.note) this.text("front", "note", x0 + 12, y0 + 31, node.spec.note, 9.5, 500, "#f8fafc", name)
      node.fields.forEach((field) => {
        const y = node.fieldY.get(field.name)! + 3.6
        this.front.push({
          type: "text",
          role: "field",
          x: x0 + 12,
          y,
          text: this.fieldLabel(field),
          size: 10.5,
          weight: 400,
          fill: INK,
          node: name,
          ...(field.derived && { italic: true })
        })
      })
      node.bullets.forEach((bullet, index) => {
        const y = y0 + headerHeight + 5 + 18 * (node.fields.length + index) + 12.6
        this.text("front", "bullet", x0 + 12, y, `• ${bullet}`, 10.5, 400, INK, name)
      })
    }
  }

  ////////////////
  // ## Lines
  ////////////////

  /** Every line, in the script's order:  brackets, buses, loops, then curves. */
  private drawEdges(edges: RoutedEdges) {
    const gap = this.spec.node_gap ?? 22
    const slots = new Map<string, string[]>()
    const slot = (to: WorkingNode, side: string, kind: string, direction: string) => {
      const key = `${to.spec.name}|${side}`
      const list = slots.get(key) ?? []
      if (!list.includes(`${kind}|${direction}`)) list.push(`${kind}|${direction}`)
      slots.set(key, list)
    }
    for (const edge of edges.all) {
      if (edge.route === "down") slot(edge.to, "R", edge.kind, "down")
      if (edge.route === "left" || edge.route === "bus") slot(edge.to, "R", edge.kind, "x")
      if (edge.route === "right") slot(edge.to, "L", edge.kind, "x")
      if (edge.route === "up") slot(edge.to, "B", edge.kind, "up")
    }
    /** Where an arrowhead lands on `to`'s header:  side by side when kinds or directions differ. */
    const landing = (to: WorkingNode, side: string, kind: string, direction: string) => {
      const list = slots.get(`${to.spec.name}|${side}`)!
      const offset = (list.indexOf(`${kind}|${direction}`) - (list.length - 1) / 2) * HEADER_SLOT
      return side === "B" ? (to.x0 + to.x1) / 2 + offset : to.headerY + offset
    }

    for (const { side, to, kind, edges: list } of edges.brackets) {
      const k = list[0]!.laneIndex
      const lane = this.lanes[list[0]!.from.lane]!
      if (side === "R") {
        const x = Math.max(lane.nodeX1, to.x1, ...list.map((edge) => edge.from.x1)) + LANE0 + LANE * k
        const y = landing(to, "R", kind, "down")
        const far = Math.min(...list.map((edge) => edge.fieldY))
        for (const edge of list) {
          const sy = edge.fieldY
          this.path(`M${n(edge.from.tail)},${n(sy)} H${n(x - RC)} Q${n(x)},${n(sy)} ${n(x)},${n(sy + RC)}`, kind)
        }
        this.path(`M${n(x)},${n(far + RC)} V${n(y - RC)} Q${n(x)},${n(y)} ${n(x - RC)},${n(y)} H${n(to.x1 + 7)}`, kind)
        this.arrow(to.x1, y, "left")
      } else {
        const x = Math.min(lane.nodeX0, to.x0, ...list.map((edge) => edge.from.x0)) - LANE0 - LANE * k
        const middle = to.y0 + to.height + gap / 2
        const cx = landing(to, "B", kind, "up")
        const bottom = to.y0 + to.height
        const far = Math.max(...list.map((edge) => edge.fieldY))
        for (const edge of list) {
          const sy = edge.fieldY
          this.path(`M${n(edge.from.x0 + 3)},${n(sy)} H${n(x + RC)} Q${n(x)},${n(sy)} ${n(x)},${n(sy - RC)}`, kind)
        }
        this.path(
          `M${n(x)},${n(far - RC)} V${n(middle + RC)} Q${n(x)},${n(middle)} ${n(x + RC)},${n(middle)} ` +
            `H${n(cx - RC)} Q${n(cx)},${n(middle)} ${n(cx)},${n(middle - RC)} V${n(bottom + 7)}`,
          kind
        )
        this.arrow(cx, bottom, "up")
      }
    }

    for (const { to, kind, edges: list } of edges.buses) {
      const k = list[0]!.laneIndex
      const lane = this.lanes[list[0]!.from.lane]!
      const groupX = Math.min(lane.groupX0, ...list.map((edge) => edge.from.x0 - (lane.nodeX0 - lane.groupX0)))
      const x = groupX - 16 - LANE * k
      const y = landing(to, "R", kind, "x")
      const end = to.x1
      for (const edge of list) {
        const sy = edge.fieldY
        if (Math.abs(sy - y) < 1) {
          this.path(`M${n(edge.from.x0 + 3)},${n(sy)} H${n(x)}`, kind)
          continue
        }
        const down = y > sy ? 1 : -1
        this.path(`M${n(edge.from.x0 + 3)},${n(sy)} H${n(x + RC)} Q${n(x)},${n(sy)} ${n(x)},${n(sy + down * RC)}`, kind)
      }
      const ys = list.map((edge) => edge.fieldY)
      const above = ys.filter((sy) => sy < y)
      const below = ys.filter((sy) => sy > y)
      if (above.length) this.path(`M${n(x)},${n(Math.min(...above) + RC)} V${n(y - (below.length ? 0 : RC))}`, kind)
      if (below.length) this.path(`M${n(x)},${n(Math.max(...below) - RC)} V${n(y + (above.length ? 0 : RC))}`, kind)
      if (above.length && !below.length) {
        this.path(`M${n(x)},${n(y - RC)} Q${n(x)},${n(y)} ${n(x - RC)},${n(y)} H${n(end + 7)}`, kind)
      } else if (below.length && !above.length) {
        this.path(`M${n(x)},${n(y + RC)} Q${n(x)},${n(y)} ${n(x - RC)},${n(y)} H${n(end + 7)}`, kind)
      } else {
        this.path(`M${n(x)},${n(y)} H${n(end + 7)}`, kind)
      }
      this.arrow(end, y, "left")
    }

    for (const [node, list] of edges.selfLoops) {
      const { x0, headerY } = node
      list.forEach((edge, index) => {
        const off = 16 + 11 * index
        const sy = edge.fieldY
        this.path(
          `M${n(x0 + 3)},${n(sy)} H${n(x0 - 4)} C${n(x0 - off)},${n(sy)} ${n(x0 - off)},${n(headerY)} ${n(x0 - 7)},${n(headerY)}`,
          edge.kind
        )
      })
      this.arrow(x0, headerY, "right")
    }

    for (const edge of edges.all) {
      const { from, to, kind } = edge
      const sy = edge.fieldY
      const lane = this.lanes[from.lane]!
      if (edge.route === "left") {
        const y = landing(to, "R", kind, "x")
        const groupX = Math.min(lane.groupX0, from.x0 - (lane.nodeX0 - lane.groupX0))
        const mx = (groupX + to.x1) / 2
        this.path(
          `M${n(from.x0 + 3)},${n(sy)} L${n(from.x0 - 6)},${n(sy)} C${n(mx)},${n(sy)} ${n(mx)},${n(y)} ${n(to.x1 + 7)},${n(y)}`,
          kind
        )
        this.arrow(to.x1, y, "left")
      } else if (edge.route === "right") {
        const y = landing(to, "L", kind, "x")
        const groupX = Math.max(lane.groupX1, from.x1 + (lane.groupX1 - lane.nodeX1))
        const mx = (groupX + to.x0) / 2
        this.path(
          `M${n(from.tail)},${n(sy)} L${n(groupX)},${n(sy)} C${n(mx)},${n(sy)} ${n(mx)},${n(y)} ${n(to.x0 - 7)},${n(y)}`,
          kind
        )
        this.arrow(to.x0, y, "right")
      }
    }
  }

  ////////////////
  // ## Shapes
  ////////////////

  /** A rectangle. */
  private rect(
    layer: "back" | "front",
    role: DiagramShapeRole,
    props: {
      x: number
      y: number
      width: number
      height: number
      rx: number
      fill: string
      stroke?: string
      node?: string
    }
  ) {
    const { node, stroke, ...box } = props
    this[layer].push({ type: "rect", role, ...box, ...(stroke && { stroke }), ...(node && { node }) })
  }

  /** A text, its baseline at `y`. */
  private text(
    layer: "back" | "front",
    role: DiagramShapeRole,
    x: number,
    y: number,
    text: string,
    size: number,
    weight: number,
    fill: string,
    node?: string
  ) {
    this[layer].push({ type: "text", role, x, y, text, size, weight, fill, ...(node && { node }) })
  }

  /** A line of kind `kind`:  solid, or dashed for `ref`. */
  private path(d: string, kind: DiagramEdgeKind) {
    this.front.push({
      type: "path",
      role: "line",
      d,
      fill: "none",
      stroke: LINE_COLOR,
      ...(DASHES[kind] && { dash: DASHES[kind] })
    })
  }

  /** An arrowhead whose point is at `x`, `y`, pointing `direction`. */
  private arrow(x: number, y: number, direction: "left" | "right" | "up") {
    const points: (readonly [number, number])[] =
      direction === "left"
        ? [
            [x, y],
            [x + 7, y - 3],
            [x + 7, y + 3]
          ]
        : direction === "right"
          ? [
              [x, y],
              [x - 7, y - 3],
              [x - 7, y + 3]
            ]
          : [
              [x, y],
              [x - 3, y + 7],
              [x + 3, y + 7]
            ]
    this.front.push({ type: "arrow", role: "arrow", points, fill: LINE_COLOR })
  }

  /** The drawing, its `viewBox` grown to take in any box dragged outside it. */
  private finished(width: number, height: number, edgeCount: number): DiagramDrawing {
    let x0 = -4
    let y0 = 0
    let x1 = width - 4
    let y1 = height
    for (const name of this.moved.keys()) {
      const node = this.nodes.get(name)
      if (!node) continue
      x0 = Math.min(x0, node.x0 - PAD - 30)
      y0 = Math.min(y0, node.y0 - PAD - 20)
      x1 = Math.max(x1, node.x1 + PAD + 30)
      y1 = Math.max(y1, node.y0 + node.height + PAD)
    }
    const background: DiagramShape = {
      type: "rect",
      role: "background",
      x: x0,
      y: y0,
      width: x1 - x0,
      height: y1 - y0,
      rx: 0,
      fill: "#ffffff"
    }
    const boxes = new Map<string, DiagramBox>(
      [...this.nodes.values()].map((node) => [
        node.spec.name,
        {
          name: node.spec.name,
          x: node.x0,
          y: node.y0,
          width: node.width,
          height: node.height,
          headerHeight: node.headerHeight
        }
      ])
    )
    return {
      x: x0,
      y: y0,
      width: x1 - x0,
      height: y1 - y0,
      shapes: [background, ...this.back, ...this.front],
      boxes,
      edgeCount
    }
  }
}

/** What `DiagramLayout.of()` takes besides the spec. */
export type DiagramLayoutOptions = {
  /** A text's width:  default the script's estimate (`estimatedWidth()`). */
  readonly measure?: DiagramMeasure
  /** The words it draws:  default English. */
  readonly words?: DiagramWords
  /** Boxes dragged from where the layout puts them, by name. */
  readonly moved?: ReadonlyMap<string, DiagramMove>
  /** Boxes that hold content, by name:  that size, in user units. */
  readonly sizes?: ReadonlyMap<string, { width: number; height: number }>
  /** A flat spec's most columns;  default 3. */
  readonly maxColumns?: number
}

////////////////
// ## Working state
////////////////

/** A box as it's laid out. */
type WorkingNode = {
  spec: DiagramNodeSpec
  group: WorkingGroup
  color: string
  fields: DiagramFieldSpec[]
  bullets: readonly string[]
  hasContent: boolean
  headerHeight: number
  height: number
  width: number
  /** Its lane's index in `lanes`. */
  lane: number
  x0: number
  x1: number
  y0: number
  /** Its header's middle, where lines land. */
  headerY: number
  /** Each field row's middle. */
  fieldY: Map<string, number>
  /** Where lines leaving it to the right start. */
  tail: number
}

/** A lane of a column:  boxes stacked, as wide as the widest. */
type WorkingLane = {
  column: number
  lane: number
  width: number
  nodes: WorkingNode[]
  index: number
  groupX0: number
  nodeX0: number
  nodeX1: number
  groupX1: number
}

/** A group as it's laid out. */
type WorkingGroup = {
  spec: DiagramGroupSpec
  column: number
  lanes: WorkingNode[][]
  legendLane: number | undefined
  y0: number
  y1: number
}

/** How an edge goes:  in its column (`down`, `up`), to itself, or to another (`left`, `right`, merged `bus`). */
type EdgeRoute = "self" | "down" | "up" | "left" | "right" | "bus"

/** An edge as it's routed. */
type WorkingEdge = {
  from: WorkingNode
  to: WorkingNode
  field: string
  kind: DiagramEdgeKind
  route: EdgeRoute
  fieldY: number
  /** Its bracket's or bus's lane. */
  laneIndex: number
}

/** Edges that share one bracket (`R`, `L`) or one bus (`G`). */
type Bracket = { lane: number; side: "R" | "L" | "G"; to: WorkingNode; kind: DiagramEdgeKind; edges: WorkingEdge[] }

/** Every edge, and how they're grouped. */
type RoutedEdges = {
  all: WorkingEdge[]
  brackets: Bracket[]
  buses: Bracket[]
  selfLoops: Map<WorkingNode, WorkingEdge[]>
  lanesUsed: Map<string, number>
}

/** A lane's x's before they're placed. */
const ZERO_LANE = { groupX0: 0, nodeX0: 0, nodeX1: 0, groupX1: 0 }

////////////////
// ## The script's numbers
////////////////

/** A number in a path, to a tenth:  what the script writes. */
function n(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/** The top of every column. */
const TOP = 22
/** Room inside a group, around its boxes. */
const PAD = 12
/** A box's corner radius;  a bracket's. */
const R = 6
const RC = 5
/** A bracket's first lane, and the room between lanes. */
const LANE0 = 14
const LANE = 9
/** Room between arrowheads of different kinds on one header. */
const HEADER_SLOT = 9
/** A legend box's width. */
const LEGEND_WIDTH = 112
/** A flat spec's most columns, unless it says. */
const DEFAULT_MAX_COLUMNS = 3

/** Colours the script draws with:  ink, lines, a group or box with none, the legend. */
const INK = "#1f2430"
const LINE_COLOR = "#374151"
const DEFAULT_COLOR = "#475569"
const LEGEND_COLOR = "#4b5563"
const LEGEND_BACKGROUND = "#eceef2"

/** A `ref` line's dashes;  a `contains` line is solid. */
const DASHES: Record<DiagramEdgeKind, string | undefined> = { contains: undefined, ref: "5,2" }

/** The words, unless a page gives its own. */
const ENGLISH: DiagramWords = { legend: "Legend", contains: "contains", refersTo: "refers to", derived: "(derived)" }

/** Helvetica's widths, in the order of `HELVETICA_CHARACTERS`. */
// oxfmt-ignore
const WIDTHS = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,
  278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,
  611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,
  556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584
]

/** Helvetica's widths per character, in thousandths of the font's size:  the script's table. */
const HELVETICA_WIDTHS = new Map(
  Array.from(
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
    (char, index) => [char, WIDTHS[index]!]
  )
)
