/**
 * Tests of spell-epic's VS Code extension's pure parts (`vscode/src/docUrls.ts`):
 * - page URLs, which side bar tab a page goes to, the epic pages "Open Epic..." lists, the window's epic, where a
 *   served URL's file is
 * - a Claude tab's label, the bridge's registry folder, a window's folder by any spelling (`folderIndex()`)
 * - Plain `node --test` (types stripped):  the extension's own code needs `vscode`, these parts don't.
 */
import { deepEqual, equal } from "node:assert/strict"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"

import {
  DOC_VIEWS,
  docViewFor,
  docViewNamed,
  fileForPath,
  folderIndex,
  isLoopback,
  openingPage,
  planDocsIn,
  planDocsOf,
  samePage,
  serverBaseIn,
  SILENT_FRAME_RELOADS,
  silentFrameStep,
  stamped,
  tabShows,
  windowEpic,
  windowsFolder,
  worktreeEpic
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
  // a worktree's name through main's page server (epic `epic-engine` T167)
  equal(isLoopback("http://epic-engine.localhost:4747/x"), true)
  equal(isLoopback("http://seo--app.localhost:4747/"), true)
  equal(isLoopback("https://127.0.0.1/x"), false)
  equal(isLoopback("http://example.com/x"), false)
  equal(isLoopback("not a url"), false)
})

test("docViewFor():  details pages to Details, epic docs to Epic Docs, everything else to Review (epic `epic-engine` P59)", () => {
  const content = "/Users/o/www/spell/spell.epics"
  // an epic page and a saga page:  Review
  equal(docViewFor(`${content}/epics/data/data.plan.html`), "review")
  equal(docViewFor("/epics/data/data.plan.html"), "review")
  equal(docViewFor(`${content}/sagas/spell/spell.saga.html`), "review")
  equal(docViewFor(`${content}/goals/old/old.goal.html`), "review")
  // the Servers page:  Servers, under a worktree's address too (epic `epic-engine` T162)
  equal(docViewFor("/_epic/servers/"), "servers")
  equal(docViewFor("/worktrees/editor/_epic/servers/"), "servers")
  // details, review and choice pages:  Details (the choice page Owen lost, request r50)
  equal(docViewFor(`${content}/epics/data/details/data-words.html`), "details")
  equal(docViewFor(`${content}/pages/details/pick-layout.html`), "details")
  equal(docViewFor("/r/other/epics/seo/details/names.html"), "details")
  equal(docViewFor("C:\\spell.epics\\epics\\x\\details\\y.html"), "details")
  // the epic `details` keeps its epic page in a `details/` folder:  still Review
  equal(docViewFor(`${content}/epics/details/details.plan.html`), "review")
  equal(docViewFor(`${content}/epics/details/details/q.html`), "details")
  // guides, the home page, the list pages, an epic's parts:  Review, where Epic Docs held them until Q73
  equal(docViewFor(`${content}/guides/solid/solid-2.html`), "review")
  equal(docViewFor("/r/other/guides/server.html"), "review")
  equal(docViewFor(`${content}/pages/index.html`), "review")
  equal(docViewFor(`${content}/sagas/index.html`), "review")
  equal(docViewFor(`${content}/epics/data/parts/p1.html`), "review")
  // the epic tooling's READMEs, rendered by the page server:  Epic Docs, a worktree's address too
  equal(docViewFor("/_epic/docs/README-epics.md"), "docs")
  equal(docViewFor("/worktrees/data/_epic/docs/epic/README-setup.md"), "docs")
  equal(docViewFor(`${content}/guides/_epic/docs/x.html`), "review")
})

