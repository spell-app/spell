import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { SubMenuAim } from "spell/ui/components/ui-menu"

// Boxes:  a row at the menu's left, its sub-menu opening 10px to its right (or, flipped, to its left)
const ROW = { left: 300, top: 100, width: 200, height: 30 }
const RIGHT_SUB = { left: 510, top: 50, width: 200, height: 300 }
const LEFT_SUB = { left: 90, top: 50, width: 200, height: 300 }

describe("SubMenuAim.isAiming()", () => {
  const target = { side: "right" as const, edge: 510, top: 50, bottom: 350 }
  const from = { x: 450, y: 115 }

  it("toward the sub-menu:  aiming", () => {
    expect(SubMenuAim.isAiming(from, { x: 10, y: 0 }, target)).toBe(true)
    expect(SubMenuAim.isAiming(from, { x: 10, y: 10 }, target)).toBe(true)
  })

  it("away from it, sideways:  missed, whatever the angle", () => {
    expect(SubMenuAim.isAiming(from, { x: -1, y: 0 }, target)).toBe(false)
    expect(SubMenuAim.isAiming(from, { x: -10, y: 30 }, target)).toBe(false)
  })

  it("15° of slack past each corner, and no more", () => {
    // the bottom corner is atan2(235, 60) ~= 75.7° below level:  85° is inside the slack, 95° outside
    const at = (degrees: number) => ({ x: Math.cos((degrees * Math.PI) / 180), y: Math.sin((degrees * Math.PI) / 180) })
    expect(SubMenuAim.isAiming(from, at(85), target)).toBe(true)
    expect(SubMenuAim.isAiming(from, at(89), target, 10)).toBe(false)
    // the top corner is atan2(-65, 60) ~= -47.3°
    expect(SubMenuAim.isAiming(from, at(-60), target)).toBe(true)
    expect(SubMenuAim.isAiming(from, at(-65), target)).toBe(false)
  })

  it("a sub-menu on the left:  the same, mirrored", () => {
    const left = { side: "left" as const, edge: 290, top: 50, bottom: 350 }
    const start = { x: 350, y: 115 }
    expect(SubMenuAim.isAiming(start, { x: -10, y: 5 }, left)).toBe(true)
    expect(SubMenuAim.isAiming(start, { x: 1, y: 0 }, left)).toBe(false)
    expect(SubMenuAim.isAiming(start, { x: -1, y: -20 }, left)).toBe(false)
  })
})

describe("SubMenuAim.targetFor()", () => {
  it("its side from the boxes' middles, its near edge", () => {
    expect(SubMenuAim.targetFor(rect(ROW), rect(RIGHT_SUB))).toEqual({ side: "right", edge: 510, top: 50, bottom: 350 })
    expect(SubMenuAim.targetFor(rect(ROW), rect(LEFT_SUB))).toEqual({ side: "left", edge: 290, top: 50, bottom: 350 })
  })
})

