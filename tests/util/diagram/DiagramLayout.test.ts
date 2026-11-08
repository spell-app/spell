import { describe, expect, test } from "vite-plus/test"

import { DiagramColumns } from "spell/util/diagram/DiagramColumns"
import { DiagramLayout } from "spell/util/diagram/DiagramLayout"
import type { DiagramDrawing, DiagramShape, DiagramSpec } from "spell/util/diagram/diagram.types"

import KITCHEN from "./fixtures/kitchen.json"
import KITCHEN_EXPECTED from "./fixtures/kitchen.expected.json"
import RECIPE_BOX from "./fixtures/recipe-box.json"
import RECIPE_BOX_EXPECTED from "./fixtures/recipe-box.expected.json"

/**
 * What the NERD skill's own script draws for a spec:  its `viewBox`, and each element's tag and numbers, in order.
 * - Made once by running the script (`nerds.py`) on each fixture spec;  the specs are made up, in the shapes of the
 *   skill's two examples (one main concept in lanes;  several concepts in three columns).
 */
type ScriptDrawing = { viewBox: number[]; shapes: (string | number)[][] }

/** `shape`'s tag and numbers, as `ScriptDrawing` writes them. */
function numbersOf(shape: DiagramShape): (string | number)[] {
  switch (shape.type) {
    case "rect":
      return ["rect", shape.x, shape.y, shape.width, shape.height]
    case "path":
      return ["path", ...(shape.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)]
    case "arrow":
      return ["polygon", ...shape.points.flat()]
    case "text":
      return ["text", shape.x, shape.y]
  }
}

/** Expect `drawing` to be what the script drew, every number within a fifth of a unit. */
function expectScript(drawing: DiagramDrawing, script: ScriptDrawing) {
  expect([drawing.x, drawing.y, drawing.width, drawing.height]).toEqual(script.viewBox)
  expect(drawing.shapes).toHaveLength(script.shapes.length)
  drawing.shapes.forEach((shape, index) => {
    const ours = numbersOf(shape)
    const theirs = script.shapes[index]!
    expect(ours[0], `shape ${index}`).toBe(theirs[0])
    expect(ours.length, `shape ${index}'s numbers`).toBe(theirs.length)
    ours.slice(1).forEach((value, at) => {
      expect(Math.abs((value as number) - (theirs[at + 1] as number)), `shape ${index}, number ${at}`).toBeLessThan(
        0.21
      )
    })
  })
}

