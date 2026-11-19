import {
  GRAPH_METRICS,
  type GraphData,
  type GraphEdge,
  type GraphEnd,
  type GraphLayoutOptions,
  type GraphLayoutResult,
  type GraphMetrics,
  type GraphNode,
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
 * - Edges come out as points;  `pathFor()` turns them into a smooth SVG path, leaving and entering ports sideways.
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
    const { margin } = layout.metrics
    layout.flatten(level, margin, margin, 0, nodes, edges)
    const pins: GraphPlacedPin[] = level.pins.map((pin) => ({
      port: pin.port,
      side: pin.side,
      path: `${prefix}:${pin.port.id}`,
      x: pin.x + margin,
      y: pin.y + margin
    }))
    return { width: level.width + 2 * margin, height: level.height + 2 * margin, nodes, edges, pins }
  }

  /** `d` of an edge's `<path>`:  cubic curves through its points, leaving and entering along its sides. */
  static pathFor(edge: Pick<GraphPlacedEdge, "points" | "fromSide" | "toSide">): string {
    const { points, fromSide, toSide } = edge
    if (points.length < 2) return ""
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
  static middleOf(edge: Pick<GraphPlacedEdge, "points">): GraphPoint {
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

    // 2. Layers.
    this.assignLayers(units, links)

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

    // 4. Order.
    this.order(layers)

    // 5. Coordinates.
    const { width, height } = this.place(layers, links)

    // Points per edge.
    const placedEdges: LevelEdge[] = []
    for (const link of links) {
      const [a, b] = link.reversed ? [link.to, link.from] : [link.from, link.to]
      const points: GraphPoint[] = [{ x: a.unit.x + a.dx, y: a.unit.y + a.dy }]
      for (let i = 1; i < link.chain.length - 1; i++) {
        const dummy = link.chain[i]
        points.push({ x: dummy.x, y: dummy.y + dummy.height / 2 })
      }
      points.push({ x: b.unit.x + b.dx, y: b.unit.y + b.dy })
      if (link.reversed) points.reverse()
      placedEdges.push({
        edge: link.edge,
        id: link.id,
        points,
        fromSide: link.from.side,
        toSide: link.to.side,
        fromPath: link.from.path,
        toPath: link.to.path,
        fromPin: link.from.unit.kind === "pin" ? link.from.unit.pin!.port.id : undefined,
        toPin: link.to.unit.kind === "pin" ? link.to.unit.pin!.port.id : undefined
      })
    }

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

  /** x by layer, y pulled towards neighbours without overlapping;  the level's size. */
  private place(layers: Unit[][], links: Link[]): { width: number; height: number } {
    const m = this.metrics
    const gapAfter = (unit: Unit) => (unit.kind === "dummy" ? 6 : m.nodeGap)

    // x:  each layer as wide as its widest box, boxes centred in it;  busier gaps are wider.
    const crossings = new Array(layers.length).fill(0)
    for (const link of links) for (let i = 0; i + 1 < link.chain.length; i++) crossings[link.chain[i].layer]++
    let x = 0
    layers.forEach((layer, index) => {
      const width = Math.max(0, ...layer.map((unit) => unit.width))
      for (const unit of layer) unit.x = x + (width - unit.width) / 2
      x += width + m.layerGap + Math.min(60, Math.sqrt(crossings[index]) * 4)
    })

    // y:  stacked, then pulled towards the neighbours' attachment points, in a few sweeps.
    for (const layer of layers) {
      let y = 0
      for (const unit of layer) {
        unit.y = y
        y += unit.height + gapAfter(unit)
      }
    }
    const tallest = Math.max(
      0,
      ...layers.map((layer) => layer.reduce((sum, unit) => sum + unit.height + gapAfter(unit), 0))
    )
    for (const layer of layers) {
      const used = layer.reduce((sum, unit) => sum + unit.height + gapAfter(unit), 0)
      for (const unit of layer) unit.y += (tallest - used) / 2
    }
    const pull = (layer: Unit[], side: "up" | "down") => {
      const wanted = layer.map((unit) => {
        const near = [...(unit[side] ?? []), ...(unit[side === "up" ? "down" : "up"] ?? [])]
        if (!near.length) return unit.y
        return near.reduce((sum, each) => sum + each.unit.y + each.theirs - each.mine, 0) / near.length
      })
      GraphLayout.separate(layer, wanted, gapAfter)
    }
    for (let round = 0; round < 8; round++) {
      if (round % 2 === 0) for (let i = 1; i < layers.length; i++) pull(layers[i], "up")
      else for (let i = layers.length - 2; i >= 0; i--) pull(layers[i], "down")
    }

    // Normalised to start at 0.
    const all = layers.flat()
    const top = Math.min(0, ...all.map((unit) => unit.y))
    for (const unit of all) unit.y -= top
    const width = Math.max(0, ...all.map((unit) => unit.x + unit.width))
    const height = Math.max(0, ...all.map((unit) => unit.y + unit.height))
    return { width, height }
  }

  /** Put each unit of `layer` as near its `wanted` y as it can, in order, without overlaps. */
  private static separate(layer: Unit[], wanted: number[], gapAfter: (unit: Unit) => number) {
    // Blocks of units pushed together sit at the mean of what they want (pool adjacent violators).
    type Block = { start: number; end: number; top: number; height: number; weight: number; sum: number }
    const blocks: Block[] = []
    layer.forEach((unit, index) => {
      const height = unit.height + gapAfter(unit)
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
        y += layer[i].height + gapAfter(layer[i])
      }
    }
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
    container?: { unit: Unit; x: number; y: number }
  ) {
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
        this.flatten(unit.child, ux + unit.childOffset.x, uy + unit.childOffset.y, depth + 1, nodes, edges, {
          unit,
          x: ux,
          y: uy
        })
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
        depth
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
}

/** One graph laid out, relative to its own top left. */
type Level = {
  width: number
  height: number
  units: Unit[]
  edges: LevelEdge[]
  pins: { port: GraphPort; side: "left" | "right"; x: number; y: number }[]
  prefix: string
}

/** A port's votes seen from inside:  a boundary port that edges START from inside is an input, on the left. */
function flip(votes: { asSource: number; asTarget: number }) {
  return { asSource: votes.asTarget, asTarget: votes.asSource }
}

/** A coordinate, to a tenth. */
function round(value: number): number {
  return Math.round(value * 10) / 10
}
