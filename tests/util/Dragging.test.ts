import { afterEach, describe, expect, test } from "vite-plus/test"

import { Dragging } from "spell/util/Dragging"

/** The page's cover while a mouse drag runs:  the one fixed box over everything. */
function cover(): HTMLElement | undefined {
  return [...document.body.children].find((child) => (child as HTMLElement).style.zIndex === "2147483647") as
    | HTMLElement
    | undefined
}

/** A mouse press on `element`, then a move far enough to make it a drag. */
function dragWith(element: HTMLElement, options: Partial<ConstructorParameters<typeof Dragging>[2]> = {}) {
  const at = { clientX: 10, clientY: 10, pointerId: 1, pointerType: "mouse", bubbles: true }
  new Dragging(element, new PointerEvent("pointerdown", at), {
    follows: false,
    placing: () => {},
    onDrop: () => {},
    ...options
  })
  window.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: 40 }))
  return () => window.dispatchEvent(new PointerEvent("pointerup", { ...at, clientX: 40 }))
}

describe("Dragging's cursor", () => {
  const element = document.body.appendChild(document.createElement("div"))
  afterEach(() => cover()?.remove())

  test("the closed hand over the whole page, while nobody says another;  gone once let go", async () => {
    const letGo = dragWith(element)
    expect(cover()?.style.cursor).toBe("grabbing")
    letGo()
    // it settles just before the next paint
    await new Promise((done) => requestAnimationFrame(done))
    expect(cover()).toBeUndefined()
  })

  test("the one its owner says (`cursor`), and the closed hand again on the next drag that says none", () => {
    let letGo = dragWith(element, { cursor: "col-resize" })
    expect(cover()?.style.cursor).toBe("col-resize")
    letGo()
    letGo = dragWith(element)
    expect(cover()?.style.cursor).toBe("grabbing")
    letGo()
  })
})
