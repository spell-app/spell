import { describe, test, expect } from "vite-plus/test"

import { core, Thing, List, View, ViewableList } from "spell/parser/core"

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

  test("a view with a thumbnail and no drawing draws its thumbnail;  one with neither can't be drawn (mockup P16)", () => {
    class Terms extends View {
      get thumbnail() {
        return "snapshots/t.jpg"
      }
    }
    class Blank extends View {}
    expect(() => new Blank().draw()).toThrow(/does not implement draw/)
    core.projectFolder = "/spaces/@spell/x"
    try {
      expect(core.addressOfFile("snapshots/t.jpg")).toBe("/spaces/@spell/x/snapshots/t.jpg")
      expect(core.addressOfFile("/elsewhere/t.jpg")).toBe("/elsewhere/t.jpg")
      expect(core.addressOfFile("https://a.example/t.jpg")).toBe("https://a.example/t.jpg")
      expect(new Terms().drawThumbnail()).toBeDefined()
    } finally {
      core.projectFolder = undefined
    }
  })

  test("both are built in:  found by name", () => {
    expect(core.things.classNamed("View")).toBe(View)
    expect(core.things.classNamed("ViewableList")).toBe(ViewableList)
  })
})
