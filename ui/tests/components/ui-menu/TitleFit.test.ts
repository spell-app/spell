import { describe, expect, it } from "vite-plus/test"

import { TitleFit } from "spell/ui/components/ui-menu/TitleFit"

// the docs runtime's `titleCap()` and `titleFit()` cases (spell-epic's `titleCap.test.ts`, gone), plus the new ones

describe("TitleFit.cap()", () => {
  it("fits whole:  undefined", () => {
    expect(TitleFit.cap([30, 80, 120], 230)).toBeUndefined()
    expect(TitleFit.cap([], 0)).toBeUndefined()
  })

  it("the longest give way first:  the short ones keep their width", () => {
    expect(TitleFit.cap([30, 80, 120], 200)).toBe(90)
    expect(TitleFit.cap([120, 30, 80], 120)).toBe(45)
  })

  it("an equal share when they're all long;  never below 0", () => {
    expect(TitleFit.cap([100, 100, 100], 200)).toBe(66)
    expect(TitleFit.cap([100], -10)).toBe(0)
  })
})

describe("TitleFit.fit()", () => {
  it("whole, while every title fits", () => {
    expect(TitleFit.fit([30, 80, 120], 230, 50)).toBe("whole")
    expect(TitleFit.fit([30, 30, 30, 30, 30], 160, 50)).toBe("whole")
  })

  it("a width, the longest cut, while none is cut under the minimum", () => {
    expect(TitleFit.fit([30, 80, 120], 200, 50)).toBe(90)
    expect(TitleFit.fit([40, 200, 200], 140, 50)).toBe(50)
  })

  it("icons only, once one would be cut under the minimum", () => {
    expect(TitleFit.fit([30, 80, 120], 120, 50)).toBe("icons")
    expect(TitleFit.fit([40, 200, 200], 138, 50)).toBe("icons")
    expect(TitleFit.fit([200, 200, 200, 200, 200, 200], 280, 50)).toBe("icons")
    expect(TitleFit.fit([100], -10, 50)).toBe("icons")
  })

  it("takes any minimum:  80px makes a cut of 70 icons only", () => {
    expect(TitleFit.fit([100, 100, 100], 210, 50)).toBe(70)
    expect(TitleFit.fit([100, 100, 100], 210, 80)).toBe("icons")
    expect(TitleFit.fit([100, 100, 100], 210, 70)).toBe(70)
  })

  it("overflow, once the icon buttons don't fit the row either", () => {
    const icons = { widths: [30, 30, 30], min: 34 }
    // each button at least 34px:  102px needed
    expect(TitleFit.fit([100, 100, 100], 60, 50, { ...icons, room: 102 })).toBe("icons")
    expect(TitleFit.fit([100, 100, 100], 60, 50, { ...icons, room: 101 })).toBe("overflow")
  })

  it("the item minimum folds them sooner:  44px buttons need 132px", () => {
    const icons = { widths: [30, 30, 30], room: 120 }
    expect(TitleFit.fit([100, 100, 100], 60, 50, { ...icons, min: 34 })).toBe("icons")
    expect(TitleFit.fit([100, 100, 100], 60, 50, { ...icons, min: 44 })).toBe("overflow")
  })

  it("a button wider than the minimum counts at its own width", () => {
    expect(TitleFit.fit([100, 100], 40, 50, { widths: [60, 60], room: 119, min: 34 })).toBe("overflow")
    expect(TitleFit.fit([100, 100], 40, 50, { widths: [60, 60], room: 120, min: 34 })).toBe("icons")
  })

  it("never overflows while a cut is still allowed", () => {
    expect(TitleFit.fit([100, 100], 120, 50, { widths: [30, 30], room: 0, min: 34 })).toBe(60)
  })
})

describe("TitleFit.lengthOf()", () => {
  it("reads px, em of the font size, or a bare number", () => {
    expect(TitleFit.lengthOf("50px", 14, 0)).toBe(50)
    expect(TitleFit.lengthOf(" 3em ", 14, 0)).toBe(42)
    expect(TitleFit.lengthOf("2.5em", 16, 0)).toBe(40)
    expect(TitleFit.lengthOf("34", 14, 0)).toBe(34)
  })

  it("falls back for anything else", () => {
    expect(TitleFit.lengthOf("", 14, 50)).toBe(50)
    expect(TitleFit.lengthOf("calc(1em + 2px)", 14, 34)).toBe(34)
    expect(TitleFit.lengthOf("10%", 14, 34)).toBe(34)
  })
})
