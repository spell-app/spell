import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vite-plus/test"

import { Markup } from "spell/epic/markup"

import { PlanDocError } from "spell/epic/tool/planDoc.types"

import { OptionSets } from "spell/epic/tool/OptionSets"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanItem } from "spell/epic/tool/PlanItem"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"

/** The epic pages these tests read, tracked beside them (`fixtures/`). */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** When the tests' edits happen:  local 2026-10-01 09:05. */
const NOW = new Date(2026, 9, 1, 9, 5)

/** Three options, B recommended. */
const OPTIONS =
  '<epic-option letter="A" title="Keep folds"><p>a</p></epic-option>' +
  '<epic-option letter="B" title="Unfold it" recommended><p>b</p></epic-option>' +
  '<epic-option letter="C" title="Both"><p>c</p></epic-option>'

/**
 * A fresh epic page:  Q1 with a pick-any set, Q2 with a pick-one set, J1 with a pick-one set, phase P1 with a set
 * in its Choices field.
 */
function plan() {
  const doc = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW)
  doc.addItem("question", "which?", { details: `<p>why</p><epic-choices multiple>${OPTIONS}</epic-choices>` })
  doc.addItem("question", "one?", { details: `<p>why</p><epic-choices>${OPTIONS}</epic-choices>` })
  doc.addItem("judgement", "chose X", { details: `<p>why</p><epic-choices>${OPTIONS}</epic-choices>` })
  doc.addPhase("Offline Pages", { symptom: "pages stall", changes: "served locally" })
  doc.setPhaseFields(1, { choices: `<epic-choices>${OPTIONS}</epic-choices>` })
  doc.updateStates()
  return doc
}

/** Item or phase `id`'s first option set. */
function setOf(doc: PlanDoc, id: string): Element {
  const holder = new OptionSets(doc).holderOf(id)!
  return holder.sets[0]!
}

/** A set's options as `letter:title[slot]`. */
function options(set: Element): string[] {
  return PlanItem.optionsIn(set).map(
    ({ letter, title, option }) =>
      `${letter}:${title}${option.hasAttribute("slot") ? `[${option.getAttribute("slot")}]` : ""}`
  )
}

/** What `Markup.validate()` finds in `doc`, one line each. */
function problems(doc: PlanDoc) {
  return Markup.validate(doc.document).map((problem) => `${problem.where} ${problem.message}`)
}

