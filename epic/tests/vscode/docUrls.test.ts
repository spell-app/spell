/**
 * Tests of spell-epic's VS Code extension's pure parts (`vscode/src/docUrls.ts`):
 * - page URLs, which side bar tab a page goes to, the epic pages "Open Epic..." lists, the window's epic, where a
 *   served URL's file is
 * - a Claude tab's label, the bridge's registry folder, a window's folder by any spelling (`folderIndex()`)
 * - Plain `node --test` (types stripped):  the extension's own code needs `vscode`, these parts don't.
 */
import { deepEqual, equal } from "node:assert/strict"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"

import {
  docViewFor,
  fileForPath,
  folderIndex,
  isDocView,
  isLoopback,
  planDocsIn,
  planDocsOf,
  samePage,
  stamped,
  tabShows,
  windowEpic,
  windowsFolder
} from "spell/epic/vscode/src/docUrls.ts"

const top = mkdtempSync(join(tmpdir(), "spell-epic-vscode-"))
after(() => rmSync(top, { recursive: true, force: true }))

/** Write epic `name`'s page under `content`, titled `title`, changed at `when` (seconds). */
function epicPage(content: string, name: string, title: string, when: number): void {
  const folder = join(content, "epics", name)
  mkdirSync(folder, { recursive: true })
  const file = join(folder, `${name}.plan.html`)
  writeFileSync(file, `<html><head><title>Epic: ${title}</title></head></html>`)
  utimesSync(file, when, when)
}

test("stamped() and samePage():  a fresh ?t=, ignored with the hash when comparing", () => {
  equal(stamped("http://127.0.0.1:4848/epics/x.html#p1", 42), "http://127.0.0.1:4848/epics/x.html?t=42#p1")
  equal(samePage("http://127.0.0.1:4848/a.html?t=1#x", "http://127.0.0.1:4848/a.html?t=2"), true)
  equal(samePage("http://127.0.0.1:4848/a.html", "http://127.0.0.1:4747/a.html"), false)
  equal(samePage("http://127.0.0.1:4848/a.html?v=1", "http://127.0.0.1:4848/a.html?v=2"), false)
})

test("isLoopback():  plain http on this machine only", () => {
  equal(isLoopback("http://127.0.0.1:4848/x"), true)
  equal(isLoopback("http://localhost:4848/x"), true)
  equal(isLoopback("https://127.0.0.1/x"), false)
  equal(isLoopback("http://example.com/x"), false)
  equal(isLoopback("not a url"), false)
})

test("docViewFor():  the page's kind picks the tab, an epic page never Epic Docs (epic `epic-engine` P59)", () => {
  const content = "/Users/o/www/spell/spell.epics"
  // an epic page and a saga page:  Review, whatever was asked
  for (const asked of [undefined, "docs", "review", "details"] as const) {
    equal(docViewFor(`${content}/epics/data/data.plan.html`, asked), "review")
    equal(docViewFor("/epics/data/data.plan.html", asked), "review")
    equal(docViewFor(`${content}/sagas/spell/spell.saga.html`, asked), "review")
    equal(docViewFor(`${content}/goals/old/old.goal.html`, asked), "review")
  }
  // details, review and choice pages:  Details, whatever was asked (the choice page Owen lost, request r50)
  for (const asked of [undefined, "docs", "review"] as const) {
    equal(docViewFor(`${content}/epics/data/details/data-words.html`, asked), "details")
    equal(docViewFor(`${content}/pages/details/pick-layout.html`, asked), "details")
    equal(docViewFor("/r/other/epics/seo/details/names.html", asked), "details")
  }
  // the epic `details` keeps its epic page in a `details/` folder:  still Review
  equal(docViewFor(`${content}/epics/details/details.plan.html`), "review")
  equal(docViewFor(`${content}/epics/details/details/q.html`), "details")
  // anything else:  as asked, else Epic Docs;  never Details by asking
  equal(docViewFor(`${content}/guides/solid/solid-2.html`), "docs")
  equal(docViewFor(`${content}/guides/solid/solid-2.html`, "review"), "review")
  equal(docViewFor(`${content}/guides/solid/solid-2.html`, "details"), "docs")
  equal(docViewFor(`${content}/epics/data/parts/p1.html`), "docs")
  equal(docViewFor("C:\\spell.epics\\epics\\x\\details\\y.html"), "details")
})

test("isDocView():  the three tabs' names, nothing else", () => {
  deepEqual(["docs", "review", "details", "Docs", "", undefined, 1].map(isDocView), [
    true,
    true,
    true,
    false,
    false,
    false,
    false
  ])
})

test("windowEpic():  a worktree's own epic, else the one changed last", () => {
  const content = join(top, "window-epic")
  epicPage(content, "data", "Data", 1_000)
  epicPage(content, "seo", "SEO", 5_000)
  equal(windowEpic("/Users/o/www/spell.worktrees/data", content), "data")
  equal(windowEpic("/Users/o/www/spell", content), "seo")
  equal(windowEpic(undefined, content), "seo")
  equal(windowEpic("/x", join(top, "no-epics")), undefined)
})

