/**
 * Tests of `epic ask`'s functions (`tools/details.js`), in a scratch checkout:
 * the real template, a scratch `details/` and an epic.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, expect, test } from "vite-plus/test"

import {
  answerFile,
  createPage,
  draftFile,
  findPage,
  formatAnswer,
  formatDraft,
  isEpicsPage,
  listPages,
  readAnswer,
  readDraft,
  sweep,
  waitForAnswer
} from "spell/epic/tools/details.js"

let docs

beforeAll(() => {
  docs = mkdtempSync(join(tmpdir(), "details-cli-"))
  mkdirSync(join(docs, "epics/big"), { recursive: true })
})

afterAll(() => rmSync(docs, { recursive: true, force: true }))

test("new:  scratch and epic pages from the tool's template, in the epics pack's elements, the same at any depth", () => {
  const scratch = createPage(docs, "pick-layout", { title: "Pick a layout" })
  expect(scratch).toBe(join(docs, "pages/details/pick-layout.html"))
  const html = readFileSync(scratch, "utf8")
  expect(html).toContain("<title>Pick a layout</title>")
  // the engine's files from the epic server's routes, whatever the depth (epic `epic-eject` P7)
  expect(html).toContain('<script src="/_epic/assets/spell-ui.js">')
  expect(html).toContain('<ui-components source="/_epic/pack/epics.pack.js">')
  expect(html).not.toMatch(/details\.(css|js)"/)
  // root paths, the same from any folder;  no site header `root` (epic `epic-engine` P46)
  expect(html).toContain("<spell-site-header></spell-site-header>")
  // no crumb to the home page:  the site header's Spell Epic is that link (epic `epic-engine` T148)
  expect(html).not.toContain("<ui-breadcrumb link=")
  expect(html).not.toContain("TEMPLATE:")
  expect(html).toMatch(/<epic-field label="Asked" data-details-asked>\d{4}-\d\d-\d\d</)
  expect(html).toContain("<epic-send></epic-send>")
  expect(html).toContain('<epic-text-box type="notes"></epic-text-box>')

  const epic = createPage(docs, "shape", { title: "Shape", epic: "big" })
  expect(epic).toBe(join(docs, "epics/big/details/shape.html"))
  const deep = readFileSync(epic, "utf8")
  expect(deep).toContain('href="/_epic/assets/spell-doc.css"')
  expect(deep).toContain('source="/_epic/pack/epics.pack.js"')
  expect(deep).toContain("<spell-site-header></spell-site-header>")
  expect(deep).not.toContain("<ui-breadcrumb link=")
})

test("new --from:  the whole page from a spec", () => {
  const file = createPage(docs, "from-spec", {
    spec: {
      title: "Clean up",
      lede: "Which <b>leftovers</b> go?",
      askedBy: "session <code>w</code>, while taking stock",
      where: { epic: "none", justNow: "listed 6 worktrees", decides: "what gets removed" },
      questions: [
        {
          title: "1 · worktree seo",
          text: "Merged into main.",
          options: [
            { title: "Remove it", summary: "git worktree remove", recommended: true },
            { title: "Leave it", summary: "nothing", details: "<p>more</p>" }
          ]
        },
        { id: "phases", title: "Phases", text: "Which tonight?", multiple: true, options: [{ title: "P1 · A" }] }
      ]
    }
  })
  const html = readFileSync(file, "utf8")
  expect(html).toContain("<title>Clean up</title>")
  expect(html).toContain("Which <b>leftovers</b> go?")
  expect(html).toContain('<epic-field label="Just now">listed 6 worktrees</epic-field>')
  expect(html).toContain('<epic-field label="Asked by" data-details-by>session <code>w</code>, while taking stock')
  expect(html).not.toContain('id="context"')
  expect(html).toMatch(/<ui-section id="q1" label="1 · worktree seo" sticky collapsible dividing>/)
  expect(html).toContain("<epic-ask><epic-question><p>Merged into main.</p></epic-question><epic-choices>")
  expect(html).toContain('<epic-option letter="A" title="Remove it" recommended><p>git worktree remove</p>')
  expect(html).toContain('<epic-aside title="Details"><p>more</p></epic-aside>')
  expect(html).toMatch(/<ui-section id="phases"[^>]*><ui-icon[^>]*><\/ui-icon><epic-ask multiple>/)
  expect(html).not.toContain("First option")
  // nothing built as markup in strings:  a title with HTML in it stays text, in its attribute
  expect(createPageHtml({ questions: [{ title: 'A <b>"bold"</b> one', options: [{ title: "x & y" }] }] })).toContain(
    'label="A <b>&quot;bold&quot;</b> one"'
  )
  rmSync(file)
})

/** A page from `spec` alone, read back and deleted:  its HTML. */
function createPageHtml(spec) {
  const file = createPage(docs, "scratch-spec", { spec })
  const html = readFileSync(file, "utf8")
  rmSync(file)
  return html
}

test("new:  refuses a bad slug, a missing epic, an existing page", () => {
  expect(() => createPage(docs, "Bad Slug")).toThrow(/kebab/)
  expect(() => createPage(docs, "x", { epic: "nope" })).toThrow(/no epic/)
  expect(() => createPage(docs, "pick-layout")).toThrow(/already exists/)
})