describe("the mark (`ReviewInbox.toMark()`)", () => {
  test("an old pick reads as before;  a pick-any list, the flip, adds, edits and removals are checked", () => {
    expect(ReviewInbox.toMark({ action: "pick", pick: "B", choices: 1 })).toEqual({
      action: "pick",
      pick: "B",
      choices: 1
    })
    expect(
      ReviewInbox.toMark({
        action: "pick",
        pick: " A  C +1 ",
        multiple: true,
        added: [{ key: "+1", title: " Faster builds ", note: " why ", shot: "tests/q1-20261029-1432.png" }],
        edited: [{ letter: "B", title: "Unfold all" }],
        removed: ["C"]
      })
    ).toEqual({
      action: "pick",
      pick: "A C +1",
      multiple: true,
      added: [{ key: "+1", title: "Faster builds", note: "why", shot: "tests/q1-20261029-1432.png" }],
      edited: [{ letter: "B", title: "Unfold all" }],
      removed: ["C"]
    })
    // no pick, only a change
    expect(ReviewInbox.toMark({ action: "pick", multiple: false })).toEqual({ action: "pick", multiple: false })
    // a revisit carries all of it ("pick B, but ...")
    expect(ReviewInbox.toMark({ action: "revisit", note: "but", pick: "B", removed: ["A"] })).toEqual({
      action: "revisit",
      when: "soon",
      note: "but",
      pick: "B",
      removed: ["A"]
    })
  })

  test("refused:  nothing changed, bad letters and keys, a +N nothing added, long titles, bad pictures", () => {
    const bad: unknown[] = [
      { action: "pick" },
      { action: "pick", pick: "a" },
      { action: "pick", pick: "A A" },
      { action: "pick", pick: "+1" },
      { action: "pick", multiple: "yes" },
      { action: "pick", added: [{ key: "1", title: "x" }] },
      { action: "pick", added: [{ key: "+1", title: "" }] },
      { action: "pick", added: [{ key: "+1", title: "x".repeat(301) }] },
      {
        action: "pick",
        added: [
          { key: "+1", title: "x" },
          { key: "+1", title: "y" }
        ]
      },
      { action: "pick", added: [{ key: "+1", title: "x", shot: "../x.png" }] },
      { action: "pick", edited: [{ letter: "AB", title: "x" }] },
      { action: "pick", removed: "A" },
      { action: "pick", removed: Array.from({ length: 27 }, () => "A") }
    ]
    for (const mark of bad) expect(() => ReviewInbox.toMark(mark), JSON.stringify(mark)).toThrow()
  })

  test("pickOf carries the whole change;  a standing set's id takes marks while open", () => {
    expect(ReviewInbox.pickOf({ pick: "A", choices: 0, removed: ["B"], multiple: true })).toEqual({
      pick: "A",
      choices: 0,
      multiple: true,
      removed: ["B"]
    })
    expect(ReviewInbox.pickOf({ choices: 1 })).toEqual({})
    expect(ReviewInbox.toItemId("s-upgrades")).toBe("s-upgrades")
    const html =
      '<epic-section id="choices" kind="choices"><epic-choices id="s-upgrades" title="Up" standing multiple>' +
      '</epic-choices><epic-choices id="s-done" title="Done" standing closed></epic-choices></epic-section>'
    const ids = ReviewInbox.itemIds(html)
    expect([ids.has("s-upgrades"), ids.has("s-done")]).toEqual([true, false])
  })
})

