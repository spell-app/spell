/** Core's `send()` and `input` (epic `elemental-spell` P9):  an event up a thing's chain, and the mouse and keys. */
import { describe, test, expect, beforeEach } from "vite-plus/test"

import { core, send, Thing, List, App } from "spell-parser/core"
import { chainOf, handlerOf, SentEvent } from "spell-parser/core/sending"

class Card extends Thing {
  heard: string[] = []
  onPicked(event: SentEvent) {
    this.heard.push(`card:${event.type}`)
    event.pass()
  }
  onFlipped() {
    this.heard.push("card:flipped")
  }
}
class Pile extends List {
  heard: string[] = []
  onPicked(event: SentEvent) {
    this.heard.push(`pile:${event.target === this}:${event.originalTarget instanceof Card}`)
  }
}
Pile.exclusive = true

describe("send()", () => {
  beforeEach(() => {
    core.resetRuntime()
  })

  test("the target's handler takes it:  its holder doesn't hear it", async () => {
    const pile = new Pile()
    const card = new Card()
    pile.add(card)
    const event = await send(card, "flipped")
    expect(card.heard).toEqual(["card:flipped"])
    expect(pile.heard).toEqual([])
    expect(event.handled).toBe(true)
  })

  test("pass() hands it up to the list holding it, with target and original target", async () => {
    const pile = new Pile()
    const card = new Card()
    pile.add(card)
    await send(card, "picked")
    expect(card.heard).toEqual(["card:picked"])
    expect(pile.heard).toEqual(["pile:true:true"])
  })

  test("the chain:  the thing, what holds it, then the program's app", () => {
    const app = new App()
    const pile = new Pile()
    const card = new Card()
    pile.add(card)
    expect([...chainOf(card)]).toEqual([card, pile, app])
  })

  test("nobody takes it:  the program's own listeners hear it;  else it's dropped", async () => {
    const heard: unknown[] = []
    core.on("lonely", (event) => void heard.push(event.type))
    await send(new Card(), "lonely")
    const dropped = await send(new Card(), "nobody-listens")
    expect(heard).toEqual(["lonely"])
    expect(dropped.handled).toBe(false)
  })

  test("cancel() marks it canceled;  sender and params ride on it", async () => {
    const card = new Card()
    const door = Object.assign(new Thing(), {
      onClosing(event: SentEvent) {
        event.cancel()
      }
    })
    const event = await send(door, "closing", { how: "slam" }, card)
    expect(event.canceled).toBe(true)
    expect(event.sender).toBe(card)
    expect(event.how).toBe("slam")
  })

  test("a handler is found as on<Name> or when<Name>", () => {
    const thing = Object.assign(new Thing(), { whenCardFlipped() {} })
    expect(handlerOf(thing, "card flipped")).toBe(thing.whenCardFlipped)
  })
})

describe("core.input", () => {
  test("follows the page's keys and mouse:  the meta key is control off a Mac", () => {
    const target = new EventTarget()
    const stop = core.input.listen(target, { isMac: false })
    try {
      target.dispatchEvent(Object.assign(new Event("keydown"), { key: "Shift", shiftKey: true, ctrlKey: true }))
      expect(core.input.shiftKey).toBe(true)
      expect(core.input.metaKey).toBe(true)
      expect(core.input.isKeyDown("shift")).toBe(true)
      target.dispatchEvent(Object.assign(new Event("mousedown"), { button: 0, buttons: 1, clientX: 0, clientY: 0 }))
      expect(core.input.button).toBe(true)
      target.dispatchEvent(Object.assign(new Event("blur")))
      expect(core.input.shiftKey).toBe(false)
      expect(core.input.button).toBe(false)
    } finally {
      stop()
      core.input.reset()
    }
  })
})
