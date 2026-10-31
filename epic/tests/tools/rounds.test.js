/**
 * Tests of a details page's or choice page's ROUNDS (`tools/rounds.js`, epic `epic-engine` P37):  `epic ask round`,
 * `epic choices round`, `create`'s refusal of a near-copy, and `epic ask fold`, in a scratch epic folder.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseHTML } from "linkedom"
import { afterAll, beforeAll, expect, test } from "vite-plus/test"

import { DataFile } from "spell/epic/data/DataFile.ts"
import { SeeAlso } from "spell/epic/tool/SeeAlso"
import { createPage as createChoices, newRound as choicesRound, rowsFile } from "spell/epic/tools/choices.js"
import {
  answerFile,
  createPage,
  draftFile,
  foldCopies,
  newRound,
  noAnswerYet,
  readAnswer
} from "spell/epic/tools/details.js"
import { formatRound, nearCopyOf, roundsOf } from "spell/epic/tools/rounds.js"

let docs

/** A details page's spec:  one question titled `title`. */
function spec(title, lede = `Asked about ${title}`) {
  return { title: "Event names", lede, questions: [{ title, options: [{ title: "Yes" }, { title: "No" }] }] }
}

/** Choice rows:  one section, one row per `[id, recommended]`. */
function rows(...pairs) {
  return {
    title: "Event names",
    lede: "Which names?",
    sections: [{ id: "q1", title: "Q1 · Events" }],
    rows: pairs.map(([id, recommended]) => ({
      id,
      section: "q1",
      file: "a.ts",
      line: 1,
      purpose: id,
      current: `ui-${id}`,
      recommended
    }))
  }
}

/** `page`, parsed. */
function parsed(page) {
  return parseHTML(readFileSync(page, "utf8")).document
}

/** The folded rounds of `page`:  each one's label, newest first. */
function roundLabels(page) {
  return [...parsed(page).querySelectorAll("ui-section[data-round]")].map((each) => each.getAttribute("label"))
}

beforeAll(() => {
  docs = mkdtempSync(join(tmpdir(), "rounds-"))
  for (const epic of ["big", "es"]) {
    mkdirSync(join(docs, "epics", epic, "parts"), { recursive: true })
    writeFileSync(join(docs, "epics", epic, `${epic}.plan.html`), `<title>${epic}</title><epic-page></epic-page>`)
  }
})

afterAll(() => rmSync(docs, { recursive: true, force: true }))

test("ask round:  ONE page, the new round on top, the round before folded below with what was sent", () => {
  const page = createPage(docs, "event-names", { epic: "big", spec: spec("Rename ui-open?") })
  DataFile.write(answerFile(page), {
    page: "/epics/big/details/event-names.html",
    answered: "2026-10-24T20:00:00.000Z",
    changes: 0,
    answers: { q1: { picked: ["A"] } },
    notes: "showing, not folding"
  })
  // saved with the send:  it goes, or it would come back over round 2
  DataFile.write(draftFile(page), { saved: "2026-10-24T19:59:59.000Z", answers: {}, notes: "" })

  expect(newRound(docs, "big/event-names", { spec: spec("Rename ui-close?", "Round two") })).toBe(page)
  const document = parsed(page)
  expect(document.querySelector("ui-section#q1").getAttribute("label")).toBe("Rename ui-close?")
  expect(document.querySelector("p.lede").textContent).toBe("Round two")
  expect(document.querySelector("[data-details-asked]").textContent).toMatch(/^\d{4}-\d\d-\d\d · round 2$/)
  const [label] = roundLabels(page)
  expect(label).toMatch(/^Round 1 · \d+\/\d+ · what you sent$/)
  const folded = document.querySelector("ui-section[data-round]")
  expect(folded.getAttribute("open")).toBe("false")
  expect(folded.textContent).toContain("Asked about Rename ui-open?")
  expect(folded.textContent).toContain("Rename ui-open?:  A · Yes")
  expect(folded.textContent).toContain("Notes:  showing, not folding")
  // no live question in it:  the page's form never sends the old round again
  expect(folded.querySelector("epic-ask, epic-text-box")).toBeNull()
  // before the notes box:  the form stays the page's bottom
  expect(folded.nextElementSibling.localName).toBe("epic-text-box")

  expect(readAnswer(page)).toBeUndefined()
  expect(existsSync(draftFile(page))).toBe(false)
  const [round1] = roundsOf(page)
  expect(round1).toMatchObject({ round: 1, answer: { notes: "showing, not folding" } })
  expect(formatRound(page, 1)).toContain("Rename ui-open?:  A · Yes")
  expect(noAnswerYet(page)).toContain("no answer yet to round 2")
})