test("finds pages by slug, <epic>/<slug>, or an epic's slug alone", () => {
  expect(findPage(docs, "pick-layout")).toBe(join(docs, "pages/details/pick-layout.html"))
  expect(findPage(docs, "big/shape")).toBe(join(docs, "epics/big/details/shape.html"))
  expect(findPage(docs, "shape")).toBe(join(docs, "epics/big/details/shape.html"))
  expect(() => findPage(docs, "nothing")).toThrow(/no details page/)
  expect(listPages(docs)).toEqual([
    join(docs, "pages/details/pick-layout.html"),
    join(docs, "epics/big/details/shape.html")
  ])
})

test("formats an answer with the page's titles", () => {
  const page = join(docs, "pages/details/pick-layout.html")
  const answer = {
    page: "/pages/details/pick-layout.html",
    answered: "2026-10-03T22:00:00.000Z",
    changes: 1,
    changed: ["q1", "comment:context"],
    answers: { q1: { picked: ["A"], other: "and more" } },
    comments: { context: "clear enough" },
    notes: "fine"
  }
  expect(formatAnswer(page, answer)).toBe(
    [
      `Answer to "Pick a layout" (${page}), sent 2026-10-03T22:00:00.000Z:  (sent 2×)`,
      "  1 of 1 decided",
      "  Q1 · Short question:  A · First option (recommended);  Other:  and more  (new)",
      "  Comments:",
      "    1. Context:  clear enough  (new)",
      "  Notes:  fine"
    ].join("\n")
  )
})

// epic `epic-engine` T121:  a compact question's Other is its comment box
test("formats a compact question's Other as its comment", () => {
  const page = join(docs, "pages/details/pick-compact.html")
  const layout = readFileSync(join(docs, "pages/details/pick-layout.html"), "utf8")
  writeFileSync(page, layout.replace(/<epic-ask\b/, "<epic-ask compact"))
  const answer = {
    page: "/pages/details/pick-compact.html",
    answered: "2026-10-03T22:00:00.000Z",
    changes: 0,
    answers: { q1: { picked: ["A"], other: "but later" } },
    comments: {},
    notes: ""
  }
  expect(formatAnswer(page, answer).split("\n")[2]).toBe(
    "  Q1 · Short question:  A · First option (recommended);  Comment:  but later"
  )
  rmSync(page)
})

test("formats an option's comment with its question and title", () => {
  const page = join(docs, "pages/details/pick-layout.html")
  const answer = {
    page: "/x",
    answered: "2026-10-03T22:00:00.000Z",
    changes: 0,
    answers: { q1: { picked: [] } },
    comments: { "q1-B": "too slow", "q9-Z": "lost" },
    notes: ""
  }
  expect(formatAnswer(page, answer).split("\n").slice(-3)).toEqual([
    "  Comments:",
    "    Q1 · Short question, B · Second option:  too slow",
    "    q9-Z:  lost"
  ])
})

test("formats a partial answer:  the questions not decided yet say so", () => {
  const page = join(docs, "pages/details/pick-layout.html")
  const answer = { page: "/x", answered: "2026-10-03T22:00:00.000Z", changes: 0, answers: {}, notes: "" }
  expect(formatAnswer(page, answer).split("\n").slice(1)).toEqual([
    "  0 of 1 decided",
    "  Q1 · Short question:  (not decided yet)"
  ])
})

// epic `epic-engine` r6:  repo-split's layout page, comment boxes and notes, no question
test("formats a page with no questions:  its comments and notes, no count of what's decided", () => {
  // outside the folders `list` walks:  only its markup matters here
  const page = join(docs, "layout.html")
  writeFileSync(
    page,
    `<h1>Layout</h1><ui-section id="l-main" label="2.2 The main checkout"><epic-text-box for="l-main"></epic-text-box></ui-section>`
  )
  const answer = {
    page: "/x",
    answered: "2026-10-20T02:22:00.000Z",
    changes: 0,
    answers: {},
    comments: { "l-main": "Make the top project just spell" },
    notes: "Is this worth it?"
  }
  expect(formatAnswer(page, answer).split("\n").slice(1)).toEqual([
    "  Comments:",
    "    2.2 The main checkout:  Make the top project just spell",
    "  Notes:  Is this worth it?"
  ])
})

// epic `ast-markup`:  a SEEDED box sends only what changed;  the rest reads as kept
test("formats seeded boxes:  the person's version, an emptied one, the ones kept as suggested", () => {
  const page = join(docs, "seeded.html")
  const box = (id, label) =>
    `<ui-section id="${id}" label="${label}"><epic-text-box for="${id}" code>` +
    `<script type="text/plain"><ui-button label="{x}"></ui-button></script></epic-text-box></ui-section>`
  writeFileSync(page, `<h1>Shapes</h1>${box("s1", "1. Buttons")}${box("s2", "2. Lists")}${box("s3", "3. Forms")}`)
  const answer = {
    page: "/x",
    answered: "2026-11-21T02:22:00.000Z",
    changes: 0,
    answers: {},
    comments: { s1: '<ui-button label="{y}">\n  go\n</ui-button>', s2: "(emptied:  none of the suggested text kept)" },
    notes: ""
  }
  expect(formatAnswer(page, answer).split("\n").slice(1)).toEqual([
    "  Comments:",
    "    1. Buttons, their version of the suggestion:",
    '      <ui-button label="{y}">',
    "        go",
    "      </ui-button>",
    "    2. Lists:  (emptied:  none of the suggested text kept)",
    "  Kept as suggested:  3. Forms"
  ])
  rmSync(page)
})

