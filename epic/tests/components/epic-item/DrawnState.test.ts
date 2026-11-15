/**
 * Tests of `DrawnState.of()`:  an item's state as its id chip draws it, from its attributes and the live review.
 * - here:  Owen's turn on a comment in it (epic `epic-engine` I284)
 */
import { describe, expect, test } from "vite-plus/test"

import { DrawnState, NO_LIVE_REVIEW } from "spell/epic/components/epic-item/EpicItem.types"

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
