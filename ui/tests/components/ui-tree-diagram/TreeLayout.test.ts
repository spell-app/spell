import { describe, expect, test } from "vite-plus/test"

import { TreeLayout } from "spell/ui/components/ui-tree-diagram/TreeLayout"
import {
  TREE_DIAGRAM_METRICS,
  type TreeDiagramBox,
  type TreeDiagramLayout,
  type TreeDiagramNode
} from "spell/ui/components/ui-tree-diagram/UITreeDiagram.types"

////////////////
// ## Fixtures
////////////////

/** The FizzBuzz line of the epic's sketch (`guides/compile-targets/compile-targets.html`, `#fizzbuzz-tree`). */
const FIZZBUZZ: TreeDiagramNode = {
  label: "If",
  children: [
    {
      label: "IsA · integer",
      detail: "boolean",
      edgeLabel: "condition",
      children: [
        {
          label: "Divide",
          detail: "number",
          edgeLabel: "value",
          children: [
            { label: "Variable number", detail: "number" },
            { label: "Number 15", detail: "number" }
          ]
        }
      ]
    },
    {
      label: "Print",
      edgeLabel: "body",
      children: [{ label: "Variable number", detail: "number" }, { label: 'Text "fizzbuzz"' }]
    },
    { label: "If …", edgeLabel: "otherwise" }
  ]
}

/** Slot names long enough to be wider than their boxes. */
const LONG_SLOTS: TreeDiagramNode = {
  label: "Call",
  children: [
    { label: "a", edgeLabel: "the first argument" },
    { label: "b", edgeLabel: "the second argument" },
    { label: "c", edgeLabel: "rest" }
  ]
}

const { fontSize, detailFontSize, charWidth, lineHeight, paddingX, paddingY, minBoxWidth, siblingGap, margin } =
  TREE_DIAGRAM_METRICS

/** A box's width for `chars` characters of label. */
function widthFor(chars: number): number {
  return Math.max(minBoxWidth, chars * charWidth * fontSize + 2 * paddingX)
}

/**
 * A tree of `count` nodes, shaped by a seeded random walk:  bushy, lopsided, deep in places, with long and short
 * labels and some slots.  The same `seed`, the same tree.
 */
function randomTree(seed: number, count: number): TreeDiagramNode {
  let state = seed
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647
  const root: TreeDiagramNode = { label: "root", children: [] }
  const nodes = [root]
  for (let index = 1; index < count; index++) {
    const parent = nodes[Math.floor(random() * nodes.length)]!
    const child: TreeDiagramNode = { label: "x".repeat(1 + Math.floor(random() * 14)) }
    if (random() < 0.4) child.edgeLabel = "s".repeat(1 + Math.floor(random() * 16))
    if (random() < 0.3) child.detail = "number"
    ;(parent.children ??= []).push(child)
    nodes.push(child)
  }
  return root
}

/** Every box's parent box, by the box. */
function parents(layout: TreeDiagramLayout): Map<TreeDiagramBox, TreeDiagramBox> {
  const byNode = new Map(layout.boxes.map((box) => [box.node, box]))
  const result = new Map<TreeDiagramBox, TreeDiagramBox>()
  for (const box of layout.boxes) for (const child of box.node.children ?? []) result.set(byNode.get(child)!, box)
  return result
}

/** Horizontal spans of `layout`'s slot labels, with their row. */
function slotSpans(layout: TreeDiagramLayout) {
  return layout.edges.flatMap((edge) => {
    const { label: slot } = edge
    return slot
      ? [{ edge, y: slot.y, left: slot.x - slot.width / 2, right: slot.x + slot.width / 2, text: slot.text }]
      : []
  })
}

