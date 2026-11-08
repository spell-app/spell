import { describe, expect, onTestFinished, test, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import type { DiagramSpec, UIDiagram } from "spell/ui/components/ui-diagram"

import KITCHEN from "./fixtures/kitchen.json"
import RECIPE_BOX from "./fixtures/recipe-box.json"

import "spell/ui/components/ui-diagram"
import "spell/ui/components/ui-shape"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-diagram/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A `<ui-diagram>` DOM element, with its script API. */
type DiagramElement = DOMElement<UIDiagram> & {
  spec?: unknown
  putBack(): void
  toSVG(): string | undefined
}

/** `<ui-diagram>` holding `spec` in a script child (none:  no child). */
function markup(spec?: unknown, attributes = "", inside = "") {
  const script =
    spec === undefined
      ? ""
      : `<script type="application/json">${typeof spec === "string" ? spec : JSON.stringify(spec)}</script>`
  return `<ui-diagram${attributes}>${script}${inside}</ui-diagram>`
}

/** Render one diagram;  returns it with its `<svg>`. */
async function diagram(html: string) {
  const host = await ElementFixture.render<DiagramElement>(html)
  await ElementFixture.tick()
  return { host, svg: svgOf(host) }
}

/** `host`'s `<svg>`. */
function svgOf(host: Element): SVGSVGElement {
  return host.shadowRoot!.querySelector<SVGSVGElement>("svg[part~=diagram]")!
}

/** The box names drawn, in order. */
function names(host: Element): string[] {
  return [...svgOf(host).querySelectorAll("text.name")].map((text) => text.textContent ?? "")
}

/** Drag `target` by `dx`, `dy` pixels, as a mouse would. */
function drag(target: Element, dx: number, dy: number) {
  const box = target.getBoundingClientRect()
  const x = box.left + 4
  const y = box.top + 4
  const options = { bubbles: true, composed: true, pointerId: 1, pointerType: "mouse", button: 0 }
  target.dispatchEvent(new PointerEvent("pointerdown", { ...options, clientX: x, clientY: y }))
  window.dispatchEvent(new PointerEvent("pointermove", { ...options, clientX: x + dx / 2, clientY: y + dy / 2 }))
  window.dispatchEvent(new PointerEvent("pointermove", { ...options, clientX: x + dx, clientY: y + dy }))
  window.dispatchEvent(new PointerEvent("pointerup", { ...options, clientX: x + dx, clientY: y + dy }))
}

describe("<ui-diagram> drawing", () => {
  test("draws its script child's spec:  every box, its group, its lines, the legend", async () => {
    const { host, svg } = await diagram(markup(RECIPE_BOX))
    expect(svg.getAttribute("class")).toBe("ui diagram")
    expect(names(host)).toEqual([
      "Recipe",
      "Cuisine",
      "Tag",
      "Method",
      "Photo",
      "Note",
      "Technique",
      "Timer",
      "Photo hosts"
    ])
    expect(svg.querySelectorAll("text.group-label")).toHaveLength(2)
    expect(svg.querySelectorAll("path.line[stroke-dasharray]").length).toBeGreaterThan(0)
    expect([...svg.querySelectorAll("text.legend-text")].map((text) => text.textContent)).toEqual([
      "contains",
      "refers to"
    ])
    expect(svg.getAttribute("aria-label")).toBe("Diagram:  9 boxes, 11 links")
    await expectAccessible(host)
  })

  test("the `spec` property wins over the script child, and redraws when set again", async () => {
    const { host } = await diagram(markup(RECIPE_BOX))
    host.spec = KITCHEN
    await ElementFixture.tick()
    expect(names(host)).toContain("Cook")
    host.spec = undefined
    await ElementFixture.tick()
    expect(names(host)[0]).toBe("Recipe")
  })

  test("a flat spec is put in columns:  `columns` says how many at most", async () => {
    const spec: DiagramSpec = {
      nodes: [{ name: "A", fields: ["b"] }, { name: "B", fields: ["c"] }, { name: "C" }],
      edges: [
        { from: "A.b", to: "B" },
        { from: "B.c", to: "C" }
      ]
    }
    const { host } = await diagram(markup(spec, ' columns="2"'))
    const boxes = host.component!.layout!.boxes
    expect(boxes.get("B")!.x).toBeGreaterThan(boxes.get("A")!.x)
    expect(boxes.get("C")!.x).toBe(boxes.get("B")!.x)
  })

  test("with no spec, draws nothing:  a hidden, unnamed `<svg>`", async () => {
    const { svg } = await diagram(markup())
    expect(svg.getAttribute("class")).toBe("ui empty diagram")
    expect(svg.hasAttribute("aria-label")).toBe(false)
    expect(getComputedStyle(svg).display).toBe("none")
  })

  test("an edge naming a box it hasn't draws nothing and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const spec = {
      columns: [{ groups: [{ label: "A", nodes: [{ name: "One", fields: ["x"] }] }] }],
      edges: [{ from: "One.x", to: "Two" }]
    }
    const { svg } = await diagram(markup(spec))
    expect(svg.getAttribute("class")).toBe("ui empty diagram")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toMatch(/Two/)
  })

  test("a click that doesn't move is a click:  `ui-node-clicked`", async () => {
    const { host, svg } = await diagram(markup(RECIPE_BOX))
    const clicked = vi.fn()
    host.addEventListener("ui-node-clicked", clicked)
    ;(svg.querySelector('text.name[data-node="Note"]') as SVGElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true })
    )
    expect(clicked.mock.calls[0]![0].detail).toMatchObject({ name: "Note" })
  })

  test("toSVG():  the drawing as an SVG file, sized in points", async () => {
    const { host } = await diagram(markup(KITCHEN))
    const text = host.toSVG()!
    expect(text).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+pt" height="\d+pt" viewBox="-4 0 /)
    expect(text).toContain(">current_tasks[] (derived)</text>")
  })
})

