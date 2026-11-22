import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { PerfBudget } from "spell/app/cli/perf/PerfBudget"
import type { BudgetEntry } from "spell/app/cli/perf/perf.types"

/** A budget entry over `folder`. */
function entry(fields: Partial<BudgetEntry> = {}): BudgetEntry {
  return { id: "b", name: "A bundle", budget: 100, ceiling: 200, entries: ["index.html"], ...fields }
}

describe("PerfBudget", () => {
  const dir = mkdtempSync(join(tmpdir(), "spell-budget-"))
  const build = join(dir, "build")
  mkdirSync(join(build, "assets"), { recursive: true })
  writeFileSync(
    join(build, "index.html"),
    '<script type="module" src="/assets/index.js"></script>\n<link rel="modulepreload" href="/assets/shared.js">\n' +
      '<link rel="stylesheet" href="/assets/index.css"><script src="https://cdn.example/x.js"></script>'
  )
  writeFileSync(join(build, "assets", "index.js"), 'import "./shared.js";const later = () => import("./lazy.js")')
  writeFileSync(join(build, "assets", "shared.js"), "export const shared = 1")
  writeFileSync(join(build, "assets", "lazy.js"), `export const big = ${JSON.stringify("lazy ".repeat(3000))}`)
  writeFileSync(join(build, "assets", "index.css"), "a{color:red}")
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test("loadsOf():  a page's scripts, module preloads and stylesheets, from its folder;  never another site's", () => {
    expect(PerfBudget.loadsOf(join(build, "index.html"))).toEqual([
      "assets/index.js",
      "assets/shared.js",
      "assets/index.css"
    ])
  })

  test("sizeOf():  the first load's brotli bytes, or only its scripts, or its biggest lazy file", () => {
    const all = PerfBudget.sizeOf(entry(), build)
    const scripts = PerfBudget.sizeOf(entry({ only: "\\.js$" }), build)
    const lazy = PerfBudget.sizeOf(entry({ only: "\\.js$", measure: "lazy" }), build)
    expect(scripts).toBeGreaterThan(0)
    expect(all).toBeGreaterThan(scripts)
    expect(lazy).toBeGreaterThan(0)
    expect(lazy).toBeLessThan(15_000)
  })

  test("judged():  over budget is said;  only over the ceiling fails", () => {
    expect(PerfBudget.judged(entry(), 150)).toMatchObject({ isOverBudget: true, isOverCeiling: false })
    expect(PerfBudget.judged(entry(), 201)).toMatchObject({ isOverCeiling: true })
    expect(PerfBudget.judged(entry(), 90)).toMatchObject({ isOverBudget: false, isOverCeiling: false })
    const { lines, isPassing } = PerfBudget.report([PerfBudget.judged(entry(), 150)])
    expect(isPassing).toBe(true)
    expect(lines.at(-1)).toBe("Over budget:  b")
    expect(PerfBudget.report([PerfBudget.judged(entry(), 250)]).isPassing).toBe(false)
  })

  test("tighten():  each ceiling lowered to the size plus 2%, never raised;  the file's comments kept", () => {
    const file = join(dir, "budgets.json5")
    writeFileSync(
      file,
      '// the budgets\n{\n  budgets: [\n    { id: "a", name: "A", budget: 10, ceiling: 500 },\n' +
        '    { id: "b", name: "B", budget: 10, ceiling: 50 }\n  ]\n}\n'
    )
    const budget = new PerfBudget(file, dir)
    const [a, b] = budget.entries
    const lowered = budget.tighten([PerfBudget.judged(a!, 100), PerfBudget.judged(b!, 80)])
    expect(lowered).toEqual(["a"])
    expect(budget.entries.map((it) => it.ceiling)).toEqual([102, 50])
    expect(readFileSync(file, "utf8")).toMatch(/^\/\/ the budgets/)
    expect(PerfBudget.ceilingFor(982.4)).toBe(1003)
    // within its budget, it never passes the budget again
    writeFileSync(file, '{ budgets: [{ id: "c", name: "C", budget: 200, ceiling: 500 }] }\n')
    const within = new PerfBudget(file, dir)
    within.tighten([PerfBudget.judged(within.entries[0]!, 199)])
    expect(within.entries[0]!.ceiling).toBe(200)
  })

  test("the kit's budgets file reads, every entry sized one way", () => {
    const budget = new PerfBudget(join(import.meta.dirname, "..", "..", "..", "perf-budgets.json5"), dir)
    for (const it of budget.entries) {
      expect(it.ceiling, it.id).toBeGreaterThanOrEqual(it.budget > it.ceiling ? 0 : it.budget)
      expect([it.build, it.folder, it.run].filter(Boolean), it.id).toHaveLength(1)
    }
  })
})
