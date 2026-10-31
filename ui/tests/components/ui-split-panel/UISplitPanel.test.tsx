import { flush } from "solid-js"
import { describe, expect, it, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UISplitPanel } from "spell/ui/components/ui-split-panel"

import "spell/ui/components/ui-panel"

/** A split panel in the page, 600 by 200, with three `<div>` panes unless told otherwise. */
async function panel(attributes: string, panes = "<div>a</div><div>b</div><div>c</div>") {
  return (await ElementFixture.render(
    `<ui-split-panel ${attributes} style="width: 600px; height: 200px">${panes}</ui-split-panel>`
  )) as HTMLElement
}

/** Its bars, in order. */
function bars(host: Element): HTMLElement[] {
  return [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part~="bar"]')]
}

/** Its children's widths, whole px. */
function widths(host: Element): number[] {
  return [...host.children].map((child) => Math.round(child.getBoundingClientRect().width))
}

/** Drag `bar` by `moved` px across. */
function dragAcross(bar: HTMLElement, moved: number) {
  const { x, y } = bar.getBoundingClientRect()
  bar.setPointerCapture = () => undefined
  const fire = (type: string, clientX: number) =>
    bar.dispatchEvent(new PointerEvent(type, { clientX, clientY: y, button: 0, bubbles: true, composed: true }))
  fire("pointerdown", x)
  flush()
  fire("pointermove", x + moved)
  fire("pointerup", x + moved)
  flush()
}