/** The invariants every layout keeps. */
function expectTidy(layout: TreeDiagramLayout) {
  // boxes of a row never overlap, and keep `siblingGap` apart
  const rows = new Map<number, TreeDiagramBox[]>()
  for (const box of layout.boxes) rows.set(box.y, [...(rows.get(box.y) ?? []), box])
  for (const row of rows.values()) {
    const sorted = [...row].sort((a, b) => a.x - b.x)
    for (let index = 1; index < sorted.length; index++)
      expect(sorted[index]!.x - (sorted[index - 1]!.x + sorted[index - 1]!.width)).toBeGreaterThanOrEqual(
        siblingGap - 0.02
      )
    // a row's boxes are all as tall as each other
    expect(new Set(row.map((box) => box.height)).size).toBe(1)
  }
  // a parent is centred over its first and last child
  for (const box of layout.boxes) {
    const children = layout.boxes.filter((each) => box.node.children?.includes(each.node))
    if (!children.length) continue
    const first = children[0]!
    const last = children[children.length - 1]!
    expect(box.x + box.width / 2).toBeCloseTo((first.x + first.width / 2 + last.x + last.width / 2) / 2, 1)
  }
  // slot labels never overlap, nor sit on another edge
  const spans = slotSpans(layout)
  for (const span of spans) {
    for (const other of spans) {
      if (other === span || other.y !== span.y) continue
      expect(other.left >= span.right - 0.02 || other.right <= span.left + 0.02, `${span.text} / ${other.text}`).toBe(
        true
      )
    }
    for (const edge of layout.edges) {
      if (edge === span.edge) continue
      if (edge.from.y >= span.y || edge.to.y <= span.y) continue
      const x = edge.from.x + ((edge.to.x - edge.from.x) * (span.y - edge.from.y)) / (edge.to.y - edge.from.y)
      expect(x <= span.left + 0.02 || x >= span.right - 0.02, `an edge under ${span.text}`).toBe(true)
    }
  }
  // everything inside the viewBox, `margin` clear
  for (const box of layout.boxes) {
    expect(box.x).toBeGreaterThanOrEqual(margin - 0.01)
    expect(box.x + box.width).toBeLessThanOrEqual(layout.width - margin + 0.01)
    expect(box.y + box.height).toBeLessThanOrEqual(layout.height - margin + 0.01)
  }
  for (const span of spans) {
    expect(span.left).toBeGreaterThanOrEqual(margin - 0.01)
    expect(span.right).toBeLessThanOrEqual(layout.width - margin + 0.01)
  }
}

////////////////
// ## Tests
////////////////

