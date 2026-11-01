import { describe, expect, it } from "vite-plus/test"

import { ListSelection } from "spell/util/ListSelection"

const ITEMS = ["a", "b", "c", "d", "e"]
const PLAIN = { shiftKey: false, metaKey: false, ctrlKey: false }
const COMMAND = { ...PLAIN, metaKey: true }
const CONTROL = { ...PLAIN, ctrlKey: true }
const SHIFT = { ...PLAIN, shiftKey: true }

describe("ListSelection", () => {
  it("a plain click selects only what's clicked", () => {
    expect(new ListSelection<string>().clicked("c", { items: ITEMS, selected: ["a", "b"], keys: PLAIN })).toEqual(["c"])
  })

  it("command or control adds what's clicked, or takes it away", () => {
    const selection = new ListSelection<string>()
    expect(selection.clicked("c", { items: ITEMS, selected: ["a"], keys: COMMAND })).toEqual(["a", "c"])
    expect(selection.clicked("a", { items: ITEMS, selected: ["a", "c"], keys: CONTROL })).toEqual(["c"])
  })

  it("shift takes everything from the last one clicked to it, either way, and leaves the anchor", () => {
    const selection = new ListSelection<string>()
    selection.clicked("b", { items: ITEMS, selected: [], keys: PLAIN })
    expect(selection.clicked("d", { items: ITEMS, selected: ["b"], keys: SHIFT })).toEqual(["b", "c", "d"])
    expect(selection.clicked("a", { items: ITEMS, selected: ["b", "c", "d"], keys: SHIFT })).toEqual(["a", "b"])
  })

  it("shift with no anchor, or one that's left the list, is a plain click", () => {
    const selection = new ListSelection<string>()
    expect(selection.clicked("c", { items: ITEMS, selected: [], keys: SHIFT })).toEqual(["c"])
    selection.anchor = "z"
    expect(selection.clicked("d", { items: ITEMS, selected: ["c"], keys: SHIFT })).toEqual(["d"])
  })
})
