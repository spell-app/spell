import { describe, expect, test } from "vite-plus/test"

import { GraphLayout, type GraphData, type GraphLayoutResult, type GraphPlacedNode } from "spell/ui/components/ui-graph"

////////////////
// ## Fixtures
////////////////

/** A chain of three, and a shortcut from the first to the last:  the shortcut spans two layers. */
const CHAIN: GraphData = {
  nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
  edges: [
    { id: "ab", from: { node: "a" }, to: { node: "b" } },
    { id: "bc", from: { node: "b" }, to: { node: "c" } },
    { id: "ac", from: { node: "a" }, to: { node: "c" } }
  ]
}

/** A made-up pipeline whose middle node holds a graph of its own, wired to its ports. */
const NESTED: GraphData = {
  nodes: [
    { id: "source", label: "Source", ports: [{ id: "out", kind: "out" }] },
    {
      id: "filter",
      label: "Filter",
      ports: [
        { id: "in", kind: "in" },
        { id: "out", kind: "out" }
      ],
      children: {
        nodes: [
          {
            id: "trim",
            ports: [
              { id: "a", kind: "in" },
              { id: "b", kind: "out" }
            ]
          },
          {
            id: "dedupe",
            ports: [
              { id: "a", kind: "in" },
              { id: "b", kind: "out" }
            ]
          }
        ],
        edges: [
          { from: { port: "in" }, to: { node: "trim", port: "a" } },
          { from: { node: "trim", port: "b" }, to: { node: "dedupe", port: "a" } },
          { from: { node: "dedupe", port: "b" }, to: { port: "out" } }
        ]
      }
    },
    { id: "sink", label: "Sink", ports: [{ id: "in", kind: "in" }] }
  ],
  edges: [
    { from: { node: "source", port: "out" }, to: { node: "filter", port: "in" } },
    { from: { node: "filter", port: "out" }, to: { node: "sink", port: "in" } }
  ]
}

/** The placed node at `path`. */
function nodeAt(layout: GraphLayoutResult, path: string): GraphPlacedNode {
  const placed = layout.nodes.find((each) => each.path === path)
  if (!placed) throw new Error(`no node at ${path}`)
  return placed
}

/** The placed nodes' paths, by layer:  nodes sharing an `x` are one layer. */
function layersOf(layout: GraphLayoutResult): string[][] {
  const byX = new Map<number, string[]>()
  for (const placed of layout.nodes) byX.set(placed.x, [...(byX.get(placed.x) ?? []), placed.path])
  return [...byX.entries()].sort(([a], [b]) => a - b).map(([, paths]) => paths.sort())
}

////////////////
// ## Tests
////////////////

describe("GraphLayout.of()", () => {
  test("puts each node one layer right of what points at it", () => {
    const layout = GraphLayout.of(CHAIN)
    expect(layersOf(layout)).toEqual([["a"], ["b"], ["c"]])
    const [a, b, c] = ["a", "b", "c"].map((path) => nodeAt(layout, path))
    expect(a.x).toBeLessThan(b.x)
    expect(b.x).toBeLessThan(c.x)
  })

  test("breaks a cycle, so every node still gets a layer and every edge is drawn", () => {
    const layout = GraphLayout.of({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
      edges: [
        { from: { node: "a" }, to: { node: "b" } },
        { from: { node: "b" }, to: { node: "c" } },
        { from: { node: "c" }, to: { node: "a" } }
      ]
    })
    expect(layout.nodes).toHaveLength(3)
    expect(layersOf(layout).flat().sort()).toEqual(["a", "b", "c"])
    expect(layersOf(layout).length).toBeGreaterThan(1)
    expect(layout.edges).toHaveLength(3)
    // The edge turned round still starts at its own `from`:  its points run c => a.
    const back = layout.edges.find((edge) => edge.fromPath === "c")!
    expect(back.toPath).toBe("a")
    expect(back.points[0].x).toBeGreaterThan(back.points.at(-1)!.x)
  })

  test("routes a long edge through a point per layer it crosses", () => {
    const layout = GraphLayout.of(CHAIN)
    const short = layout.edges.find((edge) => edge.id === "ab")!
    const long = layout.edges.find((edge) => edge.id === "ac")!
    expect(short.points).toHaveLength(2)
    expect(long.points).toHaveLength(3)
    // The middle point sits in b's layer, beside b, not through it.
    const b = nodeAt(layout, "b")
    const middle = long.points[1]
    expect(middle.x).toBeGreaterThanOrEqual(b.x)
    expect(middle.x).toBeLessThanOrEqual(b.x + b.width)
    expect(middle.y < b.y || middle.y > b.y + b.height).toBe(true)
  })

  test("names edges by their graph's path and id, `#<index>` without one", () => {
    const layout = GraphLayout.of({
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ from: { node: "a" }, to: { node: "b" } }]
    })
    expect(layout.edges[0].id).toBe("#0")
    expect(layout.edges[0].path).toBe("##0")
  })

  test("lays a node open in place out round its child graph, its children inside it", () => {
    const children = NESTED.nodes[1].children as GraphData
    const closed = GraphLayout.of(NESTED)
    const open = GraphLayout.of(NESTED, { openChildren: new Map([["filter", children]]) })

    expect(closed.nodes.map((placed) => placed.path)).toEqual(["source", "filter", "sink"])
    const filter = nodeAt(open, "filter")
    expect(filter.isOpen).toBe(true)
    expect(filter.width).toBeGreaterThan(nodeAt(closed, "filter").width)

    for (const path of ["filter/trim", "filter/dedupe"]) {
      const child = nodeAt(open, path)
      expect(child.depth).toBe(1)
      expect(child.x).toBeGreaterThan(filter.x)
      expect(child.y).toBeGreaterThan(filter.y)
      expect(child.x + child.width).toBeLessThan(filter.x + filter.width)
      expect(child.y + child.height).toBeLessThan(filter.y + filter.height)
    }
    // An end with no `node` is the container's own port.
    const fromPort = open.edges.find((edge) => edge.toPath === "filter/trim:a")!
    expect(fromPort.fromPath).toBe("filter:in")
  })

  test("draws the enclosing node's ports as pins on the graph's sides", () => {
    const filter = NESTED.nodes[1]
    const layout = GraphLayout.of(filter.children as GraphData, { prefix: "filter", boundary: filter.ports })
    expect(layout.pins.map((pin) => [pin.path, pin.side])).toEqual([
      ["filter:in", "left"],
      ["filter:out", "right"]
    ])
    const [left, right] = layout.pins
    expect(left.x).toBeLessThan(right.x)
    expect(layout.nodes.map((placed) => placed.path)).toEqual(["filter/trim", "filter/dedupe"])
  })

  test("sizes boxes with the text widths it's given", () => {
    const graph: GraphData = { nodes: [{ id: "a", label: "A long label for a box" }] }
    const narrow = GraphLayout.of(graph, { textWidth: (text, size) => text.length * size * 0.3 })
    const wide = GraphLayout.of(graph, { textWidth: (text, size) => text.length * size * 0.9 })
    expect(wide.nodes[0].width).toBeGreaterThan(narrow.nodes[0].width)
  })
})

describe("GraphLayout.pathFor()", () => {
  test("leaves and enters sideways, one curve per segment", () => {
    const d = GraphLayout.pathFor({
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 50 }
      ],
      fromSide: "right",
      toSide: "left"
    })
    expect(d).toBe("M0 0C50 0 50 50 100 50")
  })
})
