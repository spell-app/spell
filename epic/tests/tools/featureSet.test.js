/**
 * Tests of the Feature Set template (`tools/FeatureSet.js`), through `epic ask`'s functions, in a scratch checkout.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseHTML } from "linkedom"
import { afterAll, beforeAll, expect, test } from "vite-plus/test"

import { DataFile } from "spell/epic/data/DataFile.ts"
import { FeatureSet } from "spell/epic/tools/FeatureSet.js"
import { createPage, formatAnswer, newRound } from "spell/epic/tools/details.js"

let docs

beforeAll(() => {
  docs = mkdtempSync(join(tmpdir(), "feature-set-"))
  mkdirSync(join(docs, "epics/big"), { recursive: true })
})

afterAll(() => rmSync(docs, { recursive: true, force: true }))

/** A list of `sections`, each a title and its items' titles. */
function spec(...sections) {
  return { title: "List", sections: sections.map(([title, ...items]) => ({ title, items: items.map(itemOf) })) }
}

/** An item:  a title, or the whole item. */
function itemOf(item) {
  return typeof item === "string" ? { title: item } : item
}

/** A new page from `data`. */
function make(slug, data) {
  return createPage(docs, slug, { template: "feature-set", epic: "big", spec: data })
}

/** The ids of `file`'s items, in order. */
function namesIn(file) {
  const { document } = parseHTML(readFileSync(file, "utf8"))
  return [...document.querySelectorAll("tr[data-feature-item]")].map(
    (row) => `${row.id} ${row.querySelector("b").textContent}`
  )
}

test("the starter data makes a page:  three columns, one question chipless with its Priority in it", () => {
  const file = make("starter", DataFile.parse(readFileSync(FeatureSet.starter, "utf8")))
  const html = readFileSync(file, "utf8")
  const { document } = parseHTML(html)
  expect(html).not.toContain("TEMPLATE:")
  // no crumb to the home page (epic `epic-engine` T148)
  expect(html).not.toContain("<ui-breadcrumb link=")
  expect([...document.querySelectorAll("th")].map((head) => head.textContent)).toEqual(["Item", "Your pick", "Facts"])
  const ask = document.querySelector("#s1f1 epic-ask")
  expect(ask.hasAttribute("no-chip")).toBe(true)
  const priority = ask.querySelector('epic-ask[slot="then"]')
  expect([priority.getAttribute("name"), priority.getAttribute("off-for")]).toEqual(["s1f1-priority", "N"])
  expect(document.querySelector("p.lede").textContent.replace(/\s+/g, " ").trim()).toBe(
    "For each idea, choose Yes, No, Modify (say what to change in the comment box) or Revisit (Claude will ask you again later)." +
      "Then pick a Priority, from 1 (first) to 3 (last).If you chose No, you can skip Priority."
  )
  expect(document.querySelector("#s1").getAttribute("label")).toBe("S1 · Now")
  expect(document.querySelector("a.spell-feature-name").getAttribute("href")).toBe("#s1f1")
})

test("links:  another site's a new tab, the page's and the repo's this window", () => {
  const text = '<a href="https://example.com/">out</a> <a href="../x.plan.html" target="x">in</a>'
  const file = make("links", spec(["Now", { title: "One", text }]))
  const { document } = parseHTML(readFileSync(file, "utf8"))
  expect(document.querySelector('a[href^="https"]').getAttribute("target")).toBe("_blank")
  expect(document.querySelector('a[href="../x.plan.html"]').hasAttribute("target")).toBe(false)
})

test("links:  a source file's keeps its tab, which the side bar opens in the editor;  a page's doesn't", () => {
  const text =
    '<a href="/src/util/string.ts" target="src-src-util-string-ts">file</a> ' +
    '<a href="../y.html#part" target="src-y-html">page</a>'
  const file = make("sources", spec(["Now", { title: "One", text }]))
  const { document } = parseHTML(readFileSync(file, "utf8"))
  expect(document.querySelector('a[href^="/src"]').getAttribute("target")).toBe("src-src-util-string-ts")
  expect(document.querySelector('a[href^="../y"]').hasAttribute("target")).toBe(false)
})

test("data it can't draw is refused, saying why", () => {
  expect(() => createPage(docs, "none", { template: "feature-set" })).toThrow("made from data")
  expect(() => createPage(docs, "other", { template: "kanban" })).toThrow("no template 'kanban'")
  expect(() => createPage(docs, "plain", { spec: spec(["Now", "One"]) })).toThrow("with --template feature-set")
  expect(() => make("empty", spec(["Now"]))).toThrow("needs items")
  expect(() => make("pick", spec(["Now", { title: "One", recommended: "X" }]))).toThrow("isn't one of Y, N, M, R")
})

