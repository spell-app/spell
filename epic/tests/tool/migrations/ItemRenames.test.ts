/**
 * Tests of the migration `item-renames` (epic `epic-engine` P44):  Caveats become Todo (C -> T), Tests become Manual
 * tests (T -> M), comments M -> C;  the content folder's pass that makes other pages' links and every inbox's comments
 * follow (`ContentRelink`);  and the whole run on a scratch checkout (`epic migrate`:  parts, the review inbox).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { parseHTML } from "linkedom"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { DataFile } from "spell/epic/data/DataFile"
import { ContentRelink, ItemRenames, Migrations } from "spell/epic/tool/migrations"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"

/** The step under test. */
const STEP = Migrations.named("item-renames")!

/** Now, for the context. */
const NOW = new Date(2026, 9, 25, 16, 0)

/**
 * An epic page `seo` in the letters before P44:  Caveats (a todo `c1`, a limit `c2`), Tests (`t1`, `t2`), and every
 * kind of reference to them:  links and their words, a part's `source`, `part-ids`, a change mark's and an
 * `<epic-mark>`'s `item`, a note box's `for`, `<epic-link item>`s (this page's and another's), a `#caveats` link.
 */
function page(): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="seo" title="SEO">` +
      `<epic-section id="phases" kind="phases"><epic-phase id="p-one" title="One" status="done">` +
      `<epic-field name="to-review"><epic-mark item="c1" link></epic-mark> <epic-mark item="t2"></epic-mark></epic-field>` +
      `<p>See <a href="#caveats">the caveats</a> and <epic-link item="C2"></epic-link>, ` +
      `<epic-link epic="other" item="C2"></epic-link>.</p></epic-phase></epic-section>` +
      `<epic-section id="caveats" kind="caveats">` +
      `<epic-item id="c1" title="Do it" status="open"><p>See <a href="#t1">T1</a> and <a href="#c2">C2</a>.</p>` +
      `<epic-text-box for="c1"></epic-text-box></epic-item>` +
      `<epic-item id="c2" title="A limit" status="open" limit source="parts/c2.html"></epic-item></epic-section>` +
      `<epic-section id="tests" kind="tests" part-ids="t1 t2">` +
      `<epic-item id="t1" title="Check it" status="open"><epic-change item="C1">words</epic-change></epic-item>` +
      `<epic-item id="t2" title="And that" status="open"></epic-item></epic-section>` +
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

describe("item-renames", () => {
  test("Caveats become Todo (C -> T), Tests become Manual tests (T -> M):  every number kept;  one log line", () => {
    const document = page()
    const context = { now: NOW, epic: "seo", notes: [] as string[] }
    expect(STEP.run(document, context)).toBe(true)
    expect(items(document)).toEqual(["t1:todos", "t2+limit:todos", "m1:tests", "m2:tests"])
    expect(document.querySelector("#todos")!.getAttribute("kind")).toBe("todos")
    expect(document.querySelector('[kind="caveats"]')).toBeNull()
    expect(context).toMatchObject({ renames: { c1: "t1", c2: "t2", t1: "m1", t2: "m2" } })
    expect(context.notes).toEqual(["item-renames:  2 caveats -> todos, 2 tests -> manual tests"])
    expect(document.querySelectorAll("epic-event")).toHaveLength(1)
    expect(document.querySelector("epic-event")!.textContent).toMatch(/^The item letters moved, every number kept:/)
  })

  test("every reference follows, ALL AT ONCE:  a T made from a C is never then made an M", () => {
    const document = page()
    STEP.run(document, { now: NOW, epic: "seo" })
    expect(document.getElementById("t1")!.querySelector("p")!.innerHTML).toBe(
      `See <a href="#m1">M1</a> and <a href="#t2">T2</a>.`
    )
    expect(document.querySelector("epic-text-box")!.getAttribute("for")).toBe("t1")
    expect(document.getElementById("t2")!.getAttribute("source")).toBe("parts/t2.html")
    expect(document.querySelector("#tests")!.getAttribute("part-ids")).toBe("m1 m2")
    expect(document.querySelector("epic-change")!.getAttribute("item")).toBe("T1")
    expect(Array.from(document.querySelectorAll("epic-mark"), (mark) => mark.getAttribute("item"))).toEqual([
      "t1",
      "m2"
    ])
    const phase = document.querySelector("epic-phase p")!
    expect(phase.querySelector("a")!.getAttribute("href")).toBe("#todos")
    // another epic's link is that epic's business
    expect(Array.from(phase.querySelectorAll("epic-link"), (link) => link.getAttribute("item"))).toEqual(["T2", "C2"])
  })

  test("idempotent:  a migrated page changes no more;  a page in the new letters isn't touched", () => {
    const document = page()
    STEP.run(document, { now: NOW, epic: "seo" })
    const html = document.documentElement.outerHTML
    expect(STEP.run(document, { now: NOW, epic: "seo" })).toBe(false)
    expect(document.documentElement.outerHTML).toBe(html)
    expect(ItemRenames.renames(document)).toEqual({})
  })
})

describe("ContentRelink", () => {
  let root: string | undefined
  afterEach(() => root && rmSync(root, { recursive: true, force: true }))

  test("other pages' links to the epic follow:  URLs, a link's words, <epic-link item>, short addresses, #caveats;  never twice", () => {
    root = mkdtempSync(join(tmpdir(), "relink-"))
    mkdirSync(join(root, "guides"))
    mkdirSync(join(root, "epics", "seo"), { recursive: true })
    const guide = join(root, "guides", "g.html")
    writeFileSync(
      guide,
      `<a href="../epics/seo/seo.plan.html#c8">C8</a> <a href="../epics/seo/seo.plan.html#t8">T8 of seo</a> ` +
        `<epic-link epic="seo" item="C8"></epic-link> <epic-link epic="other" item="T8"></epic-link> SAGA:/s/seo#T8 ` +
        `<a href="../epics/seo/seo.plan.html#caveats">its caveats</a>`
    )
    // the page itself:  the step renumbered it already
    const own = join(root, "epics", "seo", "seo.plan.html")
    writeFileSync(own, `<a href="seo.plan.html#t8">T8</a>`)
    const count = ContentRelink.run(root, { seo: { c8: "t8", t8: "m8", caveats: "todos" } })
    expect(readFileSync(guide, "utf8")).toBe(
      `<a href="../epics/seo/seo.plan.html#t8">T8</a> <a href="../epics/seo/seo.plan.html#m8">T8 of seo</a> ` +
        `<epic-link epic="seo" item="T8"></epic-link> <epic-link epic="other" item="T8"></epic-link> SAGA:/s/seo#M8 ` +
        `<a href="../epics/seo/seo.plan.html#todos">its caveats</a>`
    )
    expect(readFileSync(own, "utf8")).toBe(`<a href="seo.plan.html#t8">T8</a>`)
    expect(count).toEqual({ files: 1, links: 5 })
  })

  test("each file is rewritten under its page's lock, as its writers take it:  a part under its epic page's", () => {
    root = mkdtempSync(join(tmpdir(), "relink-lock-"))
    mkdirSync(join(root, "epics", "seo", "parts"), { recursive: true })
    mkdirSync(join(root, "epics", "other", "parts"), { recursive: true })
    const page = join(root, "epics", "other", "other.plan.html")
    const part = join(root, "epics", "other", "parts", "p1.html")
    writeFileSync(page, "")
    writeFileSync(part, `<a href="../../seo/seo.plan.html#c8">C8</a>`)
    const locked = vi.spyOn(SRV.FileLock, "run")
    try {
      expect(ContentRelink.run(root, { seo: { c8: "t8" } })).toEqual({ files: 1, links: 1 })
      expect(locked.mock.calls.map(([file]) => file)).toEqual([page, page])
    } finally {
      locked.mockRestore()
    }
    expect(readFileSync(part, "utf8")).toBe(`<a href="../../seo/seo.plan.html#t8">T8</a>`)
  })

  test("every inbox's comments respelt C, open and closed;  nothing else in the file;  a second run:  none", () => {
    root = mkdtempSync(join(tmpdir(), "respell-"))
    mkdirSync(join(root, "guides"))
    const inbox = join(root, "guides", "g.inbox.json5")
    const comment = (status: string) => ({
      anchor: "a",
      kind: "page",
      label: "",
      excerpt: "",
      text: "x",
      at: "t",
      status
    })
    DataFile.write(inbox, { comments: { m1: comment("new"), cm2: comment("answered") }, other: { m1: 1 } })
    writeFileSync(join(root, "guides", "fine.inbox.json5"), `{ comments: { c1: { text: "x" } } }`)
    expect(ContentRelink.respellComments(root, { dryRun: true })).toEqual({ files: 1, links: 2 })
    expect(Object.keys(DataFile.read<{ comments: object }>(inbox)!.comments)).toEqual(["m1", "cm2"])
    expect(ContentRelink.respellComments(root)).toEqual({ files: 1, links: 2 })
    const after = DataFile.read<{ comments: Record<string, { status: string }>; other: object }>(inbox)!
    expect(Object.entries(after.comments).map(([id, each]) => `${id}:${each.status}`)).toEqual([
      "c1:new",
      "c2:answered"
    ])
    expect(after.other).toEqual({ m1: 1 })
    expect(ContentRelink.respellComments(root)).toEqual({ files: 0, links: 0 })
  })
})

