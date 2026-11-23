import { describe, expect, test } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMGraphElement, GraphData } from "spell/ui/components/ui-graph"

import "spell/ui/components/ui-graph"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-graph/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A `<ui-graph>` DOM element, with its rich properties. */
type GraphElement = DOMGraphElement & { graph?: unknown; path?: string; selected?: unknown }

/** A made-up graph:  a clock driving a CPU whose children are given, and the memory it writes to. */
const GRAPH: GraphData = {
  nodes: [
    { id: "clock", label: "Clock", ports: [{ id: "t", kind: "out" }] },
    {
      id: "cpu",
      label: "CPU",
      ports: [
        { id: "clk", label: "clk", kind: "in" },
        { id: "bus", label: "bus", kind: "out" }
      ],
      children: {
        nodes: [
          { id: "alu", label: "ALU" },
          { id: "regs", label: "Registers" }
        ],
        edges: [
          { from: { port: "clk" }, to: { node: "alu" } },
          { from: { node: "alu" }, to: { node: "regs" } },
          { from: { node: "regs" }, to: { port: "bus" } }
        ]
      }
    },
    { id: "mem", label: "Memory", ports: [{ id: "a", label: "addr", kind: "in" }] }
  ],
  edges: [
    { from: { node: "clock", port: "t" }, to: { node: "cpu", port: "clk" } },
    { from: { node: "cpu", port: "bus" }, to: { node: "mem", port: "a" }, label: "bus" }
  ]
}

/** Render a graph of `GRAPH`;  returns it with its shadow root. */
async function graph(attributes = "") {
  const host = await ElementFixture.render<GraphElement>(
    `<ui-graph${attributes} graph='${JSON.stringify(GRAPH)}' style="width: 640px"></ui-graph>`
  )
  await ElementFixture.tick()
  return { host, root: host.shadowRoot! }
}

/** The labels of the nodes drawn, in order. */
function labels(root: ShadowRoot): string[] {
  return [...root.querySelectorAll("g.node > text.label")].map((text) => text.textContent ?? "")
}

/** Every `ui-changed` `host` sends from now on. */
function changes(host: Element): unknown[] {
  const details: unknown[] = []
  host.addEventListener("ui-changed", (event) => details.push((event as CustomEvent).detail))
  return details
}

describe("<ui-graph> drawing", () => {
  test("draws a box per node, a wire per edge, a dot per port", async () => {
    const { root } = await graph()
    expect(root.querySelector(".ui.graph")).toBeTruthy()
    expect(labels(root)).toEqual(["Clock", "CPU", "Memory"])
    expect(root.querySelectorAll("path.edge")).toHaveLength(2)
    expect(root.querySelectorAll("g.port")).toHaveLength(4)
    expect([...root.querySelectorAll("text.edge-label")].map((text) => text.textContent)).toEqual(["bus"])
    // The CPU has children, so a toggle.
    expect(root.querySelectorAll("g.toggle")).toHaveLength(1)
    expect(root.querySelector("svg")!.getAttribute("aria-label")).toBe("Graph:  3 nodes")
  })

  test("opens a node in place:  its children drawn inside it", async () => {
    const { host, root } = await graph()
    await host.open("cpu")
    await ElementFixture.tick()
    expect(labels(root)).toEqual(expect.arrayContaining(["CPU", "ALU", "Registers"]))
    expect(root.querySelector("g.node.container")?.getAttribute("data-path")).toBe("cpu")
    host.close("cpu")
    await ElementFixture.tick()
    expect(labels(root)).toEqual(["Clock", "CPU", "Memory"])
  })

  test("is accessible", async () => {
    const { host } = await graph()
    await expectAccessible(host)
  })

  test.each(Object.entries(EXAMPLES))("example %s is accessible", async (_path, html) => {
    const host = await ElementFixture.render(`<div>${html}</div>`)
    await ElementFixture.tick()
    await expectAccessible(host)
  })
})

