import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"

import { EPIC_CARDS_END } from "spell-epic/list/EpicCards"
import {
  MARKER,
  RunningEpics,
  sessionsTitledFor,
  titleNames,
  type TitledSession,
  type RunningEpic
} from "spell-epic/list/RunningEpics"
import runningRoutes from "spell-epic/list/runningRoutes"

/**
 * An epic page in `<epic-*>` markup with `phases`, each `[status, header]` (`P2 · Title`), `updated` that day.
 * - its phase tags spread over lines, as oxfmt writes them
 */
function planDoc(title: string, phases: [string, string][] = [], updated?: string): string {
  const tags = phases.map(
    ([status, header], i) =>
      `<epic-phase\n  id="p${i + 1}"\n  title="${header.replace(/^P\d+ · /, "")}"\n  status="${status}"\n></epic-phase>`
  )
  const page = `<epic-page epic="x"${updated ? `\n  updated="${updated}"` : ""}\n>`
  return (
    `<!doctype html><html><head><title>${title}</title></head><body class="spell-doc-page plan-doc">${page}` +
    `<epic-section id="phases" kind="phases">${tags.join("\n")}</epic-section></epic-page></body></html>\n`
  )
}

/** The Epics page's list as `docs index` writes it (`epicListHtml()`), holding `cards`. */
function list(cards: string): string {
  return `<epic-list class="spell-epics">\n${MARKER}\n${cards}\n${EPIC_CARDS_END}\n</epic-list>`
}

/** Write `html` at `path` under `root`, making folders. */
function put(root: string, path: string, html: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), html)
}