describe("TreeLayout.of()", () => {
  test("one node:  a box sized to its label, the margin around it", () => {
    const layout = TreeLayout.of({ label: "Number 15" })
    const height = 2 * paddingY + fontSize * lineHeight
    expect(layout).toEqual({
      width: widthFor(9) + 2 * margin,
      height: height + 2 * margin,
      boxes: [
        {
          node: { label: "Number 15" },
          depth: 0,
          path: "0",
          x: margin,
          y: margin,
          width: widthFor(9),
          height,
          exit: { x: margin + widthFor(9) / 2, y: margin + height },
          label: { x: margin + widthFor(9) / 2, y: margin + height / 2 }
        }
      ],
      edges: []
    })
  })

  test("sizes boxes by character count:  the label or the detail, whichever is wider;  never under the minimum", () => {
    const [root, short, detailed] = TreeLayout.of({
      label: "Variable number",
      children: [{ label: "a" }, { label: "b", detail: "a very long datatype" }]
    }).boxes
    expect(root!.width).toBe(widthFor(15))
    expect(short!.width).toBe(minBoxWidth)
    expect(detailed!.width).toBeCloseTo(20 * charWidth * detailFontSize + 2 * paddingX, 5)
  })

  test("counts code points, so `·` and `…` are one character each", () => {
    expect(TreeLayout.of({ label: "IsA · integer" }).boxes[0]!.width).toBeCloseTo(widthFor(13), 5)
  })

  test("a detail adds a second line;  every box in its row grows to match, its text centred in it", () => {
    const layout = TreeLayout.of({ label: "Add", children: [{ label: "a" }, { label: "b", detail: "number" }] })
    const [, plain, detailed] = layout.boxes
    expect(detailed!.height).toBe(2 * paddingY + (fontSize + detailFontSize) * lineHeight)
    expect(plain!.height).toBe(detailed!.height)
    expect(plain!.label.y).toBeCloseTo(plain!.y + plain!.height / 2, 5)
    expect(plain!.detail).toBeUndefined()
    expect(detailed!.detail!.y).toBeGreaterThan(detailed!.label.y)
  })

  test("is the SAME for the same tree:  deterministic", () => {
    expect(TreeLayout.of(FIZZBUZZ)).toEqual(TreeLayout.of(structuredClone(FIZZBUZZ)))
  })

  test("lays FizzBuzz out tidy:  rows, parents centred, no overlaps", () => {
    const layout = TreeLayout.of(FIZZBUZZ)
    expectTidy(layout)
    expect(new Set(layout.boxes.map((box) => box.y)).size).toBe(4)
    expect(layout.boxes.map((box) => box.node.label)).toEqual([
      "If",
      "IsA · integer",
      "Divide",
      "Variable number",
      "Number 15",
      "Print",
      "Variable number",
      'Text "fizzbuzz"',
      "If …"
    ])
  })

  test("an edge runs from the parent's bottom centre to the child's top centre", () => {
    const layout = TreeLayout.of(FIZZBUZZ)
    const parentOf = parents(layout)
    const byNode = new Map(layout.boxes.map((box) => [box.node, box]))
    const children = layout.boxes.filter((box) => parentOf.has(box))
    expect(layout.edges).toHaveLength(children.length)
    layout.edges.forEach((edge, index) => {
      const child = children[index]!
      const parent = parentOf.get(child)!
      expect(edge.from).toEqual({ x: parent.label.x, y: parent.y + parent.height })
      expect(edge.to).toEqual({ x: child.label.x, y: child.y })
      expect(edge.label?.text).toBe(byNode.get(child.node)!.node.edgeLabel)
    })
  })

  test("a slot label sits at its edge's midpoint, and the edge stops under it", () => {
    const { edges } = TreeLayout.of(FIZZBUZZ)
    const condition = edges.find((edge) => edge.label?.text === "condition")!
    const { from, to, label: slot, gap } = condition
    expect(slot!.x).toBeCloseTo((from.x + to.x) / 2, 1)
    expect(slot!.y).toBeCloseTo((from.y + to.y) / 2, 1)
    // the gap is centred on the label, and reaches its box's side or top / bottom
    expect((gap!.from.x + gap!.to.x) / 2).toBeCloseTo(slot!.x, 1)
    const reachesSide = Math.abs(Math.abs(gap!.to.x - gap!.from.x) - slot!.width) < 0.05
    const reachesTop = Math.abs(Math.abs(gap!.to.y - gap!.from.y) - slot!.height) < 0.05
    expect(reachesSide || reachesTop).toBe(true)
    expect(edges.find((edge) => !edge.label)!.gap).toBeUndefined()
  })

  test("keeps long slot labels apart, wider than their boxes", () => {
    expectTidy(TreeLayout.of(LONG_SLOTS))
  })

  test.each([1, 7, 42, 1234, 99991])("keeps every invariant on a random tree (seed %i)", (seed) => {
    expectTidy(TreeLayout.of(randomTree(seed, 60)))
  })

  test("left to right:  a level is a column, siblings stack, and the same invariants hold across", () => {
    const layout = TreeLayout.of(FIZZBUZZ, { direction: "left-right" })
    const [root, condition] = layout.boxes
    expect(condition!.x).toBeGreaterThan(root!.x + root!.width)
    const firstColumn = layout.boxes.filter((box) => box.depth === 1)
    expect(new Set(firstColumn.map((box) => box.x)).size).toBe(1)
    expect(new Set(firstColumn.map((box) => box.width)).size).toBe(1)
    const sorted = [...firstColumn].sort((a, b) => a.y - b.y)
    for (let index = 1; index < sorted.length; index++)
      expect(sorted[index]!.y - (sorted[index - 1]!.y + sorted[index - 1]!.height)).toBeGreaterThanOrEqual(
        siblingGap - 0.02
      )
    // the root's centred on its first and last child, across
    const middle = (box: TreeDiagramBox) => box.y + box.height / 2
    expect(middle(root!)).toBeCloseTo((middle(sorted[0]!) + middle(sorted[sorted.length - 1]!)) / 2, 1)
    // an edge leaves the parent's right side, and reaches the child's left side
    expect(layout.edges[0]!.from.x).toBeCloseTo(root!.x + root!.width, 1)
    expect(layout.edges[0]!.to.x).toBeCloseTo(condition!.x, 1)
    expect(layout.edges[0]!.to.y).toBeCloseTo(middle(condition!), 1)
    for (const box of layout.boxes) {
      expect(box.y).toBeGreaterThanOrEqual(margin - 0.01)
      expect(box.y + box.height).toBeLessThanOrEqual(layout.height - margin + 0.01)
      expect(box.x + box.width).toBeLessThanOrEqual(layout.width - margin + 0.01)
    }
  })

  test("left to right:  a wide edge label gets room between its columns", () => {
    const layout = TreeLayout.of(
      { label: "a", children: [{ label: "b", edgeLabel: "a very long label on the line" }] },
      { direction: "left-right" }
    )
    const { from, to, label } = layout.edges[0]!
    expect(to.x - from.x).toBeGreaterThanOrEqual(label!.width)
  })

  test("takes measured sizes, as numbers:  a box fits its text however its characters count", () => {
    const node: TreeDiagramNode = { label: "iiiiiiiiii", detail: "d", edgeLabel: "e" }
    const tree: TreeDiagramNode = { label: "root", children: [node] }
    const sizes = new Map([[node, { labelWidth: 100, detailWidth: 10, edgeLabelWidth: 200 }]])
    const layout = TreeLayout.of(tree, { sizes })
    expect(layout.boxes[1]!.width).toBe(100 + 2 * paddingX)
    expect(layout.edges[0]!.label!.width).toBe(200 + 2 * TREE_DIAGRAM_METRICS.edgeLabelPaddingX)
  })

  test("leaves room for what a node holds, under its label, all of it centred", () => {
    const node: TreeDiagramNode = { label: "x" }
    const layout = TreeLayout.of(node, { sizes: new Map([[node, { contentWidth: 80, contentHeight: 40 }]]) })
    const [box] = layout.boxes
    expect(box!.width).toBe(80 + 2 * paddingX)
    expect(box!.height).toBe(2 * paddingY + fontSize * lineHeight + 40)
    expect(box!.content).toEqual({
      x: box!.x + box!.width / 2,
      y: box!.y + paddingY + fontSize * lineHeight + 20,
      width: 80,
      height: 40
    })
  })

  test("what a node holds alone takes no empty label line", () => {
    const node: TreeDiagramNode = { label: "" }
    const [box] = TreeLayout.of(node, { sizes: new Map([[node, { contentWidth: 80, contentHeight: 40 }]]) }).boxes
    expect(box!.height).toBe(2 * paddingY + 40)
  })

  test("a folded node draws as a leaf, and says how many it holds", () => {
    const hidden: TreeDiagramNode = { label: "under it" }
    const folded: TreeDiagramNode = { label: "folded", children: [hidden] }
    const layout = TreeLayout.of({ label: "root", children: [folded] }, { folded: new Set([folded]) })
    expect(layout.boxes.map((box) => box.node.label)).toEqual(["root", "folded"])
    expect(layout.boxes[1]).toMatchObject({ isFolded: true, childCount: 1, path: "0.0" })
    expect(layout.edges).toHaveLength(1)
  })

  test("gives each box its path:  its child index at each depth", () => {
    const { boxes } = TreeLayout.of(FIZZBUZZ)
    expect(boxes.map((box) => box.path)).toEqual([
      "0",
      "0.0",
      "0.0.0",
      "0.0.0.0",
      "0.0.0.1",
      "0.1",
      "0.1.0",
      "0.1.1",
      "0.2"
    ])
  })

  test("apportions:  small subtrees between two big ones spread evenly", () => {
    const wide = (label: string): TreeDiagramNode => ({
      label,
      children: Array.from({ length: 5 }, (_, index) => ({
        label: `${label}${index}`,
        children: [{ label: "deep deep deep" }]
      }))
    })
    const leaf = (label: string): TreeDiagramNode => ({ label })
    const tree: TreeDiagramNode = { label: "root", children: [wide("a"), leaf("x"), leaf("y"), leaf("z"), wide("b")] }
    const layout = TreeLayout.of(tree)
    expectTidy(layout)
    const centre = (label: string) => {
      const box = layout.boxes.find((each) => each.node.label === label)!
      return box.x + box.width / 2
    }
    const gaps = [centre("x") - centre("a"), centre("y") - centre("x"), centre("z") - centre("y")]
    // what's between the two big ones stands evenly between them
    expect(gaps[1]).toBeCloseTo(gaps[2]!, 0)
    expect(centre("b") - centre("z")).toBeGreaterThan(gaps[1]! / 2)
    expect(gaps[0]).toBeGreaterThan(gaps[1]! / 2)
  })

  test("takes its sizes from `metrics`", () => {
    const layout = TreeLayout.of(
      { label: "ab" },
      { metrics: { ...TREE_DIAGRAM_METRICS, paddingX: 50, minBoxWidth: 0 } }
    )
    expect(layout.boxes[0]!.width).toBeCloseTo(2 * charWidth * fontSize + 100, 5)
  })
})