describe("<ui-diagram> dragging", () => {
  test("dragging a box moves it and its lines;  Put back puts it back", async () => {
    const { host, svg } = await diagram(markup(RECIPE_BOX))
    const before = host.component!.layout!.boxes.get("Photo")!
    const linesBefore = [...svg.querySelectorAll("path.line")].map((path) => path.getAttribute("d"))
    drag(svg.querySelector('text.name[data-node="Photo"]')!, 60, 40)
    await ElementFixture.tick()
    const after = host.component!.layout!.boxes.get("Photo")!
    expect(after.x).toBeGreaterThan(before.x + 20)
    expect(after.y).toBeGreaterThan(before.y + 10)
    expect([...svg.querySelectorAll("path.line")].map((path) => path.getAttribute("d"))).not.toEqual(linesBefore)
    expect(host.matches(":state(moved)")).toBe(true)
    host.putBack()
    await ElementFixture.tick()
    expect(host.component!.layout!.boxes.get("Photo")).toEqual(before)
    expect(host.matches(":state(moved)")).toBe(false)
  })

  test("a drag says where the box went:  `ui-node-moved`", async () => {
    const { host, svg } = await diagram(markup(RECIPE_BOX))
    const moved = vi.fn()
    host.addEventListener("ui-node-moved", moved)
    drag(svg.querySelector('text.name[data-node="Tag"]')!, 50, 0)
    expect(moved).toHaveBeenCalledTimes(1)
    expect(moved.mock.calls[0]![0].detail).toMatchObject({ name: "Tag" })
  })

  test("`fixed`:  boxes don't move", async () => {
    const { host, svg } = await diagram(markup(RECIPE_BOX, " fixed"))
    const before = host.component!.layout!.boxes.get("Photo")!
    drag(svg.querySelector('text.name[data-node="Photo"]')!, 60, 40)
    await ElementFixture.tick()
    expect(host.component!.layout!.boxes.get("Photo")).toEqual(before)
  })

  test("`remember`:  where boxes were put is kept, and comes back on the next page", async () => {
    const name = `test-${Math.random().toString(36).slice(2)}`
    onTestFinished(() => localStorage.removeItem(`ui-diagram:${name}`))
    const first = await diagram(markup(RECIPE_BOX, ` remember="${name}"`))
    drag(first.svg.querySelector('text.name[data-node="Photo"]')!, 60, 40)
    await ElementFixture.tick()
    const placed = first.host.component!.layout!.boxes.get("Photo")!
    expect(localStorage.getItem(`ui-diagram:${name}`)).toMatch(/Photo/)
    const second = await diagram(markup(RECIPE_BOX, ` remember="${name}"`))
    expect(second.host.component!.layout!.boxes.get("Photo")!.x).toBeCloseTo(placed.x, 0)
  })
})

