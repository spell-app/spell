/**
 * Tests of `GuideChanges`, in a scratch checkout:  comments and page notes gathered into an epic, one phase per page;
 * a second gather updates the page's open phase;  what went in is marked taken.
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { PhaseIds } from "$/epics/phases"
import { takenInto } from "$/epics/tool/CommentList"
import { GuideInbox } from "$/epics/tool/GuideInbox"
import { PlanDocFiles } from "$/epics/tool/PlanDocFiles"

import { GuideChanges } from "../../src/tools/GuideChanges"

/** A guide, its `<title>` carrying a site suffix, with a page note not yet answered. */
const GUIDE = `<!doctype html>
<html lang="en">
  <head><title>Memory · Spell docs</title></head>
  <body>
    <main class="spell-doc-main">
      <ui-sticky class="spell-h1"><header class="spell-page-head"><h1>Memory</h1></header></ui-sticky>
      <ui-section id="sizes" header="2. Sizes">
        <p>Body.</p>
        <spell-notes for="sizes"><spell-note id="n1" status="new" at="2026-10-10 10:00"><p>Still true?</p></spell-note></spell-notes>
      </ui-section>
    </main>
  </body>
</html>
`

const root = mkdtempSync(join(tmpdir(), "guide-changes-"))
mkdirSync(join(root, "epics"))
mkdirSync(join(root, "guides", "memory"), { recursive: true })
writeFileSync(join(root, "guides", "memory", "memory.html"), GUIDE)
writeFileSync(join(root, "guides", "plain.html"), GUIDE.replace(/<spell-notes[\s\S]*<\/spell-notes>/, ""))
// the scratch checkout has no docs tools:  the home page isn't rebuilt, and says so on stderr
vi.spyOn(process.stderr, "write").mockImplementation(() => true)

afterAll(() => rmSync(root, { recursive: true, force: true }))

/** Comment `text` on page `page`'s second table in section `sizes`;  returns its id. */
function comment(page: string, text: string, quote?: string): string {
  return GuideInbox.update(GuideInbox.fileFor(join(root, page)), (comments) =>
    comments.add({ anchor: "sizes#table-2", kind: "table", label: "2. Sizes", excerpt: "Name Size", quote }, text)
  )
}

/** The scratch epic's whole doc, its parts assembled. */
function epicText(): string {
  return new PlanDocFiles({ root }).read(join(root, "epics", "gc", "gc.plan.html")).toString()
}

/** The scratch checkout's Epic UI folder (the engine's `src/docs/` in real use):  one element's page. */
const EPIC_UI = join(root, "epic-ui")
mkdirSync(EPIC_UI)
writeFileSync(
  join(EPIC_UI, "epic-item.html"),
  `<!doctype html><html><head><title>epic-item</title></head><body><main id="main" class="site-main"></main></body></html>\n`
)

