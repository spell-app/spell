/**
 * Tests of the migration `caveats-and-tests` (epic `epic-engine` P32):  todos fold into Caveats, tests take `T`;
 * and the content folder's pass that makes other pages' links follow (`ContentRelink`).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { parseHTML } from "linkedom"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { CaveatsAndTests, ContentRelink, Migrations } from "spell-epic/tool/migrations"

/** The step under test. */
const STEP = Migrations.named("caveats-and-tests")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 24, 22, 0)

/** An epic page `seo`:  two caveats, two todos (one linking a test, one a part), two tests, a log. */
function page(): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="seo" title="SEO">` +
      `<epic-section id="caveats" kind="caveats">` +
      `<epic-item id="c1" title="A limit" status="open"></epic-item>` +
      `<epic-item id="c2" title="Another" status="done"></epic-item></epic-section>` +
      `<epic-section id="todos" kind="todos">` +
      `<epic-item id="t1" title="Do it" status="open"><p>See <a href="#v1">V1</a> and <a href="#t2">T2</a>.</p></epic-item>` +
      `<epic-item id="t2" title="Then this" status="open" source="parts/t2.html"></epic-item></epic-section>` +
      `<epic-section id="tests" kind="tests" part-ids="v1 v2">` +
      `<epic-item id="v1" title="Check it" status="open"><epic-change item="T1">words</epic-change></epic-item>` +
      `<epic-item id="v2" title="And that" status="open"></epic-item></epic-section>` +
      `<epic-section id="log" kind="log"></epic-section>` +
      `</epic-page></main></body></html>`
  ).document as unknown as Document
}

/** The page's items, `id:section`, in page order;  `+limit` on a limit. */
function items(document: Document): string[] {
  return Array.from(document.querySelectorAll("epic-section > epic-item"), (item) => {
    const limit = item.hasAttribute("limit") ? "+limit" : ""
    return `${item.id}${limit}:${item.parentElement!.id}`
  })
}

describe("caveats-and-tests", () => {
  test("todos become caveats after the last one, the caveats limits, tests V -> T;  the Todos section goes", () => {
    const document = page()
    const context = { now: NOW, epic: "seo", notes: [] as string[] }
    expect(STEP.run(document, context)).toBe(true)
    expect(items(document)).toEqual([
      "c1+limit:caveats",
      "c2+limit:caveats",
      "c3:caveats",
      "c4:caveats",
      "t1:tests",
      "t2:tests"
    ])
    expect(document.querySelector('[kind="todos"]')).toBeNull()
    expect(context).toMatchObject({ renames: { t1: "c3", t2: "c4", v1: "t1", v2: "t2" } })
    // the log says what each became, so "T4" in old chat can be looked up
    const line = "Caveats hold the todos now, tests are T:  T1 → C3, T2 → C4, V1 → T1, V2 → T2"
    expect(document.querySelector("epic-event")!.textContent).toBe(line)
    expect(CaveatsAndTests.renamesInLog(document)).toEqual({ t1: "c3", t2: "c4", v1: "t1", v2: "t2" })
  })

  test("every reference follows, all at once:  links and their words, a change's item, a part's source, part-ids", () => {
    const document = page()
    STEP.run(document, { now: NOW, epic: "seo" })
    const todo = document.getElementById("c3")!
    expect(todo.querySelector("p")!.innerHTML).toBe(`See <a href="#t1">T1</a> and <a href="#c4">C4</a>.`)
    expect(document.getElementById("c4")!.getAttribute("source")).toBe("parts/c4.html")
    expect(document.querySelector("#tests")!.getAttribute("part-ids")).toBe("t1 t2")
    expect(document.querySelector("epic-change")!.getAttribute("item")).toBe("C3")
  })

  test("idempotent:  a migrated page changes no more;  a page with neither todos nor V tests isn't touched", () => {
    const document = page()
    STEP.run(document, { now: NOW, epic: "seo" })
    const html = document.documentElement.outerHTML
    expect(STEP.run(document, { now: NOW, epic: "seo" })).toBe(false)
    expect(document.documentElement.outerHTML).toBe(html)
  })
})

describe("ContentRelink", () => {
  let root: string | undefined
  afterEach(() => root && rmSync(root, { recursive: true, force: true }))

  test("other pages' links to the epic follow:  URLs, a link's words, <epic-link item>, short addresses;  never twice", () => {
    root = mkdtempSync(join(tmpdir(), "relink-"))
    mkdirSync(join(root, "guides"))
    mkdirSync(join(root, "epics", "seo"), { recursive: true })
    const guide = join(root, "guides", "g.html")
    writeFileSync(
      guide,
      `<a href="../epics/seo/seo.plan.html#v8">V8</a> <a href="../epics/seo/seo.plan.html#t8">T8 of seo</a> ` +
        `<epic-link epic="seo" item="T8"></epic-link> <epic-link epic="other" item="T8"></epic-link> SAGA:/s/seo#V8`
    )
    // the page itself:  the step renumbered it already
    const own = join(root, "epics", "seo", "seo.plan.html")
    writeFileSync(own, `<a href="seo.plan.html#t8">T8</a>`)
    const count = ContentRelink.run(root, { seo: { t8: "c10", v8: "t8" } })
    expect(readFileSync(guide, "utf8")).toBe(
      `<a href="../epics/seo/seo.plan.html#t8">T8</a> <a href="../epics/seo/seo.plan.html#c10">T8 of seo</a> ` +
        `<epic-link epic="seo" item="C10"></epic-link> <epic-link epic="other" item="T8"></epic-link> SAGA:/s/seo#T8`
    )
    expect(readFileSync(own, "utf8")).toBe(`<a href="seo.plan.html#t8">T8</a>`)
    expect(count).toEqual({ files: 1, links: 4 })
  })
})
