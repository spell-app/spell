import { describe, expect, test } from "vite-plus/test"

import {
  clipped,
  contrast,
  CONTRAST_TEXT,
  hexToOklch,
  hexToRgb,
  inGamut,
  luminance,
  oklchToHex,
  oklchToRgb,
  rgbToHex,
  rgbToOklch,
  toGamut
} from "spell/util/color"

describe("hex", () => {
  test("reads every hex form", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 1, g: 1, b: 1 })
    expect(hexToRgb("000000")).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb("#FF000080").alpha).toBeCloseTo(128 / 255)
  })

  test("refuses what isn't hex", () => {
    expect(() => hexToRgb("#ggg")).toThrow(TypeError)
    expect(() => hexToRgb("#12345")).toThrow(TypeError)
  })

  test("writes lower case, alpha only when not opaque", () => {
    expect(rgbToHex({ r: 1, g: 0.5, b: 0 })).toBe("#ff8000")
    expect(rgbToHex({ r: 1, g: 0, b: 0, alpha: 0.5 })).toBe("#ff000080")
    expect(rgbToHex({ r: 1.2, g: -0.1, b: 0, alpha: 1 })).toBe("#ff0000")
  })
})

describe("OKLCH <-> sRGB", () => {
  test("round-trips through hex", () => {
    for (const hex of ["#000000", "#ffffff", "#3366cc", "#e0a040", "#1a1c27"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex)
    }
  })

  test("white and black are OKLCH's ends;  a grey's hue is 0", () => {
    const white = rgbToOklch({ r: 1, g: 1, b: 1 })
    expect(white.l).toBeCloseTo(1, 4)
    expect(white.c).toBeCloseTo(0, 4)
    expect(white.h).toBe(0)
    expect(rgbToOklch({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 6)
  })

  test("pure red is the CSS Color 4 value", () => {
    const red = hexToOklch("#ff0000")
    expect(red.l).toBeCloseTo(0.628, 3)
    expect(red.c).toBeCloseTo(0.2577, 3)
    expect(red.h).toBeCloseTo(29.23, 1)
  })
})

describe("gamut", () => {
  /** A green far more saturated than sRGB holds. */
  const wild = { l: 0.7, c: 0.4, h: 145 }

  test("an out-of-gamut colour isn't fitted until asked", () => {
    expect(inGamut(oklchToRgb(wild))).toBe(false)
    expect(inGamut(clipped(oklchToRgb(wild)))).toBe(true)
  })

  test("toGamut() keeps lightness and hue, and takes chroma off", () => {
    const fitted = toGamut(wild)
    expect(fitted.l).toBe(wild.l)
    expect(fitted.h).toBe(wild.h)
    expect(fitted.c).toBeLessThan(wild.c)
    expect(inGamut(oklchToRgb(fitted))).toBe(true)
    expect(toGamut({ l: 0.5, c: 0.05, h: 200 })).toEqual({ l: 0.5, c: 0.05, h: 200 })
  })

  test("oklchToHex() clips by default, or fits chroma", () => {
    expect(oklchToHex(wild)).toBe(rgbToHex(clipped(oklchToRgb(wild))))
    expect(oklchToHex(wild, { fit: "chroma" })).toBe(rgbToHex(oklchToRgb(toGamut(wild))))
  })
})

describe("contrast", () => {
  test("WCAG's numbers", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1, 6)
    expect(luminance("#000000")).toBe(0)
    expect(contrast("#000", "#fff")).toBeCloseTo(21, 6)
    expect(contrast("#fff", "#000")).toBeCloseTo(21, 6)
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2)
    expect(contrast("#767676", "#ffffff")).toBeGreaterThanOrEqual(CONTRAST_TEXT)
  })

  test("takes any shape:  hex, sRGB or OKLCH", () => {
    const blue = "#3366cc"
    const ratio = contrast(blue, "#fff")
    expect(contrast(hexToRgb(blue), { r: 1, g: 1, b: 1 })).toBeCloseTo(ratio, 6)
    expect(contrast(hexToOklch(blue), { l: 1, c: 0, h: 0 })).toBeCloseTo(ratio, 4)
  })
})