describe("apply (`PlanDoc.applyMark()`)", () => {
  test("a question's pick-any set:  several picked, an option added, one edited, one removed;  answered with them", () => {
    const doc = plan()
    const result = doc.applyMark({
      id: "q1",
      action: "pick",
      pick: "A +1",
      added: [{ key: "+1", title: "Faster builds", note: "one\n\ntwo", shot: "tests/q1-20261001-0905.png" }],
      edited: [{ letter: "B", title: "Unfold all", note: "new text" }],
      removed: ["C"]
    })
    expect(result).toEqual({
      applied: true,
      did: "picked A · Keep folds, D · Faster builds;  added D · Faster builds;  edited B;  removed C"
    })
    const set = setOf(doc, "q1")
    expect(set.getAttribute("chosen")).toBe("A D")
    expect(options(set)).toEqual(["A:Keep folds", "B:Unfold all", "D:Faster builds", "C:Both[removed]"])
    const added = set.querySelector('epic-option[letter="D"]')!
    expect(added.getAttribute("by")).toBe("owen")
    expect(added.innerHTML).toBe(
      '<p>one</p><p>two</p><p><img src="tests/q1-20261001-0905.png" alt="Faster builds"></p>'
    )
    const edited = set.querySelector('epic-option[letter="B"]')!
    expect(edited.getAttribute("edited")).toBe("2026-10-01")
    expect(edited.innerHTML).toBe('<p>new text</p><div data-title="Unfold it" slot="was"><p>b</p></div>')
    expect(set.querySelector('epic-option[letter="C"]')!.getAttribute("removed")).toBe("2026-10-01")
    expect(doc.findItem("q1")!.querySelector("epic-answer")!.getAttribute("title")).toBe(
      "A · Keep folds, D · Faster builds"
    )
    expect(set.getAttribute("chosen-note")).toMatch(
      /^added D · Faster builds;  edited B;  removed C;  recorded as the answer/
    )
    expect(Array.from(doc.document.querySelectorAll("#log > epic-event")).at(-1)!.textContent).toMatch(/^Q1 picked A/)
    expect(problems(doc)).toEqual([])
  })

  test("a pick-one set keeps the newest pick;  the flip;  a change with no pick leaves the question open", () => {
    const doc = plan()
    expect(doc.applyMark({ id: "q2", action: "pick", multiple: true }).did).toBe("now pick any")
    expect(setOf(doc, "q2").hasAttribute("multiple")).toBe(true)
    expect(doc.findItem("q2")!.getAttribute("status")).toBe("open")
    expect(doc.applyMark({ id: "j1", action: "pick", pick: "A C" }).did).toBe(
      "picked C:  Both;  approved:  closed (accepted)"
    )
    expect(setOf(doc, "j1").getAttribute("chosen")).toBe("C")
  })

  test("a phase's set:  chosen, the phase not approved, its line asking for its plan;  choices-open follows", () => {
    const doc = plan()
    const phase = doc.phase(1)
    expect(phase.getAttribute("choices-open")).toBe("1")
    const result = doc.applyMark({ id: phase.id, action: "pick", pick: "B" })
    expect(result).toEqual({ applied: true, did: "P1's choices:  picked B · Unfold it;  adjust its plan" })
    expect(setOf(doc, "P1").getAttribute("chosen")).toBe("B")
    expect(setOf(doc, "P1").getAttribute("chosen-note")).toBe("recorded;  adjust P1's plan to it")
    doc.updateStates()
    expect(phase.hasAttribute("choices-open")).toBe(false)
    expect(phase.getAttribute("plan")).toBeNull()
    expect(problems(doc)).toEqual([])
  })

  test("Accept plan takes an open phase set's recommended option", () => {
    const doc = plan()
    doc.setPhaseFields(1, { plan: "<p>build it</p>" })
    expect(doc.applyMark({ id: doc.phase(1).id, action: "approve" })).toEqual({
      applied: true,
      did: "plan accepted:  build it;  took the recommended B · Unfold it"
    })
    expect(setOf(doc, "P1").getAttribute("chosen")).toBe("B")
  })

  test("a standing set:  picks stamped and folded under Picked, the set open;  a closed set's mark left", () => {
    const doc = plan()
    const sets = new OptionSets(doc)
    const id = sets.addStandingSet("Upgrades on offer", { multiple: true, note: "What to add next" })
    expect(id).toBe("s-upgrades-on-offer")
    sets.add(id, "Dark mode")
    sets.add(id, "Faster builds", { note: "<p>cache it</p>" })
    expect(doc.applyMark({ id, action: "pick", pick: "B +1", added: [{ key: "+1", title: "Search" }] })).toEqual({
      applied: true,
      did: "picked B · Faster builds, C · Search;  added C · Search:  act on this round"
    })
    const set = sets.standingSet(id)!
    expect(options(set)).toEqual(["A:Dark mode", "B:Faster builds[picked]", "C:Search[picked]"])
    expect(set.querySelector('[letter="B"]')!.getAttribute("picked-on")).toBe("2026-10-01")
    expect(set.hasAttribute("chosen")).toBe(false)
    doc.updateStates()
    expect(problems(doc)).toEqual([])
    expect(ReviewInbox.itemIds(doc.toString()).has(id)).toBe(true)
    expect(doc.summary().choices).toEqual({ sets: 1, open: 1, options: 1, phases: [{ phase: "P1", open: 1 }] })
    sets.close(id)
    expect(doc.applyMark({ id, action: "pick", pick: "A" })).toMatchObject({ applied: false, left: /closed/ })
    expect(ReviewInbox.itemIds(doc.toString()).has(id)).toBe(false)
  })

  test("a closed item set's mark is left, not applied", () => {
    const doc = plan()
    new OptionSets(doc).close("q2")
    expect(doc.applyMark({ id: "q2", action: "pick", pick: "A" })).toMatchObject({ applied: false, left: /closed/ })
    expect(doc.findItem("q2")!.getAttribute("status")).toBe("open")
  })
})

