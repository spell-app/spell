/**
 * Tests of `PhaseMoves` (epic `epic-engine` P34, I480):  where a moved to-do phase lands, and the order after it.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { PhaseMoves } from "spell/epic/phases"

/** P1-P7:  P2, P3, P5 and P6 done, the rest to do (the data epic's P51-P57, shown as the page hides its done ones). */
const STATUSES = ["todo", "done", "done", "todo", "done", "done", "todo"]

/** Phases `p1` ... in `statuses`, in a section. */
function phasesOf(statuses: readonly string[]): Element[] {
  const markup = statuses.map((status, index) => `<epic-phase id="p${index + 1}" status="${status}"></epic-phase>`)
  const { document } = parseHTML(`<epic-section>${markup.join("")}</epic-section>`)
  return Array.from(document.querySelectorAll("epic-phase"))
}

/** The ids of `phases`' section, in order. */
function order(phases: readonly Element[]): string[] {
  return Array.from(phases[0]!.parentElement!.children, (phase) => phase.id)
}

describe("PhaseMoves.landing()", () => {
  test("a place a to-do phase holds:  itself;  a started one's:  the nearest to-do place back towards the phase", () => {
    expect(PhaseMoves.landing(STATUSES, 7, 1)).toBe(1)
    expect(PhaseMoves.landing(STATUSES, 7, 2)).toBe(4)
    expect(PhaseMoves.landing(STATUSES, 1, 6)).toBe(4)
    expect(PhaseMoves.landing(STATUSES, 1, 7)).toBe(7)
    // dropped trades too:  nothing was built under it (I228)
    expect(PhaseMoves.landing(["todo", "dropped", "todo"], 3, 2)).toBe(2)
  })

  test("stays:  no to-do place between;  can't:  a started phase moving, or a place out of range", () => {
    expect(PhaseMoves.landing(["done", "todo"], 2, 1)).toBe(2)
    expect(PhaseMoves.landing(STATUSES, 4, 4)).toBe(4)
    expect(PhaseMoves.landing(STATUSES, 2, 1)).toBeUndefined()
    expect(PhaseMoves.landing(STATUSES, 7, 8)).toBeUndefined()
  })
})

describe("PhaseMoves.move()", () => {
  test("past done phases:  the to-do ones take each other's places around them;  the done ones never move", () => {
    const phases = phasesOf(STATUSES)
    expect(PhaseMoves.move(phases, 7, 1)).toBe(1)
    expect(order(phases)).toEqual(["p7", "p2", "p3", "p1", "p5", "p6", "p4"])
  })

  test("down, onto a done phase's place:  to the to-do place before it", () => {
    const phases = phasesOf(STATUSES)
    expect(PhaseMoves.move(phases, 1, 6)).toBe(4)
    expect(order(phases)).toEqual(["p4", "p2", "p3", "p1", "p5", "p6", "p7"])
  })

  test("among to-do phases only:  an ordinary move, one place each", () => {
    const phases = phasesOf(["todo", "todo", "todo", "todo"])
    expect(PhaseMoves.move(phases, 1, 3)).toBe(3)
    expect(order(phases)).toEqual(["p2", "p3", "p1", "p4"])
  })

  test("throws for a move that can't be, changing nothing", () => {
    const phases = phasesOf(STATUSES)
    expect(() => PhaseMoves.move(phases, 2, 1)).toThrow(/can't move/)
    expect(order(phases)).toEqual(["p1", "p2", "p3", "p4", "p5", "p6", "p7"])
  })
})
