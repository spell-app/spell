/**
 * Tests of the running epics' route module, in a scratch checkout with one worktree:
 * - the list as JSON
 * - the Epics page served with its card
 * - the watcher closed with the server
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"

import { EPIC_CARDS_END } from "spell/epic/list/EpicCards"
import { MARKER, type RunningEpic } from "spell/epic/list/RunningEpics"
import runningRoutes, { RUNNING_API } from "spell/epic/list/runningRoutes"

/** The Epics page's list, empty, as `docs index` writes it (`epicListHtml()`). */
const LIST = `<epic-list class="spell-epics">\n${MARKER}\n${EPIC_CARDS_END}\n</epic-list>`

/** Write `html` at `path` under `root`, making folders. */
function put(root: string, path: string, html: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), html)
}

describe("runningRoutes", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "epics-running-")))
  // no running sessions:  never this machine's (`RunningEpics.claudeHome`)
  const claudeHome = realpathSync(mkdtempSync(join(tmpdir(), "epics-running-claude-")))
  const home = process.env.CLAUDE_CONFIG_DIR
  const stops: (() => unknown)[] = []
  let server: PageServer
  let port: number

  beforeAll(async () => {
    process.env.CLAUDE_CONFIG_DIR = claudeHome
    put(root, "epics/index.html", `<html><head></head><body>${LIST}</body></html>\n`)
    put(
      root,
      ".claude/worktrees/seo/epics/seo/seo.plan.html",
      `<html><head><title>Epic: SEO</title></head><body class="plan-doc"><epic-page epic="seo">` +
        `<epic-phase id="p1" title="Meta Tags" status="active"></epic-phase></epic-page></body></html>\n`
    )
    server = new PageServer({ root })
    await runningRoutes.setup({ ...server.routeContext(), onStop: (stop) => stops.push(stop) })
    await server.start({ port: 0, routes: false, pidFile: false })
    port = server.info.port
  })

  afterAll(async () => {
    for (const stop of stops) await stop()
    await server.stop()
    if (home === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = home
    rmSync(root, { recursive: true, force: true })
    rmSync(claudeHome, { recursive: true, force: true })
  })

  test("answers the running epics as JSON at `/api/epics/running`, never cached;  the old path is gone", async () => {
    const answer = await ask(port, "GET", RUNNING_API)
    expect(answer.status).toBe(200)
    expect(answer.headers["cache-control"]).toBe("no-store")
    const list = JSON.parse(answer.text) as RunningEpic[]
    expect(list).toMatchObject([
      {
        name: "seo",
        worktree: "seo",
        title: "SEO",
        url: "/worktrees/seo/epics/seo/seo.plan.html",
        active: "P1 · Meta Tags"
      }
    ])
    expect((await ask(port, "GET", "/_server/epics")).status).toBe(404)
  })

  test("serves the Epics page with the running epic's card in its list", async () => {
    const page = (await ask(port, "GET", "/epics/index.html")).text
    expect(page).toMatch(/<epic-card id="epic-seo"[\s\S]*<!-- running-epics:end -->/)
    expect(page).toContain('href="/worktrees/seo/epics/seo/seo.plan.html"')
  })

  test("closes its watcher when the server stops", () => {
    expect(stops).toHaveLength(1)
  })
})

describe("runningRoutes, worktrees moved beside the repo (epic-eject P8)", () => {
  const top = realpathSync(mkdtempSync(join(tmpdir(), "epics-running-moved-")))
  const root = join(top, "repo")
  const claudeHome = realpathSync(mkdtempSync(join(tmpdir(), "epics-running-claude-")))
  const home = process.env.CLAUDE_CONFIG_DIR
  const stops: (() => unknown)[] = []
  let server: PageServer
  let port: number

  /** An epic page for epic `name`, at phase `phase`. */
  const page = (name: string, phase: string) =>
    `<html><head><title>Epic: ${name}</title></head><body class="plan-doc"><epic-page epic="${name}">` +
    `<epic-phase id="p1" title="${phase}" status="active"></epic-phase></epic-page></body></html>\n`

  beforeAll(async () => {
    process.env.CLAUDE_CONFIG_DIR = claudeHome
    put(root, ".epic/config.json5", '{ "worktreesFolder": "../repo.worktrees" }')
    put(root, "epics/index.html", `<html><head></head><body>${MARKER}</body></html>\n`)
    put(top, "repo.worktrees/new/epics/new/new.plan.html", page("new", "Beside"))
    put(root, ".claude/worktrees/old/epics/old/old.plan.html", page("old", "Nested"))
    server = new PageServer({ root })
    await runningRoutes.setup({ ...server.routeContext(), onStop: (stop) => stops.push(stop) })
    await server.start({ port: 0, routes: false, pidFile: false })
    port = server.info.port
  })

  afterAll(async () => {
    for (const stop of stops) await stop()
    await server.stop()
    if (home === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = home
    rmSync(top, { recursive: true, force: true })
    rmSync(claudeHome, { recursive: true, force: true })
  })

  test("lists the epics of both places, the new place first, each at /worktrees/<w>/", async () => {
    const list = JSON.parse((await ask(port, "GET", RUNNING_API)).text) as RunningEpic[]
    expect(list.map(({ name, url }) => [name, url])).toEqual([
      ["new", "/worktrees/new/epics/new/new.plan.html"],
      ["old", "/worktrees/old/epics/old/old.plan.html"]
    ])
  })

  test("serves both places' pages at /worktrees/<w>/:  the server takes both folders, the new place first", async () => {
    expect(server.info.worktreesFolders).toEqual([join(top, "repo.worktrees"), join(root, ".claude", "worktrees")])
    expect((await ask(port, "GET", "/worktrees/new/epics/new/new.plan.html")).text).toContain("Beside")
    expect((await ask(port, "GET", "/worktrees/old/epics/old/old.plan.html")).text).toContain("Nested")
    expect((await ask(port, "GET", "/worktrees/none/epics/x.html")).status).toBe(404)
  })
})

// epic `epic-eject` P12:  the module tells the page server where the repo's pages are, when it can be told
describe("runningRoutes, the content folder", () => {
  const top = realpathSync(mkdtempSync(join(tmpdir(), "epics-running-content-")))
  const root = join(top, "repo")
  afterAll(() => rmSync(top, { recursive: true, force: true }))

  test("hands the config's content folder to `serveContent()`;  a server without it is left as it was", async () => {
    put(root, ".epic/config.json5", '{ "contentFolder": "../repo.epics" }')
    put(top, "repo.epics/epics/index.html", `<html><body>${MARKER}</body></html>\n`)
    const served: string[] = []
    const stops: (() => unknown)[] = []
    const server = new PageServer({ root })
    const context = { ...server.routeContext(), onStop: (stop: () => unknown) => void stops.push(stop) }
    await runningRoutes.setup({ ...context, serveContent: (dir: string) => void served.push(dir) } as typeof context)
    expect(served).toEqual([join(top, "repo.epics")])
    // an older page server:  no `serveContent()`, nothing called, nothing thrown
    await runningRoutes.setup(context)
    for (const stop of stops) await stop()
  })
})
