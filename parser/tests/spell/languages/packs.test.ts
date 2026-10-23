import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-parser/spell"
import { packSources } from "spell-parser/cli/packsCommand"
import {
  checkPack,
  checkPackModule,
  checkWords,
  fixPackModule,
  TODO_MARKER,
  type PackModuleSource,
  type PackReport
} from "spell-parser/spell/languages/packs"

/**
 * The language packs' check and fix (epic `spanish` P7):  `spell parser packs check|fix`.
 * - The real packs, read from disk:  Spanish is complete.
 * - The rest on strings:  a small made-up module, English and Spanish.
 */

////////////////
// ## A made-up module
////////////////

const ENGLISH = `import { Negatable } from "spell-parser/spell/rules/expressions"

import { _async } from "./async.parser"
import { Await } from "./Await"
import { Pause, PAUSE_UNITS } from "./Pause"

_async.addRule(Await, {
  syntax: "wait for {expression}",
  tests: [{ compileAs: "statement", tests: [["wait for 1", "await 1"]] }]
})

// a pause, in seconds
_async.addRule(Pause, {
  syntax: "pause for {number:expression} {units:pause_units}",
  tests: [{ compileAs: "statement", tests: [["pause for 2 seconds", 'await core.pauseFor(2, "seconds")']] }],
  units: PAUSE_UNITS
})

_async.addRule(Negatable.specialize({ ruleName: "exclusive_or_not" }), {
  syntax: "(exclusive|(negated:non-exclusive))"
})
`

const SPANISH = `import { SpellParser } from "spell-parser/spell/SpellParser"
import { Negatable } from "spell-parser/spell/rules/expressions"

import { Await } from "./Await"

/** Spanish's \`async\` rules. */
export const asyncEs = new SpellParser({ module: "async" })

asyncEs.addRule(Await, {
  syntax: "esperar {expression}",
  tests: [{ compileAs: "statement", tests: [["esperar 1", "await 1"]] }]
})

asyncEs.addRule(Negatable.specialize({ ruleName: "exclusive_or_not" }), {
  syntax: "(exclusivo|(negated:no exclusivo))"
})
`

const SOURCE: PackModuleSource = { module: "async", english: ENGLISH, other: SPANISH, ruleFiles: {} }

////////////////
// ## Tests
////////////////

describe("checkPack()", () => {
  test("Spanish's pack is COMPLETE:  every English registration, word table and rule class", () => {
    const report = checkPack(packSources("es"), SP.english, SP.spanish)
    expect(problemsIn(report)).toEqual([])
  })
})

describe("checkWords()", () => {
  test("a parser message the pack lacks is reported, by its key (epic `spanish` P17)", () => {
    const { "dont-understand": _left, ...messages } = SP.spanish.parserMessages
    const lacking = { ...SP.spanish, parserMessages: messages } as SP.Language
    expect(checkWords(SP.english, lacking)).toEqual([
      { table: "parserMessages", key: "dont-understand", problem: "missing" }
    ])
  })
})

describe("checkPackModule()", () => {
  test("a missing Spanish registration is reported, by its key and English line", () => {
    const report = checkPackModule(SOURCE, "es")
    expect(report.missing.map((it) => [it.key, it.line])).toEqual([["Pause", 13]])
    expect(report).toMatchObject({ file: "async/async.es.ts", untested: [], noSyntax: [], outOfOrder: [], extra: [] })
  })

  test("one with no tests where English has some is reported;  `packs: ok` above it says that's on purpose", () => {
    const untested = SPANISH.replace(/,\n {2}tests: \[\{ compileAs[^\n]*esperar 1[^\n]*\n/, "\n")
    expect(checkPackModule({ ...SOURCE, other: untested }, "es").untested.map((it) => it.key)).toEqual(["Await"])
    const marked = untested.replace("asyncEs.addRule(Await", "// packs: ok -- no tests yet\nasyncEs.addRule(Await")
    expect(checkPackModule({ ...SOURCE, other: marked }, "es").untested).toEqual([])
  })

  test("`packs: none <key>` says a registration is left out on purpose", () => {
    const other = `${SPANISH}\n// packs: none Pause -- no pauses in this language\n`
    expect(checkPackModule({ ...SOURCE, other }, "es").missing).toEqual([])
  })
})

describe("fixPackModule()", () => {
  test("writes English's registration as a stub, after the one before it, with the imports it needs", () => {
    const fix = fixPackModule(SOURCE, "es")
    expect(fix.stubs.map((it) => it.registration.key)).toEqual(["Pause"])
    expect(fix.text).toBe(
      SPANISH.replace(
        'import { Await } from "./Await"',
        'import { Await } from "./Await"\nimport { Pause, PAUSE_UNITS } from "./Pause"'
      ).replace(
        `"await 1"]] }]
})
`,
        `"await 1"]] }]
})

${TODO_MARKER}
// a pause, in seconds
asyncEs.addRule(Pause, {
  syntax: "pause for {number:expression} {units:pause_units}",
  tests: [{ compileAs: "statement", tests: [["pause for 2 seconds", 'await core.pauseFor(2, "seconds")']] }],
  units: PAUSE_UNITS
})
`
      )
    )
    expect(checkPackModule({ ...SOURCE, other: fix.text }, "es").missing).toEqual([])
  })

  test("stubs with no registration before them go before the file's first, in English's order", () => {
    const other = SPANISH.replace(/asyncEs\.addRule\(Await, \{[\s\S]*?\n\}\)\n\n/, "")
    const fix = fixPackModule({ ...SOURCE, other }, "es")
    const order = ["addRule(Await", "addRule(Pause", "addRule(Negatable"].map((it) => fix.text.indexOf(it))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(fix.stubs.map((it) => it.after)).toEqual([undefined, undefined])
  })

  test("a translator's answer replaces the stub, marked for review", () => {
    const fix = fixPackModule(SOURCE, "es", () => 'asyncEs.addRule(Pause, { syntax: "pausar {number:expression}" })')
    expect(fix.text).toContain(
      '// AI draft:  review -- translated by `spell parser packs fix --ai`\nasyncEs.addRule(Pause, { syntax: "pausar'
    )
    expect(fix.stubs[0]!.isTranslated).toBe(true)
  })

  test("a module with no file yet gets one:  its parser, then every stub", () => {
    const fix = fixPackModule({ ...SOURCE, other: undefined }, "es")
    expect(fix.isNewFile).toBe(true)
    expect(fix.text).toContain('export const asyncEs = new SpellParser({ module: "async" })')
    expect(checkPackModule({ ...SOURCE, other: fix.text }, "es").missing).toEqual([])
  })
})

////////////////
// ## Helpers
////////////////

/** Every problem `report` has, one readable line each:  the failure diff lists them. */
function problemsIn(report: PackReport): string[] {
  return [
    ...report.modules.flatMap((module) => [
      ...(module.hasFile ? [] : [`${module.file}:  no file`]),
      ...module.missing.map((it) => `${module.file}:  missing ${it.key}`),
      ...module.untested.map((it) => `${module.file}:${it.line}  no tests ${it.key}`),
      ...module.noSyntax.map((it) => `${module.file}:${it.line}  no syntax ${it.key}`),
      ...module.outOfOrder.map((it) => `${module.file}:${it.line}  out of order ${it.key}`)
    ]),
    ...report.unregistered.map((it) => `${it.module}/${it.file}:  ${it.ruleClass} unregistered`),
    ...report.words.map((it) => `words:  ${it.problem} ${it.table} ${it.key}`)
  ]
}