describe("epic migrate:  item-renames on a scratch checkout", () => {
  /** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
  const FIXTURES = fileURLToPath(new URL("../fixtures", import.meta.url))
  const CHECKOUT = fileURLToPath(new URL("../../..", import.meta.url))
  let root: string | undefined
  afterEach(() => {
    vi.restoreAllMocks()
    if (root) rmSync(root, { recursive: true, force: true })
  })

  /** A split epic page `seo` in the letters before P44:  a caveat with details (a part), a test;  its inbox. */
  async function scratch() {
    root = mkdtempSync(join(tmpdir(), "item-renames-"))
    symlinkSync(join(CHECKOUT, "packages"), join(root, "packages"))
    const files = new PlanDocFiles({ root })
    const file = join(root, "epics", "seo", "seo.plan.html")
    mkdirSync(join(root, "epics", "seo"), { recursive: true })
    const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
    plan.addItem("todo", "Retry the upload", { details: "<p>Once it's online.</p>" })
    plan.addItem("test", "The sitemap lists every page")
    // back to the old letters, as a page before P44 has them
    const todos = plan.document.querySelector("#todos")!
    todos.id = "caveats"
    todos.setAttribute("kind", "caveats")
    plan.document.getElementById("t1")!.id = "c1"
    plan.document.getElementById("m1")!.id = "t1"
    await files.writeDoc(file, plan, true)
    const comment = { kind: "field", label: "", excerpt: "", text: "why?", at: "2026-10-25T10:00:00Z", status: "new" }
    DataFile.write(ReviewInbox.pathFor(file), {
      marks: {
        c1: { action: "todo", at: "2026-10-25T10:00:00Z" },
        t1: { action: "approve", at: "2026-10-25T10:00:00Z" }
      },
      comments: { m1: { ...comment, anchor: "c1#field-1" }, m2: { ...comment, anchor: "t1" } }
    })
    mkdirSync(join(root, "guides"))
    DataFile.write(join(root, "guides", "g.inbox.json5"), { comments: { m4: { ...comment, anchor: "a" } } })
    const printed: string[] = []
    const commands = new PlanDocCommands({ files })
    vi.spyOn(commands, "print").mockImplementation((text) => void printed.push(text))
    vi.spyOn(commands, "warn").mockImplementation(() => {})
    return { root, files, file, printed, commands }
  }

  test("the page, its parts written fresh, its inbox re-keyed (a comment on a renamed item with it), every inbox's comments C", async () => {
    const { root, files, file, printed, commands } = await scratch()
    expect(existsSync(join(root, "epics", "seo", "parts", "c1.html"))).toBe(true)
    expect(await commands.run(["migrate", "--all", "--dry-run"])).toBe(0)
    expect(printed).toContain("seo:  would run item-renames")
    expect(printed).toContain("comments:  3 in 2 inboxes would be respelt C (from M)")
    printed.length = 0
    expect(await commands.run(["migrate", "--all"])).toBe(0)
    expect(printed).toContain("comments:  1 in 1 inbox were respelt C (from M)")
    const plan = files.read(file)
    expect(plan.item("t1").getAttribute("title")).toBe("Retry the upload")
    expect(plan.item("m1").getAttribute("title")).toBe("The sitemap lists every page")
    expect(existsSync(join(root, "epics", "seo", "parts", "c1.html"))).toBe(false)
    expect(readFileSync(join(root, "epics", "seo", "parts", "t1.html"), "utf8")).toContain("Once it's online.")
    const inbox = ReviewInbox.read(ReviewInbox.pathFor(file))
    expect(Object.keys(inbox.marks).sort()).toEqual(["m1", "t1"])
    expect([inbox.marks.t1!.action, inbox.marks.m1!.action]).toEqual(["todo", "approve"])
    expect(Object.entries(inbox.comments).map(([id, each]) => `${id}@${each.anchor}`)).toEqual([
      "c1@t1#field-1",
      "c2@m1"
    ])
    expect(Object.keys(DataFile.read<{ comments: object }>(join(root, "guides", "g.inbox.json5"))!.comments)).toEqual([
      "c4"
    ])
    printed.length = 0
    expect(await commands.run(["migrate", "--all"])).toBe(0)
    expect(printed.slice(-2)).toEqual(["epic pages:  0 of 1 changed", "root links:  none to write in 4 files"])
  })
})