describe("GuideChanges.gather()", () => {
  const changes = new GuideChanges({ root, epic: "gc", epicUi: EPIC_UI })

  test("nothing waiting:  no epic is made", async () => {
    rmSync(join(root, "guides", "memory", "memory.html"))
    expect(await changes.gather()).toEqual([])
    expect(readdirSync(join(root, "epics"))).toEqual([])
    writeFileSync(join(root, "guides", "memory", "memory.html"), GUIDE)
  })

  test("ONE PHASE PER PAGE:  its comments and new notes, quoted and linked back;  each marked taken", async () => {
    const id = comment("guides/memory/memory.html", "Too wide on a phone?", "Name Size")
    expect(changes.waiting().map((page) => [page.page, page.title, page.comments.length, page.notes.length])).toEqual([
      ["guides/memory/memory.html", "Memory", 1, 1]
    ])
    expect(await changes.gather()).toEqual([
      {
        page: "guides/memory/memory.html",
        epic: "gc",
        phase: 1,
        phaseId: "p-memory",
        phaseTitle: "Memory",
        as: "phase",
        comments: [id],
        notes: ["n1"]
      }
    ])
    const doc = epicText()
    expect(doc).toMatch(/<epic-phase[^>]*title="Memory"/)
    expect(doc).toMatch(
      /href="\.\.\/\.\.\/guides\/memory\/memory\.html#sizes"[^>]*>table in 2\. Sizes<\/a>\s+on\s+<q>Name Size<\/q>/
    )
    expect(doc).toContain("Too wide on a phone?")
    expect(doc).toContain("Still true?")
    const inbox = GuideInbox.read(join(root, "guides", "memory", "memory.inbox.json5"))
    expect(inbox.comments[id]).toMatchObject({
      status: "taken",
      taken: { epic: "gc", phase: 1, phaseId: "p-memory", title: "Memory" }
    })
    const page = readFileSync(join(root, "guides", "memory", "memory.html"), "utf8")
    expect(page).toMatch(
      /<spell-note id="n1" status="answered"[\s\S]*Taken into <a href="..\/..\/epics\/gc\/gc.plan.html#p-memory">gc P1/
    )
    expect(changes.waiting()).toEqual([])
  })

  test("a page with its phase still open gets an update;  another page its own phase;  one page alone", async () => {
    const more = comment("guides/memory/memory.html", "And the second table?")
    const other = comment("guides/plain.html", "A picture here")
    expect(await changes.gather(["guides/plain.html"])).toMatchObject([{ page: "guides/plain.html", phase: 2 }])
    expect(await changes.gather()).toMatchObject([
      { page: "guides/memory/memory.html", phase: 1, as: "update", comments: [more] }
    ])
    expect(epicText()).toMatch(
      /<epic-update[^>]*summary="1 comment more from Owen"[^>]*>[\s\S]*1 comment more from Owen[\s\S]*And the second table\?/
    )
    expect(other).toBe("m1")
  })

  // epic `epic-engine` I16:  the thread's link goes by the phase's id, so an insert ahead of it moves nothing
  test("a taken comment's link still finds its phase after add-phase --before:  P1 · Memory is P2", async () => {
    const files = new PlanDocFiles({ root })
    const doc = join(root, "epics", "gc", "gc.plan.html")
    const plan = files.read(doc)
    plan.addPhase("Inserted", { before: 1 })
    await files.writeDoc(doc, plan, true)
    const inbox = GuideInbox.read(join(root, "guides", "memory", "memory.inbox.json5"))
    const taken = Object.values(inbox.comments).map((each) => each.taken!)
    const into = takenInto(taken[0]!)
    expect(into).toEqual({ hash: "p-memory", label: "gc · Memory" })
    const phase = files.read(doc).document.getElementById(into.hash)!
    expect(PhaseIds.labelOf(phase)).toBe("P2")
  })

  // epic `epic-engine` P2 (T3):  Epic UI's pages take comments, beside them in the engine's `src/docs/`;  no epic
  // owns one, so they're gathered too, each page by its served path
  test("an Epic UI page's comments:  found beside it, named `components/epics/...`, gathered into a phase, taken", async () => {
    const inbox = GuideInbox.fileFor(join(EPIC_UI, "epic-item.html"))
    const id = GuideInbox.update(inbox, (comments) =>
      comments.add({ anchor: "1-example", kind: "section", label: "1. Example", excerpt: "1. Example" }, "Why two?")
    )
    expect(changes.inboxFiles()).toContain(inbox)
    expect(changes.pageOf(inbox)).toBe("components/epics/epic-item.html")
    expect(changes.fileOf("components/epics/epic-item.html")).toBe(join(EPIC_UI, "epic-item.html"))
    expect(changes.fileOf("guides/plain.html")).toBe(join(root, "guides", "plain.html"))
    expect(await changes.gather()).toMatchObject([
      { page: "components/epics/epic-item.html", as: "phase", comments: [id] }
    ])
    expect(epicText()).toMatch(/href="\.\.\/\.\.\/components\/epics\/epic-item\.html#1-example"/)
    expect(GuideInbox.read(inbox).comments[id]).toMatchObject({ status: "taken", taken: { epic: "gc" } })
  })

  // epic `epic-workflow` P13:  a page an epic owns sends its comments to that epic, never into guide-changes
  test("a page another epic owns is left out;  named, it's gathered all the same", async () => {
    mkdirSync(join(root, "epics", "py"), { recursive: true })
    writeFileSync(
      join(root, "epics", "py", "py.plan.html"),
      `<epic-page epic="py" updated="2026-10-13"><a slot="durable" href="../../guides/owned.html">Owned</a></epic-page>`
    )
    writeFileSync(join(root, "guides", "owned.html"), GUIDE.replace(/<spell-notes[\s\S]*<\/spell-notes>/, ""))
    comment("guides/owned.html", "Whose is this?")
    expect(changes.waiting()).toEqual([])
    expect(await changes.gather()).toEqual([])
    expect(changes.waiting(["guides/owned.html"]).map((page) => page.comments.length)).toEqual([1])
  })
})