test("a round keeps each name with its item, and NEVER uses one again", () => {
  const file = make("rounds", spec(["Now", "One", "Two", "Three"], ["Later", "Four"]))
  expect(namesIn(file)).toEqual(["s1f1 One", "s1f2 Two", "s1f3 Three", "s2f1 Four"])
  // moved, dropped, added:  by title
  newRound(docs, file, { spec: spec(["Later", "Four"], ["Now", "Two", "One", "Five"]) })
  expect(namesIn(file)).toEqual(["s2f1 Four", "s1f2 Two", "s1f1 One", "s1f4 Five"])
  // the last number's item dropped:  its number is still used up;  a new title keeps its name by `id`
  newRound(docs, file, { spec: spec(["Now", { id: "F2", title: "Two, renamed" }]) })
  newRound(docs, file, { spec: spec(["Now", "Two, renamed", "Six"], ["Someday", "Seven"]) })
  expect(namesIn(file)).toEqual(["s1f2 Two, renamed", "s1f5 Six", "s3f1 Seven"])
  expect(() => newRound(docs, file, { spec: spec(["Now", { id: "F3", title: "Three" }]) })).toThrow("never used again")
})

test("an id never hands a name to another item:  its old title still listed, or another's title, is refused", () => {
  const file = make("passed-on", spec(["Now", "One", "Two", "Three"], ["Later", "Four"]))
  const before = readFileSync(file, "utf8")
  const round =
    (...sections) =>
    () =>
      newRound(docs, file, { spec: spec(...sections) })
  expect(round(["Now", { id: "F1", title: "New" }, "One"])).toThrow('"One" has it, and is still in the list')
  expect(round(["Now", { id: "F1", title: "Two" }])).toThrow("the round before calls it F2")
  expect(round(["Now", { id: "F1", title: "Two" }, { id: "F2", title: "One" }])).toThrow('"One" has it')
  const later = { id: "S1", title: "Soon", items: [{ title: "Five" }] }
  const now = { title: "Now", items: [{ title: "One" }] }
  expect(() => newRound(docs, file, { spec: { title: "List", sections: [later, now] } })).toThrow('"Now" has it')
  expect(readFileSync(file, "utf8")).toBe(before)
  // two items of one title are two items still, each kept by its own id
  const twins = make("twins", spec(["Now", "Same", "Same"]))
  newRound(docs, twins, { spec: spec(["Now", { id: "F2", title: "Same" }, { id: "F1", title: "Changed" }]) })
  expect(namesIn(twins)).toEqual(["s1f2 Same", "s1f1 Changed"])
})

test("a list for an ordinary details page is refused, writing nothing;  --template feature-set turns it into one", () => {
  const question = { id: "q1", title: "Which?", options: [{ title: "This" }, { title: "That" }] }
  const file = createPage(docs, "ordinary", { epic: "big", spec: { title: "Ordinary", questions: [question] } })
  const answerFile = DataFile.besidePage(file, "answer")
  DataFile.write(answerFile, { answered: "2026-11-22T10:00:00.000Z", answers: { q1: { picked: ["B"] } } })
  const contents = () => [readFileSync(file, "utf8"), readFileSync(answerFile, "utf8")]
  const before = contents()
  const list = spec(["Now", "One", "Two"])
  expect(() => newRound(docs, file, { spec: list })).toThrow("with --template feature-set")
  expect(() => newRound(docs, file, { template: "feature-set" })).toThrow("made from data")
  expect(() => newRound(docs, file, { template: "kanban", spec: list })).toThrow("no template 'kanban'")
  expect(contents()).toEqual(before)

  expect(newRound(docs, file, { template: "feature-set", spec: list })).toBe(file)
  expect(namesIn(file)).toEqual(["s1f1 One", "s1f2 Two"])
  const { rounds, answers } = DataFile.read(answerFile)
  expect(answers).toBeUndefined()
  expect(rounds[0].answer.answers).toEqual({ q1: { picked: ["B"] } })
  expect(rounds[0].sent).toContain("That")
  expect(parseHTML(readFileSync(file, "utf8")).document.querySelector("#round-1").textContent).toContain("That")
  // and the next round is a Feature Set's, by itself
  newRound(docs, file, { spec: spec(["Now", "Two", "Three"]) })
  expect(namesIn(file)).toEqual(["s1f2 Two", "s1f3 Three"])
})

test("the answer:  a line an item, its Priority and one comment on it;  No needs none;  the new order by name", () => {
  const file = make("answer", spec(["Now", "One", "Two", "Three"], ["Later", "Four"]))
  const answers = {
    s1f1: { picked: ["Y"], other: "soon" },
    "s1f1-priority": { picked: ["2"] },
    s1f2: { picked: ["N"] },
    "s1f2-priority": { picked: ["1"] },
    s1f3: { picked: [] },
    "s1f3-priority": { picked: ["3"] },
    order: { picked: ["s2", "s1"] },
    "order-s1": { picked: ["s1f2", "s1f1", "s1f3"] }
  }
  const lines = formatAnswer(file, { answered: "now", answers }).split("\n")
  expect(lines.slice(1)).toEqual([
    "  2 of 4 decided",
    "  S1F1 · One:  Y · Yes;  Priority:  2 · Priority 2;  Comment:  soon",
    "  S1F2 · Two:  N · No;  Priority:  not needed",
    "  S1F3 · Three:  (not decided yet);  Priority:  3 · Priority 3",
    "  S2F1 · Four:  (not decided yet)",
    "  New order of the sections:  S2, S1",
    "  New order in S1:  S1F2, S1F1, S1F3"
  ])
  const again = formatAnswer(file, { answered: "later", changes: 1, changed: ["order"], answers: {} })
  expect(again).toContain("The order of the sections is back as the page has it  (new)")
})