test("planDocsIn() / planDocsOf():  every repo's epic pages, newest first, titles without `Epic: `", () => {
  const one = join(top, "one")
  const two = join(top, "two")
  epicPage(one, "seo", "SEO", 1_000)
  epicPage(two, "eject", "Epic Eject", 3_000)
  epicPage(two, "older", "Older", 2_000)
  mkdirSync(join(one, "epics", "no-page"))
  deepEqual(
    planDocsIn(one).map((doc) => [doc.name, doc.title, doc.repo]),
    [["seo", "SEO", undefined]]
  )
  deepEqual(
    planDocsOf([
      { name: "one", content: one },
      { name: "two", content: two },
      { name: "again", content: one }
    ]).map((doc) => [doc.name, doc.repo]),
    [
      ["eject", "two"],
      ["older", "two"],
      ["seo", "one"]
    ]
  )
  deepEqual(planDocsIn(join(top, "nothing")), [])
})

test("fileForPath():  the epic server's engine and repos;  a checkout's root and worktrees", () => {
  const hub = {
    epicServer: true,
    engine: "/e",
    repos: [
      { name: "app", content: "/app-dev", prefix: "/r/app/", isDefault: true },
      { name: "other", content: "/other-docs", prefix: "/r/other/", isDefault: false }
    ]
  }
  equal(fileForPath(hub, "/epics/a%20b/x.html"), "/app-dev/epics/a b/x.html")
  equal(fileForPath(hub, "/r/other/guides/x.md"), "/other-docs/guides/x.md")
  equal(fileForPath(hub, "/_epic/assets/spell-doc.css"), "/e/src/tools/_assets/spell-doc.css")
  equal(fileForPath(hub, "/_epic/pack/epics.pack.js"), "/e/src/components/__pack/epics.pack.js")
  equal(fileForPath(hub, "/_epic/nope/x"), undefined)
  // the templates are the engine's too (epic `epic-eject` T11), under each repo's prefix as at the root
  equal(fileForPath(hub, "/templates/durable.html"), "/e/templates/durable.html")
  equal(fileForPath(hub, "/r/other/templates/durable.html"), "/e/templates/durable.html")
  const checkout = { root: "/repo", worktrees: "/repo/.claude/worktrees" }
  equal(fileForPath(checkout, "/packages/x.ts"), "/repo/packages/x.ts")
  equal(fileForPath(checkout, "/worktrees/seo/epics/x.html"), "/repo/.claude/worktrees/seo/epics/x.html")
  equal(fileForPath({}, "/x"), undefined)
  // several worktrees folders (J28):  the first that holds the worktree, else the first
  const places = mkdtempSync(join(tmpdir(), "doc-urls-places-"))
  mkdirSync(join(places, "old", "stayed"), { recursive: true })
  const moved = { root: "/repo", worktreesFolders: [join(places, "new"), join(places, "old")] }
  equal(fileForPath(moved, "/worktrees/stayed/x.html"), join(places, "old", "stayed", "x.html"))
  equal(fileForPath(moved, "/worktrees/gone/x.html"), join(places, "new", "gone", "x.html"))
  rmSync(places, { recursive: true, force: true })
})

test("tabShows():  the whole title, or its first 24 characters and an ellipsis", () => {
  equal(tabShows("short", " short "), true)
  equal(tabShows("A very long session titl…", "A very long session title indeed"), true)
  equal(tabShows("A very long", "A very long session title indeed"), false)
})

test("windowsFolder():  SPELL_EPIC_WINDOWS_DIR, else ~/.spell-epic/windows -- never the spell extension's", () => {
  equal(windowsFolder({ SPELL_EPIC_WINDOWS_DIR: "/tmp/w" }, "/home/o"), "/tmp/w")
  equal(windowsFolder({}, "/home/o"), "/home/o/.spell-epic/windows")
})

test("folderIndex():  a window's folder by any spelling -- one reopened from the recent list after a move (I59)", () => {
  // `old/repo.worktrees -> ../new/repo.worktrees`:  the window holds the OLD spelling, a session asks by the real one
  const moved = mkdtempSync(join(tmpdir(), "doc-urls-moved-"))
  const real = join(realpathSync(moved), "new", "repo.worktrees", "seo")
  mkdirSync(real, { recursive: true })
  mkdirSync(join(moved, "old"))
  symlinkSync("../new/repo.worktrees", join(moved, "old", "repo.worktrees"))
  const folders = ["/repo", join(moved, "old", "repo.worktrees", "seo")]
  equal(folderIndex(folders, real), 1)
  equal(folderIndex(folders, join(moved, "old", "repo.worktrees", "seo")), 1)
  equal(folderIndex(folders, "/repo/"), 0)
  equal(folderIndex(folders, join(real, "..", "other")), -1)
  rmSync(moved, { recursive: true, force: true })
})
