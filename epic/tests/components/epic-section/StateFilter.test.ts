import { describe, expect, test } from "vite-plus/test"

import { StateFilter } from "spell/epic/components/epic-section/StateFilter"

/** The states a filter has, in the filter's order. */
const PRESENT = ["attention", "replied", "open", "recent"]

describe("StateFilter.nextShown()", () => {
  // epic `epic-engine` I242 (Owen, 2026-11-09:  "Clicking on a badge toggles it.")
  test("everything showing:  a click turns that one off", () => {
    expect(StateFilter.nextShown(PRESENT, PRESENT, "open")).toEqual(["attention", "replied", "recent"])
  })

  test("a hidden state, clicked:  it shows too, the others as they were, in the filter's order", () => {
    expect(StateFilter.nextShown(PRESENT, ["attention"], "replied")).toEqual(["attention", "replied"])
    expect(StateFilter.nextShown(PRESENT, ["recent", "attention"], "open")).toEqual(["attention", "open", "recent"])
  })

  test("a shown state, clicked, others showing too:  it hides", () => {
    expect(StateFilter.nextShown(PRESENT, ["attention", "open"], "open")).toEqual(["attention"])
  })

  // Owen, 2026-11-09:  "Turning off the last badge -- select the next one in the list."
  test("the ONLY state showing, clicked:  the next one instead, wrapping;  none showing:  the clicked one", () => {
    expect(StateFilter.nextShown(PRESENT, ["open"], "open")).toEqual(["recent"])
    expect(StateFilter.nextShown(PRESENT, ["recent"], "recent")).toEqual(["attention"])
    expect(StateFilter.nextShown(PRESENT, [], "open")).toEqual(["open"])
  })

  test("the next one is a whole group, and steps past the clicked group", () => {
    const present = ["progress", "scheduled", "replied", "requested", "open"]
    expect(StateFilter.nextShown(present, ["open"], "open")).toEqual(["progress", "scheduled"])
    expect(StateFilter.nextShown(present, ["progress", "scheduled"], "scheduled")).toEqual(["replied", "requested"])
    expect(StateFilter.nextShown(present, ["replied", "requested"], "replied")).toEqual(["open"])
  })

  test("one group, or one state, is all there is:  it stays on", () => {
    expect(StateFilter.nextShown(["open"], ["open"], "open")).toEqual(["open"])
    const blues = ["progress", "scheduled"]
    expect(StateFilter.nextShown(blues, blues, "progress")).toEqual(blues)
  })

  // epic `epic-engine` I166:  an ⌥-click
  test('`how: "only"`:  only the clicked state, whatever showed', () => {
    expect(StateFilter.nextShown(PRESENT, ["attention"], "open", "only")).toEqual(["open"])
    expect(StateFilter.nextShown(PRESENT, ["attention", "open"], "open", "only")).toEqual(["open"])
    expect(StateFilter.nextShown(PRESENT, ["open"], "open", "only")).toEqual(["open"])
    expect(StateFilter.nextShown(PRESENT, PRESENT, "recent", "only")).toEqual(["recent"])
  })

  // epic `epic-engine` I242 (Owen, 2026-11-09:  "Blues should appear together and toggle together.  Oranges should
  // toggle together.")
  test("the blues go together:  `progress`, `handed` and `scheduled`", () => {
    const present = ["progress", "handed", "scheduled", "open"]
    expect(StateFilter.nextShown(present, present, "progress")).toEqual(["open"])
    expect(StateFilter.nextShown(present, ["open"], "scheduled")).toEqual(present)
    expect(StateFilter.nextShown(present, present, "handed", "only")).toEqual(["progress", "handed", "scheduled"])
    // one of them still on:  the click turns the rest off
    expect(StateFilter.nextShown(present, ["scheduled", "open"], "progress")).toEqual(["open"])
    expect(StateFilter.hides("progress", [])).toBe(true)
    expect(StateFilter.hides("open", ["open"])).toBe(false)
    expect(StateFilter.chipStatesOf(["handed", "progress", "open"])).toEqual(["open"])
  })

  test("the oranges go together:  an item's `replied` and `requested`, a phase's `waiting` and `updated`", () => {
    const items = ["replied", "requested", "open"]
    expect(StateFilter.nextShown(items, items, "requested")).toEqual(["open"])
    expect(StateFilter.nextShown(items, ["open"], "replied")).toEqual(items)
    expect(StateFilter.nextShown(items, items, "replied", "only")).toEqual(["replied", "requested"])
    const phases = ["waiting", "updated", "scheduled"]
    expect(StateFilter.nextShown(phases, phases, "updated")).toEqual(["scheduled"])
  })

  test("the greys go together:  `old`, `handled` and `quiet`", () => {
    const present = ["open", "handled", "quiet", "old"]
    expect(StateFilter.nextShown(present, present, "old")).toEqual(["open"])
  })

  // the Epics list's saga chips (`EpicList`)
  test('`how: "narrow"`:  the saga chips\' older rule', () => {
    const sagas = ["a", "b", "c"]
    expect(StateFilter.nextShown(sagas, sagas, "b", "narrow")).toEqual(["b"])
    expect(StateFilter.nextShown(sagas, ["b"], "a", "narrow")).toEqual(["a", "b"])
    expect(StateFilter.nextShown(sagas, ["a", "b"], "b", "narrow")).toEqual(["a"])
    expect(StateFilter.nextShown(sagas, ["b"], "b", "narrow")).toEqual(sagas)
  })

  test("states no longer there are left out", () => {
    expect(StateFilter.nextShown(["open", "recent"], ["old", "open"], "recent")).toEqual(["open", "recent"])
  })
})