test("ask round again, with nothing sent:  round 2 folds on top of round 1, what was typed with it;  the draft stays", () => {
  const page = join(docs, "epics/big/details/event-names.html")
  DataFile.write(draftFile(page), { saved: "2026-10-25T08:00:00.000Z", answers: { q1: { picked: ["B"] } }, notes: "" })
  // no --from:  the page as it is, for Claude to edit
  newRound(docs, "big/event-names")
  expect(roundLabels(page).map((label) => label.replace(/ · \d+\/\d+/, ""))).toEqual([
    "Round 2 · typed, not sent",
    "Round 1 · what you sent"
  ])
  expect(parsed(page).querySelector("[data-details-asked]").textContent).toMatch(/ · round 3$/)
  expect(parsed(page).querySelector("ui-section#round-2").textContent).toContain("Rename ui-close?:  B · No")
  expect(existsSync(draftFile(page))).toBe(true)
  expect(roundsOf(page).map((each) => each.round)).toEqual([1, 2])
  expect(formatRound(page, 2)).toMatch(/nothing sent/)
})

test("create refuses a near-copy, naming the round command;  a dated slug is no copy", () => {
  expect(() => createPage(docs, "event-names-2", { epic: "big" })).toThrow(
    "event-names-2 is a second round of event-names:  epic ask round big/event-names"
  )
  expect(() => createPage(docs, "event-names-round2", { epic: "big" })).toThrow(/second round/)
  const choices = createChoices(docs, "names", { epic: "big", data: rows(["open", "opening"]) })
  expect(() => createChoices(docs, "names-3", { epic: "big", data: rows(["open", "x"]) })).toThrow(
    "names-3 is a second round of names:  epic choices round big/names --rows <rows.json5>"
  )
  expect(nearCopyOf(join(docs, "epics/big/details"), "names-2026")).toBeUndefined()
  expect(existsSync(choices)).toBe(true)
})

test("choices round:  the new rows in the page and beside it, the round before folded with its changed rows", () => {
  const page = join(docs, "epics/big/details/names.html")
  DataFile.write(answerFile(page), {
    page: "/epics/big/details/names.html",
    answered: "2026-10-24T20:00:00.000Z",
    changes: 0,
    values: { open: "opening / opened" },
    feedback: "showing, not `folding`"
  })
  DataFile.write(draftFile(page), {
    saved: "2026-10-24T20:00:00.000Z",
    values: { open: "opening / opened" },
    feedback: ""
  })
  choicesRound(docs, "big/names", { data: rows(["open", "opening / opened"], ["close", "closing / closed"]) })
  const document = parsed(page)
  expect([...document.querySelectorAll("epic-choice-row")].map((row) => row.getAttribute("name"))).toEqual([
    "open",
    "close"
  ])
  expect(DataFile.read(rowsFile(page)).rows).toHaveLength(2)
  const folded = document.querySelector("ui-section[data-round]")
  expect(folded.getAttribute("label")).toMatch(/^Round 1 · \d+\/\d+ · what you sent$/)
  expect(folded.textContent).toContain("a.ts:1  ui-open -> opening  =>  opening / opened")
  expect(folded.querySelector("code").textContent).toBe("folding")
  expect(folded.textContent).not.toContain("Rows:")
  expect(folded.nextElementSibling.localName).toBe("epic-choices-bar")
  expect(existsSync(draftFile(page))).toBe(false)
  expect(readAnswer(page)).toBeUndefined()
})