test("docViewNamed():  the three tabs' names", () => {
  deepEqual(["review", "details", "docs", "Docs", "", undefined, 1].map(docViewNamed), [
    "review",
    "details",
    "docs",
    undefined,
    undefined,
    undefined,
    undefined
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

test("worktreeEpic():  a worktree window's own epic, and none for the main checkout's (epic `epic-engine` I266)", () => {
  const content = join(top, "worktree-epic")
  epicPage(content, "data", "Data", 1_000)
  epicPage(content, "seo", "SEO", 5_000)
  equal(worktreeEpic("/Users/o/www/spell.worktrees/data", content), "data")
  equal(worktreeEpic("/Users/o/www/spell", content), undefined)
  equal(worktreeEpic(undefined, content), undefined)
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

test("serverBaseIn():  the base in what `epic server ensure` printed;  nothing, when it didn't come up (I192)", () => {
  equal(
    serverBaseIn('bundles:  current\n{\n  "port": 4747,\n  "base": "http://127.0.0.1:4747"\n}\n'),
    "http://127.0.0.1:4747"
  )
  equal(serverBaseIn("zsh: command not found: node"), undefined)
})

test("silentFrameStep():  a frame whose page never said where it is (epic `epic-engine` I309)", () => {
  // its server down (restarting):  wait for it
  equal(silentFrameStep({ serverUp: false, reloads: 0 }), "wait")
  equal(silentFrameStep({ serverUp: false, reloads: SILENT_FRAME_RELOADS }), "wait")
  // up:  load it again, a few times in a row, then say so
  equal(silentFrameStep({ serverUp: true, reloads: 0 }), "reload")
  equal(silentFrameStep({ serverUp: true, reloads: SILENT_FRAME_RELOADS - 1 }), "reload")
  equal(silentFrameStep({ serverUp: true, reloads: SILENT_FRAME_RELOADS }), "say")
})

test("openingPage():  a page asked for while a fresh view looks up its fallbacks wins (epic `epic-engine` I341)", async () => {
  const EPIC = "http://127.0.0.1:4747/epics/demo/demo.plan.html"
  const REMEMBERED = "http://127.0.0.1:4747/pages/index.html"
  // the checklist button pressed while the remembered page's server is looked for:  the press wins
  let asked: string | undefined
  const remembered = async () => {
    asked = EPIC
    return REMEMBERED
  }
  equal(await openingPage(() => asked, [remembered]), EPIC)
  // asked for before the view opened:  no fallback is even tried
  let tried = false
  equal(
    await openingPage(
      () => EPIC,
      [
        async () => {
          tried = true
          return REMEMBERED
        }
      ]
    ),
    EPIC
  )
  equal(tried, false)
  // nothing asked for:  the first fallback that has a page
  equal(await openingPage(() => undefined, [async () => undefined, async () => REMEMBERED]), REMEMBERED)
  equal(await openingPage(() => undefined, []), undefined)
})

/** The extension's manifest, and its doc views' source:  what the title bars show, and what answers each button. */
const MANIFEST = JSON.parse(readFileSync(join(import.meta.dirname, "../../vscode/package.json"), "utf8")) as {
  contributes: {
    commands: { command: string; title: string; category?: string }[]
    menus: Record<string, { command: string; when: string }[]>
    viewsContainers: Record<string, { id: string; title: string; icon: string }[]>
    views: Record<string, { id: string; name: string }[]>
    configuration?: { properties: Record<string, unknown> }
  }
}
const DOC_VIEW_SOURCE = readFileSync(join(import.meta.dirname, "../../vscode/src/DocView.ts"), "utf8")

test("title bars:  every tab's buttons, each a short plain tooltip, each answered (epic `epic-engine` I341)", () => {
  const titles = new Map(MANIFEST.contributes.commands.map((each) => [each.command, each]))
  const buttons = (view: string) =>
    MANIFEST.contributes.menus["view/title"]
      .filter((item) => item.when.split(" || ").includes(`view == spellEpic.${view}`))
      .map((item) => item.command)
      .filter((command) => command !== "spellEpic.toolbarGap")
  const tooltips = (view: string) => new Set(buttons(view).map((command) => titles.get(command)?.title))
  const COMMON = ["Back", "Forward", "Reload", "Open in Browser", "Restart Page Server"]
  deepEqual(tooltips("reviewView"), new Set([...COMMON, "Epics Home", "This Epic's Page"]))
  deepEqual(tooltips("detailsView"), new Set([...COMMON, "This Epic's Questions"]))
  deepEqual(tooltips("docsView"), new Set([...COMMON, "Epic Docs Home"]))
  const CATEGORY = { reviewView: "Review", detailsView: "Details", docsView: "Epic Docs" }
  for (const [view, category] of Object.entries(CATEGORY))
    for (const command of buttons(view)) {
      // the Command Palette names the tab by the category;  VS Code shows only the title as the tooltip
      equal(titles.get(command)?.category, category, command)
      // answered:  a command of every view (`COMMANDS`), or one registered by its own name
      const verb = command.split(".").at(-1)!
      const answered =
        new RegExp(`const COMMANDS = \\[[^\\]]*"${verb}"`).test(DOC_VIEW_SOURCE) ||
        DOC_VIEW_SOURCE.includes(`registerCommand("${command}"`)
      equal(answered, true, `${command} has no handler`)
    }
  // no Inspect button (Owen, 2026-11-18)
  equal(
    MANIFEST.contributes.menus["view/title"].some((item) => /inspect/i.test(item.command)),
    false
  )
})

test("four side-bar tabs:  Review (the Spell hat), Epic Docs (books on a shelf), Servers (a server, between Epic Docs and Details:  T162, I449), Details;  Owen, 2026-11-19", () => {
  const { contributes } = MANIFEST
  deepEqual(
    contributes.viewsContainers.secondarySidebar!.map((each) => [each.title, each.icon]),
    [
      ["Review", "media/spell.svg"],
      ["Epic Docs", "$(library)"],
      ["Servers", "$(server)"],
      ["Details", "$(comment-discussion)"]
    ]
  )
  // the hat ships in the .vsix
  equal(existsSync(join(import.meta.dirname, "../../vscode/media/spell.svg")), true)
  deepEqual(
    Object.values(contributes.views).flatMap((views) => views.map((view) => view.id)),
    ["spellEpic.reviewView", "spellEpic.docsView", "spellEpic.serversView", "spellEpic.detailsView"]
  )
  // NOT the first Epic Docs tab's id, nor its setting (epic `epic-engine` Q73):  a new view, with its own place
  const everything = JSON.stringify(contributes)
  equal(everything.includes("spellEpic.docView."), false)
  equal(contributes.configuration?.properties["spellEpic.docPreview.location"], undefined)
  // and the views the source makes are the manifest's, in its order
  deepEqual(DOC_VIEWS, ["review", "servers", "details", "docs"])
  for (const view of [...contributes.views["spell-epic-docs"]!, ...contributes.views["spell-epic-servers"]!])
    equal(DOC_VIEW_SOURCE.includes(`"${view.id}"`), true)
})
