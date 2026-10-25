import { describe, expect, test } from "vite-plus/test"

import { titleCap } from "spell-epic/tools/_assets/spell-doc-toolbar.js"

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
