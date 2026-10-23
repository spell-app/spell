import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell-lang/core"

/**
 * How tests report what they found:  `core.testResults()`, each check with the spell it was written as,
 * and `core.runTests()`, which `spell test` and the runners' Run Tests share.
 * - A program's tests compile to exported functions, `export function testCardSetup() { return core.test(...) }`:
 *   `program()` makes a module of them.
 */
describe("test results", () => {
  beforeEach(() => {
    core.resetRuntime()
    core.console.clear()
    // the native console stays quiet:  `core.console` keeps the lines
    for (const method of ["log", "info", "error", "group", "groupCollapsed", "groupEnd"] as const) {
      vi.spyOn(console, method).mockImplementation(() => undefined)
    }
  })
  afterEach(() => vi.restoreAllMocks())

  test("each check of a test says what it was written as, and what it printed", () => {
    program().testMath()
    const [result] = core.testResults()
    expect(result).toMatchObject({ name: "test math", method: "testMath", passed: false })
    expect(result!.checks).toEqual([
      { passed: true, what: "2 + 2", expected: "4", message: "As expected `2 + 2` is `4`" },
      { passed: false, what: "2 + 3", expected: "4", message: "Unexpected: `2 + 3` should be `4` but is actually `5`" },
      { passed: true, what: "it runs", expected: undefined, message: "As expected `it runs` is truthy" }
    ])
  })

  test("runTests() runs each exported test once:  the ones the program ran itself as it loaded don't run again", () => {
    const tests = program()
    tests.testMath()
    const results = core.runTests(tests)
    expect(results.map(({ name, passed }) => `${passed ? "✓" : "✗"} ${name}`)).toEqual([
      "✗ test math",
      "✓ test words",
      "✗ test that throws"
    ])
    expect(tests.calls).toEqual(["math", "words", "throws"])
  })

  test("a test that throws fails, says so on the console, and the tests after it still run", () => {
    const results = core.runTests(program(), "throws")
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ name: "test that throws", passed: false })
    expect(results[0]!.threw).toBeInstanceOf(Error)
    const errors = core.console.lines.filter(({ level }) => level === "error")
    expect(errors.map(({ message }) => message[0])).toEqual(['Error in test "test that throws":'])
  })

  test("a filter picks tests by name, ignoring case and spaces ~== `-` ~== `_`", () => {
    expect(core.runTests(program(), "WORDS").map(({ name }) => name)).toEqual(["test words"])
  })

  test("each run starts with no results", () => {
    program().testMath()
    core.resetRuntime()
    expect(core.testResults()).toEqual([])
  })
})

/** A compiled program's module:  three tests, as `to test ...` compiles them, and which ran, in `calls`. */
function program() {
  const calls: string[] = []
  return {
    calls,
    testMath() {
      return core.test("test math", function testMath() {
        calls.push("math")
        core.expect(4, "2 + 2", 4, "4")
        core.expect(5, "2 + 3", 4, "4")
        core.expect(true, "it runs")
      })
    },
    testWords() {
      return core.test("test words", function testWords() {
        calls.push("words")
        core.expect("a", "the first letter", "a", '"a"')
      })
    },
    testThatThrows() {
      return core.test("test that throws", function testThatThrows() {
        calls.push("throws")
        throw new Error("oops")
      })
    },
    // not a test:  its name doesn't say so
    testy: "not a function"
  }
}
