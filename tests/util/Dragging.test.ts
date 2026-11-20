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

describe("Dragging with a finger", () => {
  const element = document.body.appendChild(document.createElement("div"))
  const at = { clientX: 10, clientY: 10, pointerId: 2, pointerType: "touch", bubbles: true }
  /** A finger's move, as the browser sends it while it may still scroll:  `true` if something stopped the scroll. */
  const fingerMoved = () => {
    const move = new TouchEvent("touchmove", { cancelable: true, bubbles: true })
    window.dispatchEvent(move)
    return move.defaultPrevented
  }

  test("a press on a draggable thing never scrolls the page, until the finger lets go;  a mouse's changes nothing", () => {
    new Dragging(element, new PointerEvent("pointerdown", at), { onDrop: () => {} })
    expect(fingerMoved()).toBe(true)
    window.dispatchEvent(new PointerEvent("pointerup", at))
    expect(fingerMoved()).toBe(false)
    const letGo = dragWith(element)
    expect(fingerMoved()).toBe(false)
    letGo()
  })
})

describe("Dragging on a turned board", () => {
  /** A card on a board, `board` its transform:  the card already lifted 48px off it, as Anatomy lifts its floors. */
  const cardOn = (board: string) => {
    const holder = document.body.appendChild(document.createElement("div"))
    holder.style.cssText = `position: absolute; left: 100px; top: 100px; width: 400px; height: 400px; transform: ${board}; transform-style: preserve-3d`
    const card = holder.appendChild(document.createElement("div"))
    card.style.cssText = "width: 50px; height: 70px"
    card.style.translate = "0px 0px 48px"
    return { holder, card }
  }
  /** Drag `card` 30px across and 20px down the screen;  its `translate` mid-drag. */
  const draggedBy30And20 = (card: HTMLElement) => {
    const at = { clientX: 10, clientY: 10, pointerId: 3, pointerType: "mouse", bubbles: true }
    new Dragging(card, new PointerEvent("pointerdown", at), { carried: [card], onDrop: () => {} })
    window.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: 40, clientY: 30 }))
    const translate = card.style.translate
    window.dispatchEvent(new PointerEvent("pointerup", { ...at, clientX: 40, clientY: 30 }))
    return translate
  }
  afterEach(() => cover()?.remove())

  test("flat:  the pointer's move as it is, keeping the card's depth", () => {
    const { holder, card } = cardOn("none")
    expect(draggedBy30And20(card)).toBe("30px 20px 48px")
    holder.remove()
  })

  test("at half size:  twice the move in the board's plane, so the card stays under the pointer (T120)", () => {
    const { holder, card } = cardOn("scale(0.5)")
    const [x, y, depth] = draggedBy30And20(card).split(" ")
    expect(Number.parseFloat(x!)).toBeCloseTo(60, 0)
    expect(Number.parseFloat(y!)).toBeCloseTo(40, 0)
    expect(depth).toBe("48px")
    holder.remove()
  })
})
