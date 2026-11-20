import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { PaneSizes } from "spell/ui/util"

describe("PaneSizes.sizesFor()", () => {
  afterEach(() => vi.restoreAllMocks())

  test("reads px, em, %, * and auto, padding with shares of what's left", () => {
    expect(PaneSizes.sizesFor("80%", 2)).toEqual([
      { value: 80, units: "%" },
      { value: 20, units: "%" }
    ])
    expect(PaneSizes.sizesFor("*,*,200px", 3)[0]).toEqual({ value: 50, units: "%" })
    expect(PaneSizes.sizesFor("2em,auto", 2)).toEqual([
      { value: 2, units: "em" },
      { value: 0, units: "auto" }
    ])
    expect(PaneSizes.sizesFor("120", 1)).toEqual([{ value: 120, units: "px" }])
  })

  test("ignores a space after a comma, and empty entries", () => {
    expect(PaneSizes.sizesFor("200px, 30%, auto", 3)).toEqual([
      { value: 200, units: "px" },
      { value: 30, units: "%" },
      { value: 0, units: "auto" }
    ])
  })

  test("warns, naming who's reading, about an entry that isn't a size, and shares what's left with it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(PaneSizes.sizesFor("wide", 1, { source: "<ui-tree>" })).toEqual([{ value: 100, units: "%" }])
    expect(warn).toHaveBeenCalledWith(
      `[spell-ui] <ui-tree>:  the size "wide" isn't one:  a number, px, em, %, * or auto`
    )
  })
})

describe("PaneSizes.sizeText()", () => {
  test("writes the sizes back in the form sizesFor() reads", () => {
    expect(PaneSizes.sizeText(PaneSizes.sizesFor("60%,40%,auto,8px", 4))).toBe("60%,40%,auto,8px")
  })
})

describe("PaneSizes.sizeFor()", () => {
  test("reads one entry:  `undefined` for `*`, which each element gives a meaning of its own", () => {
    expect(PaneSizes.sizeFor(" 12em ")).toEqual({ value: 12, units: "em" })
    expect(PaneSizes.sizeFor("auto")).toEqual({ value: 0, units: "auto" })
    expect(PaneSizes.sizeFor("*")).toBeUndefined()
  })
})
