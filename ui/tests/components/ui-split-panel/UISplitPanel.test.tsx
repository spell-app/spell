import { flush } from "solid-js"
import { describe, expect, it, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import "spell/ui/components/ui-panel"
import "spell/ui/components/ui-split-panel"

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

  it("a fixed pane takes the move in px, the share beside it the difference, and the others don't move", async () => {
    const host = await panel('columns="*,*,200px" resizable')
    const [first, second] = widths(host)
    dragAcross(bars(host)[1], -50)
    expect(widths(host)).toEqual([first, second - 50, 250])
    expect(host.getAttribute("columns")).toBe("*,*,200px")
    expect((host.children[2] as HTMLElement).style.flex).toBe("0 0 250px")
  })

  it("the bar follows the pointer, step by step, until a pane's least or most stops it, and comes back with it", async () => {
    // a share as big as its content at most (`max-content`), a share up to 120px, and one that takes the rest
    const host = (await ElementFixture.render(
      `<ui-split-panel rows="40%,30%,30%" resizable style="width: 200px; height: 400px">
         <div style="min-height: 30px; max-height: max-content"><div style="height: 200px">a</div></div>
         <div style="min-height: 30px; max-height: 120px">b</div>
         <div style="min-height: 30px">c</div>
       </ui-split-panel>`
    )) as HTMLElement
    const [top, middle] = [...host.children].map((child) => child.getBoundingClientRect().height)
    const bar = bars(host)[0]
    bar.setPointerCapture = () => undefined
    const place = () => {
      const { top, height } = bar.getBoundingClientRect()
      return top + height / 2
    }
    const start = place()
    const fire = (type: string, clientY: number) =>
      bar.dispatchEvent(new PointerEvent(type, { clientX: 10, clientY, button: 0, bubbles: true, composed: true }))
    fire("pointerdown", start)
    flush()
    const misses: string[] = []
    const moveTo = (moved: number, expected: number) => {
      fire("pointermove", start + moved)
      if (Math.abs(place() - (start + expected)) > 1) misses.push(`${moved}:  ${(place() - start).toFixed(1)}`)
    }
    // the first pane is as big as its content at most:  200px
    const down = 200 - top
    // up, the middle pane takes the room up to its 120px, then the last takes the rest;  down to the first's least
    const up = 30 - top
    for (let moved = 0; moved <= 100; moved += 10) moveTo(moved, Math.min(moved, down))
    for (let moved = 100; moved >= -200; moved -= 10) moveTo(moved, Math.max(Math.min(moved, down), up))
    for (let moved = -200; moved <= 0; moved += 10) moveTo(moved, Math.max(moved, up))
    expect(misses).toEqual([])
    expect(middle).toBeLessThan(120)
    // let go:  shares again, the bar where it was let go
    fire("pointermove", start - 40)
    fire("pointerup", start - 40)
    flush()
    expect(Math.abs(place() - (start - 40))).toBeLessThanOrEqual(1)
    expect([...host.children].map((child) => (child as HTMLElement).style.flex)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^[\d.]+ [\d.]+ 0px$/)])
    )
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

  it("a pane's own `min-width` and `max-width` bound a drag, a share's and a fixed pane's alike", async () => {
    const host = await panel(
      'columns="50%,50%" resizable',
      '<div style="min-width: 150px">a</div><div style="max-width: 400px">b</div>'
    )
    // the second at its most, 400:  the first keeps the rest of the 592, above its least
    dragAcross(bars(host)[0], -500)
    expect(widths(host)).toEqual([192, 400])
    ;(host.children[1] as HTMLElement).style.maxWidth = ""
    dragAcross(bars(host)[0], -200)
    expect(widths(host)[0]).toBe(150)
    dragAcross(bars(host)[0], 600)
    // the second's least is 0, so the first may take the rest
    expect(widths(host)[1]).toBeLessThanOrEqual(30)
    const fixed = await panel(
      'columns="*,200px" resizable',
      '<div style="max-width: 450px">a</div><div style="min-width: 120px">b</div>'
    )
    // the first at its most, 450:  the second keeps the rest, above its least
    dragAcross(bars(fixed)[0], 300)
    expect(widths(fixed)).toEqual([450, 142])
    ;(fixed.children[0] as HTMLElement).style.maxWidth = ""
    dragAcross(bars(fixed)[0], 300)
    expect(widths(fixed)[1]).toBe(120)
  })

  it("a pane that can't be resized (least === most) is skipped:  a bar beside it sizes the panes across it", async () => {
    const host = await panel(
      'rows="50%,40px,50%" resizable',
      '<div style="min-height: 30px">a</div><div style="min-height: 40px; max-height: 40px">folded</div><div style="min-height: 30px">c</div>'
    )
    const heights = () => [...host.children].map((child) => Math.round(child.getBoundingClientRect().height))
    const [top, , bottom] = heights()
    const dragDown = (bar: HTMLElement, moved: number) => {
      const { x, y } = bar.getBoundingClientRect()
      bar.setPointerCapture = () => undefined
      const fire = (type: string, clientY: number) =>
        bar.dispatchEvent(new PointerEvent(type, { clientX: x, clientY, button: 0, bubbles: true, composed: true }))
      fire("pointerdown", y)
      flush()
      fire("pointermove", y + moved)
      fire("pointerup", y + moved)
      flush()
    }
    // either bar:  the folded pane keeps its 40px, the other two trade
    dragDown(bars(host)[0], 30)
    expect(heights()).toEqual([top + 30, 40, bottom - 30])
    dragDown(bars(host)[1], -60)
    expect(heights()).toEqual([top - 30, 40, bottom + 30])
    // and neither gets smaller than its own least
    dragDown(bars(host)[1], 500)
    expect(heights()[2]).toBe(30)
    dragDown(bars(host)[0], -500)
    expect(heights()[0]).toBe(30)
    expect(heights()[1]).toBe(40)
    // nothing on one side to size:  the bar doesn't move
    const end = await panel(
      'rows="*,40px" resizable',
      '<div>a</div><div style="min-height: 40px; max-height: 40px">b</div>'
    )
    dragDown(bars(end)[0], -50)
    expect(Math.round((end.children[1] as HTMLElement).getBoundingClientRect().height)).toBe(40)
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

  it("`grows`:  a bar sizes the pane past it, the growing pane takes the difference, the one between keeps its width", async () => {
    const host = await panel('columns="*,100px,*" grows="first" resizable')
    const [app, between, last] = widths(host)
    // the last bar, between the middle pane and the last:  left 100 makes the last 100 wider
    dragAcross(bars(host)[1], -100)
    const [appAfter, betweenAfter, lastAfter] = widths(host)
    expect(lastAfter).toBe(last + 100)
    expect(betweenAfter).toBe(between)
    expect(appAfter).toBe(app - 100)
    dragAcross(bars(host)[1], 100)
    expect(widths(host)).toEqual([app, between, last])
    // the panel growing is the first pane's alone
    host.style.width = "700px"
    await vi.waitFor(() => expect(widths(host)[0]).toBe(app + 100))
    expect(widths(host).slice(1)).toEqual([between, last])
  })
})
