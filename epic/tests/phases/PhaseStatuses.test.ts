/**
 * Tests of `PhaseStatuses` (epic `epic-engine` I228):  a phase's statuses, and which ones are finished.
 */
import { describe, expect, test } from "vite-plus/test"

import { PhaseStatuses } from "spell/epic/phases"

describe("PhaseStatuses", () => {
  test("the statuses:  todo, active, done, and dropped;  any other word isn't one", () => {
    expect(PhaseStatuses.ALL).toEqual(["todo", "active", "done", "dropped"])
    expect(["dropped", "done", "finished", "", null].map((status) => PhaseStatuses.isStatus(status))).toEqual([
      true,
      true,
      false,
      false,
      false
    ])
  })

  test("finished:  done and dropped;  to do, under way and nothing are not", () => {
    expect(["done", "dropped", "todo", "active", null, undefined].map((s) => PhaseStatuses.isFinished(s))).toEqual([
      true,
      true,
      false,
      false,
      false,
      false
    ])
  })
})