describe("<ui-graph> drilling", () => {
  test("a drill shows the node's children, sets `path` and sends `ui-changed`", async () => {
    const { host, root } = await graph(' child-view="drill"')
    const sent = changes(host)
    root.querySelector<SVGGElement>("g.toggle")!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await ElementFixture.tick()

    expect(host.path).toBe("cpu")
    expect(sent).toEqual([expect.objectContaining({ kind: "path", path: "cpu" })])
    expect(labels(root)).toEqual(["ALU", "Registers"])
    // The CPU's ports are pins on the drawing's sides, and the breadcrumbs lead back.
    expect(root.querySelectorAll("g.pin")).toHaveLength(2)
    expect(root.querySelector("ui-breadcrumbs")).toBeTruthy()
    expect(host.matches(":state(drilled)")).toBe(true)

    await host.drillTo()
    await ElementFixture.tick()
    expect(host.path).toBe("")
    expect(labels(root)).toEqual(["Clock", "CPU", "Memory"])
    expect(sent.at(-1)).toEqual(expect.objectContaining({ kind: "path", path: "" }))
  })

  test("setting `path` drills there, and sends nothing", async () => {
    const { host, root } = await graph()
    const sent = changes(host)
    host.setAttribute("path", "cpu")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(labels(root)).toEqual(["ALU", "Registers"])
    expect(sent).toEqual([])
  })
})

describe("<ui-graph> selection", () => {
  test("a click selects a node:  `ui-selecting`, then `selected` and `ui-changed`", async () => {
    const { host, root } = await graph()
    const sent = changes(host)
    const memory = root.querySelector<SVGGElement>('g.node[data-path="mem"]')!
    memory.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await ElementFixture.tick()
    expect(host.selected).toEqual({ kind: "node", id: "mem", path: "mem" })
    expect(sent).toEqual([expect.objectContaining({ value: { kind: "node", id: "mem", path: "mem" } })])
    expect(memory.classList.contains("selected")).toBe(true)
  })

  test("a canceled `ui-selecting` keeps the selection", async () => {
    const { host, root } = await graph()
    host.addEventListener("ui-selecting", (event) => event.preventDefault())
    root.querySelector('g.node[data-path="mem"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await ElementFixture.tick()
    expect(host.selected).toBeUndefined()
  })
})

describe("<ui-graph> columns and fit", () => {
  /** A made-up build in two named columns. */
  const STAGES: GraphData = {
    groups: [
      { id: "source", label: "Sources" },
      { id: "build", label: "Build" }
    ],
    nodes: [
      { id: "repo", label: "Repo", group: "source" },
      { id: "compile", label: "Compile", group: "build", order: 1 },
      { id: "bundle", label: "Bundle", group: "build", order: 2 }
    ],
    edges: [
      { from: { node: "repo" }, to: { node: "compile" } },
      { from: { node: "compile" }, to: { node: "bundle" } }
    ]
  }

  /** Whether every node's box shows whole in the drawing's box. */
  function allShowing(root: ShadowRoot): boolean {
    const view = root.querySelector("svg")!.getBoundingClientRect()
    return [...root.querySelectorAll("g.node > rect")].every((rect) => {
      const box = rect.getBoundingClientRect()
      return box.left >= view.left && box.right <= view.right && box.top >= view.top && box.bottom <= view.bottom
    })
  }

  test("draws a band and a header per column", async () => {
    const host = await ElementFixture.render<GraphElement>(
      `<ui-graph graph='${JSON.stringify(STAGES)}' style="width: 640px"></ui-graph>`
    )
    await ElementFixture.tick()
    const root = host.shadowRoot!
    expect(root.querySelectorAll("g.column > rect.column-band")).toHaveLength(2)
    expect([...root.querySelectorAll("text.column-label")].map((text) => text.textContent)).toEqual([
      "Sources",
      "Build"
    ])
    // `arrange="layers"`:  no columns.
    host.setAttribute("arrange", "layers")
    await ElementFixture.tick()
    expect(root.querySelectorAll("g.column")).toHaveLength(0)
  })

  test("the toolbar sits at the right of the bar over the drawing, Fit last", async () => {
    const { root } = await graph()
    const toolbar = root.querySelector(".top-bar > .toolbar")!
    expect(toolbar).toBeTruthy()
    expect(toolbar.lastElementChild!.classList.contains("group-start")).toBe(true)
    const bar = root.querySelector(".top-bar")!.getBoundingClientRect()
    expect(bar.bottom).toBeLessThanOrEqual(root.querySelector("svg")!.getBoundingClientRect().top + 1)
  })

  test("fits the drawing to the view, and again, eased, when a node opens in place", async () => {
    const { host, root } = await graph()
    expect(allShowing(root)).toBe(true)
    await host.open("cpu")
    await ElementFixture.tick()
    // The fit eases over 350ms.
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(labels(root)).toEqual(expect.arrayContaining(["ALU", "Registers"]))
    expect(allShowing(root)).toBe(true)
  })
})
