import {
  GRAPH_METRICS,
  type GraphData,
  type GraphEdge,
  type GraphEnd,
  type GraphGroup,
  type GraphLayoutOptions,
  type GraphLayoutResult,
  type GraphMetrics,
  type GraphNode,
  type GraphPlacedColumn,
  type GraphPlacedEdge,
  type GraphPlacedNode,
  type GraphPlacedPin,
  type GraphPlacedPort,
  type GraphPoint,
  type GraphPort,
  type GraphPortSide
} from "./UIGraph.types"

/****************
 * ### `GraphLayout`
 * Lays a graph out left to right, in layers (a small Sugiyama):  pure, numbers in, boxes and paths out.
 * - The steps, per level:
 *   1. each node's size, from its label and ports;  a node open in place is laid out first, and grows round it
 *   2. cycles broken (depth first, back edges turned round), then layers by longest path, sources pulled right
 *   3. a dummy point per layer a long edge crosses, so it routes round the boxes
 *   4. order within each layer by barycentre sweeps (each box moved towards its neighbours' mean), ports counted
 *   5. x by layer;  y pulled towards each box's neighbours, then pushed apart so nothing overlaps
 *   6. edges ROUTED square:  out of a port into the gap beside its layer (a gutter), down or up the gutter, across
 *      each layer at a gap (a dummy's place, or a row gap beside a box), into the far port from its own side.  So
 *      no edge runs under a box, a back edge goes round its node, and edges sharing a gutter get lanes of their own.
 * - `groups` arrangement (`arrange`, or `auto` when nodes have a `group`):  a column per group instead of layers by
 *   edges, its nodes stacked top to bottom by `order`, a header above;  edges routed the same way.
 * - Edges come out as points;  `pathFor()` turns them into an SVG path with rounded corners.
 * - The enclosing node's ports (`boundary`) are pins in the first and last layers:
 *   a container's own ports sit where its child graph's pins are.
 * - Measured:  200 nodes and 400 edges in one level lay out in tens of milliseconds (`UIGraph`'s docs page).
 * - GENERIC:  imports only the family's types.
 ****************/
export class GraphLayout {
  /** `graph` laid out, every open level flattened into absolute boxes. */
  static of(graph: GraphData, options: GraphLayoutOptions = {}): GraphLayoutResult {
    const layout = new GraphLayout(options)
    const prefix = options.prefix ?? ""
    const level = layout.level(graph, prefix, options.boundary ?? [])
    const nodes: GraphPlacedNode[] = []
    const edges: GraphPlacedEdge[] = []
    const columns: GraphPlacedColumn[] = []
    const { margin } = layout.metrics
    layout.flatten(level, margin, margin, 0, nodes, edges, undefined, columns)
    const pins: GraphPlacedPin[] = level.pins.map((pin) => ({
      port: pin.port,
      side: pin.side,
      path: `${prefix}:${pin.port.id}`,
      x: pin.x + margin,
      y: pin.y + margin
    }))
    return { width: level.width + 2 * margin, height: level.height + 2 * margin, nodes, edges, pins, columns }
  }

