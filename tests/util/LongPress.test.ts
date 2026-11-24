import { afterEach, describe, expect, test } from "vite-plus/test"

import { LONG_PRESS_EVENT, LONG_PRESS_MS, LongPress } from "spell/util/LongPress"

/** Wait `ms`, real time:  the long press is a timer. */
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

/** A pointer pressed on `target`, held, and what reached `target` meanwhile. */
function press(target: HTMLElement, pointerType: string, pointerId: number) {
  const at = { clientX: 10, clientY: 10, pointerId, pointerType, isPrimary: true, button: 0, bubbles: true }
  target.dispatchEvent(new PointerEvent("pointerdown", at))
  return {
    move: (dx: number) => target.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: 10 + dx })),
    lift: () => target.dispatchEvent(new PointerEvent("pointerup", at))
  }
}

describe("LongPress (`ui-long-press`)", () => {
  const owned = document.body.appendChild(document.createElement("div"))
  owned.className = "owned"
  const heard: string[] = []
  owned.addEventListener(LONG_PRESS_EVENT, (event) => heard.push((event as MouseEvent).type))
  // an owner taking presses on `.owned`, a mouse's too;  another taking only fingers anywhere
  const onOwned = (path: readonly EventTarget[]) => path.includes(owned)
  LongPress.listen(onOwned)
  LongPress.listen((path, pointerType) => pointerType === "touch" && path.includes(owned))
  afterEach(() => (heard.length = 0))

  test("the event's name is Spell UI's:  ui-long-press", () => {
    expect(LONG_PRESS_EVENT).toBe("ui-long-press")
  })

  test("a mouse held still on what an owner takes is a long press, and its click is swallowed", async () => {
    const { lift } = press(owned, "mouse", 11)
    await wait(LONG_PRESS_MS + 100)
    expect(heard).toEqual(["ui-long-press"])
    const clicks: Event[] = []
    owned.addEventListener("click", (event) => clicks.push(event), { once: true })
    lift()
    owned.click()
    expect(clicks).toEqual([])
  })

  test("a pen and a finger too", async () => {
    press(owned, "pen", 12)
    await wait(LONG_PRESS_MS + 100)
    press(owned, "touch", 13)
    await wait(LONG_PRESS_MS + 100)
    expect(heard).toEqual(["ui-long-press", "ui-long-press"])
  })

  test("nothing for a press that lifts or moves first, nor one no owner takes", async () => {
    press(owned, "mouse", 14).lift()
    press(owned, "mouse", 15).move(30)
    const other = document.body.appendChild(document.createElement("div"))
    press(other, "mouse", 16)
    await wait(LONG_PRESS_MS + 100)
    expect(heard).toEqual([])
    other.remove()
  })

  test("the same owner listed twice is asked once;  a later listen() adds to the ONE detector", async () => {
    LongPress.listen(onOwned)
    press(owned, "mouse", 17)
    await wait(LONG_PRESS_MS + 100)
    expect(heard).toEqual(["ui-long-press"])
  })
})
