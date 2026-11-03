import { describe, expect, onTestFinished, test, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import type { TreeDiagramLayout, TreeDiagramNode, UITreeDiagram } from "spell/ui/components/ui-tree-diagram"

import "spell/ui/components/ui-tree-diagram"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-tree-diagram/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** The FizzBuzz line of the epic's sketch, as the docs page gives it. */
const FIZZBUZZ: TreeDiagramNode = {
  label: "If",
  title: "if number / 15 is an integer",
  children: [
    {
      label: "IsA · integer",
      edgeLabel: "condition",
      children: [
        {
          label: "Divide",
          detail: "number",
          edgeLabel: "value",
          children: [{ label: "Variable number" }, { label: "Number 15" }]
        }
      ]
    },
    { label: "Print", edgeLabel: "body" },
    { label: "If …", edgeLabel: "otherwise" }
  ]
}

/** A `<ui-tree-diagram>` DOM element, with its `tree` property. */
type TreeDiagramElement = DOMElement & { tree?: unknown }

/** `<ui-tree-diagram>` holding `json` in a script child (none:  no child). */
function markup(json?: string, attributes = "") {
  const script = json === undefined ? "" : `<script type="application/json">${json}</script>`
  return `<ui-tree-diagram${attributes}>${script}</ui-tree-diagram>`
}

/** Render one diagram;  returns it with its `<svg>`. */
async function diagram(html: string) {
  const host = await ElementFixture.render<TreeDiagramElement>(html)
  return { host, svg: svgOf(host) }
}

/** `host`'s `<svg>`. */
function svgOf(host: Element): SVGSVGElement {
  return host.shadowRoot!.querySelector<SVGSVGElement>("svg[part~=diagram]")!
}

/** What `host` drew:  its text's measured, so a layout from character counts isn't it. */
function layoutOf(host: Element): TreeDiagramLayout {
  return (host as DOMElement<UITreeDiagram>).component!.layout!
}

/** The labels drawn, in order. */
function labels(host: Element): string[] {
  return [...svgOf(host).querySelectorAll("g[part~=node] text.label")].map((text) => text.textContent ?? "")
}

////////////////
// ## Data
////////////////

describe("<ui-tree-diagram> data", () => {
  test("draws the tree in its JSON script child:  a node per box, an edge per child, slot labels on edges", async () => {
    const { host, svg } = await diagram(markup(JSON.stringify(FIZZBUZZ)))
    expect(svg.getAttribute("class")).toBe("ui tree diagram")
    expect(labels(host)).toEqual(["If", "IsA · integer", "Divide", "Variable number", "Number 15", "Print", "If …"])
    const nodes = svg.querySelectorAll("g[part~=node]")
    expect(nodes).toHaveLength(7)
    expect(svg.querySelectorAll("path[part~=edge]")).toHaveLength(6)
    expect([...svg.querySelectorAll("text[part~=edge-label]")].map((text) => text.textContent)).toEqual([
      "condition",
      "value",
      "body",
      "otherwise"
    ])
    expect(svg.querySelectorAll("g[part~=node] text.detail")).toHaveLength(1)
  })

  test("draws the layout's numbers:  `viewBox` at natural size, each box where `TreeLayout` put it", async () => {
    const { host, svg } = await diagram(markup(JSON.stringify(FIZZBUZZ)))
    const layout = layoutOf(host)
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${layout.width} ${layout.height}`)
    const rects = [...svg.querySelectorAll("rect.box")]
    expect(rects.map((rect) => Number(rect.getAttribute("x")))).toEqual(layout.boxes.map((box) => box.x))
    expect(rects.map((rect) => Number(rect.getAttribute("width")))).toEqual(layout.boxes.map((box) => box.width))
  })

  test("the `tree` property wins over the script child, and redraws when set again", async () => {
    const { host } = await diagram(markup(JSON.stringify(FIZZBUZZ)))
    host.tree = { label: "Add", children: [{ label: "Number 1" }, { label: "Number 2" }] }
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["Add", "Number 1", "Number 2"])
    host.tree = { label: "Number 15" }
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["Number 15"])
    expect(svgOf(host).querySelectorAll("path")).toHaveLength(0)
    host.tree = undefined
    await ElementFixture.tick()
    expect(labels(host)[0]).toBe("If")
  })

  test("takes the tree as JSON in the attribute too", async () => {
    const { host } = await diagram(`<ui-tree-diagram tree='{"label": "Root"}'></ui-tree-diagram>`)
    expect(labels(host)).toEqual(["Root"])
  })

  test("follows its script child as the page changes it", async () => {
    const { host } = await diagram(markup('{"label": "Before"}'))
    host.querySelector("script")!.textContent = '{"label": "After", "children": [{"label": "Child"}]}'
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["After", "Child"])
  })

  test("with no tree, draws nothing:  a hidden, unnamed `<svg>`, an element with no height", async () => {
    const { host, svg } = await diagram(markup())
    expect(svg.getAttribute("class")).toBe("ui empty tree diagram")
    expect(svg.hasAttribute("role")).toBe(false)
    expect(svg.hasAttribute("aria-label")).toBe(false)
    expect(getComputedStyle(svg).display).toBe("none")
    expect(host.getBoundingClientRect().height).toBe(0)
  })

  test("invalid JSON draws nothing and warns ONCE;  fixing it draws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const { host, svg } = await diagram(markup("{label: If}"))
    expect(svg.getAttribute("class")).toBe("ui empty tree diagram")
    host.tree = { label: "Other" }
    await ElementFixture.tick()
    host.tree = undefined
    await ElementFixture.tick()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain("<ui-tree-diagram>")
    host.querySelector("script")!.textContent = '{"label": "If"}'
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["If"])
  })
})

////////////////
// ## Nested tags
////////////////

/** `FIZZBUZZ` as nested tags. */
const FIZZBUZZ_TAGS = `<ui-tree-diagram>
  <ui-tree-node label="If" hover-text="if number / 15 is an integer">
    <ui-tree-node label="IsA · integer" edge-label="condition">
      <ui-tree-node label="Divide" detail="number" edge-label="value">
        <ui-tree-node label="Variable number"></ui-tree-node>
        <ui-tree-node label="Number 15"></ui-tree-node>
      </ui-tree-node>
    </ui-tree-node>
    <ui-tree-node label="Print" edge-label="body"></ui-tree-node>
    <ui-tree-node label="If …" edge-label="otherwise"></ui-tree-node>
  </ui-tree-node>
</ui-tree-diagram>`

describe("<ui-tree-node>", () => {
  test("nested tags draw the same tree as the same data in JSON", async () => {
    const nested = await ElementFixture.render<TreeDiagramElement>(FIZZBUZZ_TAGS)
    await ElementFixture.settle()
    const json = await ElementFixture.render<TreeDiagramElement>(markup(JSON.stringify(FIZZBUZZ)))
    await ElementFixture.settle()
    expect(labels(nested)).toEqual(labels(json))
    expect(layoutOf(nested).width).toBe(layoutOf(json).width)
    expect(svgOf(nested).getAttribute("aria-label")).toBe("Tree:  If, with 3 children")
    expect(svgOf(nested).querySelector("title")!.textContent).toBe("if number / 15 is an integer")
  })

  test("a node's own text is its label, when it has no `label`", async () => {
    const host = await ElementFixture.render(`<ui-tree-diagram>
      <ui-tree-node>Root
        <ui-tree-node>Its child</ui-tree-node>
      </ui-tree-node>
    </ui-tree-diagram>`)
    await ElementFixture.settle()
    expect(labels(host)).toEqual(["Root", "Its child"])
  })

  test("follows the tags:  a label changed, a node added", async () => {
    const host = await ElementFixture.render(
      `<ui-tree-diagram><ui-tree-node label="a"></ui-tree-node></ui-tree-diagram>`
    )
    await ElementFixture.settle()
    const root = host.querySelector("ui-tree-node")!
    root.setAttribute("label", "b")
    root.insertAdjacentHTML("beforeend", `<ui-tree-node label="c"></ui-tree-node>`)
    await ElementFixture.settle()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["b", "c"])
  })

  test("the `tree` property wins over nested tags, and they over a JSON child", async () => {
    const host = await ElementFixture.render<TreeDiagramElement>(
      `<ui-tree-diagram><ui-tree-node label="tags"></ui-tree-node><ui-json>{ "label": "json" }</ui-json></ui-tree-diagram>`
    )
    await ElementFixture.settle()
    expect(labels(host)).toEqual(["tags"])
    host.tree = { label: "property" }
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["property"])
  })

  test("an element inside a node shows over its box, measured, and scales with the drawing", async () => {
    const wrapper = await ElementFixture.render(`<div style="width: 800px"><ui-tree-diagram>
      <ui-tree-node label="Root">
        <ui-tree-node>
          <span class="held" style="display: block; width: 100px; height: 40px"></span>
        </ui-tree-node>
        <ui-tree-node label="Other"></ui-tree-node>
      </ui-tree-node>
    </ui-tree-diagram></div>`)
    await ElementFixture.settle()
    await ElementFixture.tick()
    await ElementFixture.tick()
    const host = wrapper.querySelector("ui-tree-diagram")!
    const held = wrapper.querySelector(".held")!.getBoundingClientRect()
    const box = svgOf(host).querySelectorAll("g[part~=node] rect.box")[1]!.getBoundingClientRect()
    expect(held.width).toBeGreaterThan(50)
    expect(held.left).toBeGreaterThanOrEqual(box.left)
    expect(held.right).toBeLessThanOrEqual(box.right)
    expect(held.top).toBeGreaterThanOrEqual(box.top)
    expect(held.bottom).toBeLessThanOrEqual(box.bottom)
    expect((held.left + held.right) / 2).toBeCloseTo((box.left + box.right) / 2, 0)
    expect((held.top + held.bottom) / 2).toBeCloseTo((box.top + box.bottom) / 2, 0)
  })
})

////////////////
// ## Measured text
////////////////

describe("<ui-tree-diagram> measuring", () => {
  /** Each drawn text with the box it's in. */
  function textsAndBoxes(host: Element) {
    return [...svgOf(host).querySelectorAll("g[part~=node]")].map((node) => ({
      box: node.querySelector("rect.box")!.getBoundingClientRect(),
      label: node.querySelector("text.label")!.getBoundingClientRect()
    }))
  }

  test("every label sits centred in its box, with its padding, in a proportional font", async () => {
    const host = await ElementFixture.render<TreeDiagramElement>(
      markup(JSON.stringify({ label: "iiiiiiiiiiiiiiii", children: [{ label: "WWWWWWWWWWWWWWWW" }, { label: "Mg" }] }))
    )
    await ElementFixture.settle()
    for (const { box, label } of textsAndBoxes(host)) {
      expect((label.left + label.right) / 2).toBeCloseTo((box.left + box.right) / 2, 0)
      expect(label.left).toBeGreaterThanOrEqual(box.left)
      expect(label.right).toBeLessThanOrEqual(box.right)
    }
    const [narrow, wide] = textsAndBoxes(host)
    expect(wide!.box.width).toBeGreaterThan(narrow!.box.width * 1.5)
    const padding = wide!.label.left - wide!.box.left
    expect(padding).toBeCloseTo(wide!.box.right - wide!.label.right, 0)
    expect(padding).toBeLessThan(16)
  })

  test("measures inside a hidden element:  the boxes are right the moment it shows", async () => {
    const wrapper = await ElementFixture.render(
      `<div hidden>${markup(JSON.stringify({ label: "WWWWWWWWWWWWWWWW" }))}</div>`
    )
    await ElementFixture.settle()
    wrapper.removeAttribute("hidden")
    const [drawn] = textsAndBoxes(wrapper.querySelector("ui-tree-diagram")!)
    expect(drawn!.label.right).toBeLessThanOrEqual(drawn!.box.right)
    expect(drawn!.box.right - drawn!.label.right).toBeLessThan(16)
  })

  test("a font token's change measures again", async () => {
    const host = await ElementFixture.render<TreeDiagramElement>(markup(JSON.stringify({ label: "Mmmmmmmmmmmm" })))
    await ElementFixture.settle()
    const before = layoutOf(host).width
    host.style.setProperty("--ui-tree-diagram-font-family", "monospace")
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    await ElementFixture.tick()
    expect(layoutOf(host).width).not.toBe(before)
    const [drawn] = textsAndBoxes(host)
    expect(drawn!.label.right).toBeLessThanOrEqual(drawn!.box.right)
  })
})

////////////////
// ## Direction, colour, kind
////////////////

describe("<ui-tree-diagram> variations", () => {
  test('`direction="left-right"`:  children after their parent, not under it', async () => {
    const host = await ElementFixture.render(`<ui-tree-diagram direction="left-right">
      <ui-tree-node label="Root"><ui-tree-node label="a"></ui-tree-node><ui-tree-node label="b"></ui-tree-node></ui-tree-node>
    </ui-tree-diagram>`)
    await ElementFixture.settle()
    const [root, a, b] = [...svgOf(host).querySelectorAll("g[part~=node] rect.box")].map((box) =>
      box.getBoundingClientRect()
    )
    expect(a!.left).toBeGreaterThan(root!.right)
    expect(b!.top).toBeGreaterThan(a!.bottom)
  })

  test("`color` paints a box in that hue;  `kind` adds a part a page can reach", async () => {
    const red = "rgb(255, 0, 0)"
    const wrapper = await ElementFixture.render(`<div>
      <style>.themed::part(kind-call) { --ui-tree-diagram-node-background: ${red} }</style>
      <ui-tree-diagram class="themed">
        <ui-tree-node label="Root" color="green">
          <ui-tree-node label="a" kind="call"></ui-tree-node>
          <ui-tree-node label="b" color="red"></ui-tree-node>
        </ui-tree-node>
      </ui-tree-diagram>
    </div>`)
    await ElementFixture.settle()
    const svg = svgOf(wrapper.querySelector("ui-tree-diagram")!)
    const fills = [...svg.querySelectorAll("g[part~=node] rect.box")].map((box) => getComputedStyle(box).fill)
    expect(fills[1]).toBe(red)
    expect(fills[0]).not.toBe(fills[2])
    expect(svg.querySelectorAll("g[part~=kind-call]")).toHaveLength(1)
  })
})

////////////////
// ## Clicks and folding
////////////////

describe("<ui-tree-diagram> events", () => {
  const TREE = JSON.stringify({
    label: "Root",
    children: [{ label: "a", children: [{ label: "under a" }] }, { label: "b" }]
  })

  test("a click on a node sends `ui-node-clicked`, with its node and path", async () => {
    const host = await ElementFixture.render(markup(TREE))
    await ElementFixture.settle()
    const clicked = vi.fn()
    host.addEventListener("ui-node-clicked", (event) => clicked((event as CustomEvent).detail))
    svgOf(host)
      .querySelectorAll("g[part~=node]")[1]!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    expect(clicked).toHaveBeenCalledTimes(1)
    expect(clicked.mock.calls[0]![0]).toMatchObject({ path: "0.0", node: { label: "a" } })
  })

  test("`clickable`:  nodes are buttons, in the tab order, and Enter clicks;  the drawing's a group", async () => {
    const host = await ElementFixture.render(markup(TREE, " clickable"))
    await ElementFixture.settle()
    const clicked = vi.fn()
    host.addEventListener("ui-node-clicked", clicked)
    const node = svgOf(host).querySelector<SVGGElement>("g[part~=node]")!
    expect(svgOf(host).getAttribute("role")).toBe("group")
    expect(node.getAttribute("role")).toBe("button")
    expect(node.getAttribute("tabindex")).toBe("0")
    node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }))
    expect(clicked).toHaveBeenCalledTimes(1)
    await expectAccessible(host)
  })

  test("`foldable`:  a button folds a node away and opens it again, sending `ui-node-toggled`, and no click", async () => {
    const host = await ElementFixture.render(markup(TREE, " foldable"))
    await ElementFixture.settle()
    const toggled = vi.fn()
    const clicked = vi.fn()
    host.addEventListener("ui-node-toggled", (event) => toggled((event as CustomEvent).detail))
    host.addEventListener("ui-node-clicked", clicked)
    const toggles = () => [...svgOf(host).querySelectorAll<SVGGElement>("g[part~=toggle]")]
    expect(toggles()).toHaveLength(2)
    expect(labels(host)).toEqual(["Root", "a", "under a", "b"])
    const click = (button: Element) => button.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    click(toggles()[1]!)
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["Root", "a", "b"])
    expect(toggled.mock.calls[0]![0]).toMatchObject({ path: "0.0", folded: true })
    expect(toggles()[1]!.getAttribute("aria-expanded")).toBe("false")
    click(toggles()[1]!)
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["Root", "a", "under a", "b"])
    expect(clicked).not.toHaveBeenCalled()
    await expectAccessible(host)
  })

  test("`folded` starts it folded;  a tree that changes keeps what a person folded", async () => {
    const host = await ElementFixture.render<TreeDiagramElement>(`<ui-tree-diagram foldable>
      <ui-tree-node label="Root"><ui-tree-node label="a" folded><ui-tree-node label="under a"></ui-tree-node></ui-tree-node></ui-tree-node>
    </ui-tree-diagram>`)
    await ElementFixture.settle()
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["Root", "a"])
    const toggle = svgOf(host).querySelectorAll("g[part~=toggle]")[1]!
    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["Root", "a", "under a"])
    host.querySelector("ui-tree-node")!.setAttribute("label", "Root 2")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(labels(host)).toEqual(["Root 2", "a", "under a"])
  })

  test("a click on what a node holds is that node's click", async () => {
    const host = await ElementFixture.render(`<ui-tree-diagram>
      <ui-tree-node label="Root"><ui-tree-node><button class="held">Go</button></ui-tree-node></ui-tree-node>
    </ui-tree-diagram>`)
    await ElementFixture.settle()
    const clicked = vi.fn()
    host.addEventListener("ui-node-clicked", (event) => clicked((event as CustomEvent).detail))
    host.querySelector<HTMLElement>(".held")!.click()
    expect(clicked.mock.calls[0]![0]).toMatchObject({ path: "0.0" })
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-tree-diagram> accessibility", () => {
  test("is an image named by its root and how many children it has", async () => {
    const { host, svg } = await diagram(markup(JSON.stringify(FIZZBUZZ)))
    expect(svg.getAttribute("role")).toBe("img")
    expect(svg.getAttribute("aria-label")).toBe("Tree:  If, with 3 children")
    host.tree = { label: "Print", children: [{ label: "x" }] }
    await ElementFixture.tick()
    expect(svg.getAttribute("aria-label")).toBe("Tree:  Print, with 1 child")
    host.tree = { label: "x" }
    await ElementFixture.tick()
    expect(svg.getAttribute("aria-label")).toBe("Tree:  x")
  })

  test("gives a node's `title` to its box as hover text;  the root is also part `root-node`", async () => {
    const { svg } = await diagram(markup(JSON.stringify(FIZZBUZZ)))
    const root = svg.querySelector("g[part~=node]")!
    expect(root.getAttribute("part")).toBe("node root-node")
    expect(root.querySelector("title")!.textContent).toBe("if number / 15 is an integer")
    expect(svg.querySelectorAll("title")).toHaveLength(1)
  })

  test.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})

////////////////
// ## Look and size
////////////////

describe("<ui-tree-diagram> look", () => {
  test("sets labels in the page's font, not a monospace one, edge labels in italics", async () => {
    const { svg } = await diagram(markup(JSON.stringify(FIZZBUZZ)))
    expect(getComputedStyle(svg.querySelector("text.label")!).fontFamily).not.toMatch(/mono/i)
    expect(getComputedStyle(svg.querySelector("text.edge-label")!).fontStyle).toBe("italic")
  })

  test("draws at its natural size in a wide container:  its width in label em", async () => {
    const wrapper = await ElementFixture.render(
      `<div style="width: 2000px; font-size: 16px">${markup(JSON.stringify(FIZZBUZZ))}</div>`
    )
    const svg = svgOf(wrapper.querySelector("ui-tree-diagram")!)
    const fontSize = Number.parseFloat(getComputedStyle(svg).fontSize)
    expect(fontSize).toBe(13)
    expect(svg.getBoundingClientRect().width).toBeCloseTo(
      (layoutOf(wrapper.querySelector("ui-tree-diagram")!).width / 12) * fontSize,
      0
    )
  })

  test("shrinks to fit a narrower container, keeping its shape", async () => {
    const tree = JSON.stringify(FIZZBUZZ)
    const wrapper = await ElementFixture.render(`<div style="width: 350px">${markup(tree)}</div>`)
    const svg = svgOf(wrapper.querySelector("ui-tree-diagram")!)
    const layout = layoutOf(wrapper.querySelector("ui-tree-diagram")!)
    const box = svg.getBoundingClientRect()
    expect(box.width).toBeCloseTo(350, 0)
    expect(box.height).toBeCloseTo((350 * layout.height) / layout.width, 0)
  })

  test("stops shrinking at the minimum scale, and scrolls sideways inside the element", async () => {
    const wrapper = await ElementFixture.render(
      `<div style="width: 120px; font-size: 16px">${markup(JSON.stringify(FIZZBUZZ))}</div>`
    )
    const host = wrapper.querySelector("ui-tree-diagram")!
    const svg = svgOf(host)
    const natural = (layoutOf(host).width / 12) * Number.parseFloat(getComputedStyle(svg).fontSize)
    expect(svg.getBoundingClientRect().width).toBeCloseTo(natural * 0.75, 0)
    expect(host.getBoundingClientRect().width).toBeCloseTo(120, 0)
    expect(host.scrollWidth).toBeGreaterThan(host.clientWidth)
  })

  test("colours follow the colour scheme:  light and dark differ", async () => {
    const tree = JSON.stringify(FIZZBUZZ)
    const light = await ElementFixture.render(`<div style="color-scheme: light">${markup(tree)}</div>`)
    const dark = await ElementFixture.render(`<div style="color-scheme: dark">${markup(tree)}</div>`)
    const fill = (wrapper: Element, selector: string) =>
      getComputedStyle(svgOf(wrapper.querySelector("ui-tree-diagram")!).querySelector(selector)!).fill
    expect(fill(light, "g:not(.root) rect.box")).not.toBe(fill(dark, "g:not(.root) rect.box"))
    expect(fill(light, "text.label")).not.toBe(fill(dark, "text.label"))
  })

  test("takes its tokens from outside:  the element, an ancestor, `::part()`", async () => {
    const red = "rgb(255, 0, 0)"
    const tree = JSON.stringify(FIZZBUZZ)
    const onHost = await ElementFixture.render(markup(tree, ` style="--ui-tree-diagram-edge-color: ${red}"`))
    expect(getComputedStyle(svgOf(onHost).querySelector("path.edge")!).stroke).toBe(red)
    const ancestor = await ElementFixture.render(
      `<section style="--ui-tree-diagram-node-background: ${red}">${markup(tree)}</section>`
    )
    const box = svgOf(ancestor.querySelector("ui-tree-diagram")!).querySelector("g:not(.root) rect.box")!
    expect(getComputedStyle(box).fill).toBe(red)
    const parted = await ElementFixture.render(
      `<div><style>.themed::part(root-node) { --ui-tree-diagram-root-background: ${red} }</style>${markup(tree, ' class="themed"')}</div>`
    )
    const root = svgOf(parted.querySelector("ui-tree-diagram")!).querySelector("g.root rect.box")!
    expect(getComputedStyle(root).fill).toBe(red)
  })
})