describe("<ui-diagram> keyboard", () => {
  /** The focusable shape of box `name`. */
  const boxShape = (svg: SVGSVGElement, name: string) =>
    svg.querySelector<SVGElement>(`[data-node="${name}"][tabindex="0"]`)!

  /** A key on `target`. */
  const key = (target: Element, name: string, shiftKey = false) =>
    target.dispatchEvent(new KeyboardEvent("keydown", { key: name, shiftKey, bubbles: true, composed: true }))

  test("each box is a button that takes focus, named by its name", async () => {
    const { svg } = await diagram(markup(RECIPE_BOX))
    const photo = boxShape(svg, "Photo")
    expect([photo.getAttribute("role"), photo.getAttribute("aria-label")]).toEqual(["button", "Photo"])
    expect(svg.getAttribute("role")).toBe("group")
  })

  test("the arrow keys move the focused box, Shift further;  each move is sent", async () => {
    const { host, svg } = await diagram(markup(RECIPE_BOX))
    const moved = vi.fn()
    host.addEventListener("ui-node-moved", moved)
    const before = host.component!.layout!.boxes.get("Photo")!
    key(boxShape(svg, "Photo"), "ArrowRight")
    key(boxShape(svg, "Photo"), "ArrowDown", true)
    await ElementFixture.tick()
    const after = host.component!.layout!.boxes.get("Photo")!
    expect([after.x - before.x, after.y - before.y]).toEqual([8, 40])
    expect(moved).toHaveBeenCalledTimes(2)
  })

  test("Enter is a click;  `fixed` boxes don't move", async () => {
    const { host, svg } = await diagram(markup(RECIPE_BOX, " fixed"))
    const clicked = vi.fn()
    host.addEventListener("ui-node-clicked", clicked)
    const before = host.component!.layout!.boxes.get("Photo")!
    key(boxShape(svg, "Photo"), "ArrowLeft")
    key(boxShape(svg, "Photo"), "Enter")
    await ElementFixture.tick()
    expect(host.component!.layout!.boxes.get("Photo")).toEqual(before)
    expect(clicked.mock.calls[0]![0].detail).toMatchObject({ name: "Photo" })
  })
})

describe("<ui-diagram> menu", () => {
  test("a right click opens its menu at the pointer;  Put back shows once a box has moved", async () => {
    const { host, svg } = await diagram(markup(RECIPE_BOX))
    const rightClick = () =>
      svg.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true, clientX: 30, clientY: 40 })
      )
    expect(rightClick()).toBe(false)
    await ElementFixture.tick()
    await new Promise((done) => requestAnimationFrame(done))
    const menu = host.shadowRoot!.querySelector<HTMLElement>("[part~=menu]")!
    expect(menu.matches(":popover-open")).toBe(true)
    expect(menu.querySelectorAll("ui-item")).toHaveLength(2)
    menu.hidePopover()
    // the popover's toggle event comes a task later
    await new Promise((done) => setTimeout(done, 20))
    await ElementFixture.tick()
    expect(host.shadowRoot!.querySelector("[part~=menu]")).toBeNull()
    svg
      .querySelector<SVGElement>('[data-node="Photo"][tabindex="0"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, composed: true }))
    rightClick()
    await ElementFixture.tick()
    expect(host.shadowRoot!.querySelectorAll("[part~=menu] ui-item")).toHaveLength(3)
  })
})

