import { describe, expect, test } from "vite-plus/test"

import { titleCap, titleFit } from "spell-epic/tools/_assets/spell-doc-toolbar.js"

describe("titleCap()", () => {
  test("every title whole when they fit:  no cap", () => {
    expect(titleCap([30, 80, 120], 230)).toBeUndefined()
    expect(titleCap([], 0)).toBeUndefined()
  })

  test("the longest give way first, down to one width", () => {
    expect(titleCap([30, 80, 120], 200)).toBe(90)
    expect(titleCap([120, 30, 80], 120)).toBe(45)
  })

  test("whole pixels, never more than the room", () => {
    expect(titleCap([100, 100, 100], 200)).toBe(66)
    expect(titleCap([100], -10)).toBe(0)
  })
})

describe("titleFit()", () => {
  test("whole when every title fits, even short ones in little room", () => {
    expect(titleFit([30, 80, 120], 230)).toBe("whole")
    expect(titleFit([30, 30, 30, 30, 30], 160)).toBe("whole")
  })

  test("a cap while no title is cut under 50px", () => {
    expect(titleFit([30, 80, 120], 200)).toBe(90)
    expect(titleFit([40, 200, 200], 140)).toBe(50)
  })

  test("icons once a title would be cut under 50px:  never a stub like '6 W…'", () => {
    expect(titleFit([30, 80, 120], 120)).toBe("icons")
    expect(titleFit([40, 200, 200], 138)).toBe("icons")
    expect(titleFit([200, 200, 200, 200, 200, 200], 280)).toBe("icons")
    expect(titleFit([100], -10)).toBe("icons")
  })
})
