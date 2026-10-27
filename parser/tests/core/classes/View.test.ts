import { describe, test, expect } from "vite-plus/test"

import { core, Thing, List, View, ViewableList } from "spell-parser/core"

/** The base classes `a card is a view` and `a pile is a viewable list of cards` compile to. */
describe("View, ViewableList", () => {
  class Card extends View {}
  class Pile extends ViewableList<Card> {
    static instanceType = Card
  }

  test("a view is a thing;  a viewable list is a list, holding its items", () => {
    const pile = new Pile()
    core.append(pile, new Card())
    expect(new Card()).toBeInstanceOf(Thing)
    expect(pile).toBeInstanceOf(List)
    expect(pile.items).toHaveLength(1)
  })

  test("both are built in:  found by name", () => {
    expect(core.things.classNamed("View")).toBe(View)
    expect(core.things.classNamed("ViewableList")).toBe(ViewableList)
  })
})
