import { describe, expect, it } from "vite-plus/test"

import { ListSelection } from "spell/util/ListSelection"

const ITEMS = ["a", "b", "c", "d", "e", "f", "g"]
const PLAIN = { shiftKey: false, metaKey: false, ctrlKey: false }
const COMMAND = { ...PLAIN, metaKey: true }
const CONTROL = { ...PLAIN, ctrlKey: true }
const SHIFT = { ...PLAIN, shiftKey: true }

describe("ListSelection", () => {
  /** A selection, and a click that remembers what's selected, as an owner does. */
  function clicking() {
    const selection = new ListSelection<string>()
    let selected: string[] = []
    return {
      selection,
      click(item: string, keys = PLAIN, inList = true) {
        selected = selection.clicked(item, { items: inList ? ITEMS : undefined, selected, keys })
        return [...selected].sort()
      }
    }
  }

  it("a plain click selects only what's clicked, and sets the pivot", () => {
    const { selection, click } = clicking()
    click("a", COMMAND)
    expect(click("c")).toEqual(["c"])
    expect(selection.pivot).toBe("c")
  })

  it("command or control adds what's clicked, which becomes the pivot", () => {
    const { selection, click } = clicking()
    click("a")
    expect(click("c", COMMAND)).toEqual(["a", "c"])
    expect(selection.pivot).toBe("c")
    expect(click("e", CONTROL)).toEqual(["a", "c", "e"])
    expect(selection.pivot).toBe("e")
  })

  it("taking the pivot away moves it to the last one still selected;  taking another away leaves it", () => {
    const { selection, click } = clicking()
    click("a")
    click("c", COMMAND)
    click("e", COMMAND)
    expect(click("a", COMMAND)).toEqual(["c", "e"])
    expect(selection.pivot).toBe("e")
    expect(click("e", COMMAND)).toEqual(["c"])
    expect(selection.pivot).toBe("c")
    expect(click("c", COMMAND)).toEqual([])
    expect(selection.pivot).toBeUndefined()
  })

  it("shift selects the run from the pivot to what's clicked, either way, and the pivot stays", () => {
    const { selection, click } = clicking()
    click("c")
    expect(click("e", SHIFT)).toEqual(["c", "d", "e"])
    expect(selection.pivot).toBe("c")
    expect(click("a", SHIFT)).toEqual(["a", "b", "c"])
    expect(selection.pivot).toBe("c")
  })

  it("another shift-click swaps the run for the new one, keeping only what's in both", () => {
    const { click } = clicking()
    click("b")
    expect(click("f", SHIFT)).toEqual(["b", "c", "d", "e", "f"])
    expect(click("d", SHIFT)).toEqual(["b", "c", "d"])
  })

  it("what command added outside the run stays, and its command moved the pivot", () => {
    const { selection, click } = clicking()
    click("a")
    click("g", COMMAND)
    expect(selection.pivot).toBe("g")
    expect(click("e", SHIFT)).toEqual(["a", "e", "f", "g"])
    expect(click("f", SHIFT)).toEqual(["a", "f", "g"])
  })

  it("a run stays once command is pressed:  the next run starts from the new pivot, and swaps only itself", () => {
    const { click } = clicking()
    click("a")
    click("b", SHIFT)
    click("e", COMMAND)
    expect(click("f", SHIFT)).toEqual(["a", "b", "e", "f"])
    expect(click("g", SHIFT)).toEqual(["a", "b", "e", "f", "g"])
    expect(click("e", SHIFT)).toEqual(["a", "b", "e"])
  })

  it("shift with no pivot, or one that's left the list, is a plain click", () => {
    const selection = new ListSelection<string>()
    expect(selection.clicked("c", { items: ITEMS, selected: [], keys: SHIFT })).toEqual(["c"])
    selection.pivot = "z"
    expect(selection.clicked("d", { items: ITEMS, selected: ["c"], keys: SHIFT })).toEqual(["d"])
  })

  it("not in a list, shift toggles, as command does", () => {
    const { selection, click } = clicking()
    const outside = (item: string) => click(item, SHIFT, false)
    click("a", PLAIN, false)
    expect(outside("d")).toEqual(["a", "d"])
    expect(selection.pivot).toBe("d")
    expect(outside("a")).toEqual(["d"])
    expect(selection.pivot).toBe("d")
  })
})
