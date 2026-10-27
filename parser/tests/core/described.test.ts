import { describe, expect, test } from "vite-plus/test"

import { core, Thing, View } from "spell/parser/core"

/**
 * `core.describeAction()` / `describeEvent()` (epic `elemental-spell` P5):  what a template says about its actions
 * and events, read back with `actionsOf()` / `eventsOf()`.
 * - The classes are what spell compiles from `- to turn it over:` with its description lines,
 *   and `- it sends "flipped" with side as a direction`.
 */
describe("core.describeAction()", () => {
  test("an action's description, read back by its method's name", () => {
    class Card extends View {}
    core.describeAction(Card, "turnOver", {
      title: "turn it over",
      shortcuts: ["meta+T"],
      enabledWhen: "turnOverIsEnabled"
    })
    expect(core.actionsOf(Card).get("turnOver")).toEqual({
      title: "turn it over",
      shortcuts: ["meta+T"],
      enabledWhen: "turnOverIsEnabled"
    })
  })

  test("a sub-class has its super-class's actions, and its own description of one wins", () => {
    class Card extends Thing {}
    class Joker extends Card {}
    core.describeAction(Card, "turnOver", { title: "turn it over" })
    core.describeAction(Card, "show", { title: "show it" })
    core.describeAction(Joker, "turnOver", { title: "flip the joker", undoneAs: "Flip Joker" })
    expect([...core.actionsOf(Joker).keys()]).toEqual(["turnOver", "show"])
    expect(core.actionsOf(Joker).get("turnOver")).toEqual({ title: "flip the joker", undoneAs: "Flip Joker" })
    // the super-class keeps its own
    expect(core.actionsOf(Card).get("turnOver")).toEqual({ title: "turn it over" })
  })

  test("a class that describes nothing has none", () => {
    class Deck extends Thing {}
    expect(core.actionsOf(Deck).size).toBe(0)
    expect(core.eventsOf(Deck).size).toBe(0)
  })
})

describe("core.describeEvent()", () => {
  test("an event a template's things send, with its parameters", () => {
    class TwoSided extends View {}
    core.describeEvent(TwoSided, "flipped", { params: { side: "Direction" } })
    core.describeEvent(TwoSided, "card-dropped", {})
    expect(Object.fromEntries(core.eventsOf(TwoSided))).toEqual({
      flipped: { params: { side: "Direction" } },
      "card-dropped": {}
    })
  })
})