  /** `d` of an edge's `<path>`:  cubic curves through its points, leaving and entering along its sides. */
  static pathFor(edge: Pick<GraphPlacedEdge, "points" | "fromSide" | "toSide" | "routed">): string {
    const { points, fromSide, toSide } = edge
    if (points.length < 2) return ""
    if (edge.routed) return GraphLayout.squarePath(points)
    let d = `M${round(points[0].x)} ${round(points[0].y)}`
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1]
      const q = points[i]
      const reach = Math.max(16, Math.abs(q.x - p.x) / 2, Math.abs(q.y - p.y) / 4)
      const forward = Math.sign(q.x - p.x) || 1
      const [c1x, c1y] = i === 1 ? GraphLayout.toward(p, fromSide, reach) : [p.x + forward * reach, p.y]
      const [c2x, c2y] = i === points.length - 1 ? GraphLayout.toward(q, toSide, reach) : [q.x - forward * reach, q.y]
      d += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(q.x)} ${round(q.y)}`
    }
    return d
  }

  /** A square path through `points`, its corners rounded. */
  private static squarePath(points: readonly GraphPoint[]): string {
    const at = simplify(points)
    let d = `M${round(at[0].x)} ${round(at[0].y)}`
    for (let i = 1; i < at.length; i++) {
      const p = at[i - 1]
      const q = at[i]
      const next = at[i + 1]
      if (!next) {
        d += `L${round(q.x)} ${round(q.y)}`
        break
      }
      const r = Math.min(8, Math.hypot(q.x - p.x, q.y - p.y) / 2, Math.hypot(next.x - q.x, next.y - q.y) / 2)
      const toward = (from: GraphPoint, to: GraphPoint, by: number) => {
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
        return { x: from.x + ((to.x - from.x) * by) / length, y: from.y + ((to.y - from.y) * by) / length }
      }
      const a = toward(q, p, r)
      const b = toward(q, next, r)
      d += `L${round(a.x)} ${round(a.y)}Q${round(q.x)} ${round(q.y)} ${round(b.x)} ${round(b.y)}`
    }
    return d
  }

  /** A control point `reach` out of `point`, on `side`. */
  private static toward(point: GraphPoint, side: GraphPortSide, reach: number): [number, number] {
    switch (side) {
      case "left":
        return [point.x - reach, point.y]
      case "right":
        return [point.x + reach, point.y]
      case "top":
        return [point.x, point.y - reach]
      case "bottom":
        return [point.x, point.y + reach]
    }
  }

  /** The middle of an edge's path, for its label. */
  static middleOf(edge: Pick<GraphPlacedEdge, "points" | "labelAt">): GraphPoint {
    if (edge.labelAt) return edge.labelAt
    const { points } = edge
    if (points.length % 2 === 1) return points[(points.length - 1) / 2]
    const p = points[points.length / 2 - 1]
    const q = points[points.length / 2]
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  }

  /** A port's side:  its own, else its kind's, else where most of its edges are drawn from. */
  static sideOf(port: GraphPort, votes: { asSource: number; asTarget: number } | undefined): GraphPortSide {
    if (port.side) return port.side
    const kind = port.kind?.toLowerCase()
    if (kind === "in" || kind === "input") return "left"
    if (kind === "out" || kind === "output") return "right"
    if (!votes) return "right"
    return votes.asTarget > votes.asSource ? "left" : "right"
  }

  private readonly metrics: GraphMetrics
  private readonly options: GraphLayoutOptions

  private constructor(options: GraphLayoutOptions) {
    this.options = options
    this.metrics = options.metrics ?? GRAPH_METRICS
  }

  private textWidth(text: string, fontSize: number): number {
    return this.options.textWidth?.(text, fontSize) ?? text.length * fontSize * this.metrics.charWidth
  }

  private labelOf(node: GraphNode): string {
    return this.options.label?.(node) ?? node.label ?? node.id
  }

  ////////////////
  // ## One level
  ////////////////

  /** One graph laid out, its coordinates relative to its own top left. */
  private level(
    graph: GraphData,
    prefix: string,
    boundary: readonly GraphPort[],
    boundarySides?: ReadonlyMap<GraphPort, GraphPortSide>
  ): Level {
    const m = this.metrics
    const nodes = graph.nodes ?? []
    const byId = new Map<string, Unit>()
    const units: Unit[] = []
    const edges = graph.edges ?? []

    // Votes for each port's side:  how often it starts an edge, and ends one.
    const votes = new Map<string, { asSource: number; asTarget: number }>()
    const vote = (end: GraphEnd, key: "asSource" | "asTarget") => {
      if (end.port === undefined) return
      const id = `${end.node ?? ""}:${end.port}`
      const tally = votes.get(id) ?? { asSource: 0, asTarget: 0 }
      tally[key]++
      votes.set(id, tally)
    }
    for (const edge of edges) {
      vote(edge.from, "asSource")
      vote(edge.to, "asTarget")
    }

    // 1. Sizes.
    for (const node of nodes) {
      if (!node || typeof node.id !== "string" || byId.has(node.id)) continue
      const path = prefix ? `${prefix}/${node.id}` : node.id
      const unit = this.box(node, path, (port) => GraphLayout.sideOf(port, votes.get(`${node.id}:${port.id}`)))
      byId.set(node.id, unit)
      units.push(unit)
    }

    // Pins:  the enclosing node's ports.  Inside, a left pin STARTS edges, so it's drawn facing right.
    const pins = new Map<string, Unit>()
    for (const port of boundary) {
      const inside = votes.get(`:${port.id}`)
      const side = boundarySides?.get(port) ?? GraphLayout.sideOf(port, inside && flip(inside))
      const pin: Unit = {
        kind: "pin",
        width: 0,
        height: m.portSpacing,
        layer: 0,
        order: 0,
        x: 0,
        y: 0,
        ports: [],
        pin: { port, side: side === "left" || side === "top" ? "left" : "right" }
      }
      pins.set(port.id, pin)
      units.push(pin)
    }

    // Resolve each edge's ends.
    const links: Link[] = []
    edges.forEach((edge, index) => {
      if (!edge?.from || !edge?.to) return
      const from = this.endOf(edge.from, "from", byId, pins, prefix)
      const to = this.endOf(edge.to, "to", byId, pins, prefix)
      if (!from || !to) return
      const id = edge.id ?? `#${index}`
      links.push({ edge, id, from, to, reversed: false, chain: [] })
    })

    // 2. Layers:  by the edges, or a column per group.
    const grouped = this.options.arrange !== "layers" && nodes.some((node) => node && node.group !== undefined)
    const columnOf = grouped ? this.assignColumns(units, links, graph) : undefined
    if (!grouped) this.assignLayers(units, links)

    // 3. Dummies along long edges.
    const layerCount = Math.max(0, ...units.map((unit) => unit.layer)) + 1
    for (const link of links) {
      const [a, b] = link.reversed ? [link.to, link.from] : [link.from, link.to]
      link.chain = [a.unit]
      for (let layer = a.unit.layer + 1; layer < b.unit.layer; layer++) {
        const dummy: Unit = { kind: "dummy", width: 0, height: 4, layer, order: 0, x: 0, y: 0, ports: [] }
        units.push(dummy)
        link.chain.push(dummy)
      }
      link.chain.push(b.unit)
    }

    const layers: Unit[][] = Array.from({ length: layerCount }, () => [])
    for (const unit of units) layers[unit.layer].push(unit)
    layers.forEach((layer) => layer.forEach((unit, order) => (unit.order = order)))

    // Neighbours, for the sweeps:  each segment of each chain, with the y offset it attaches at on each side.
    for (const link of links) {
      const [a, b] = link.reversed ? [link.to, link.from] : [link.from, link.to]
      for (let i = 0; i + 1 < link.chain.length; i++) {
        const u = link.chain[i]
        const v = link.chain[i + 1]
        if (u.layer === v.layer) continue
        const uOffset = i === 0 ? a.dy : u.height / 2
        const vOffset = i + 1 === link.chain.length - 1 ? b.dy : v.height / 2
        ;(u.down ??= []).push({ unit: v, mine: uOffset, theirs: vOffset })
        ;(v.up ??= []).push({ unit: u, mine: vOffset, theirs: uOffset })
      }
    }

    // 4. Order:  in columns, the nodes by `order` then label, the dummies under them.
    this.order(layers)
    if (grouped) {
      const rank = (unit: Unit) => (unit.kind === "node" ? 0 : 1)
      const label = (unit: Unit) => (unit.node ? this.labelOf(unit.node) : "")
      for (const layer of layers) {
        layer.sort(
          (a, b) =>
            rank(a) - rank(b) ||
            (rank(a) === 0
              ? (a.node!.order ?? Infinity) - (b.node!.order ?? Infinity) ||
                label(a).localeCompare(label(b), undefined, { numeric: true })
              : a.order - b.order)
        )
        layer.forEach((unit, order) => (unit.order = order))
      }
    }

    // 5. Coordinates.
    const headers = columnOf?.map((column) => (column?.label ? this.textWidth(column.label, m.portFontSize) + 16 : 0))
    const { width, height, layerX, layerWidth } = this.place(
      layers,
      links,
      grouped,
      headers,
      grouped ? graph.rows : undefined
    )

    // 6. Routes.
    const routes = this.route(links, layers, layerX, layerWidth)

    const columns: LevelColumn[] = []
    if (columnOf)
      columnOf.forEach((column, index) => {
        if (!column || !layers[index]?.some((unit) => unit.kind === "node")) return
        columns.push({
          id: column.id,
          label: column.label ?? "",
          x: layerX[index] - 10,
          y: 0,
          width: layerWidth[index] + 20,
          height
        })
      })

    // Points per edge.
    const placedEdges: LevelEdge[] = []
    links.forEach((link, index) => {
      const { points, labelAt } = routes[index]
      placedEdges.push({
        edge: link.edge,
        id: link.id,
        points,
        routed: true,
        labelAt,
        fromSide: link.from.side,
        toSide: link.to.side,
        fromPath: link.from.path,
        toPath: link.to.path,
        fromPin: link.from.unit.kind === "pin" ? link.from.unit.pin!.port.id : undefined,
        toPin: link.to.unit.kind === "pin" ? link.to.unit.pin!.port.id : undefined
      })
    })

    const levelPins = [...pins.values()].map((pin) => ({
      port: pin.pin!.port,
      side: pin.pin!.side,
      x: pin.pin!.side === "left" ? 0 : width,
      y: pin.y + pin.height / 2
    }))

    return {
      width,
      height,
      units: units.filter((unit) => unit.kind === "node"),
      edges: placedEdges,
      pins: levelPins,
      columns,
      prefix
    }
  }

  /** A node's box:  a leaf sized to its label and ports, or a container round its laid out child graph. */
  private box(node: GraphNode, path: string, sideOf: (port: GraphPort) => GraphPortSide): Unit {
    const m = this.metrics
    const label = this.labelOf(node)
    const ports = (node.ports ?? []).filter((port) => port && typeof port.id === "string")
    const sides = new Map(ports.map((port) => [port, sideOf(port)]))
    const on = (side: GraphPortSide) => ports.filter((port) => sides.get(port) === side)
    const portLabelWidth = (side: GraphPortSide) =>
      Math.max(0, ...on(side).map((port) => (port.label ? this.textWidth(port.label, m.portFontSize) + 6 : 0)))
    const hasChildren = node.children !== undefined
    const childGraph = this.options.openChildren?.get(path)
    const labelWidth = this.textWidth(label, m.fontSize) + 2 * m.paddingX + (hasChildren ? m.toggleWidth : 0)

    const unit: Unit = {
      kind: "node",
      node,
      path,
      width: 0,
      height: 0,
      layer: 0,
      order: 0,
      x: 0,
      y: 0,
      ports: [],
      hasChildren,
      isLoading: this.options.loading?.has(path)
    }

    if (childGraph) {
      const child = this.level(childGraph, path, ports, sides)
      unit.child = child
      unit.width = Math.max(labelWidth, child.width + 2 * m.containerPadding)
      unit.height = m.headerHeight + child.height + m.containerPadding
      const insetX = (unit.width - child.width) / 2
      for (const pin of child.pins) {
        const side = pin.side
        unit.ports.push({
          port: pin.port,
          side,
          dx: side === "left" ? 0 : unit.width,
          dy: m.headerHeight + pin.y
        })
      }
      unit.childOffset = { x: insetX, y: m.headerHeight }
      this.spread(unit, on("top"), "top")
      this.spread(unit, on("bottom"), "bottom")
      return unit
    }

    const tall = Math.max(on("left").length, on("right").length)
    const wide = Math.max(on("top").length, on("bottom").length)
    unit.height = Math.max(m.nodeHeight, (tall + 1) * m.portSpacing)
    unit.width = Math.max(
      m.minNodeWidth,
      labelWidth + portLabelWidth("left") + portLabelWidth("right"),
      (wide + 1) * m.portSpacing
    )
    for (const side of ["left", "right", "top", "bottom"] as const) this.spread(unit, on(side), side)
    return unit
  }

  /** Place `ports` evenly along `unit`'s `side`. */
  private spread(unit: Unit, ports: GraphPort[], side: GraphPortSide) {
    ports.forEach((port, index) => {
      const along = (index + 1) / (ports.length + 1)
      if (side === "left" || side === "right")
        unit.ports.push({ port, side, dx: side === "left" ? 0 : unit.width, dy: along * unit.height })
      else unit.ports.push({ port, side, dx: along * unit.width, dy: side === "top" ? 0 : unit.height })
    })
  }

  /** Where an edge's end attaches;  `undefined` for an end naming nothing in this graph. */
  private endOf(
    end: GraphEnd,
    role: "from" | "to",
    byId: Map<string, Unit>,
    pins: Map<string, Unit>,
    prefix: string
  ): End | undefined {
    if (!end.node) {
      const pin = end.port !== undefined ? pins.get(end.port) : undefined
      if (!pin) return undefined
      return {
        unit: pin,
        dx: 0,
        dy: pin.height / 2,
        side: pin.pin!.side === "left" ? "right" : "left",
        path: `${prefix}:${end.port}`
      }
    }
    const unit = byId.get(end.node)
    if (!unit) return undefined
    const port = end.port !== undefined ? unit.ports.find((each) => each.port.id === end.port) : undefined
    if (port) return { unit, dx: port.dx, dy: port.dy, side: port.side, path: `${unit.path}:${port.port.id}` }
    return role === "from"
      ? { unit, dx: unit.width, dy: unit.height / 2, side: "right", path: unit.path! }
      : { unit, dx: 0, dy: unit.height / 2, side: "left", path: unit.path! }
  }

  /** Layers:  cycles broken, longest path from the sources, sources pulled next to what they feed;  pins at the sides. */
  private assignLayers(units: Unit[], links: Link[]) {
    const nodes = units.filter((unit) => unit.kind === "node")
    const out = new Map<Unit, Link[]>(nodes.map((unit) => [unit, []]))
    const inDegree = new Map<Unit, number>(nodes.map((unit) => [unit, 0]))
    const between = links.filter((link) => link.from.unit.kind === "node" && link.to.unit.kind === "node")

    // Depth first, iteratively:  an edge back to a node still on the stack is turned round.
    for (const link of between) out.get(link.from.unit)!.push(link)
    const state = new Map<Unit, 1 | 2>()
    for (const root of nodes) {
      if (state.has(root)) continue
      const stack: [Unit, number][] = [[root, 0]]
      state.set(root, 1)
      const outs = (unit: Unit) => out.get(unit)!
      while (stack.length) {
        const top = stack[stack.length - 1]
        const list = outs(top[0])
        if (top[1] >= list.length) {
          state.set(top[0], 2)
          stack.pop()
          continue
        }
        const link = list[top[1]++]
        const next = link.to.unit
        if (next === top[0]) continue
        const seen = state.get(next)
        if (seen === 1) link.reversed = true
        else if (!seen) {
          state.set(next, 1)
          stack.push([next, 0])
        }
      }
    }

    // Longest path, in topological order.
    const succ = new Map<Unit, Unit[]>(nodes.map((unit) => [unit, []]))
    const pred = new Map<Unit, Unit[]>(nodes.map((unit) => [unit, []]))
    for (const link of between) {
      const [a, b] = link.reversed ? [link.to.unit, link.from.unit] : [link.from.unit, link.to.unit]
      if (a === b) continue
      succ.get(a)!.push(b)
      pred.get(b)!.push(a)
      inDegree.set(b, inDegree.get(b)! + 1)
    }
    const queue = nodes.filter((unit) => inDegree.get(unit) === 0)
    const topo: Unit[] = []
    for (let i = 0; i < queue.length; i++) {
      const unit = queue[i]
      topo.push(unit)
      for (const next of succ.get(unit)!) {
        next.layer = Math.max(next.layer, unit.layer + 1)
        inDegree.set(next, inDegree.get(next)! - 1)
        if (inDegree.get(next) === 0) queue.push(next)
      }
    }
    // Sources pulled right, next to the nearest node they feed.
    for (let i = topo.length - 1; i >= 0; i--) {
      const unit = topo[i]
      const nexts = succ.get(unit)!
      if (pred.get(unit)!.length === 0 && nexts.length)
        unit.layer = Math.max(unit.layer, Math.min(...nexts.map((next) => next.layer)) - 1)
    }

    // Pins:  left ones before every node, right ones after.
    const pins = units.filter((unit) => unit.kind === "pin")
    const hasLeft = pins.some((pin) => pin.pin!.side === "left")
    if (hasLeft) for (const unit of nodes) unit.layer++
    const last = Math.max(0, ...nodes.map((unit) => unit.layer))
    for (const pin of pins) pin.layer = pin.pin!.side === "left" ? 0 : last + (nodes.length ? 1 : 0)

    // Links between pins and nodes go forward or are turned round.
    for (const link of links)
      if (link.from.unit.kind === "pin" || link.to.unit.kind === "pin")
        link.reversed = link.from.unit.layer > link.to.unit.layer
  }

  /** Order within each layer:  barycentre sweeps, down then up, keeping the best. */
  private order(layers: Unit[][]) {
    const position = (unit: Unit, offset: number) => unit.order + offset / Math.max(1, unit.height)
    const sweep = (layer: Unit[], side: "up" | "down") => {
      const centre = new Map<Unit, number>()
      for (const unit of layer) {
        const near = unit[side]
        if (!near?.length) centre.set(unit, unit.order)
        else centre.set(unit, near.reduce((sum, each) => sum + position(each.unit, each.theirs), 0) / near.length)
      }
      layer.sort((a, b) => centre.get(a)! - centre.get(b)! || a.order - b.order)
      layer.forEach((unit, order) => (unit.order = order))
    }
    for (let round = 0; round < 6; round++) {
      if (round % 2 === 0) for (let i = 1; i < layers.length; i++) sweep(layers[i], "up")
      else for (let i = layers.length - 2; i >= 0; i--) sweep(layers[i], "down")
    }
  }

  /**
   * x by layer, y pulled towards neighbours without overlapping;  the level's size, and each layer's x and width.
   * - `grouped`:  each column's nodes stacked from the top under its header (`headers`, each one's width), as a rack
   *   is drawn;  only pins are pulled towards what they reach.
   */
  private place(
    layers: Unit[][],
    links: Link[],
    grouped = false,
    headers?: number[],
    rowOrder?: string[]
  ): { width: number; height: number; layerX: number[]; layerWidth: number[] } {
    const m = this.metrics
    const gapAfter = (unit: Unit, next?: Unit) => GraphLayout.gapBetween(unit, next, m.nodeGap)

    // x:  each layer as wide as its widest box (or header), boxes centred in it;  busier gaps are wider.
    const crossings = new Array(layers.length).fill(0)
    for (const link of links) for (let i = 0; i + 1 < link.chain.length; i++) crossings[link.chain[i].layer]++
    const layerX: number[] = []
    const layerWidth: number[] = []
    let x = 0
    layers.forEach((layer, index) => {
      const width = Math.max(0, headers?.[index] ?? 0, ...layer.map((unit) => unit.width))
      for (const unit of layer) unit.x = x + (width - unit.width) / 2
      layerX.push(x)
      layerWidth.push(width)
      x += width + m.layerGap + Math.min(60, Math.sqrt(crossings[index]) * 6)
    })

    const pull = (layer: Unit[], side: "up" | "down") => {
      const wanted = layer.map((unit) => {
        const near = [...(unit[side] ?? []), ...(unit[side === "up" ? "down" : "up"] ?? [])]
        if (!near.length) return unit.y
        return near.reduce((sum, each) => sum + each.unit.y + each.theirs - each.mine, 0) / near.length
      })
      GraphLayout.separate(layer, wanted, gapAfter)
    }

    // y:  stacked, then (layers) pulled towards the neighbours' attachment points, in a few sweeps.
    // Room above for headers (none without labels:  a row's gap, for edges going round the top).
    const top = grouped ? (headers?.some((width) => width > 0) ? m.headerHeight + 8 : m.nodeGap) : 0
    for (const layer of layers) {
      let y = top
      layer.forEach((unit, index) => {
        unit.y = y
        y += unit.height + gapAfter(unit, layer[index + 1])
      })
    }
    // Rows (a grid):  each row starts at one height across the columns, as tall as its tallest cell.
    const rowOf = (unit: Unit) => (unit.kind === "node" ? unit.node!.row : undefined)
    const rowIds = [
      ...new Set(
        layers
          .flat()
          .map(rowOf)
          .filter((row): row is string => row !== undefined)
      )
    ]
    if (grouped && rowIds.length) {
      const listed = (rowOrder ?? []).filter((row) => rowIds.includes(row))
      const rest = rowIds
        .filter((row) => !listed.includes(row))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      const rows = [...listed, ...rest]
      const cellHeight = (layer: Unit[], row: string) => {
        const cell = layer.filter((unit) => rowOf(unit) === row)
        return cell.reduce((sum, unit, index) => sum + unit.height + gapAfter(unit, cell[index + 1]), 0)
      }
      const rowY = new Map<string, number>()
      let y = top
      for (const row of rows) {
        rowY.set(row, y)
        y += Math.max(0, ...layers.map((layer) => cellHeight(layer, row))) + m.rowGap
      }
      const below = y
      for (const layer of layers) {
        const at = new Map(rowY)
        const hasRows = layer.some((unit) => rowOf(unit) !== undefined)
        let rest = hasRows ? below : top
        const placed = layer.filter((unit) => unit.kind === "node")
        placed.forEach((unit, index) => {
          const row = rowOf(unit)
          const next = placed.slice(index + 1).find((each) => rowOf(each) === row)
          if (row === undefined) {
            unit.y = rest
            rest += unit.height + gapAfter(unit, next)
          } else {
            unit.y = at.get(row)!
            at.set(row, unit.y + unit.height + gapAfter(unit, next))
          }
        })
      }
      // A long edge's dummies:  at the height its neighbours pull it to, moved to the nearest free gap in its column
      // (not stacked under the rows, which sent edges on long jogs down and back).
      const dummies = layers.map((layer) => layer.filter((unit) => unit.kind === "dummy"))
      for (let round = 0; round < 4; round++)
        layers.forEach((layer, index) => {
          const taken = layer
            .filter((unit) => unit.kind === "node")
            .map((unit) => [unit.y - 8, unit.y + unit.height + 8])
          for (const dummy of dummies[index]) {
            const near = [...(dummy.up ?? []), ...(dummy.down ?? [])]
            let y = near.length
              ? near.reduce((sum, each) => sum + each.unit.y + each.theirs - each.mine, 0) / near.length
              : dummy.y
            for (let tries = 0; tries < taken.length + 1; tries++) {
              const hit = taken.find(([low, high]) => y + dummy.height > low && y < high)
              if (!hit) break
              y = y + dummy.height / 2 - hit[0] < hit[1] - y ? hit[0] - dummy.height : hit[1]
            }
            dummy.y = Math.max(0, y)
            taken.push([dummy.y - 3, dummy.y + dummy.height + 3])
          }
        })
    }
    if (grouped) {
      const pinsOnly = (layer: Unit[]) => layer.length > 0 && layer.every((unit) => unit.kind === "pin")
      for (let round = 0; round < 2; round++)
        for (const layer of layers) if (pinsOnly(layer)) pull(layer, round % 2 ? "up" : "down")
      for (const layer of layers)
        if (pinsOnly(layer)) {
          const shift = Math.max(0, top - Math.min(...layer.map((unit) => unit.y)))
          for (const unit of layer) unit.y += shift
        }
    } else {
      const tallest = Math.max(
        0,
        ...layers.map((layer) =>
          layer.reduce((sum, unit, index) => sum + unit.height + gapAfter(unit, layer[index + 1]), 0)
        )
      )
      for (const layer of layers) {
        const used = layer.reduce((sum, unit, index) => sum + unit.height + gapAfter(unit, layer[index + 1]), 0)
        for (const unit of layer) unit.y += (tallest - used) / 2
      }
      for (let round = 0; round < 8; round++) {
        if (round % 2 === 0) for (let i = 1; i < layers.length; i++) pull(layers[i], "up")
        else for (let i = layers.length - 2; i >= 0; i--) pull(layers[i], "down")
      }
    }

    // Normalised to start at 0, with a row's gap above and below for edges going round.
    const all = layers.flat()
    const least = Math.min(0, ...all.map((unit) => unit.y)) - (grouped ? 0 : m.nodeGap)
    for (const unit of all) unit.y -= least
    const width = Math.max(0, ...all.map((unit) => unit.x + unit.width))
    const height = Math.max(0, ...all.map((unit) => unit.y + unit.height)) + m.nodeGap
    return { width, height, layerX, layerWidth }
  }

  /** Columns:  a layer per group, in the graph's `groups` order, then the rest, then nodes with none;  pins at the sides. */
  private assignColumns(units: Unit[], links: Link[], graph: GraphData): (GraphGroup | undefined)[] {
    const nodes = units.filter((unit) => unit.kind === "node")
    const used = new Set(nodes.map((unit) => unit.node!.group).filter((group): group is string => group !== undefined))
    const order: GraphGroup[] = []
    for (const group of graph.groups ?? [])
      if (used.has(group.id) && !order.some((each) => each.id === group.id)) order.push(group)
    for (const id of used) if (!order.some((each) => each.id === id)) order.push({ id, label: id })
    const ungrouped = nodes.some((unit) => unit.node!.group === undefined)
    const pins = units.filter((unit) => unit.kind === "pin")
    const offset = pins.some((pin) => pin.pin!.side === "left") ? 1 : 0
    for (const unit of nodes) {
      const index = order.findIndex((each) => each.id === unit.node!.group)
      unit.layer = offset + (index < 0 ? order.length : index)
    }
    const last = offset + order.length + (ungrouped ? 1 : 0) - 1
    for (const pin of pins) pin.layer = pin.pin!.side === "left" ? 0 : last + 1
    for (const link of links) link.reversed = link.from.unit.layer > link.to.unit.layer
    const columns: (GraphGroup | undefined)[] = []
    order.forEach((group, index) => (columns[offset + index] = group))
    if (ungrouped) columns[offset + order.length] = { id: "", label: "" }
    return columns
  }

  /**
   * Each link's route, square, in draw order (from its start to its end):  never under a box.
   * - Out of its start port into the gutter on that side;  each dummy is a gap its layer leaves free, crossed
   *   level;  the end port is entered from its side's gutter, crossing the end's layer at a row gap first if need be
   *   (a back edge, an edge within one column).
   * - Within one layer (a column):  round whichever side, left or right, is less busy along its length.
   * - Lanes:  the vertical runs that overlap in a gutter are spread across it, so parallel edges don't lie on one
   *   another;  runs that don't overlap share a lane.
   */
  private route(
    links: Link[],
    layers: Unit[][],
    layerX: number[],
    layerWidth: number[]
  ): { points: GraphPoint[]; labelAt?: GraphPoint }[] {
    const m = this.metrics
    const count = layers.length
    const gutterX = (g: number) => {
      if (count === 0) return 0
      if (g <= 0) return layerX[0] - m.layerGap / 2
      if (g >= count) return layerX[count - 1] + layerWidth[count - 1] + m.layerGap / 2
      return (layerX[g - 1] + layerWidth[g - 1] + layerX[g]) / 2
    }
    const gutterRoom = (g: number) =>
      g <= 0 || g >= count ? m.layerGap * 0.6 : (layerX[g] - layerX[g - 1] - layerWidth[g - 1]) * 0.7
    const gapAfter = (unit: Unit, next?: Unit) => GraphLayout.gapBetween(unit, next, m.nodeGap)

    /** A free y to cross `layer` at, near `y` (and near `unit`, when it's in that layer). */
    const crossingY = (layer: number, y: number, unit?: Unit) => {
      const list = layers[layer] ?? []
      const gaps: number[] = []
      if (list.length) gaps.push(list[0].y - m.nodeGap / 2)
      list.forEach((each, index) => gaps.push(each.y + each.height + gapAfter(each, list[index + 1]) / 2))
      const near = unit && unit.layer === layer ? unit.y + unit.height / 2 : y
      return gaps.reduce((best, gap) => (Math.abs(gap - near) < Math.abs(best - near) ? gap : best), gaps[0] ?? y)
    }

    type Run = { route: number; index: number; g: number; low: number; high: number }
    const runs: Run[] = []
    /**
     * `link`'s route.  An edge whose ends are in one layer (a column's) must cross it once:  near its END (its long
     * run in the start's gutter) or near its START (its long run in the end's gutter);  `nearStart` picks.
     */
    const routeOf = (link: Link, route: number, nearStart: boolean, into: Run[]): GraphPoint[] => {
      const chain = link.reversed ? [...link.chain].reverse() : link.chain
      const { from, to } = link
      const start = { x: from.unit.x + from.dx, y: from.unit.y + from.dy }
      const end = { x: to.unit.x + to.dx, y: to.unit.y + to.dy }
      const points: GraphPoint[] = [start]
      let g = from.side === "left" ? from.unit.layer : from.unit.layer + 1
      let y = start.y
      /** Down or up the gutter `g` to `ny`. */
      const along = (ny: number) => {
        points.push({ x: gutterX(g), y })
        into.push({ route, index: points.length - 1, g, low: Math.min(y, ny), high: Math.max(y, ny) })
        points.push({ x: gutterX(g), y: ny })
        y = ny
      }
      /** Across layer `layer` at `ny`, to its other gutter. */
      const across = (layer: number, ny: number) => {
        along(ny)
        g = g === layer ? layer + 1 : layer
      }
      for (const dummy of chain.slice(1, -1)) {
        const layer = dummy.layer
        while (g !== layer && g !== layer + 1) {
          const crossing = g < layer ? g : g - 1
          across(crossing, crossingY(crossing, y))
        }
        across(layer, dummy.y + dummy.height / 2)
      }
      const need = to.side === "left" ? to.unit.layer : to.unit.layer + 1
      while (g !== need) {
        const crossing = g < need ? g : g - 1
        const near = crossing === from.unit.layer && (nearStart || crossing !== to.unit.layer) ? from.unit : to.unit
        across(
          crossing,
          crossingY(crossing, y, crossing === to.unit.layer || crossing === from.unit.layer ? near : undefined)
        )
      }
      along(end.y)
      points.push(end)
      return points
    }

    /** How busy `candidate`'s runs would make their gutters:  the length they share with the runs already there. */
    const busy = (candidate: Run[]) => {
      let load = 0
      for (const run of candidate)
        for (const other of runs)
          if (other.g === run.g) load += Math.max(0, Math.min(run.high, other.high) - Math.max(run.low, other.low) + 4)
      return load
    }

    // Edges between layers first;  then the ones within a layer (a column), longest first, each round the
    // less busy side.
    const routes: GraphPoint[][] = new Array(links.length)
    const within = (link: Link) => link.from.unit.layer === link.to.unit.layer && link.chain.length <= 2
    links.forEach((link, route) => {
      if (!within(link)) routes[route] = routeOf(link, route, false, runs)
    })
    const span = (link: Link) => Math.abs(link.from.unit.y + link.from.dy - (link.to.unit.y + link.to.dy))
    const inLayer = links.map((link, route) => ({ link, route })).filter(({ link }) => within(link))
    inLayer.sort((a, b) => span(b.link) - span(a.link))
    for (const { link, route } of inLayer) {
      const nearEnd: Run[] = []
      const nearStart: Run[] = []
      const a = routeOf(link, route, false, nearEnd)
      const b = routeOf(link, route, true, nearStart)
      const pickStart = busy(nearStart) < busy(nearEnd)
      routes[route] = pickStart ? b : a
      runs.push(...(pickStart ? nearStart : nearEnd))
    }

    // Lanes:  per gutter, runs that overlap side by side;  runs that don't share a lane.
    const byGutter = new Map<number, Run[]>()
    for (const run of runs) {
      if (run.high - run.low < 0.5) continue
      const list = byGutter.get(run.g)
      if (list) list.push(run)
      else byGutter.set(run.g, [run])
    }
    for (const [g, list] of byGutter) {
      list.sort((a, b) => a.low - b.low || a.high - b.high)
      const lastHigh: number[] = []
      const laneOf = list.map((run) => {
        let lane = lastHigh.findIndex((high) => high + 6 < run.low)
        if (lane < 0) lane = lastHigh.push(run.high) - 1
        else lastHigh[lane] = run.high
        return lane
      })
      const step = Math.min(7, gutterRoom(g) / Math.max(1, lastHigh.length))
      list.forEach((run, index) => {
        const dx = (laneOf[index] - (lastHigh.length - 1) / 2) * step
        const points = routes[run.route]
        for (const at of [run.index, run.index + 1]) points[at] = { x: points[at].x + dx, y: points[at].y }
      })
    }

    return routes.map((points) => {
      const clean = simplify(points)
      let best = 0
      let labelAt: GraphPoint | undefined
      for (let i = 1; i < clean.length; i++) {
        const p = clean[i - 1]
        const q = clean[i]
        const length = Math.abs(q.x - p.x) + Math.abs(q.y - p.y)
        if (length > best) {
          best = length
          labelAt = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
        }
      }
      return { points: clean, labelAt }
    })
  }

  /** Put each unit of `layer` as near its `wanted` y as it can, in order, without overlaps. */
  private static separate(layer: Unit[], wanted: number[], gapAfter: (unit: Unit, next?: Unit) => number) {
    // Blocks of units pushed together sit at the mean of what they want (pool adjacent violators).
    type Block = { start: number; end: number; top: number; height: number; weight: number; sum: number }
    const blocks: Block[] = []
    layer.forEach((unit, index) => {
      const height = unit.height + gapAfter(unit, layer[index + 1])
      let block: Block = { start: index, end: index, top: wanted[index], height, weight: 1, sum: wanted[index] }
      while (blocks.length) {
        const previous = blocks[blocks.length - 1]
        if (previous.top + previous.height <= block.top) break
        blocks.pop()
        const sum = previous.sum + block.sum - block.weight * previous.height
        const weight = previous.weight + block.weight
        block = {
          start: previous.start,
          end: block.end,
          top: sum / weight,
          height: previous.height + block.height,
          weight,
          sum
        }
      }
      blocks.push(block)
    })
    for (const block of blocks) {
      let y = block.top
      for (let i = block.start; i <= block.end; i++) {
        layer[i].y = y
        y += layer[i].height + gapAfter(layer[i], layer[i + 1])
      }
    }
  }

  /** The room between `unit` and the next one down its layer:  the larger of their `spacing`s;  a dummy's, small. */
  private static gapBetween(unit: Unit, next: Unit | undefined, nodeGap: number): number {
    if (unit.kind === "dummy") return 6
    const spacing = (each: Unit | undefined) =>
      each?.kind === "node" ? (each.node!.spacing ?? nodeGap) : each?.kind === "dummy" ? 0 : nodeGap
    return next ? Math.max(spacing(unit), spacing(next)) : spacing(unit)
  }

  ////////////////
  // ## Flattening
  ////////////////

  /** `level`'s boxes and edges, moved to `x`, `y`, into `nodes` and `edges`;  open nodes' levels after them. */
  private flatten(
    level: Level,
    x: number,
    y: number,
    depth: number,
    nodes: GraphPlacedNode[],
    edges: GraphPlacedEdge[],
    container?: { unit: Unit; x: number; y: number },
    columns?: GraphPlacedColumn[]
  ) {
    for (const column of level.columns) columns?.push({ ...column, x: column.x + x, y: column.y + y, depth })
    for (const unit of level.units) {
      const ux = x + unit.x
      const uy = y + unit.y
      const ports: GraphPlacedPort[] = unit.ports.map((port) => ({
        port: port.port,
        side: port.side,
        path: `${unit.path}:${port.port.id}`,
        x: ux + port.dx,
        y: uy + port.dy
      }))
      nodes.push({
        node: unit.node!,
        path: unit.path!,
        depth,
        x: ux,
        y: uy,
        width: unit.width,
        height: unit.height,
        ports,
        hasChildren: !!unit.hasChildren,
        isOpen: !!unit.child,
        isLoading: unit.isLoading
      })
      if (unit.child && unit.childOffset)
        this.flatten(
          unit.child,
          ux + unit.childOffset.x,
          uy + unit.childOffset.y,
          depth + 1,
          nodes,
          edges,
          { unit, x: ux, y: uy },
          columns
        )
    }
    const graphPath = level.prefix
    for (const edge of level.edges) {
      const points = edge.points.map((point) => ({ x: point.x + x, y: point.y + y }))
      // A pin inside a container reaches out to the container's own port, on its side.
      if (container) {
        const portAt = (id: string) => container.unit.ports.find((port) => port.port.id === id)
        const from = edge.fromPin !== undefined ? portAt(edge.fromPin) : undefined
        const to = edge.toPin !== undefined ? portAt(edge.toPin) : undefined
        if (from) points.unshift({ x: container.x + from.dx, y: container.y + from.dy })
        if (to) points.push({ x: container.x + to.dx, y: container.y + to.dy })
      }
      edges.push({
        edge: edge.edge,
        id: edge.id,
        path: `${graphPath}#${edge.id}`,
        fromPath: edge.fromPath,
        toPath: edge.toPath,
        points,
        fromSide: container && edge.fromPin !== undefined ? "right" : edge.fromSide,
        toSide: container && edge.toPin !== undefined ? "left" : edge.toSide,
        depth,
        routed: edge.routed,
        labelAt: edge.labelAt && { x: edge.labelAt.x + x, y: edge.labelAt.y + y }
      })
    }
  }
}