describe("DiagramLayout, the NERD skill's layout", () => {
  test("one main concept in two lanes, a legend group, loops on itself:  the script's drawing", () => {
    expectScript(DiagramLayout.of(RECIPE_BOX as DiagramSpec), RECIPE_BOX_EXPECTED)
  })

  test("several concepts in three columns, brackets both ways, buses, a derived field:  the script's drawing", () => {
    expectScript(DiagramLayout.of(KITCHEN as DiagramSpec), KITCHEN_EXPECTED)
  })

  test("a derived field is drawn italic, `(derived)` after it, with a dashed line", () => {
    const drawing = DiagramLayout.of(KITCHEN as DiagramSpec)
    const derived = drawing.shapes.find((shape) => shape.type === "text" && shape.text === "current_tasks[] (derived)")
    expect(derived).toMatchObject({ italic: true, role: "field", node: "Cook" })
  })

  test("the legend lists only the kinds of line used", () => {
    const spec: DiagramSpec = {
      columns: [{ groups: [{ label: "A", nodes: [{ name: "One", fields: ["two"] }, { name: "Two" }] }] }],
      edges: [{ from: "One.two", to: "Two" }]
    }
    const legend = DiagramLayout.of(spec).shapes.filter((shape) => shape.role === "legend-text")
    expect(legend.map((shape) => shape.type === "text" && shape.text)).toEqual(["refers to"])
  })

  test("a box dragged:  it moves, and its lines follow it", () => {
    const spec = RECIPE_BOX as DiagramSpec
    const before = DiagramLayout.of(spec)
    const after = DiagramLayout.of(spec, { moved: new Map([["Photo", { dx: 40, dy: 30 }]]) })
    expect(after.boxes.get("Photo")).toMatchObject({
      x: before.boxes.get("Photo")!.x + 40,
      y: before.boxes.get("Photo")!.y + 30
    })
    expect(after.boxes.get("Recipe")).toEqual(before.boxes.get("Recipe"))
    const lines = (drawing: DiagramDrawing) => drawing.shapes.filter((shape) => shape.role === "line")
    expect(lines(after)).toHaveLength(lines(before).length)
    expect(lines(after)).not.toEqual(lines(before))
  })

  test("a box holding content takes its size, its lines landing at its middle", () => {
    const drawing = DiagramLayout.of(RECIPE_BOX as DiagramSpec, {
      sizes: new Map([["Method", { width: 220, height: 90 }]])
    })
    const method = drawing.boxes.get("Method")!
    expect(method.height).toBe(90)
    expect(method.width).toBeGreaterThanOrEqual(220)
    expect(drawing.shapes.some((shape) => shape.node === "Method" && shape.role === "name")).toBe(false)
  })

  test("words in the page's language", () => {
    const words = { legend: "Leyenda", contains: "contiene", refersTo: "se refiere a", derived: "(calculado)" }
    const texts = DiagramLayout.of(KITCHEN as DiagramSpec, { words })
      .shapes.filter((shape) => shape.type === "text")
      .map((shape) => shape.type === "text" && shape.text)
    expect(texts).toEqual(
      expect.arrayContaining(["Leyenda", "contiene", "se refiere a", "current_tasks[] (calculado)"])
    )
  })

  test("an edge naming a box or field that isn't there throws, saying which", () => {
    const spec: DiagramSpec = { columns: [{ groups: [{ label: "A", nodes: [{ name: "One", fields: ["x"] }] }] }] }
    expect(() => DiagramLayout.of({ ...spec, edges: [{ from: "One.x", to: "Nowhere" }] })).toThrow(/Nowhere/)
    expect(() => DiagramLayout.of({ ...spec, edges: [{ from: "One.y", to: "One" }] })).toThrow(/no field `y`/)
  })

  test("estimatedWidth():  the script's Helvetica estimate", () => {
    expect(DiagramLayout.estimatedWidth("Entry", 13, true)).toBeCloseTo(34.41, 1)
    expect(DiagramLayout.tint("#047857", 0.12)).toBe("#e1efeb")
  })
})

describe("DiagramColumns, a flat spec in columns", () => {
  const spec: DiagramSpec = {
    nodes: [
      { name: "Run", fields: ["plan", "steps[]"] },
      { name: "Plan", fields: ["parent"] },
      { name: "Step" },
      { name: "Tool" }
    ],
    edges: [
      { from: "Run.plan", to: "Plan" },
      { from: "Run.steps[]", to: "Step", kind: "contains" },
      { from: "Plan.parent", to: "Plan" },
      { from: "Step", to: "Tool" }
    ]
  }

  test("what nothing links to first, each box one column right of what links to it", () => {
    const names = DiagramColumns.of(spec, 3).map((column) => column.groups[0]!.nodes!.map((node) => node.name))
    expect(names).toEqual([["Run"], ["Plan", "Step"], ["Tool"]])
  })

  test("at most `maxColumns`:  what would go further stacks in the last", () => {
    const names = DiagramColumns.of(spec, 2).map((column) => column.groups[0]!.nodes!.map((node) => node.name))
    expect(names).toEqual([["Run"], ["Plan", "Step", "Tool"]])
  })

  test("a flat spec lays out, with no group backgrounds or labels", () => {
    const drawing = DiagramLayout.of(spec, { maxColumns: 2 })
    expect(drawing.boxes.size).toBe(4)
    expect(drawing.shapes.some((shape) => shape.role === "group" || shape.role === "group-label")).toBe(false)
  })
})