describe("SubMenuAim, tracking", () => {
  let row: HTMLElement
  let other: HTMLElement
  let subMenu: HTMLElement
  let gaveUp: EventTarget[][]
  let aim: SubMenuAim

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] })
    row = box(ROW)
    // the next row down
    other = box({ ...ROW, top: 130 })
    subMenu = box(RIGHT_SUB)
    gaveUp = []
    aim = new SubMenuAim({ row: () => row, subMenu: () => subMenu, onGiveUp: (path) => gaveUp.push(path) })
  })

  afterEach(() => {
    aim.stop()
    for (const element of [row, other, subMenu]) element.remove()
    vi.useRealTimers()
  })

  it("heading for the sub-menu, across the next row:  keeps it, the row can't switch", () => {
    aim.start({ clientX: 450, clientY: 120 })
    move(other, 470, 135)
    move(other, 490, 150)
    expect(aim.wantsToSwitch(over())).toBe(false)
    expect(gaveUp).toEqual([])
  })

  it("two misses in a row:  gives up, handing back the row under the pointer", () => {
    aim.start({ clientX: 350, clientY: 120 })
    move(other, 350, 135)
    expect(aim.isTracking).toBe(true)
    move(other, 350, 145)
    expect(aim.isTracking).toBe(false)
    expect(gaveUp).toHaveLength(1)
    expect(gaveUp[0]).toContain(other)
    expect(aim.wantsToSwitch(over())).toBe(true)
  })

  it("one miss, then aiming again:  the count starts over", () => {
    aim.start({ clientX: 350, clientY: 120 })
    move(other, 350, 135)
    move(other, 370, 140)
    move(other, 370, 150)
    expect(gaveUp).toEqual([])
  })

  it("moving away sideways:  two moves and it gives up", () => {
    aim.start({ clientX: 450, clientY: 120 })
    move(other, 440, 135)
    move(other, 430, 136)
    expect(gaveUp).toHaveLength(1)
  })

  it("moves closer together than a frame:  one check", () => {
    aim.start({ clientX: 350, clientY: 120 })
    // the first check:  one miss
    move(other, 350, 135, 0)
    // too soon for another
    move(other, 350, 140, 0)
    move(other, 350, 145, 0)
    expect(aim.isTracking).toBe(true)
  })

  it("resting on another row:  that row takes over after 0.4s", () => {
    aim.start({ clientX: 450, clientY: 120 })
    move(other, 470, 135)
    vi.advanceTimersByTime(390)
    expect(gaveUp).toEqual([])
    vi.advanceTimersByTime(20)
    expect(gaveUp).toHaveLength(1)
    expect(gaveUp[0]).toContain(other)
  })

  it("resting on its own row:  stays open", () => {
    aim.start({ clientX: 450, clientY: 110 })
    move(row, 460, 112)
    vi.advanceTimersByTime(1000)
    expect(gaveUp).toEqual([])
    expect(aim.isTracking).toBe(true)
  })

  it("reaching the sub-menu:  stops tracking, nothing handed back", () => {
    aim.start({ clientX: 450, clientY: 120 })
    move(subMenu, 520, 150)
    expect(aim.isTracking).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(gaveUp).toEqual([])
  })

  it("touch and pen:  ignored, and never blocked", () => {
    aim.start({ clientX: 450, clientY: 120 })
    move(other, 450, 135, 20, "touch")
    move(other, 450, 145, 20, "pen")
    expect(aim.isTracking).toBe(true)
    expect(aim.wantsToSwitch(over("touch"))).toBe(true)
  })

  it("a sub-menu on the left:  aiming left keeps it", () => {
    subMenu.remove()
    subMenu = box(LEFT_SUB)
    aim.start({ clientX: 350, clientY: 120 })
    move(other, 330, 135)
    move(other, 310, 150)
    expect(gaveUp).toEqual([])
    move(other, 320, 160)
    move(other, 330, 170)
    expect(gaveUp).toHaveLength(1)
  })

  it("stop():  no more tracking, the rest timer gone", () => {
    aim.start({ clientX: 450, clientY: 120 })
    move(other, 470, 135)
    aim.stop()
    vi.advanceTimersByTime(1000)
    expect(gaveUp).toEqual([])
    expect(aim.wantsToSwitch(over())).toBe(true)
  })
})

////////////////
// ## Helpers
////////////////

type Box = { left: number; top: number; width: number; height: number }

/** A `DOMRect` of `box`. */
function rect({ left, top, width, height }: Box): DOMRect {
  return new DOMRect(left, top, width, height)
}

/** A fixed box on the page at `box`. */
function box({ left, top, width, height }: Box): HTMLElement {
  const element = document.createElement("div")
  Object.assign(element.style, {
    position: "fixed",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  })
  document.body.append(element)
  return element
}

/** The pointer moves over `target` to `(x, y)`, `ms` after the last move. */
function move(target: Element, clientX: number, clientY: number, ms = 20, pointerType = "mouse") {
  vi.advanceTimersByTime(ms)
  target.dispatchEvent(
    new PointerEvent("pointermove", { clientX, clientY, pointerType, bubbles: true, composed: true })
  )
}

/** A `pointerover` of a row, as the menu would ask about. */
function over(pointerType = "mouse"): PointerEvent {
  return new PointerEvent("pointerover", { pointerType, bubbles: true, composed: true })
}