/** One box, dummy or pin in a level, while it's laid out. */
type Unit = {
  kind: "node" | "dummy" | "pin"
  node?: GraphNode
  path?: string
  width: number
  height: number
  layer: number
  order: number
  x: number
  y: number
  ports: { port: GraphPort; side: GraphPortSide; dx: number; dy: number }[]
  hasChildren?: boolean
  isLoading?: boolean
  child?: Level
  childOffset?: GraphPoint
  pin?: { port: GraphPort; side: "left" | "right" }
  up?: Neighbour[]
  down?: Neighbour[]
}

/** A unit in the next layer an edge segment reaches, and where it attaches on each. */
type Neighbour = { unit: Unit; mine: number; theirs: number }

/** Where an edge attaches to a unit. */
type End = { unit: Unit; dx: number; dy: number; side: GraphPortSide; path: string }

/** An edge while it's laid out. */
type Link = { edge: GraphEdge; id: string; from: End; to: End; reversed: boolean; chain: Unit[] }

/** An edge of a level, relative to it. */
type LevelEdge = {
  edge: GraphEdge
  id: string
  points: GraphPoint[]
  fromSide: GraphPortSide
  toSide: GraphPortSide
  fromPath: string
  toPath: string
  fromPin?: string
  toPin?: string
  routed?: boolean
  labelAt?: GraphPoint
}

