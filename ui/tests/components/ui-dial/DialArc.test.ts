import { describe, expect, test } from "vite-plus/test"

import { DialArc } from "spell/ui/components/ui-dial/DialArc"

describe("DialArc.angleAt() / ratioAt()", () => {
  test("the ring runs -135° ... 135° clockwise from 12 o'clock;  an angle in the gap goes to the nearer end", () => {
    expect([0, 0.5, 1].map((ratio) => DialArc.angleAt(ratio))).toEqual([-135, 0, 135])
    expect([-135, 0, 67.5, 160, -160, 270, -300].map((angle) => DialArc.ratioAt(angle))).toEqual([
      0, 0.5, 0.75, 1, 0, 1, 0
    ])
  })
})

describe("DialArc.pointAt() / angleOf()", () => {
  test("12 o'clock is straight up, 3 o'clock straight right;  angleOf() turns a point back into its angle", () => {
    expect(DialArc.pointAt(0.5, 40)).toEqual({ x: 50, y: 10 })
    expect(DialArc.pointAt(DialArc.ratioAt(90), 40)).toEqual({ x: 90, y: 50 })
    expect([DialArc.angleOf(0, -1), DialArc.angleOf(1, 0), DialArc.angleOf(-1, 0)]).toEqual([0, 90, -90])
    expect(DialArc.angleOf(-1, 1)).toBeCloseTo(-135)
  })
})

describe("DialArc.path()", () => {
  test("one arc command, the large-arc flag past 180°;  empty when it would be", () => {
    expect(DialArc.path(0, 1, 40)).toBe("M 21.716 78.284 A 40 40 0 1 1 78.284 78.284")
    expect(DialArc.path(0, 0.5, 40)).toBe("M 21.716 78.284 A 40 40 0 0 1 50 10")
    expect([DialArc.path(0, 0, 40), DialArc.path(0.6, 0.4, 40)]).toEqual(["", ""])
  })
})

describe("DialArc.follow()", () => {
  test("follows the short way round, winding on past ±180°", () => {
    expect([DialArc.follow(10, 30), DialArc.follow(170, -170), DialArc.follow(-170, 170)]).toEqual([30, 190, -190])
  })

  test("NEVER jumps across the gap:  past max, round to the start and on up, it stays at max until it comes back", () => {
    let angle = 130
    const ratios: number[] = []
    // round clockwise past the end, through the gap, up the left side to 12 o'clock and on to 3 o'clock
    for (const next of [150, 180, -150, -120, -90, -45, 0, 45, 90]) {
      angle = DialArc.follow(angle, next)
      ratios.push(DialArc.ratioAt(angle))
    }
    expect(ratios).toEqual(Array(9).fill(1))
    // and back the way it came:  max until the pointer is back on the ring's end
    for (const next of [45, 0, -90, -150, 180, 150]) angle = DialArc.follow(angle, next)
    expect(DialArc.ratioAt(angle)).toBe(1)
    angle = DialArc.follow(angle, 90)
    expect(DialArc.ratioAt(angle)).toBeCloseTo((90 + 135) / 270)
  })
})