test("fold:  near-copies made before `round` become rounds of their first page;  dry run first;  one See Also link", async () => {
  const folder = join(docs, "epics/es/details")
  mkdirSync(folder, { recursive: true })
  // made as `create` did before P37 refused them
  const base = createChoices(docs, "event-names", { epic: "es", data: rows(["open", "opening"]) })
  DataFile.write(answerFile(base), {
    answered: "2026-10-24T20:00:00.000Z",
    changes: 0,
    values: { open: "a" },
    feedback: ""
  })
  for (const [n, recommended] of [
    [2, "opening / opened"],
    [3, "showing / shown"]
  ]) {
    const copy = join(folder, `event-names-${n}.html`)
    writeFileSync(copy, readFileSync(base, "utf8").replace("<title>Event names", `<title>Event names, round ${n}`))
    DataFile.write(rowsFile(copy), { sections: rows().sections, rows: rows(["open", recommended]).rows })
  }
  DataFile.write(answerFile(join(folder, "event-names-2.html")), {
    page: "/epics/es/details/event-names-2.html",
    answered: "2026-10-24T21:00:00.000Z",
    changes: 0,
    values: { open: "b" },
    feedback: "round two's"
  })
  DataFile.write(draftFile(join(folder, "event-names-3.html")), {
    page: "/epics/es/details/event-names-3.html",
    saved: "2026-10-24T22:00:00.000Z",
    values: { open: "c" },
    feedback: ""
  })
  const part = join(docs, "epics/es/parts/q1.html")
  writeFileSync(part, '<a href="../details/event-names-3.html" target="src-epics-es-details-event-names-3-html">r3</a>')

  const planned = await foldCopies(docs, { dryRun: true })
  expect(planned[0]).toBe(
    "would fold epics/es/details/event-names.html <- event-names-2.html, event-names-3.html:" +
      "  round 3 (event-names-3) on top, rounds 2-1 folded below"
  )
  expect(planned).toContain("  would relink epics/es/parts/q1.html")
  expect(planned).toContain("  would remove epics/es/details/event-names-2.answer.json5")
  expect(existsSync(join(folder, "event-names-2.html"))).toBe(true)

  await foldCopies(docs)
  expect(existsSync(join(folder, "event-names-2.html"))).toBe(false)
  expect(existsSync(join(folder, "event-names-3.rows.json5"))).toBe(false)
  expect(roundLabels(base).map((label) => label.replace(/ · \d+\/\d+/, ""))).toEqual([
    "Round 2 · what you sent",
    "Round 1 · what you sent"
  ])
  const document = parsed(base)
  expect(document.querySelector("title").textContent).toBe("Event names, round 3")
  expect(document.querySelector("[data-choices-rows] code").textContent).toBe("event-names.rows.json5")
  expect(document.querySelector("ui-section#round-2").textContent).toContain("Feedback:")
  expect(DataFile.read(rowsFile(base)).rows[0].recommended).toBe("showing / shown")
  expect(roundsOf(base).map((each) => each.round)).toEqual([1, 2])
  expect(readAnswer(base)).toBeUndefined()
  // round 3's unsent draft is the page's now
  expect(DataFile.read(draftFile(base))).toMatchObject({
    page: "/epics/es/details/event-names.html",
    values: { open: "c" }
  })
  expect(readFileSync(part, "utf8")).toBe(
    '<a href="../details/event-names.html" target="src-epics-es-details-event-names-html">r3</a>'
  )
  expect(new SeeAlso(docs).linksOf("es").map((link) => link.href)).toEqual(["/epics/es/details/event-names.html"])
  expect(await foldCopies(docs)).toEqual([])
})
