import { describe, test, expect, afterEach, vi } from "vite-plus/test"

import { core } from "spell/parser/core"

/** Where Spell UI's tours put their control object:  `tours.ts`'s key. */
const TOURS_KEY = Symbol.for("spell-ui:tours")

/** A page's tours as Spell UI hands them over, each call recorded;  only `"first game"` is a tour. */
function fakeTours() {
  const calls: unknown[][] = []
  const tours = {
    start: (...args: unknown[]) => (calls.push(["start", ...args]), args[0] === "first game"),
    stop: () => void calls.push(["stop"]),
    show: (step: unknown) => void calls.push(["show", step]),
    next: () => void calls.push(["next"]),
    back: () => void calls.push(["back"])
  }
  ;(globalThis as Record<symbol, unknown>)[TOURS_KEY] = tours
  return calls
}

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[TOURS_KEY]
  vi.restoreAllMocks()
})

describe("a page's tours (epic `editor` P40)", () => {
  test("each line reaches the page's tours, through the global symbol", () => {
    const calls = fakeTours()
    core.startTour("first game")
    core.startTour("first game", 3)
    core.showTourStep(3)
    core.showTourStep("drag")
    core.nextTourStep()
    core.previousTourStep()
    core.stopTour()
    expect(calls).toEqual([
      ["start", "first game"],
      ["start", "first game", 3],
      ["show", 3],
      ["show", "drag"],
      ["next"],
      ["back"],
      ["stop"]
    ])
  })

  test("a tour the page hasn't got is said on the program's console;  nothing throws", () => {
    fakeTours()
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    core.startTour("second game")
    expect(warn).toHaveBeenCalledWith('start tour "second game":  this page has no tour of that name')
  })

  test("a page with no tours at all:  each line says so, and goes on", () => {
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    expect(() => {
      core.startTour("first game")
      core.stopTour()
      core.showTourStep(2)
      core.nextTourStep()
      core.previousTourStep()
    }).not.toThrow()
    expect(warn).toHaveBeenCalledTimes(5)
    expect(warn.mock.calls[0]![0]).toContain("this page has no tours")
  })
})
