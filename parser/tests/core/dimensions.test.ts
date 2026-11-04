import { readFileSync } from "fs"
import { resolve } from "path"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { core } from "spell/parser/core"
import { MeasureSystem } from "spell/util/measures/MeasureSystem"

/**
 * A measure shown in the READER's units (epic `language` P24, Q27):  `core.measureShown()`.
 * - Python's core reads the same cases, `measuresShown.expected.json5` (`tests/py/core/tests/test_dimensions.py`).
 */
const EXPECTED = JSON.parse(readFileSync(resolve(import.meta.dirname, "measuresShown.expected.json5"), "utf8")) as {
  cases: Array<{ value: number | null; dimension: string; unit: string; system: "us" | "metric"; shown: string }>
}

afterEach(() => core.useMeasureSystem(undefined))

describe("a measure in the reader's units, as Python's core shows it too", () => {
  test.each(EXPECTED.cases)(
    "$value $unit, to a $system reader:  $shown",
    ({ value, dimension, unit, system, shown }) => {
      core.useMeasureSystem(system)
      expect(core.measureShown(value, dimension, unit)).toBe(shown)
    }
  )
})

describe("the reader's system", () => {
  test.each([
    ["en-US", "us"],
    ["es-US", "us"],
    ["en-LR", "us"],
    ["my-MM", "us"],
    ["en-GB", "metric"],
    ["es-MX", "metric"],
    ["fr", "metric"],
    ["en", "us"]
  ])("a reader of %s:  %s", (language, system) => {
    expect(MeasureSystem.ofRegion(language)).toBe(system)
  })

  test("a host's choice wins", () => {
    core.useMeasureSystem("metric")
    expect(MeasureSystem.current).toBe("metric")
    core.useMeasureSystem("us")
    expect(MeasureSystem.current).toBe("us")
  })
})
