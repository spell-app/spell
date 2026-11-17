import { describe, expect, test } from "vite-plus/test"

import { SPACES } from "spell/app/spaces"

/** The home page's layout (epic `mockup` T51):  everyone's, with a person's own changes laid over it. */
describe("the home page's layout", () => {
  const defaults: SPACES.HomeLayout = {
    order: { sections: ["start", "examples"], hidden: ["@spell/examples/fizzbuzz"], "@spell/examples": ["a", "b"] },
    texts: { "@spell/examples/a": { title: "Apple", line: "A fruit" } }
  }

  test("a person's own lists and words over everyone's;  what's hidden is always everyone's", () => {
    const mine: SPACES.HomeLayout = {
      order: { "@spell/examples": ["b", "a"], hidden: [] },
      texts: { "@spell/examples/a": { line: "Mine" }, "section:examples:en": { title: "Things" } }
    }
    expect(SPACES.layeredHome(defaults, mine)).toEqual({
      order: { sections: ["start", "examples"], hidden: ["@spell/examples/fizzbuzz"], "@spell/examples": ["b", "a"] },
      texts: { "@spell/examples/a": { title: "Apple", line: "Mine" }, "section:examples:en": { title: "Things" } }
    })
    expect(SPACES.layeredHome(defaults)).toEqual(defaults)
  })

  test("a change of words:  kept trimmed;  empty, or the same as what's under it, goes back to it", () => {
    const key = "@spell/examples/a"
    const changed = SPACES.withHomeChange(SPACES.NO_HOME_CHANGES, { text: { key, title: "  Pear " } }, defaults)
    expect(changed.texts).toEqual({ [key]: { title: "Pear" } })
    expect(SPACES.withHomeChange(changed, { text: { key, title: "" } }, defaults).texts).toEqual({})
    expect(SPACES.withHomeChange(changed, { text: { key, title: "Apple" } }, defaults).texts).toEqual({})
    // a word not named is left as it was
    expect(SPACES.withHomeChange(changed, { text: { key, line: "Juicy" } }, defaults).texts).toEqual({
      [key]: { title: "Pear", line: "Juicy" }
    })
  })

  test("a change of order, and a reset", () => {
    const moved = SPACES.withHomeChange(defaults, { order: { group: "start", names: ["blank", "counter"] } })
    expect(moved.order.start).toEqual(["blank", "counter"])
    expect(moved.order["@spell/examples"]).toEqual(["a", "b"])
    expect(SPACES.withHomeChange(moved, { reset: true })).toEqual(SPACES.NO_HOME_CHANGES)
  })

  test("what each change of words is kept under", () => {
    expect(SPACES.homeTextKey({ project: "@spell/examples/Weather" })).toBe("@spell/examples/Weather")
    expect(SPACES.homeTextKey({ section: "examples", lang: "es" })).toBe("section:examples:es")
    expect(SPACES.homeTextKey({ start: "counter", lang: "en" })).toBe("start:counter:en")
  })

  test("a tagline past a card's two lines is said to be too long", () => {
    expect(SPACES.isTooLongForCard("x".repeat(SPACES.CARD_LINE_LENGTH))).toBe(false)
    expect(SPACES.isTooLongForCard("x".repeat(SPACES.CARD_LINE_LENGTH + 1))).toBe(true)
  })
})