describe("RunningEpics", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-")))
  // no running sessions but the ones a test writes:  never this machine's (`RunningEpics.claudeHome`)
  const claudeHome = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-claude-")))
  const home = process.env.CLAUDE_CONFIG_DIR
  let server: PageServer
  let port: number

  beforeAll(async () => {
    process.env.CLAUDE_CONFIG_DIR = claudeHome
    writeFileSync(join(root, "package.json"), JSON.stringify({ pageServer: { watch: ["pages", "epics"] } }))
    put(root, "epics/index.html", `<html><head></head><body><h1>Epics</h1>${list("")}</body></html>\n`)
    // merged into the main checkout:  a worktree's copy of it is stale, never listed
    put(root, "epics/old/old.html", planDoc("Old"))
    put(root, ".claude/worktrees/seo/epics/old/old.html", planDoc("Old, stale"))
    // the worktree's own epic, mid-way;  and one planning, in another worktree
    put(
      root,
      ".claude/worktrees/seo/epics/seo/seo.plan.html",
      planDoc("SEO &amp; co", [
        ["done", "P1 · Meta Tags"],
        ["active", "P2 · Site Map"],
        ["todo", "P3 · Doc Review"]
      ])
    )
    // a worktree cut before the rename to `<name>.plan.html` and the move into `content/`:
    // its epic page under the old name and folder still counts;
    // a page of that name that isn't an epic page doesn't
    put(root, ".claude/worktrees/vite/packages/docs/epics/vite/vite.html", planDoc("Vite"))
    put(root, ".claude/worktrees/vite/packages/docs/epics/notes/notes.html", "<html><body>notes</body></html>\n")
    // the page server as it runs:  its `/worktrees/` mount, and epics' route module for the running epics
    server = new PageServer({ root })
    await runningRoutes.setup(server.routeContext())
    await server.start({ port: 0, routes: false, pidFile: false })
    port = server.info.port
  })

  afterAll(async () => {
    await server.stop()
    if (home === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = home
    rmSync(root, { recursive: true, force: true })
    rmSync(claudeHome, { recursive: true, force: true })
  })

  it("lists each worktree's own epic, and any the main checkout lacks;  never stale copies", () => {
    const expected: RunningEpic[] = [
      {
        name: "seo",
        worktree: "seo",
        url: "/worktrees/seo/epics/seo/seo.plan.html",
        title: "SEO & co",
        phases: ["done", "active", "todo"],
        done: 1,
        total: 3,
        active: "P2 · Site Map"
      },
      {
        name: "vite",
        worktree: "vite",
        url: "/worktrees/vite/packages/docs/epics/vite/vite.html",
        title: "Vite",
        phases: [],
        done: 0,
        total: 0
      }
    ]
    expect(new RunningEpics(root).list()).toEqual(expected)
  })

  it("serves them under `/worktrees/`, and the list as JSON", async () => {
    const doc = await ask(port, "GET", "/worktrees/seo/epics/seo/seo.plan.html")
    expect(doc.status).toBe(200)
    expect(doc.text).toContain("SEO &amp; co")
    const list = JSON.parse((await ask(port, "GET", "/api/epics/running")).text) as RunningEpic[]
    expect(list.map((epic) => epic.name)).toEqual(["seo", "vite"])
  })

  it("gives a worktree's page that worktree's badge", async () => {
    const doc = await ask(port, "GET", "/worktrees/seo/epics/seo/seo.plan.html")
    const config = JSON.parse(/window\.SPELL_SERVER = (.*?)<\/script>/.exec(doc.text)![1]!) as { worktree?: string }
    expect(config.worktree).toBe("seo")
  })

  it("reports a worktree's rebuilt page assets, so its pages here hot-reload;  not its other code", async () => {
    const changed = vi.spyOn(server.web.live!, "changed")
    const worktree = join(root, ".claude/worktrees/seo")
    const assets = ["packages/epics/tools/_assets/spell-ui.js", "packages/epics/components/__pack/epics.pack.js"]
    put(worktree, "packages/epics/src/list/RunningEpics.ts", "// code\n")
    for (const asset of assets) put(worktree, asset, "// rebuilt\n")
    await vi.waitFor(() =>
      expect(changed.mock.calls.map(([file]) => file)).toEqual(
        expect.arrayContaining(assets.map((asset) => join(worktree, asset)))
      )
    )
    expect(changed.mock.calls.some(([file]) => file.endsWith(".ts"))).toBe(false)
    changed.mockRestore()
  })

  it("still refuses dot paths inside a worktree", async () => {
    put(root, ".claude/worktrees/seo/.env", "SECRET=1")
    expect((await ask(port, "GET", "/worktrees/seo/.env")).status).toBe(403)
  })

  it("adds the running epics' cards to the Epics list, before its end marker:  their facts, link and meta line", async () => {
    const index = (await ask(port, "GET", "/epics/index.html")).text
    expect(index).toContain(MARKER)
    const seo = /<epic-card id="epic-seo"[\s\S]*?<\/epic-card>/.exec(index)?.[0] ?? ""
    expect(seo).toContain(' epic="seo" data-status="open" phases="done active todo"')
    expect(seo).toContain(' active="P2 · Site Map"')
    expect(seo).toContain(`<a href="/worktrees/seo/epics/seo/seo.plan.html" target="seo">SEO &amp; co</a>`)
    expect(seo).toContain(`<span slot="meta">P2 · Site Map · .claude/worktrees/seo</span>`)
    // no phases yet
    expect(index).toMatch(/<epic-card id="epic-vite" epic="vite" data-status="open" phases=""/)
    expect(index.indexOf('id="epic-seo"')).toBeLessThan(index.indexOf(EPIC_CARDS_END))
  })

  it("drops a merged epic's card when the epic runs in a worktree;  marks a running one `running`", () => {
    // the closing tag split over lines, as oxfmt writes it
    const page = list(
      `<epic-card id="epic-seo" epic="seo" data-status="done" phases="done">old</epic-card\n  >\n` +
        `<epic-card id="epic-other" epic="other" phases="">x</epic-card>`
    )
    const html = new RunningEpics(root).render(page)
    expect(html).not.toContain(">old<")
    expect(html).toContain('epic="other"')
    expect(html.match(/epic="seo"/g)).toHaveLength(1)
    const stale = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-stale-")))
    try {
      put(
        stale,
        ".claude/worktrees/slow/packages/docs/epics/slow/slow.html",
        planDoc(
          "Slow",
          [
            ["done", "P1 · One"],
            ["todo", "P2 · Two"]
          ],
          "2026-01-01"
        )
      )
      expect(new RunningEpics(stale).list()[0]?.updated).toBe("2026-01-01")
      // its card says the facts:  the card draws itself paused, from `updated`
      const quiet = new RunningEpics(stale).render(list(""))
      expect(quiet).toContain(
        '<epic-card id="epic-slow" epic="slow" data-status="open" phases="done todo" updated="2026-01-01"'
      )
      expect(quiet).not.toContain("<epic-card running")
      // a session working in its worktree (this process:  alive):  `running`, so in progress however old the doc
      put(
        stale,
        "claude/sessions/1.json",
        JSON.stringify({
          pid: process.pid,
          sessionId: "s1",
          cwd: join(stale, ".claude/worktrees/slow/packages"),
          name: "🚧 other"
        })
      )
      const running = new RunningEpics(stale, { claudeHome: join(stale, "claude") })
      expect(running.runningNames()).toEqual(new Set(["slow", "other"]))
      expect(running.render(list(""))).toContain('<epic-card running id="epic-slow" epic="slow"')
      // a written card a session runs for (`other`, by its title) is marked too
      expect(running.render(list(`<epic-card id="epic-other" epic="other" phases="todo">x</epic-card>`))).toContain(
        '<epic-card id="epic-other" epic="other" phases="todo" running>'
      )
    } finally {
      rmSync(stale, { recursive: true, force: true })
    }
  })

  // epic `epic-components` P8:  converted docs say it in attributes
  // (the old markup read no more since P15)
  it("reads an epic page in <epic-*> markup:  phases, the active one's label, the page's updated date", () => {
    const fresh = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-new-")))
    try {
      put(
        fresh,
        ".claude/worktrees/neat/epics/neat/neat.plan.html",
        `<!doctype html><html><head><title>Epic: Neat &amp; Tidy</title></head><body class="spell-doc-page plan-doc">` +
          `<epic-page\n  epic="neat"\n  title="Neat &amp; Tidy"\n  updated="2026-10-06"\n>` +
          `<epic-section id="phases" kind="phases"><epic-phase id="p1" title="One" status="done"></epic-phase>` +
          `<epic-phase\n  id="p2"\n  title="Two &amp; Three"\n  status="active"\n  source="parts/p2.html"\n></epic-phase>` +
          `<epic-phase id="p3" title="Four" status="todo"></epic-phase></epic-section></epic-page></body></html>\n`
      )
      expect(new RunningEpics(fresh).list()[0]).toMatchObject({
        title: "Neat & Tidy",
        done: 1,
        total: 3,
        active: "P2 · Two & Three",
        updated: "2026-10-06"
      })
    } finally {
      rmSync(fresh, { recursive: true, force: true })
    }
  })

  // the ONE rule, `EpicState`, as the Epics list page and `<epic-page>` draw it (epic `airplane` P8):  the card draws
  // its state from these facts (`<epic-card>`, epic `epic-engine` P3)
  it("writes a future epic `future`;  every phase done:  `urgent` items while they need Owen, else done", () => {
    const quiet = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-quiet-")))
    try {
      put(
        quiet,
        ".claude/worktrees/idea/epics/idea/idea.plan.html",
        `<html><head><title>Epic: Idea</title></head><body><epic-page\n  epic="idea"\n  future\n></epic-page></body></html>\n`
      )
      for (const name of ["calm", "loud"]) {
        put(
          quiet,
          `.claude/worktrees/${name}/epics/${name}/${name}.plan.html`,
          `<html><head><title>Epic: ${name}</title></head><body><epic-page epic="${name}">` +
            `<epic-section id="phases" kind="phases"><epic-phase id="p1" title="One" status="done"></epic-phase>` +
            `<epic-phase id="p2" title="Two" status="done"></epic-phase></epic-section>` +
            `<epic-section id="issues" kind="issues"><epic-item id="i1" title="A" status="open" state="open">` +
            `</epic-item>${name === "loud" ? `<epic-item\n  id="i2"\n  status="open"\n  state="attention"\n></epic-item>` : ""}` +
            `</epic-section><epic-section id="questions" kind="questions"><epic-item id="q1" status="open" ` +
            `state="${name === "loud" ? "replied" : "recent"}"></epic-item></epic-section></epic-page></body></html>\n`
        )
      }
      const epics = new RunningEpics(quiet)
      expect(epics.list()).toMatchObject([
        { name: "calm", total: 2, done: 2 },
        { name: "idea", future: true, total: 0 },
        { name: "loud", total: 2, done: 2, urgent: ["i2", "q1"] }
      ])
      expect(epics.list()[0]).not.toHaveProperty("urgent")
      const html = epics.render(list(""))
      expect(html).toContain('<epic-card id="epic-idea" epic="idea" data-status="open" phases="" future>')
      expect(html).toContain('<epic-card id="epic-calm" epic="calm" data-status="done" phases="done done">')
      expect(html).toContain(
        '<epic-card id="epic-loud" epic="loud" data-status="open" phases="done done" urgent="i2 q1">'
      )
    } finally {
      rmSync(quiet, { recursive: true, force: true })
    }
  })

  it("marks every written card `favorite` as the favourites are now;  a value naming a mark is left alone", () => {
    const starred = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-stars-")))
    try {
      put(starred, "epics/favorites.json", JSON.stringify(["zed"]))
      const page = list(
        `<epic-card id="epic-alpha" epic="alpha" phases="todo" active="P1 · running favorite" favorite>A</epic-card>\n` +
          `<epic-card\n  id="epic-zed"\n  epic="zed"\n  phases="todo"\n>Z &amp; $& co</epic-card\n>`
      )
      const html = new RunningEpics(starred).render(page)
      expect(html).toContain('<epic-card id="epic-alpha" epic="alpha" phases="todo" active="P1 · running favorite">A<')
      expect(html).toContain('<epic-card id="epic-zed" epic="zed" phases="todo" favorite>Z &amp; $& co</epic-card\n>')
    } finally {
      rmSync(starred, { recursive: true, force: true })
    }
  })

  it("carries a merged card's last-worked moment to the running one;  its saga from any written card naming it", () => {
    const grouped = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-groups-")))
    try {
      put(
        grouped,
        ".claude/worktrees/seo/epics/seo/seo.plan.html",
        planDoc("SEO", [["active", "P1 · Go"]], "2026-10-01").replace("<epic-page", '<epic-page saga="epics"')
      )
      put(
        grouped,
        ".claude/worktrees/seo/epics/seo/parts/log.html",
        `<epic-event at="2026-10-08T09:15-04:00">P1 active</epic-event>\n`
      )
      const page = list(
        `<epic-card id="epic-seo" epic="seo" phases="done" worked="2026-10-09T20:00-04:00">old</epic-card>\n` +
          `<epic-card id="epic-other" epic="other" phases="todo" saga="epics" saga-title="Epic Tooling" ` +
          `saga-purpose="E &amp; co">x</epic-card>`
      )
      const html = new RunningEpics(grouped).render(page, new Date(2026, 9, 9))
      expect(html.match(/epic="seo"/g)).toHaveLength(1)
      // last worked:  the merged card's beat the doc's log line
      // (its branch's commit, as `docs index` read it)
      // the same moment, in whatever time zone this machine writes it in
      const seo = /<epic-card id="epic-seo"[^>]*>/.exec(html)?.[0] ?? ""
      const worked = / worked="([^"]+)"/.exec(seo)?.[1]
      expect(worked && new Date(worked).toISOString()).toBe(new Date("2026-10-09T20:00-04:00").toISOString())
      expect(new RunningEpics(grouped).list()[0]?.worked).toBe(new Date("2026-10-08T09:15-04:00").toISOString())
      // its saga (epic `epic-workflow` P15):  this leaf can't read the sagas' list, a written card names it
      expect(new RunningEpics(grouped).list()[0]?.saga).toBe("epics")
      expect(seo).toContain(' saga="epics" saga-title="Epic Tooling" saga-purpose="E &amp; co"')
      expect(html.indexOf('id="epic-seo"')).toBeLessThan(html.indexOf(EPIC_CARDS_END))
    } finally {
      rmSync(grouped, { recursive: true, force: true })
    }
  })

  it("leaves a page without its list as it is:  no marker, or an index written before the list", () => {
    const old = `${MARKER}\n<div class="spell-epic-group" data-group="active"><ui-cards><ui-card data-epic="a"></ui-card></ui-cards></div>\n${EPIC_CARDS_END}`
    expect(new RunningEpics(root).render(old)).toBe(old)
    expect(new RunningEpics(root).render("<p>no marker</p>")).toBe("<p>no marker</p>")
    const empty = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-none-")))
    try {
      expect(new RunningEpics(empty).render(list(""))).toBe(list(""))
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })
})

