/**
 * Child process of `spell speedtest`:  times the parser's rule tests once (`SP.spellParser.speedTest()`),
 * and prints the results as JSON, the last line on stdout.
 * - Started by `speedtestCommand.ts` as `node --import tsx/esm speedTest.mts <spell src URL> [module] [--by-test]`.
 *   One process per run, so each run starts cold.
 * - `<spell src URL>`:  spell's source folder to time (a `file:` URL, ending `/`):  ours, or `--against`'s temp
 *   checkout of spell-parser;  its imports are its own package names, found through that checkout's `package.json`.
 *   - So it must be from after epic `repo-split` P14:  `speedtestCommand.ts` checks.
 *   Never `spell/app/cli`.
 * - `--by-test`:  each test's own time too, `tests`, as `timeEachTest()` says (epic `language` P21).
 * - `.mts`, so it loads as an ES module wherever it's copied -- see `PAPERCUTS.md`.
 * - `failed` is a count, not the list.
 */
// spell logs as it loads, and `speedTest()` logs every run:  silence it all BEFORE loading anything
for (const method of ["log", "info", "debug", "warn", "group", "groupCollapsed", "groupEnd"] as const) {
  console[method] = () => {}
}
// defines `__PACKAGE_VERSION__` before spell reads it
const args = process.argv.slice(2)
const byTest = args.includes("--by-test")
const [spellSrc = "", module = ""] = args.filter((arg) => !arg.startsWith("--"))
await import(new URL("node/packageVersion.node.ts", spellSrc).href)
const { SP } = (await import(new URL("index.ts", spellSrc).href)) as typeof import("spell/parser/spell")
const { P } = (await import(new URL("../parser/index.ts", spellSrc).href)) as typeof import("spell/parser/parser")

/** How many times `timeEachTest()` runs every test, after one run to warm up -- as `speedTest()` does. */
const RUNS = 20

/** One test's time:  its module, rule and input, and its average CPU milliseconds over `RUNS`. */
type TestTime = { module: string; rule: string; input: string; ms: number }

/**
 * Each rule test's own time, averaged over `RUNS` runs after one to warm up:
 * its `beforeEach`, its parse and its JavaScript, as `Parser.testRules()` does them.
 * - CPU time, not the clock's:  so a busy machine (other sessions' tests) slows it far less.
 * - Written against the parser's public shape only (`rules._testable_`, `getScope()`, `JSWriter`),
 *   so it also times a checkout from before it was written, e.g. the commit before epic `data`'s P1.
 * - NEVER throws:  a test that throws is timed up to its throw.
 */
function timeEachTest(): TestTime[] {
  const parser = SP.spellParser
  const testable = parser.rules._testable_
  const rules = testable instanceof P.Group ? testable.rules : testable ? [testable] : []
  const cases: Array<{ module: string; rule: string; input: string; run: () => void }> = []
  for (const rule of rules) {
    if (module && rule.module !== module) continue
    for (const { compileAs = rule.name, tests, beforeEach } of rule.tests ?? []) {
      for (const test of tests) {
        const { input, skip } = P.normalizeRuleTest(test)
        if (skip || input === "" || typeof input !== "string") continue
        const run = () => {
          try {
            const scope = parser.getScope("test")
            if (beforeEach) beforeEach(scope)
            const match = scope.parse(input, compileAs!)
            if (!match) return
            scope.parser?.commit(match)
            parser.normalizeTestOutput(P.JSWriter.instance.writeMatch(match))
          } catch (ignored) {
            // timed up to its throw:  a failing test still costs what it costs
          }
        }
        cases.push({ module: rule.module ?? "", rule: rule.name ?? "", input, run })
      }
    }
  }
  const totals = cases.map(() => 0)
  for (let pass = 0; pass <= RUNS; pass++) {
    cases.forEach((it, index) => {
      const start = process.cpuUsage()
      it.run()
      const { user, system } = process.cpuUsage(start)
      if (pass > 0) totals[index]! += (user + system) / 1000
    })
  }
  return cases.map(({ module, rule, input }, index) => ({ module, rule, input, ms: totals[index]! / RUNS }))
}

const { failed, ...results } = SP.spellParser.speedTest(module)
const tests = byTest ? timeEachTest() : undefined
// NOTE: exits explicitly -- a parse can leave timers running, which would keep the process alive;
// and only once the line is written:  a pipe takes a long one (`--by-test`) in pieces, and an exit cuts it short
process.stdout.write(`${JSON.stringify({ ...results, failed: failed.length, tests })}\n`, () => process.exit(0))
