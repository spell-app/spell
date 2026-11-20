import { describe, expect, onTestFinished, test } from "vite-plus/test"

import { waitUntil } from "spell/util/timing"
import { MoveAndResize } from "spell/element"

// loaded before the first press, as a page's first movable element has it loaded by its first press
import "spell/util/Dragging"

/** How long a test waits for a drag to land. */
const WAIT = { timeout: 2 }

/** `html` in a fresh 400 x 300 box on the page, removed after the test. */
function page(html: string): HTMLElement {
  const box = document.createElement("div")
  box.style.cssText = "position: relative; width: 400px; height: 300px"
  box.innerHTML = html
  document.body.append(box)
  onTestFinished(() => box.remove())
  return box
}

/** A press on `element` at its middle, moved by `dx`, `dy` in steps, then let go. */
async function drag(element: HTMLElement, dx: number, dy: number) {
  const { left, top, width, height } = element.getBoundingClientRect()
  const x = left + width / 2
  const y = top + height / 2
  const at = (clientX: number, clientY: number) => ({ clientX, clientY, pointerId: 1, button: 0, bubbles: true })
  element.dispatchEvent(new PointerEvent("pointerdown", at(x, y)))
  // the first press may wait for the drag's code to load
  await new Promise((done) => setTimeout(done, 20))
  for (const step of [0.25, 0.5, 1])
    window.dispatchEvent(new PointerEvent("pointermove", at(x + dx * step, y + dy * step)))
  window.dispatchEvent(new PointerEvent("pointerup", at(x + dx, y + dy)))
}

describe("MoveAndResize.wayOf()", () => {
  test("bare and both are both ways;  one way;  anything else is off", () => {
    expect(
      ["", "both", "horizontally", "vertically", "false", "sideways", undefined, null].map(MoveAndResize.wayOf)
    ).toEqual(["both", "both", "horizontally", "vertically", undefined, undefined, undefined, undefined])
  })
})

describe("MoveAndResize.resizeWayOf()", () => {
  test("names the sizes dragged, either order;  bare is the family's;  the move words still work", () => {
    const ways = ["width", "height", "width, height", "height width", "", "both", "vertically", "depth", "width, x"]
    expect(ways.map((value) => MoveAndResize.resizeWayOf(value))).toEqual([
      "horizontally",
      "vertically",
      "both",
      "both",
      "both",
      "both",
      "vertically",
      undefined,
      undefined
    ])
    expect([MoveAndResize.resizeWayOf("", "vertically"), MoveAndResize.resizeWayOf(undefined, "vertically")]).toEqual([
      "vertically",
      undefined
    ])
  })
})

describe("MoveAndResize.start()", () => {
  test("resizable on a box of its own:  the box gets the grip, and its size is remembered", async () => {
    localStorage.removeItem("ui-element:boxed")
    onTestFinished(() => localStorage.removeItem("ui-element:boxed"))
    const element = page(`<div id="boxed"><div style="width: 100px; height: 50px">x</div></div>`)
      .firstElementChild as HTMLElement
    const box = element.firstElementChild as HTMLElement
    const stop = MoveAndResize.start(element, { resize: "vertically", box })
    expect([box.style.resize, element.style.resize]).toEqual(["vertical", ""])
    // as the browser's grip leaves it:  a press on the grip, a new height, let go
    const { right, bottom } = box.getBoundingClientRect()
    box.dispatchEvent(new PointerEvent("pointerdown", { clientX: right - 2, clientY: bottom - 2, button: 0 }))
    box.style.height = "80px"
    window.dispatchEvent(new PointerEvent("pointerup"))
    expect(await waitUntil(() => localStorage.getItem("ui-element:boxed")?.includes("80px"), WAIT)).toBeTruthy()
    stop()
    expect(box.style.resize).toBe("")
    box.style.height = ""
    onTestFinished(MoveAndResize.start(element, { resize: "vertically", box }))
    expect(await waitUntil(() => box.style.height === "80px", WAIT)).toBeTruthy()
  })

  test("resizable:  the browser's grip, its overflow scrolls;  stopping puts the style back", () => {
    const element = page(`<div style="width: 100px; height: 50px">x</div>`).firstElementChild as HTMLElement
    const stop = MoveAndResize.start(element, { resize: "vertically" })
    expect([element.style.resize, element.style.overflow]).toEqual(["vertical", "auto"])
    stop()
    expect([element.style.resize, element.style.overflow]).toEqual(["", ""])
  })

  test("movable:  a drag moves it by its translate, one way only, held inside its parent", async () => {
    const element = page(`<div style="width: 100px; height: 50px">x</div>`).firstElementChild as HTMLElement
    onTestFinished(MoveAndResize.start(element, { move: "horizontally" }))
    await drag(element, 60, 40)
    expect(await waitUntil(() => element.style.translate !== "", WAIT)).toBeTruthy()
    expect(element.style.translate).toBe("60px")
    await drag(element, 900, 0)
    expect(await waitUntil(() => element.style.translate === "300px", WAIT)).toBeTruthy()
  })

  test("a press on a control of its own inside doesn't move it", async () => {
    const element = page(`<div style="width: 100px; height: 50px"><button>B</button></div>`)
      .firstElementChild as HTMLElement
    onTestFinished(MoveAndResize.start(element, { move: "both" }))
    await drag(element.querySelector("button")!, 30, 30)
    await new Promise((done) => setTimeout(done, 50))
    expect(element.style.translate).toBe("")
  })

  test("with an id, where it was put is remembered, and given back when it starts again", async () => {
    localStorage.removeItem("ui-element:kept-box")
    onTestFinished(() => localStorage.removeItem("ui-element:kept-box"))
    const box = page(`<div id="kept-box" style="width: 100px; height: 50px">x</div>`)
    const element = box.firstElementChild as HTMLElement
    const stop = MoveAndResize.start(element, { move: "both" })
    await drag(element, 20, 30)
    expect(await waitUntil(() => localStorage.getItem("ui-element:kept-box") !== null, WAIT)).toBeTruthy()
    stop()
    element.style.translate = ""
    onTestFinished(MoveAndResize.start(element, { move: "both" }))
    expect(await waitUntil(() => element.style.translate === "20px 30px", WAIT)).toBeTruthy()
  })
})