describe("the commands (`OptionSets`)", () => {
  test("choose:  several letters in a pick-any set;  refused in a pick-one set;  a phase's set", () => {
    const doc = plan()
    const sets = new OptionSets(doc)
    expect(sets.choose("Q1", ["A", "C"], { outcome: "settled" })).toBe("picked A · Keep folds, C · Both")
    expect(setOf(doc, "q1").getAttribute("chosen")).toBe("A C")
    expect(() => sets.choose("Q2", ["A", "B"])).toThrow(PlanDocError)
    expect(sets.choose("Q2", ["A"])).toBe("picked A:  Keep folds")
    expect(sets.choose("P1", ["C"], { outcome: "built" })).toBe("P1's choices:  picked C · Both")
    expect(setOf(doc, "P1").getAttribute("chosen-note")).toBe("recorded;  built")
  })

  test("option add, edit, remove, close;  a closed set refuses them;  lint stays clean", () => {
    const doc = plan()
    const sets = new OptionSets(doc)
    expect(sets.add("Q2", "Neither", { note: "skip it", image: "tests/q2-20261001-0905.png" })).toBe("D")
    expect(sets.edit("Q2", "a", { title: "Keep the folds" })).toBe("option A edited:  Keep the folds")
    // a title alone:  the text stays, the `was` keeps the old title
    expect(setOf(doc, "q2").querySelector('[letter="A"]')!.innerHTML).toBe(
      '<p>a</p><div data-title="Keep folds" slot="was"></div>'
    )
    expect(sets.remove("Q2", "B")).toBe("option B removed:  Unfold it")
    expect(() => sets.remove("Q2", "B")).toThrow(/no option B on offer/)
    expect(sets.close("Q2")).toBe("Q2 option set closed")
    expect(() => sets.add("Q2", "More")).toThrow(/closed/)
    expect(options(setOf(doc, "q2"))).toEqual(["A:Keep the folds", "B:Unfold it[removed]", "C:Both", "D:Neither"])
    expect(problems(doc)).toEqual([])
  })
})

describe("lint (`Markup.validate()`)", () => {
  test("a standing set's id and title;  a slot's date;  several chosen only in a pick-any set", () => {
    const doc = plan()
    const id = new OptionSets(doc).addStandingSet("Ideas")
    const set = new OptionSets(doc).standingSet(id)!
    set.setAttribute("id", "ideas")
    set.innerHTML = '<epic-option letter="A" title="x" slot="removed"></epic-option>'
    setOf(doc, "q2").setAttribute("chosen", "A B")
    expect(problems(doc)).toEqual([
      expect.stringContaining("a standing set's id is `s-<slug>`"),
      expect.stringContaining('`slot="removed"` needs `removed`'),
      expect.stringContaining("only a `multiple` set does")
    ])
  })
})

describe("`epic add #J / #Q --options` (request r44)", () => {
  test("an option set after its details, lettered in order, `*` the recommended;  refused on other kinds or one option", async () => {
    const { TestCommands } = await import("spell/epic/tool/TestCommands")
    const tests = new TestCommands({} as never)
    const doc = plan()
    const { id } = tests.addItem(doc, "judgement", "Ship it?", { details: "<p>why</p>", options: "*Do it | Don't" })
    const set = setOf(doc, id)
    expect(options(set)).toEqual(["A:Do it", "B:Don't"])
    expect(set.querySelector("epic-option[letter=A]")!.hasAttribute("recommended")).toBe(true)
    const { id: question } = tests.addItem(doc, "question", "Which?", { options: "A:Red | C:Blue | Green" })
    expect(options(setOf(doc, question))).toEqual(["A:Red", "C:Blue", "B:Green"])
    expect(() => tests.addItem(doc, "issue", "Broken", { options: "A | B" })).toThrow(PlanDocError)
    expect(() => tests.addItem(doc, "judgement", "One?", { options: "Only" })).toThrow(PlanDocError)
  })
})
