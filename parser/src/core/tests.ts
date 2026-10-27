import { core } from "./core"
import { defineCoreModule, type TestCheck, type TestResult } from "./core.types"
import "./messages"

/** State for the currently-running dynamic `test()`. */
export type ActiveTest = {
  /** `message` passed to `startTest()` (or `test()`), used as its console-group heading. */
  message: unknown
  /** Whether test's console group should start collapsed. */
  collapse: boolean
  /**
   * Overall pass/fail across all `expect()` calls so far.
   * `undefined` until first `expect()`, then sticky -- one failure flips it to `false` for good.
   */
  result: boolean | undefined
  /** Lines to print inside test's console group once it ends; each is either arg-array or single value. */
  output: unknown[]
  /** Each `expect()` while it ran, in order -- see `TestCheck`. */
  checks: TestCheck[]
  /** Name of the function `test()` ran, e.g. `testCardSetup`:  `undefined` for a `start test`. */
  method?: string
  /** What it threw, if it didn't finish -- see `test()`. */
  threw?: unknown
}

/**
 * Return message as to whether a runtime assertion is true or false.
 * - One line, `[icon, message]`:  a result icon from `core._getTestResultIcon()` (`✅`/`❌`),
 *   then `expect-passed` or `expect-failed` in the program's language (`core.message()`).
 * - With 2 arguments:
 *    - passes if `thing` is truthy
 *    - `thingSource` is spell Expression source for `thing`
 * - With 4 arguments:
 *    - uses `core.equals(thing, otherThing)`
 *    - `thingSource` is spell Expression source for `thing`
 *    - `otherSource` is spell Expression source for `otherThing`
 * - SIDE EFFECT: appends to `core.ACTIVE_TEST.output` if a test is running, and its `checks`,
 *   else logs directly to `core.console`.
 * - Compiles from spell `expect {expression} (to be {value})?` (see `expect_test` rule in
 *   `src/spell/rules/tests/`).
 */
export function expect(thing: unknown, thingSource: string): void
export function expect(thing: unknown, thingSource: string, otherThing: unknown, otherSource: string): void
export function expect(thing: unknown, thingSource: string, otherThing?: unknown, otherSource?: string): void {
  const otherSourceAsWritten = otherSource
  let success: boolean
  if (arguments.length === 2) {
    success = !!thing
    otherSource = core.message("expect-truthy")
  } else {
    success = core.equals(thing, otherThing)
    otherSource = core.backTickQuote(otherSource)
  }

  const what = core.backTickQuote(thingSource)
  const message = success
    ? core.message("expect-passed", { what, expected: otherSource })
    : core.message("expect-failed", { what, expected: otherSource, actual: core.backTickQuote(thing) })
  const output: unknown[] = [core._getTestResultIcon(success), message]

  const test = core.ACTIVE_TEST
  if (test) {
    if (test.result === undefined) test.result = success
    else if (!success) test.result = false
    test.output.push(output)
    const expected = arguments.length === 2 ? undefined : otherSourceAsWritten
    test.checks.push({ passed: success, what: thingSource, expected, message })
  } else {
    core.console.log(...output)
  }
}

/**
 * The `core` methods for writing inline assertions and debug narration directly in spell source:
 * `test()`, `expect()`, `echo()`, `start test`, `end test`.
 * TODO: merge this with Core.console so `print XXX` in a test goes to ACTIVE_TEST
 * TODO: print result of "executing" e.g. Executing `display the deck` returned `xxx`
 */
