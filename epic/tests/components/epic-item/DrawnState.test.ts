/**
 * Tests of `DrawnState.of()`:  an item's state as its id chip draws it, from its attributes and the live review.
 * - here:  Owen's turn on a comment in it (epic `epic-engine` I284)
 */
import { describe, expect, test } from "vite-plus/test"

import { buttonsForItem, DrawnState, NO_LIVE_REVIEW } from "spell/epic/components/epic-item/EpicItem.types"

const NOW = Date.parse("2026-11-15T12:00:00-05:00")
const TODAY = "2026-11-15T11:00:00-05:00"

describe("DrawnState.of():  Owen's turn on a comment in it", () => {
  const replied = { ...NO_LIVE_REVIEW, commentsReplied: true }

  test("an open or closed item with a comment Claude answered last draws orange (`replied`)", () => {
    expect(DrawnState.of({ id: "i83", state: "open", status: "open", changed: TODAY }, replied, NOW)).toBe("replied")
    expect(DrawnState.of({ id: "i83", state: "recent", status: "done", changed: TODAY }, replied, NOW)).toBe("replied")
    expect(DrawnState.of({ id: "i83", state: "old", status: "canceled", changed: TODAY }, replied, NOW)).toBe("replied")
  })

  test("red stays red (it needs him anyway), blue stays blue (Claude is at it)", () => {
    expect(DrawnState.of({ id: "j4", state: "attention", status: "open", changed: TODAY }, replied, NOW)).toBe(
      "attention"
    )
    expect(DrawnState.of({ id: "i83", state: "progress", status: "open", changed: TODAY }, replied, NOW)).toBe(
      "progress"
    )
    expect(DrawnState.of({ id: "i83", state: "open", status: "open" }, { ...replied, workedOn: true }, NOW)).toBe(
      "progress"
    )
  })

  test("no comment waiting on him:  as the tool wrote it", () => {
    expect(DrawnState.of({ id: "i83", state: "open", status: "open", changed: TODAY }, NO_LIVE_REVIEW, NOW)).toBe(
      "open"
    )
  })
})

// epic `epic-engine` I306:  "it should show as grey and hide with an animate up immediately"
describe("DrawnState.of():  closing at his ✓ or x", () => {
  const closing = { ...NO_LIVE_REVIEW, closing: true }

  test("grey (`old`) at once, whatever it was:  red, orange, open", () => {
    for (const state of ["attention", "replied", "open", "requested"])
      expect(DrawnState.of({ id: "i57", state, status: "open", changed: TODAY }, closing, NOW)).toBe("old")
  })
})

// epic `epic-engine` T94:  a todo Owen flagged red as a reminder (`epic update <epic>#T3 --loud`)
describe("DrawnState.of():  a todo flagged red", () => {
  const todo = { id: "t161", state: "attention", status: "open", changed: TODAY, urgent: true }

  test("draws red, as the tool wrote it, and its id chip may call it not urgent", () => {
    expect(DrawnState.of(todo, NO_LIVE_REVIEW, NOW)).toBe("attention")
    expect(DrawnState.canCalm(todo)).toBe(true)
    expect(DrawnState.of(todo, { ...NO_LIVE_REVIEW, urgency: { calm: true } }, NOW)).toBe("open")
  })

  test("keeps a todo's review buttons:  plane, revisit, x", () => {
    expect(buttonsForItem(todo.id, { status: "open" })).toBe("todo")
  })
})
