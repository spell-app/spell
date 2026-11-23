import { describe, test, expect, vi, beforeEach, afterEach } from "vite-plus/test"

import { core, Thing, on, off, once, trigger } from "spell/parser/core"
import { declaredClassNamed, heldByRun, stillHeld } from "spell/parser/core/core"

/** `a card is a thing`:  what an event brings, e.g. `trigger card-click with the card`. */
class Card extends Thing {}

// `SpellEvent.trigger()` says what it triggers on `console.info`
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {})
  core.resetRuntime()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("on() / trigger()", () => {
  test("a listener gets the event, with what it brings;  `trigger()` answers what each listener did", () => {
    const card = new Card({})
    const heard: unknown[] = []
    on<{ card: Card }>("card-click", ({ type, card }) => heard.push([type, card]))
    on("card-click", () => "second")
    expect(trigger("card-click", { card })).toEqual([1, "second"])
    expect(heard).toEqual([["card-click", card]])
  })

  test("the event's name is case-insensitive", () => {
    const listener = vi.fn()
    on("Card-Click", listener)
    trigger("card-click")
    expect(listener).toHaveBeenCalledOnce()
  })

  test("each finds the CURRENT runtime:  a new run hears nothing of the last run's listeners", () => {
    const first = vi.fn()
    on("card-click", first)
    core.resetRuntime()
    const second = vi.fn()
    on("card-click", second)
    trigger("card-click")
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  test("`core.on()` ... are the same functions, on the same lists as `core.RUNTIME`'s own", () => {
    expect([core.on, core.off, core.once, core.trigger]).toEqual([on, off, once, trigger])
    const listener = vi.fn()
    // a program compiled before `on()` says it this way
    core.RUNTIME.on("card-click", listener)
    core.trigger("card-click")
    on("card-click", listener)
    core.RUNTIME.trigger("card-click")
    expect(listener).toHaveBeenCalledTimes(3)
  })

  test("`off()` stops a listener;  `once()` hears only the next one", () => {
    const listener = vi.fn()
    const onlyOnce = vi.fn()
    on("tick", listener)
    once("tick", onlyOnce)
    trigger("tick")
    off("tick", listener)
    trigger("tick")
    expect(listener).toHaveBeenCalledOnce()
    expect(onlyOnce).toHaveBeenCalledOnce()
  })

  test("nothing running:  `trigger()` is heard by nobody, `on()` throws saying what to do", () => {
    core.clearRuntime()
    expect(trigger("tick")).toEqual([])
    expect(() => off("tick", () => {})).not.toThrow()
    expect(() => on("tick", () => {})).toThrow("call core.resetRuntime() first")
    expect(() => once("tick", () => {})).toThrow(TypeError)
  })
})

// epic `solid-2-final` I24:  a program the editor left is freed, though page-wide registries list its classes
describe("heldByRun()", () => {
  test("while a program runs:  the run holds the value, the registry a weak reference to it", () => {
    const value = {}
    const kept = heldByRun("class:Card", value)
    expect(kept).toBeInstanceOf(WeakRef)
    expect(stillHeld(kept)).toBe(value)
    expect(core.RUNTIME.held.get("class:Card")).toBe(value)
  })

  test("held again under the same key, the last one goes:  a live edit keeps no old class", () => {
    heldByRun("class:Card", {})
    const latest = {}
    heldByRun("class:Card", latest)
    expect(core.RUNTIME.held.size).toBe(1)
    expect(core.RUNTIME.held.get("class:Card")).toBe(latest)
  })

  test("a new run holds none of the last run's", () => {
    heldByRun("class:Card", {})
    core.resetRuntime()
    expect(core.RUNTIME.held.size).toBe(0)
  })

  test("no program running (the runtime's own classes, as its module loads):  held for good, as it is", () => {
    core.clearRuntime()
    const value = {}
    expect(heldByRun("class:Card", value)).toBe(value)
    expect(stillHeld(value)).toBe(value)
  })

  test("a class declaring a property is found by its name, while held", () => {
    class Shelf extends Thing {}
    Shelf.declareProp("books", { type: "list" } as never)
    expect(declaredClassNamed("Shelf")).toBe(Shelf)
    expect(core.RUNTIME.held.get("class:Shelf")).toBe(Shelf)
  })
})
