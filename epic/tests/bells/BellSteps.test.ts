/**
 * Tests of `BellSteps` (epic `epic-engine` P86):  Bells & Whistles' table, and the one rule for whether a step runs.
 */
import { describe, expect, test } from "vite-plus/test"

import { BellSteps, type BellsValues, type BurnLevel } from "spell/epic/bells"
import { epicBellsVocabulary } from "spell/epic/components/epic-bells/EpicBells.en"

const textOf = (key: string) => epicBellsVocabulary.texts.find((text) => text.key === key)?.text

describe("BellSteps", () => {
  test("every step has a group, a cost, an importance, a title and a sentence;  45 of them, keys unique", () => {
    expect(BellSteps.STEPS).toHaveLength(45)
    expect(new Set(BellSteps.STEPS.map((step) => step.key)).size).toBe(45)
    for (const step of BellSteps.STEPS) {
      expect(BellSteps.GROUPS).toContain(step.group)
      expect(textOf(step.key), step.key).toBeTruthy()
      expect(textOf(`${step.key}Sentence`), step.key).toBeTruthy()
    }
    for (const group of BellSteps.GROUPS) expect(textOf(group), group).toBeTruthy()
  })

  test("the groups come in the table's order, each once", () => {
    const order = BellSteps.STEPS.map((step) => step.group).filter((group, i, all) => all[i - 1] !== group)
    expect(order).toEqual(BellSteps.GROUPS)
  })

  test("each group lists its steps by cost:  high, medium, low, none, then the timesavers;  the table's order within a cost", () => {
    for (const group of BellSteps.GROUPS) {
      const costs = BellSteps.STEPS.filter((step) => step.group === group).map((step) =>
        BellSteps.COST_ORDER.indexOf(step.cost)
      )
      expect(costs, group).toEqual([...costs].sort((a, b) => a - b))
    }
    const background = BellSteps.STEPS.filter((step) => step.group === "background").map((step) => step.key)
    expect(background).toEqual(["watchSends", "refreshPages", "startNotices", "closeLeftovers"])
    const testing = BellSteps.STEPS.filter((step) => step.group === "testing").map((step) => step.key)
    expect(testing).toEqual([
      "fullTestRun",
      "editorWarnings",
      "checksBeforeMerge",
      "speedTest",
      "editorAddOns",
      "stopStuckTests"
    ])
  })

  test("the costs:  5 high, 14 medium, 10 low, 13 none, 3 timesavers", () => {
    const count = (cost: string) => BellSteps.STEPS.filter((step) => step.cost === cost).length
    expect(BellSteps.COST_ORDER.map(count)).toEqual([5, 14, 10, 13, 3])
  })

  test("with nothing changed, every step runs", () => {
    const values = BellSteps.defaults()
    for (const step of BellSteps.STEPS) expect(BellSteps.stateOf(values, step.key)).toEqual({ on: true })
    expect(BellSteps.burnShown(values)).toBe("high")
  })

  test("at High, your own switch decides", () => {
    const values = { ...BellSteps.defaults(), designReview: false }
    expect(BellSteps.stateOf(values, "designReview")).toEqual({ on: false, why: "switch" })
  })

  test("Medium:  holds off every nice-to-have and every high-cost step that isn't a must;  9 of 28 (T173)", () => {
    const values = BellSteps.withBurn(BellSteps.defaults(), "medium")
    const on = (key: string) => BellSteps.stateOf(values, key).on
    expect(on("titleCheck")).toBe(true) // low, useful
    expect(on("freshHint")).toBe(true) // timesaver
    expect(on("itemScoring")).toBe(false) // low, nice to have
    expect(on("planCheck")).toBe(true) // medium, useful
    expect(on("alignmentCheck")).toBe(false) // medium, nice to have
    expect(on("helpersBuild")).toBe(true) // high, must-have
    expect(on("designReview")).toBe(false) // high, useful
    expect(BellSteps.stateOf(values, "designReview")).toEqual({ on: false, why: "burn" })
    expect(offAt("medium")).toEqual([
      "reuseCheckPhases",
      "designReview",
      "alignmentCheck",
      "itemScoring",
      "editorWarnings",
      "plainPhaseNotes",
      "fixReadmes",
      "checkGuides",
      "promptAck"
    ])
  })

  test("a step that uses no tokens runs at every level, unless your own switch is off", () => {
    for (const level of BellSteps.BURN_LEVELS) {
      const values = BellSteps.withBurn(BellSteps.defaults(), level)
      expect(BellSteps.stateOf(values, "startNotices").on, level).toBe(true) // none, useful
      expect(BellSteps.stateOf(values, "watchAgentNotes").on, level).toBe(true) // none, useful
    }
    const off = BellSteps.withBurn({ ...BellSteps.defaults(), startNotices: false }, "low")
    expect(BellSteps.stateOf(off, "startNotices")).toEqual({ on: false, why: "switch" })
  })

  test("Low:  timesavers, the steps that use no tokens, and the must-haves that aren't high-cost;  21 of 28 off (T173)", () => {
    const values = BellSteps.withBurn(BellSteps.defaults(), "low")
    const on = BellSteps.STEPS.filter((step) => !step.inBrowser && BellSteps.stateOf(values, step.key).on)
    expect(
      on.every(
        (step) =>
          step.cost === "timesaver" || step.cost === "none" || (step.cost !== "high" && step.importance === "mustHave")
      )
    ).toBe(true)
    const keys = on.map((step) => step.key)
    expect(keys).toContain("stopStuckTests")
    // Send still reaches a chat
    expect(keys).toContain("openChat")
    expect(keys).toContain("wakeQuietChat")
    expect(keys).not.toContain("titleCheck")
    expect(keys).not.toContain("helpersBuild")
    expect(offAt("low")).toHaveLength(21)
  })

  test("your own switch off stays off at every level", () => {
    let values: BellsValues = { ...BellSteps.defaults(), freshHint: false }
    values = BellSteps.withBurn(values, "low")
    expect(BellSteps.stateOf(values, "freshHint").on).toBe(false)
  })

  test("a flip while the slider is down shows Custom, wins over the slider, and a move clears it", () => {
    let values = BellSteps.withBurn(BellSteps.defaults(), "low")
    values = BellSteps.withSwitch(values, "titleCheck", true)
    values = BellSteps.withSwitch(values, "changesInBold", false)
    expect(BellSteps.burnShown(values)).toBe("custom")
    expect(BellSteps.stateOf(values, "titleCheck")).toEqual({ on: true })
    expect(BellSteps.stateOf(values, "changesInBold")).toEqual({ on: false, why: "flipped" })
    // your own switches untouched
    expect(values.titleCheck).toBe(true)
    expect(values.changesInBold).toBe(true)
    values = BellSteps.withBurn(values, "medium")
    expect(values.burnFlips).toEqual({})
    expect(BellSteps.burnShown(values)).toBe("medium")
    values = BellSteps.withBurn(values, "high")
    expect(BellSteps.stateOf(values, "changesInBold").on).toBe(true)
  })

  test("at High a flip is your own switch, kept for good", () => {
    const values = BellSteps.withSwitch(BellSteps.defaults(), "speedTest", false)
    expect(values.speedTest).toBe(false)
    expect(values.burnFlips).toEqual({})
  })

  test("Auto Send's row and a key the table hasn't got:  on, whatever the slider says", () => {
    const values = BellSteps.withBurn(BellSteps.defaults(), "low")
    expect(BellSteps.stateOf(values, "autoSend").on).toBe(true)
    expect(BellSteps.stateOf(values, "noSuchStep").on).toBe(true)
  })
})

/** The steps that use tokens the slider at `level` holds off, in the table's order. */
function offAt(level: BurnLevel): string[] {
  const values = BellSteps.withBurn(BellSteps.defaults(), level)
  return BellSteps.SETTINGS_STEPS.filter(
    (step) => step.cost !== "none" && step.cost !== "timesaver" && !BellSteps.stateOf(values, step.key).on
  ).map((step) => step.key)
}