describe("<ui-split-panel>", () => {
  it("lays its children out in the sizes given, a bar between each two", async () => {
    const host = await panel('columns="25%,*,100px" resizable')
    expect(bars(host)).toHaveLength(2)
    const [first, second, third] = [...host.children] as HTMLElement[]
    expect(first.style.flex).toBe("25 25 0px")
    expect(second.style.flex).toBe("75 75 0px")
    expect(third.style.flex).toBe("0 0 100px")
    expect(third.getBoundingClientRect().width).toBe(100)
    // pane, bar, pane, bar, pane, by `order`
    expect([first.style.order, second.style.order, third.style.order]).toEqual(["0", "2", "4"])
    expect(first.getBoundingClientRect().right).toBeLessThanOrEqual(bars(host)[0].getBoundingClientRect().left)
    expect(bars(host)[0].getBoundingClientRect().right).toBeLessThanOrEqual(second.getBoundingClientRect().left)
  })

  it("no sizes:  all the same;  `rows`:  one above the other", async () => {
    const across = await panel("columns")
    const [a, b, c] = widths(across)
    expect(a).toBe(b)
    expect(b).toBe(c)
    const down = await panel('rows="50%,*,*"')
    expect(getComputedStyle(down).flexDirection).toBe("column")
    expect(down.matches(":state(rows)")).toBe(true)
    expect((down.children[0] as HTMLElement).style.flex).toBe("50 50 0px")
    expect((down.children[1] as HTMLElement).style.flex).toBe("25 25 0px")
  })

  it("a hidden child is no pane, and comes back in the same element", async () => {
    const host = await panel('columns="50%,50%" resizable', '<div>a</div><div hidden id="off">b</div><div>c</div>')
    expect(bars(host)).toHaveLength(1)
    const off = host.querySelector<HTMLElement>("#off")!
    off.hidden = false
    await vi.waitFor(() => expect(bars(host)).toHaveLength(2))
    expect(host.querySelector("#off")).toBe(off)
    expect(off.style.flex).toBe("50 50 0px")
  })

  it("a child added or removed changes the panes, and moves no other", async () => {
    const host = await panel("columns resizable", "<div>a</div><div>b</div>")
    const first = host.children[0]
    const connected = vi.fn()
    first.addEventListener("transitionstart", connected)
    host.append(document.createElement("div"))
    await vi.waitFor(() => expect(bars(host)).toHaveLength(2))
    host.lastElementChild!.remove()
    await vi.waitFor(() => expect(bars(host)).toHaveLength(1))
    expect(host.children[0]).toBe(first)
  })

  it("dragging a bar moves the two shares beside it, and says so when let go", async () => {
    const host = await panel('columns="50%,50%" resizable', "<div>a</div><div>b</div>")
    const changed = vi.fn()
    host.addEventListener("ui-changed", changed)
    const [left, right] = widths(host)
    dragAcross(bars(host)[0], 60)
    const [newLeft, newRight] = widths(host)
    expect(newLeft).toBeGreaterThan(left + 55)
    expect(newRight).toBeLessThan(right - 55)
    expect(changed).toHaveBeenCalledOnce()
    const { sizes, panes } = (changed.mock.calls[0][0] as CustomEvent).detail
    expect(sizes).toMatch(/^[\d.]+%,[\d.]+%$/)
    expect(panes).toEqual([...host.children])
  })

  it("a fixed pane takes the move in px, and the shares take up the difference", async () => {
    const host = await panel('columns="*,*,200px" resizable')
    dragAcross(bars(host)[1], -50)
    const [first, second, fixed] = widths(host)
    expect(fixed).toBe(250)
    expect(first).toBe(second)
  })

  it("beside an `auto` pane, a fixed pane grows past both, the panel with it, down to `min-size`", async () => {
    const host = (await ElementFixture.render(
      `<ui-split-panel rows="auto,100px" min-size="60px" resizable style="height: auto">
         <div style="height: 40px">top</div><div>bottom</div>
       </ui-split-panel>`
    )) as HTMLElement
    const bar = bars(host)[0]
    const { x, y } = bar.getBoundingClientRect()
    bar.setPointerCapture = () => undefined
    const fire = (type: string, clientY: number) =>
      bar.dispatchEvent(new PointerEvent(type, { clientX: x, clientY, button: 0, bubbles: true, composed: true }))
    fire("pointerdown", y)
    flush()
    fire("pointermove", y - 300)
    expect((host.children[1] as HTMLElement).style.flex).toBe("0 0 400px")
    fire("pointermove", y + 300)
    expect((host.children[1] as HTMLElement).style.flex).toBe("0 0 60px")
    fire("pointerup", y)
  })

  it("the arrow keys move a focused bar, Shift further;  and it's a named separator", async () => {
    const host = await panel('columns="50%,50%" resizable', "<div>a</div><div>b</div>")
    const changed = vi.fn()
    host.addEventListener("ui-changed", changed)
    const bar = bars(host)[0]
    expect(bar.getAttribute("role")).toBe("separator")
    expect(bar.getAttribute("aria-label")).toBeTruthy()
    expect(bar.tabIndex).toBe(0)
    const [left] = widths(host)
    bar.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))
    const [one] = widths(host)
    expect(one).toBeGreaterThan(left + 10)
    bar.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: true, bubbles: true, composed: true }))
    expect(widths(host)[0]).toBeLessThan(one - 100)
    expect(changed).toHaveBeenCalledTimes(2)
    await expectAccessible(host)
  })

  it("not resizable:  bars don't drag or take the focus", async () => {
    const host = await panel("columns", "<div>a</div><div>b</div>")
    const bar = bars(host)[0]
    expect(bar.hasAttribute("tabindex")).toBe(false)
    expect(bar.getAttribute("role")).toBeNull()
    const [left] = widths(host)
    dragAcross(bar, 60)
    expect(widths(host)[0]).toBe(left)
  })

  it("a `<ui-panel parent>` written anywhere joins it as a pane", async () => {
    const holder = (await ElementFixture.render(
      `<div>
         <ui-panel parent="joined-split" label="One" appearance="pane">one</ui-panel>
         <ui-split-panel id="joined-split" columns="30%,*" resizable style="width: 600px; height: 200px"></ui-split-panel>
         <ui-panel parent="joined-split" label="Two" appearance="pane">two</ui-panel>
       </div>`
    )) as HTMLElement
    const host = holder.querySelector("ui-split-panel")!
    await vi.waitFor(() => expect(bars(host)).toHaveLength(1))
    const [one, two] = [...host.children] as HTMLElement[]
    expect(one.getAttribute("label")).toBe("One")
    expect(two.getAttribute("label")).toBe("Two")
    await vi.waitFor(() => expect(Math.round(one.getBoundingClientRect().width)).toBeGreaterThan(150))
    expect(one.getBoundingClientRect().width).toBeLessThan(two.getBoundingClientRect().width)
  })

  it("reads sizes as it should", () => {
    expect(UISplitPanel.sizesFor("80%", 2)).toEqual([
      { value: 80, units: "%" },
      { value: 20, units: "%" }
    ])
    expect(UISplitPanel.sizesFor("*,*,200px", 3)[0]).toEqual({ value: 50, units: "%" })
    expect(UISplitPanel.sizesFor("2em,auto", 2)).toEqual([
      { value: 2, units: "em" },
      { value: 0, units: "auto" }
    ])
    expect(UISplitPanel.sizeText(UISplitPanel.sizesFor("60%,40%,auto,8px", 4))).toBe("60%,40%,auto,8px")
  })
})
