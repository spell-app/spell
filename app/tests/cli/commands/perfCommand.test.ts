import { describe, expect, test } from "vite-plus/test"

import { runOptionsOf } from "spell/app/cli/commands/perfCommand"

describe("spell perf run's flags", () => {
  test("the quick default:  every page, desktop and phone, load only, once", () => {
    expect(runOptionsOf({})).toEqual({
      pages: ["editor", "docs", "epic", "run"],
      profiles: ["desktop", "phone"],
      steps: ["load"],
      runs: 1,
      waitMinutes: 10,
      force: false
    })
  })

  test("--full:  every step, 5 loads each;  lists ignore a space after a comma", () => {
    const options = runOptionsOf({ full: true, page: "editor, docs", wait: "0", force: true, baseline: "save" })
    expect(options).toMatchObject({ pages: ["editor", "docs"], runs: 5, waitMinutes: 0, force: true, baseline: "save" })
    expect(options.steps).toContain("pipeline")
    expect(options.steps).toContain("a11y")
  })

  test("a page, profile or step it doesn't know, runs that aren't whole, another baseline word:  an error", () => {
    expect(() => runOptionsOf({ page: "editor,home" })).toThrow("--page takes editor, docs, epic, run, site, cloud, programs;  not home")
    expect(() => runOptionsOf({ steps: "speed" })).toThrow("--steps takes")
    expect(() => runOptionsOf({ runs: "1.5" })).toThrow("--runs must be a whole number")
    expect(() => runOptionsOf({ baseline: "keep" })).toThrow("--baseline takes one word, save")
  })
})
