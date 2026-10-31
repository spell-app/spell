import { describe, expect, test, vi } from "vite-plus/test"

import { InspectorActions } from "spell/app/app/solid/InspectorActions"
import { core as realCore } from "spell/parser/core"
import type { Core } from "spell/parser/core/core.types"
import type { SP } from "spell/parser/spell"

/**
 * `InspectorActions`:  what can be done to a thing, as the Actions band lists it (epic `debut` P29).
 * - On stand-ins for a program's classes and its core:  the band draws what it answers.
 */

/** Stand-ins for spell's base, a built-in template, and a program's types. */
class Thing {
  get type() {
    return this.constructor.name
  }
  toJSON() {
    return {}
  }
}
class TwoSidedView extends Thing {
  isFaceDirection(_direction: string) {
    return true
  }
  turnFaceUp() {}
  turnOver() {}
  draw() {}
}
class Card extends TwoSidedView {
  play() {}
  putOnPile(_pile: Pile) {
    return Promise.resolve()
  }
  onClick() {}
  canBeDragged() {}
  drawFront() {}
}
class Pile extends Thing {
  constructor(public name: string) {
    super()
  }
}
class Foundation extends Pile {}

/** Spell's words for them, as a words file has them. */
const WORDS = {
  lang: "en",
  types: { Card: { play: "play a card", putOnPile: "put a card on a pile" } }
} as unknown as SP.SpellWordsData

/** A stand-in core:  its things, which actions are enabled, its console. */
function coreFor(things: object[], enabled = (_name: string) => true): Core {
  return {
    things: {
      classNamed: (name: string) => (name === "Thing" ? Thing : undefined),
      knownClasses: () => [Card, Pile, Foundation],
      bySuperType: () => [{ type: "Pile", things }]
    },
    isActionEnabled: (_thing: object, name: string) => enabled(name),
    console: { error: vi.fn() }
  } as unknown as Core
}

describe("InspectorActions.of()", () => {
  test("its own actions first, then the template's;  no drawing, event, condition or question", () => {
    const actions = InspectorActions.of(new Card(), coreFor([]), WORDS)
    expect(actions.map((action) => action.words)).toEqual(["play it", "put it on a pile", "turn face up", "turn over"])
  })

  test("what it takes, from its words:  `a pile` is the program's `Pile`", () => {
    const put = InspectorActions.of(new Card(), coreFor([]), WORDS).find((action) => action.name === "putOnPile")!
    expect(put.parameters).toEqual([{ words: "a pile", type: "Pile" }])
    // its button leaves the field's words to the field:  `put it on` [a pile ▾]
    expect(put.label).toBe("put it on")
  })

  test("no words file:  each by its method's name, what it takes unnamed", () => {
    const put = InspectorActions.of(new Card(), coreFor([])).find((action) => action.name === "putOnPile")!
    expect(put).toMatchObject({ words: "put on pile", parameters: [{ words: "" }] })
  })
})

describe("InspectorActions.run()", () => {
  test("does it with what it takes, and hands back its wait;  not while it isn't enabled", async () => {
    const card = new Card()
    const spy = vi.spyOn(card, "putOnPile")
    const foundation = new Foundation("clubs")
    const put = InspectorActions.of(card, coreFor([]), WORDS).find((action) => action.name === "putOnPile")!
    realCore.resetRuntime()
    await InspectorActions.run(realCore, card, put, [foundation])
    expect(spy).toHaveBeenCalledWith(foundation)
    const notEnabled = vi.spyOn(realCore, "runAction").mockReturnValueOnce(false)
    expect(InspectorActions.run(realCore, card, put, [foundation])).toBeUndefined()
    expect(spy).toHaveBeenCalledTimes(1)
    notEnabled.mockRestore()
  })

  test("an error goes to the program's console", () => {
    const card = new Card()
    vi.spyOn(card, "play").mockImplementation(() => {
      throw new Error("no")
    })
    realCore.resetRuntime()
    const error = vi.spyOn(realCore.console, "error").mockImplementation(() => {})
    void InspectorActions.run(realCore, card, InspectorActions.of(card, coreFor([]), WORDS)[0]!)
    expect(error).toHaveBeenCalledWith("play failed", expect.any(Error))
    error.mockRestore()
  })
})

test("InspectorActions.valueFrom():  a typed value as spell reads one", () => {
  expect(["yes", "no", "12", '"red"', "red"].map((text) => InspectorActions.valueFrom(text))).toEqual([
    true,
    false,
    12,
    "red",
    "red"
  ])
})
