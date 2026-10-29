/**
 * Tests of the epic page migrations:
 * - the registry (`Migrations`)
 * - the summary an update gets when it has none (`UpdateSummary`)
 * - Each step's own cases are its own test's (`LinksAgree.test.ts`).
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { UpdateSummary } from "spell/epic/tool/UpdateSummary"
import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** A page holding one phase, linking nothing of the engine's. */
function upToDateDoc(): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X" updated="2026-10-05">` +
      `<epic-section id="phases" kind="phases"><epic-phase id="p-one" title="One" status="todo">` +
      `<epic-field name="goal">g</epic-field></epic-phase></epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("Migrations", () => {
  test("every step by name, in order;  `named()` finds one", () => {
    expect(Migrations.all.map((step) => step.name)).toEqual([
      "links-agree",
      "more-requests-first",
      "took-as-minutes",
      "whole-phase-numbers",
      "taken-in-phase",
      "to-review-marks",
      "changes-after-goal",
      "item-renames",
      "root-links",
      "done-cards-close",
      "picks-in-choices",
      "updates-said-by-marks",
      "log-commits",
      "owens-answers-seen"
    ])
    expect(Migrations.named("links-agree")?.kind).toBe("epic")
    expect(Migrations.named("nope")).toBeUndefined()
  })

  test("each step names its kind and its day;  every edit runs only the markup ones (`everyEdit`)", () => {
    for (const step of Migrations.all) {
      expect(step.kind).toBe("epic")
      expect(step.date).toMatch(/^\d{4}-\d\d-\d\d$/)
    }
    expect(Migrations.everyEdit.map((step) => step.name)).toEqual([
      "more-requests-first",
      "took-as-minutes",
      "whole-phase-numbers",
      "to-review-marks",
      "changes-after-goal"
    ])
  })

  test("`run()` names the steps that changed something:  none on a page that's up to date;  `only` picks steps", () => {
    const now = new Date(2026, 9, 11, 9, 0)
    const document = upToDateDoc()
    const before = document.documentElement.outerHTML
    expect(Migrations.run(document, { now }, [])).toEqual([])
    expect(Migrations.run(document, { now })).toEqual([])
    expect(document.documentElement.outerHTML).toBe(before)
  })
})

describe("UpdateSummary", () => {
  test("the first sentence, its final period dropped;  white space squeezed", () => {
    expect(UpdateSummary.fromText("  Split P7 in two.  It was too big. ")).toBe("Split P7 in two")
    expect(UpdateSummary.fromText("Why not? Because.")).toBe("Why not?")
    expect(UpdateSummary.fromText("no sentence end")).toBe("no sentence end")
    expect(UpdateSummary.fromText("Keep PlanDoc.ts as is.")).toBe("Keep PlanDoc.ts as is")
    expect(UpdateSummary.fromText("")).toBe("")
  })

  test("a long one keeps its first `MAX_WORDS` words, with an ellipsis (Owen:  5-10 words)", () => {
    const summary = UpdateSummary.fromText(`${"word ".repeat(40)}end.`)
    expect(summary).toBe(`${Array(UpdateSummary.MAX_WORDS).fill("word").join(" ")}…`)
  })

  test("a lead saying who or when is dropped:  the text says it, and the update shows its date", () => {
    expect(
      UpdateSummary.fromText("From Owen's comment CM3 (2026-10-11): this epic has no Doc Review phase any more.")
    ).toBe("this epic has no Doc Review phase any more")
    expect(UpdateSummary.fromText("Owen, 2026-10-11: migrate works for every page kind.")).toBe(
      "migrate works for every page kind"
    )
    expect(UpdateSummary.fromText("Bedtime, 2026-10-11 (Owen): the goal pages stay.")).toBe("the goal pages stay")
    // a colon that isn't a who-or-when lead stays
    expect(UpdateSummary.fromText("Split in two: words first.")).toBe("Split in two: words first")
  })

  test("of nodes:  their text, a space between blocks", () => {
    const { document } = parseHTML("<div><p>First</p><p>block. Second.</p></div>")
    expect(UpdateSummary.of(document.querySelector("div")!.childNodes)).toBe("First block")
  })
})
