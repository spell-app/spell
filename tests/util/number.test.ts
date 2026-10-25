import { describe, expect, test } from "vite-plus/test"

import { clamp, kb } from "spell/util/number"

describe("clamp()", () => {
  test("holds a number between two others, ends included", () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(4, 0, 10)).toBe(4)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe("kb()", () => {
  test("a size in KB of 1024 bytes", () => {
    expect(kb(1024)).toBe("1.0 KB")
    expect(kb(12_595)).toBe("12.3 KB")
    expect(kb(2_097_152)).toBe("2048.0 KB")
    expect(kb(1536, { digits: 2 })).toBe("1.50 KB")
  })
})
