import { describe, expect, it } from "vite-plus/test"

import * as PONY from "spell/cli/commands/ponyCommand"

describe("ponyLines()", () => {
  it("puts the saying in a bubble as wide as it", () => {
    const lines = PONY.ponyLines("Hello")
    expect(lines[0]).toBe("  -------")
    expect(lines[1]).toBe(" < Hello >")
    expect(lines[2]).toBe("  -------")
  })

  it("draws the pony in its hat under the bubble", () => {
    const lines = PONY.ponyLines("Hi")
    expect(lines.some((line) => line.includes("/_|_\\"))).toBe(true)
    expect(lines.at(-1)).toContain("''  ''")
  })

  it("has something to say when told nothing", () => {
    expect(PONY.PONY_SAYINGS.length).toBeGreaterThan(0)
  })
})

describe("gallopFrames()", () => {
  it("one stride:  legs reaching, passing, tucked, passing;  only the legs move", () => {
    const frames = PONY.gallopFrames("Hi")
    expect(frames.map((frame) => frame.at(-2))).toEqual([
      "            //  //     \\\\  \\\\",
      "            ||  ||     ||  ||",
      "            \\\\  \\\\     //  //",
      "            ||  ||     ||  ||"
    ])
    const standing = PONY.ponyLines("Hi")
    for (const frame of frames) {
      expect(frame).toHaveLength(standing.length)
      expect(frame.slice(0, -2)).toEqual(standing.slice(0, -2))
    }
  })

  it("each leg's top stays under the body's bottom line", () => {
    const top = (line: string) => [...line].flatMap((char, column) => (char.trim() ? [column] : []))
    for (const frame of PONY.gallopFrames("Hi")) expect(top(frame.at(-2)!)).toEqual([12, 13, 16, 17, 23, 24, 27, 28])
  })
})