// epic `epic-engine` T79 (request r71):  the page's bullhorn comments, sent with its answer
test("formats the page's bullhorn comments sent with it, and how to answer each", () => {
  const page = join(docs, "pages/details/pick-layout.html")
  const answer = {
    page: "/epics/language/details/bold.html",
    answered: "2026-11-15T19:00:00.000Z",
    changes: 0,
    answers: {},
    notes: "",
    pageComments: [{ id: "C2", on: "1. Bold", text: "Is bold louder?" }]
  }
  expect(formatAnswer(page, answer).split("\n").slice(-2)).toEqual([
    "  Bullhorn comments, sent with it (answer each:  epic comments answer epics/language/details/bold.html#<id> --file <reply.html>):",
    '    C2 on "1. Bold":  Is bold louder?'
  ])
})

test("formats kept text:  questions gone from the page, under their old titles", () => {
  const page = join(docs, "pages/details/pick-layout.html")
  const answer = {
    page: "/x",
    answered: "2026-10-03T22:00:00.000Z",
    changes: 1,
    changed: ["kept"],
    answers: { q1: { picked: ["A"] } },
    notes: "",
    kept: [{ id: "q3", label: "Q3 · Gone", text: "picked B · Blue" }]
  }
  expect(formatAnswer(page, answer).split("\n").slice(-2)).toEqual([
    "  Kept from before the page changed:  (new)",
    "    Q3 · Gone (q3):  picked B · Blue"
  ])
})

test("draft:  what's typed and not sent, only when newer than the answer", () => {
  const page = join(docs, "epics/big/details/shape.html")
  expect(readDraft(page)).toBeUndefined()
  const draft = {
    page: "/epics/big/details/shape.html",
    saved: "2026-10-03T23:00:00.000Z",
    answers: { q1: { picked: ["B"] } },
    comments: {},
    notes: "half done",
    labels: { q1: "Q1" }
  }
  writeFileSync(draftFile(page), JSON.stringify(draft))
  expect(formatDraft(page, readDraft(page))).toBe(
    [
      `Not sent:  typed on "Shape" (${page}), draft saved 2026-10-03T23:00:00.000Z:`,
      "  1 of 1 decided",
      "  Q1 · Short question:  B · Second option",
      "  Notes:  half done"
    ].join("\n")
  )
  writeFileSync(answerFile(page), JSON.stringify({ answered: "2026-10-04T00:00:00.000Z", answers: {}, notes: "" }))
  expect(readDraft(page)).toBeUndefined()
  rmSync(answerFile(page))
  rmSync(draftFile(page))
})

test("waits for an answer newer than its start;  gives up after the timeout", async () => {
  const page = join(docs, "pages/details/pick-layout.html")
  expect(readAnswer(page)).toBeUndefined()
  expect(await waitForAnswer(page, { timeout: 50, poll: 10 })).toBeUndefined()
  const waiting = waitForAnswer(page, { timeout: 2000, poll: 10 })
  setTimeout(() => writeFileSync(answerFile(page), JSON.stringify({ answers: {}, notes: "hi" })), 50)
  expect((await waiting).notes).toBe("hi")
  // an answer from before the wait started doesn't count
  expect(await waitForAnswer(page, { since: Date.now() + 1000, timeout: 50, poll: 10 })).toBeUndefined()
})

test("sweep:  old scratch pages and answers go;  new ones and epics' stay", () => {
  const old = (Date.now() - 20 * 86_400_000) / 1000
  utimesSync(join(docs, "pages/details/pick-layout.html"), old, old)
  utimesSync(answerFile(join(docs, "pages/details/pick-layout.html")), old, old)
  utimesSync(join(docs, "epics/big/details/shape.html"), old, old)
  createPage(docs, "fresh")
  expect(sweep(docs, 14).sort()).toEqual(
    [join(docs, "pages/details/pick-layout.answer.json5"), join(docs, "pages/details/pick-layout.html")].sort()
  )
  expect(listPages(docs)).toEqual([join(docs, "pages/details/fresh.html"), join(docs, "epics/big/details/shape.html")])
})

// epic `epic-workflow` P19:  `epic ask list <epic>`, as `epic choices list <epic>`
test("an epic's own pages:  in its folder, not another's, nor a scratch one", () => {
  const pages = listPages(docs).filter((file) => isEpicsPage(file, "big", docs))
  expect(pages).toEqual([join(docs, "epics/big/details/shape.html")])
  expect(isEpicsPage(join(docs, "epics/bigger/details/x.html"), "big", docs)).toBe(false)
})