describe("<ui-diagram> boxes that hold content", () => {
  test("a `<ui-diagram-node>` fills its box:  the box takes its size, and follows it", async () => {
    const spec: DiagramSpec = {
      columns: [
        { groups: [{ label: "A", nodes: [{ name: "One", fields: ["two"] }] }] },
        { groups: [{ label: "B", nodes: [{ name: "Two" }] }] }
      ],
      edges: [{ from: "One.two", to: "Two" }]
    }
    const inside = `<ui-diagram-node name="One"><div style="width: 240px; height: 120px">Held</div></ui-diagram-node>`
    const { host } = await diagram(markup(spec, "", inside))
    await expect.poll(() => host.component!.layout!.boxes.get("One")!.height).toBe(120)
    expect(host.component!.layout!.boxes.get("One")!.width).toBeGreaterThanOrEqual(240)
    const held = host.querySelector("ui-diagram-node div")!
    ;(held as HTMLElement).style.height = "200px"
    await expect.poll(() => host.component!.layout!.boxes.get("One")!.height).toBe(200)
  })
})

describe("<ui-diagram-node resizable>", () => {
  test("its corner resizes it, and a press there doesn't drag the box", async () => {
    const spec: DiagramSpec = { columns: [{ groups: [{ label: "A", nodes: [{ name: "One" }] }] }] }
    const inside = `<ui-diagram-node name="One" resizable><div>Held</div></ui-diagram-node>`
    const { host } = await diagram(markup(spec, "", inside))
    const node = host.querySelector("ui-diagram-node")!
    const content = node.shadowRoot!.querySelector<HTMLElement>("[part~=content]")!
    expect(getComputedStyle(content).resize).toBe("both")
    await expect.poll(() => host.component!.layout!.boxes.get("One")!.height).toBeGreaterThan(0)
    const before = host.component!.layout!.boxes.get("One")!
    const box = content.getBoundingClientRect()
    const options = { bubbles: true, composed: true, pointerId: 1, pointerType: "mouse", button: 0 }
    node.dispatchEvent(new PointerEvent("pointerdown", { ...options, clientX: box.right - 4, clientY: box.bottom - 4 }))
    window.dispatchEvent(
      new PointerEvent("pointermove", { ...options, clientX: box.right + 60, clientY: box.bottom + 60 })
    )
    window.dispatchEvent(
      new PointerEvent("pointerup", { ...options, clientX: box.right + 60, clientY: box.bottom + 60 })
    )
    await ElementFixture.tick()
    expect(host.component!.layout!.boxes.get("One")!.x).toBe(before.x)
  })

  test("`horizontally` and `vertically` limit it to one way", async () => {
    const spec: DiagramSpec = { columns: [{ groups: [{ label: "A", nodes: [{ name: "One" }] }] }] }
    const { host } = await diagram(
      markup(spec, "", `<ui-diagram-node name="One" resizable="vertically"><div>Held</div></ui-diagram-node>`)
    )
    const content = host.querySelector("ui-diagram-node")!.shadowRoot!.querySelector<HTMLElement>("[part~=content]")!
    expect(getComputedStyle(content).resize).toBe("vertical")
  })
})

describe("<ui-diagram> examples", () => {
  test.each(Object.entries(EXAMPLES))("%s draws every diagram, accessibly", async (_path, html) => {
    const root = await ElementFixture.render<HTMLElement>(html)
    await ElementFixture.tick()
    const diagrams = [...root.querySelectorAll<DiagramElement>("ui-diagram")]
    expect(diagrams.length).toBeGreaterThan(0)
    for (const each of diagrams) expect(svgOf(each).getAttribute("class")).toBe("ui diagram")
    await expectAccessible(root)
  })
})
