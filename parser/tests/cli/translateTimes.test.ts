import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import type { TranslateOptions } from "spell-parser/cli"
import type { TranslationResult } from "spell-parser/cli/translateProject"
import { editOneLine, timeTranslations, type TimingReport } from "spell-parser/cli/translateTimes"

/**
 * `spell parser translate-time`'s work (epic `spanish` P29), with a fake translation:
 * the scratch copies made and removed, what each run is asked, the table and the JSON -- and the removal when a run
 * throws.  The real translations are `translateProject.test.ts`'s.
 */

const CARD = `// a card, red or black
a "card" is a thing where:
	- its "color" is one of red or black
`

let folder: string
let scratch: string
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "spell-translate-time-test-"))
  scratch = join(folder, "scratch")
  mkdirSync(scratch)
  mkdirSync(join(folder, "Cards"))
  writeFileSync(join(folder, "Cards", "Card.spell"), CARD)
  writeFileSync(join(folder, "Cards", "__project.json5"), "{}")
  // its own lists, from a translation before:  never copied
  writeFileSync(join(folder, "Cards", "Cards.es.names.json5"), "{}")
  writeFileSync(join(folder, "Cards", "Cards.es.translated.json5"), "{}")
  vi.spyOn(CLI, "out").mockImplementation(() => {})
})
afterEach(() => {
  rmSync(folder, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe("timeTranslations():  each run on a scratch copy, then a table", () => {
  test("cold and glossary, 2 runs each:  a fresh copy each run, without the project's own lists, removed after", async () => {
    const translate = fakeTranslate()
    const report = await time({ to: "es", runs: 2 }, translate.run)
    expect(translate.calls.map(({ options }) => options.cold ?? false)).toEqual([true, true, false, false])
    // each its own copy, the project's lists left behind, the person's translation passed along
    expect(new Set(translate.calls.map(({ folder }) => folder)).size).toBe(4)
    for (const call of translate.calls) {
      expect(call.files.sort()).toEqual(["Card.spell", "__project.json5"])
      expect(call.options.out).toMatch(/Cards-es$/)
      expect(call.options.effort).toBe("balanced")
      expect(call.reference).toBe("@x/Cartas")
    }
    expect(readdirSync(scratch)).toEqual([])
    // the project itself, untouched
    expect(readdirSync(join(folder, "Cards")).sort()).toEqual([
      "Card.spell",
      "Cards.es.names.json5",
      "Cards.es.translated.json5",
      "__project.json5"
    ])
    expect(report.exitCode).toBe(CLI.EXIT.OK)
    expect(report.table.map(({ mode, runs }) => `${mode} ${runs}`)).toEqual(["cold 2", "glossary 2"])
  })

  test("the table:  min, median and max of each measure, over a group's runs", async () => {
    const report = await time({ to: "es", runs: 3, mode: "cold" }, fakeTranslate().run)
    const [cold] = report.table
    // the fake's runs took 10, 20 and 30 s
    expect(cold!.measures.total).toEqual({ min: 10_000, median: 20_000, max: 30_000 })
    expect(cold!.measures.tests).toEqual({ min: 40, median: 41, max: 42 })
    expect(cold!.outOf.tests).toBe(42)
    expect(cold!.measures.agreement!.max).toBe(75)
    const lines = printed()
    expect(lines).toContain("Cards · cold · balanced · run 3 of 3:  30.0 s, 4 calls (fake), 1 problems left")
    expect(lines).toContain("Cards · cold · balanced · 3 runs")
    expect(lines.find((line) => line.startsWith("  total"))).toMatch(/^  total\s+10\.0 s\s+20\.0 s\s+30\.0 s$/)
    expect(lines.find((line) => line.startsWith("  tests passed"))).toMatch(/40\/42\s+41\/42\s+42\/42$/)
    expect(lines.find((line) => line.startsWith("  names agree"))).toMatch(/75% of 4$/)
  })

  test("--json:  every run and the table, for comparing over time;  each tier its own group", async () => {
    const json = join(folder, "times.json")
    await time({ to: "es", mode: "glossary", effort: "fast,balanced", json }, fakeTranslate().run)
    const written = JSON.parse(readFileSync(json, "utf8")) as TimingReport
    expect(Object.keys(written).sort()).toEqual(["exitCode", "runs", "table", "to", "when"])
    expect(written.runs.map(({ projectName, mode, tier, run }) => `${projectName} ${mode} ${tier} ${run}`)).toEqual([
      "Cards glossary fast 1",
      "Cards glossary balanced 1"
    ])
    expect(written.runs[0]!.result!.calls).toEqual({ names: 3, fixUps: 1 })
    expect(written.table.map(({ tier }) => tier)).toEqual(["fast", "balanced"])
  })

  test("update:  translated, one English line edited, then --update -- only that run measured", async () => {
    const translate = fakeTranslate()
    const report = await time({ to: "es", mode: "update" }, translate.run)
    expect(translate.calls.map(({ options }) => options.update ?? false)).toEqual([false, true])
    expect(translate.calls[1]!.card).toBe(CARD.replace("red or black", "red or black -- and checked again"))
    expect(report.runs).toHaveLength(1)
  })

  test("a run that throws:  its copy removed all the same, the rest still run, and the exit code says so", async () => {
    let calls = 0
    const translate = fakeTranslate(() => {
      if (++calls === 1) throw new Error("claude is down")
    })
    const report = await time({ to: "es", runs: 2, mode: "cold" }, translate.run)
    expect(readdirSync(scratch)).toEqual([])
    expect(report.runs.map(({ error }) => error)).toEqual(["claude is down", undefined])
    expect(report.table[0]!.failed).toBe(1)
    expect(printed()).toContain("Cards · cold · balanced · run 1 of 2:  failed:  claude is down")
    expect(report.exitCode).toBe(CLI.EXIT.ERRORS)
  })

  test("a mode, tier or count there isn't:  refused before anything runs", async () => {
    const translate = fakeTranslate()
    await expect(time({ to: "es", mode: "lukewarm" }, translate.run)).rejects.toThrow(/No mode 'lukewarm'/)
    await expect(time({ to: "es", effort: "low" }, translate.run)).rejects.toThrow(/No effort 'low'/)
    await expect(time({ to: "es", runs: 0 }, translate.run)).rejects.toThrow(/--runs 0/)
    expect(translate.calls).toEqual([])
  })
})

describe("editOneLine():  the English edit before --update", () => {
  test("its first comment, a few words added;  a comment at the end when it has none", () => {
    editOneLine(join(folder, "Cards"))
    expect(readFileSync(join(folder, "Cards", "Card.spell"), "utf8")).toBe(
      CARD.replace("red or black", "red or black -- and checked again")
    )
    writeFileSync(join(folder, "Cards", "Card.spell"), 'a "card" is a thing\n')
    editOneLine(join(folder, "Cards"))
    expect(readFileSync(join(folder, "Cards", "Card.spell"), "utf8")).toBe(
      'a "card" is a thing\n// and checked again\n'
    )
  })
})

////////////////
// ## Helpers
////////////////

/** `timeTranslations()` of the one project, `Cards`, its scratch folders in the test's. */
function time(options: Parameters<typeof timeTranslations>[1], run: Parameters<typeof timeTranslations>[2]) {
  const project = { projectName: "Cards", folder: join(folder, "Cards"), reference: "@x/Cartas" }
  return timeTranslations([project], options, run, { scratch })
}

/**
 * A fake translation:  keeps what each call was asked, and what its copy held;  answers a result whose total is
 * 10 s more each run, its tests one more passed.
 * - `before`:  runs first, and may throw
 */
function fakeTranslate(before: () => void = () => {}) {
  const calls: Array<{ folder: string; options: TranslateOptions; reference?: string; files: string[]; card: string }> =
    []
  const run = (copy: string, options: TranslateOptions, reference?: string): Promise<TranslationResult> => {
    calls.push({
      folder: copy,
      options,
      reference,
      files: readdirSync(copy),
      card: readFileSync(join(copy, "Card.spell"), "utf8")
    })
    before()
    expect(existsSync(copy)).toBe(true)
    const n = calls.length
    return Promise.resolve({
      exitCode: CLI.EXIT.OK,
      projectName: "Cards",
      to: "es",
      outFolder: options.out!,
      lists: { cold: !!options.cold, glossary: 0, dictionary: 0, fixes: 0, seeded: false },
      via: "fake",
      timings: { names: 1000 * n, lines: 10, fixUps: 2000, total: 10_000 * n },
      calls: { names: 3, fixUps: 1 },
      lines: { total: 4, written: 4, fixed: 1 },
      names: { seeded: 0, fromGlossary: 0, drafted: 4 },
      todo: 0,
      problems: { lint: 0, test: 1, shape: 0 },
      tests: { passed: 39 + n, failed: 3 - n },
      shape: { same: 3, statements: 3 },
      agreement: { same: Math.min(n, 3), compared: 4 }
    })
  }
  return { run, calls }
}

/** Everything printed, a line each. */
function printed(): string[] {
  return vi.mocked(CLI.out).mock.calls.map(([line]) => String(line))
}