// shared content (epics `shared-content`, `claude-design` P4):
// every checkout's `epics` is a link to the same folder;
// a checkout on older code reaches it through its `packages/docs/content` link and the old-path links
describe("RunningEpics, shared content", () => {
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "srv-epics-shared-")))
  afterAll(() => rmSync(temp, { recursive: true, force: true }))

  it("links a worktree's epic through the main checkout's own URL, whichever layout the worktree has", () => {
    const root = join(temp, "spell-app")
    put(temp, "spell-app-dev/epics/wt/wt.plan.html", planDoc("Shared", [["active", "P1 · Go"]]))
    put(temp, "spell-app-dev/epics/done/done.plan.html", planDoc("Done"))
    mkdirSync(join(temp, "spell-app-dev/packages/docs/content"), { recursive: true })
    symlinkSync("../../../epics", join(temp, "spell-app-dev/packages/docs/content/epics"))
    mkdirSync(root, { recursive: true })
    symlinkSync(join(temp, "spell-app-dev/epics"), join(root, "epics"))
    for (const worktree of ["wt", "older"]) {
      const checkout = join(root, ".claude/worktrees", worktree)
      mkdirSync(join(checkout, "packages/docs"), { recursive: true })
      if (worktree === "wt") symlinkSync(join(temp, "spell-app-dev/epics"), join(checkout, "epics"))
      else symlinkSync(join(temp, "spell-app-dev/packages/docs/content"), join(checkout, "packages/docs/content"))
    }
    const epics = new RunningEpics(root).list()
    expect(epics.map(({ name, worktree, url }) => ({ name, worktree, url }))).toEqual([
      { name: "wt", worktree: "wt", url: "/epics/wt/wt.plan.html" }
    ])
  })

  // epic `epic-eject` P12:  the content folder the config names, and no checkout links it in
  it("reads the content folder the config names, with no links:  the Epics page, each worktree's", () => {
    const root = join(temp, "repo")
    const content = join(temp, "repo.epics")
    put(content, "epics/wt/wt.plan.html", planDoc("Shared", [["active", "P1 · Go"]]))
    put(content, "epics/index.html", "<h1>Epics</h1>")
    put(root, ".epic/config.json5", '{ "contentFolder": "../repo.epics", "worktreesFolder": "../repo.worktrees" }')
    mkdirSync(join(temp, "repo.worktrees", "wt"), { recursive: true })
    const running = new RunningEpics(root)
    expect(running.epics).toBe(join(content, "epics"))
    expect(running.isIndex(join(content, "epics", "index.html"))).toBe(true)
    expect(running.list().map(({ name, worktree, url }) => ({ name, worktree, url }))).toEqual([
      { name: "wt", worktree: "wt", url: "/epics/wt/wt.plan.html" }
    ])
  })
})

// epic `airplane` P12:  which running session an epic page's "start a review" types into
describe("sessions titled for an epic", () => {
  it("names it as its bare title, or as a whole word;  never inside a longer name", () => {
    expect(titleNames("🚧 airplane", "airplane")).toBe(true)
    expect(titleNames("⏸️ airplane", "airplane")).toBe(true)
    expect(titleNames("airplane", "airplane")).toBe(true)
    expect(titleNames("review the airplane epic", "airplane")).toBe(true)
    expect(titleNames("🚧 airplane-mode", "airplane")).toBe(false)
    expect(titleNames("🚧 seo", "airplane")).toBe(false)
    expect(titleNames("", "airplane")).toBe(false)
  })

  it("keeps the matching sessions, in order", () => {
    const session = (title: string, pid: number): TitledSession => ({
      pid,
      sessionId: "",
      title,
      status: "idle",
      cwd: ""
    })
    const all = [session("🚧 seo", 1), session("🚧 airplane", 2), session("airplane notes", 3)]
    expect(sessionsTitledFor("airplane", all).map((each) => each.pid)).toEqual([2, 3])
    expect(sessionsTitledFor("docs", all)).toEqual([])
  })
})