/** A column of a level, relative to it. */
type LevelColumn = { id: string; label: string; x: number; y: number; width: number; height: number }

/** One graph laid out, relative to its own top left. */
type Level = {
  width: number
  height: number
  units: Unit[]
  edges: LevelEdge[]
  pins: { port: GraphPort; side: "left" | "right"; x: number; y: number }[]
  columns: LevelColumn[]
  prefix: string
}

/** A port's votes seen from inside:  a boundary port that edges START from inside is an input, on the left. */
function flip(votes: { asSource: number; asTarget: number }) {
  return { asSource: votes.asTarget, asTarget: votes.asSource }
}

/** `points` without repeats or points in the middle of a straight run. */
function simplify(points: readonly GraphPoint[]): GraphPoint[] {
  const out: GraphPoint[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.x - point.x) < 0.01 && Math.abs(last.y - point.y) < 0.01) continue
    const before = out[out.length - 2]
    if (
      before &&
      last &&
      ((Math.abs(before.x - last.x) < 0.01 && Math.abs(last.x - point.x) < 0.01) ||
        (Math.abs(before.y - last.y) < 0.01 && Math.abs(last.y - point.y) < 0.01))
    )
      out[out.length - 1] = point
    else out.push(point)
  }
  return out
}

/** A coordinate, to a tenth. */
function round(value: number): number {
  return Math.round(value * 10) / 10
}