describe("StateFilter.clickDoes()", () => {
  test("names what a click does, for the chip's tooltip", () => {
    expect(
      ["attention", "open"].map((state) => [
        StateFilter.clickDoes(PRESENT, PRESENT, state),
        StateFilter.clickDoes(PRESENT, ["open"], state),
        StateFilter.clickDoes(PRESENT, ["attention", "open"], state)
      ])
    ).toEqual([
      ["hide", "also", "hide"],
      ["hide", "next", "hide"]
    ])
    expect(StateFilter.clickDoes(["open", "recent"], ["recent"], "open")).toBe("all")
    expect(StateFilter.clickDoes(["open"], ["open"], "open")).toBe("stays")
    expect(StateFilter.clickDoes(["progress", "scheduled"], ["progress", "scheduled"], "scheduled")).toBe("stays")
  })
})

// epic `epic-engine` I259 (Owen, 2026-11-11:  the toolbar's grey went on, the Phases section's grey stayed off)
describe("StateFilter's colours, for the page's toolbar", () => {
  test("a state's colour:  its group's first state;  a phase's paused goes with the greys", () => {
    expect(["handled", "quiet", "old", "paused"].map((state) => StateFilter.colorOf(state))).toEqual([
      "old",
      "old",
      "old",
      "old"
    ])
    expect(["scheduled", "updated", "attention"].map((state) => StateFilter.colorOf(state))).toEqual([
      "progress",
      "replied",
      "attention"
    ])
  })

  test("setting colours:  every state of a named colour on or off, whatever the section had;  the rest as they were", () => {
    const colors = new Map([
      ["old", true],
      ["attention", false]
    ])
    expect(StateFilter.withColors(["attention", "updated", "paused", "old"], ["attention"], colors)).toEqual([
      "paused",
      "old"
    ])
    expect(StateFilter.withColors(["attention", "updated", "old"], ["updated"], colors)).toEqual(["updated", "old"])
  })

  test("where a colour stands across sections:  on, off, or mixed", () => {
    const standing = StateFilter.colorStanding([
      [
        { state: "old", on: true },
        { state: "open", on: true }
      ],
      [
        { state: "paused", on: false },
        { state: "old", on: true },
        { state: "attention", on: false }
      ]
    ])
    expect(Object.fromEntries(standing)).toEqual({ old: "mixed", open: "on", attention: "off" })
  })
})