export const testMethods = defineCoreModule({
  /** Currently-running dynamic test, if any. */
  ACTIVE_TEST: undefined as ActiveTest | undefined,

  /** Map `success` (`undefined` ~== not yet determined) to a display icon. */
  _getTestResultIcon(success: boolean | undefined): string {
    if (success === undefined) return "❓"
    return success ? "✅" : "❌"
  },
  /**
   * Run `testMethod` as test `message`, then print its result and its lines -- what `to test ...` compiles to.
   * - SIDE EFFECT: sets `core.ACTIVE_TEST` via `startTest()`/`endTest()`, so any `expect()`/
   *   `echo()` during `testMethod()` gets grouped under this test instead of logging directly.
   * - SIDE EFFECT: its result goes in `core.testResults()`, under its function's name (`testCardSetup`).
   * - A test that THROWS fails:  `test-threw` and the error on the console, after its lines,
   *   as Python's core says it.  NEVER throws itself.
   */
  test(message: unknown, testMethod: () => void, collapse = true): void {
    core.startTest(message, collapse)
    const test = core.ACTIVE_TEST!
    test.method = testMethod.name || undefined
    let threw = false
    try {
      testMethod()
    } catch (error) {
      threw = true
      test.threw = error
      test.result = false
    }
    core.endTest()
    if (threw) core.console.error(core.message("test-threw", { test: JSON.stringify(String(message)) }), test.threw)
  },

  /**
   * How each test went this run, in the order they ended:  the ones the program ran, and `runTests()`'s.
   * - Kept in `core.RUNTIME`, so each run starts with none (`resetRuntime()`).
   */
  testResults(): TestResult[] {
    return core.getRuntimeState("testResults", () => [] as TestResult[])
  },

  /**
   * Run each `to test ...` function `program` exports which hasn't run yet, and answer how every test went:
   * `core.testResults()`.
   * - `program`:  a compiled project's module, its tests exported as `testCardSetup()` ...
   * - The tests the program runs ITSELF as it loads count, and don't run again:
   *   a second run would start from what the first left behind, e.g. a dealt deck.
   * - `filter`:  only tests whose names contain it, e.g. `deck` -- ignoring case, and spaces ~== `-` ~== `_`.
   * - What runs a project's tests calls it:  `spell test` (`runProject.ts`) and the runners' Run Tests.
   * - NEVER throws:  a test that throws fails (`test()`).
   */
  runTests(program: Record<string, unknown>, filter?: string): TestResult[] {
    const wanted = (name: string) => !filter || comparableTestName(name).includes(comparableTestName(filter))
    const results = core.testResults()
    for (const [name, value] of Object.entries(program)) {
      if (!TEST_FUNCTION.test(name) || typeof value !== "function" || !wanted(name.replace(/^test_?/, ""))) continue
      const ran = results.some(
        (result) => result.method === name || comparableTestName(result.name) === comparableTestName(name)
      )
      if (!ran) (value as () => void)()
    }
    return results.filter((result) => wanted(result.name.replace(/^test[\s_]/, "")))
  },

  /**
   * Begin a named test run, becoming `core.ACTIVE_TEST`.
   * - `collapse` controls whether its console group starts collapsed.
   * - SIDE EFFECT: ends any already-running test first (via `endTest()`).
   * - Compiles from spell `start test {message}` / `start quiet test {message}` (`quiet` maps to
   *   `collapse`; see `start_test` rule in `src/spell/rules/tests/`).
   */
  startTest(message: unknown, collapse = true): void {
    if (core.ACTIVE_TEST) core.endTest()
    core.ACTIVE_TEST = {
      message,
      collapse,
      result: undefined,
      output: [],
      checks: []
    }
  },
  /**
   * Print `message`, grouped under current test if one's running.
   * - Compiles from spell `echo {expression}` (see `src/spell/rules/tests/`).
   */
  echo(message: unknown): void {
    if (core.ACTIVE_TEST) core.ACTIVE_TEST.output.push(message)
    else core.console.info(message)
  },
  /**
   * Print `▶️ Executing` plus back-tick-quoted `message` (`test-step`, in the program's language),
   * grouped under current test if one's running.
   * - Narrates each statement's source as it executes -- auto-injected before every statement inside
   *   a method defined `to test ...` (see `P.ASTEchoInvocation` usage in `methods/MethodDefinition.ts`).
   */
  echoTestAction(message: unknown): void {
    const output = core.message("test-step", { step: core.backTickQuote(message) })
    if (core.ACTIVE_TEST) {
      core.ACTIVE_TEST.output.push(output)
    } else {
      core.console.info(output)
    }
  },
  /**
   * End currently-running test (if any), logging its icon-prefixed `message` as a console group
   * containing all buffered `output`.
   * - SIDE EFFECT:  its result goes in `core.testResults()`.
   * - Compiles from spell `end test` (see `src/spell/rules/tests/`).
   */
  endTest(): void {
    const test = core.ACTIVE_TEST
    if (!test) return
    core.ACTIVE_TEST = undefined
    const { message, method, result, checks, output, threw } = test
    core.testResults().push({ name: String(message), method, passed: result !== false, checks, output, threw })

    const icon = core._getTestResultIcon(test.result)
    core.console[test.collapse ? "groupCollapsed" : "group"](`${icon} ${test.message}`)
    test.output.forEach((line) => {
      if (Array.isArray(line)) core.console.log(...line)
      else core.console.log(line)
    })
    core.console.groupEnd()
  },

  expect
})
Object.assign(core, testMethods)

/** The name of a function a `to test ...` compiles to, as a project exports it:  `testCardSetup`. */
const TEST_FUNCTION = /^test[A-Z_]/

/** A test's name or its function's, for comparing:  `testDeckCreation` ~== `test deck creation`. */
function comparableTestName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim()
}
