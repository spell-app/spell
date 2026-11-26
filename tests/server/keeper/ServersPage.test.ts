import { mkdirSync, mkdtempSync, realpathSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout } from "spell/server/test/checkouts"
import { ask } from "spell/server/test/serve"

import {
  LOG_LINES,
  ServerKeeper,
  lastLines,
  lastWorkedOn,
  type KeptServer,
  type PageServerControl
} from "spell/server/keeper"

describe("the Spell Servers page:  how each server stands, its log, the page itself (epic `editor` P49)", () => {
  let folder: string
  let kit: string
  let web: SRV.WebServer
  let up: boolean

  /** main's page server, in memory:  up while `up`, building the docs bundle, up since 11:00 */
  const control: PageServerControl = {
    status: async () => (up ? info() : undefined),
    ensure: async () => {
      const launched = !up
      up = true
      return { ...info(), launched }
    },
    stop: async () => {
      const was = up
      up = false
      return was
    }
  }
  const info = (): SRV.RunningServer => ({
    pid: 1,
    port: 4747,
    root: kit,
    started: "2026-11-25T11:00:00.000Z",
    base: "http://127.0.0.1:4747",
    building: ["epic-docs"]
  })

  beforeEach(async () => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "servers-page-")))
    kit = fakeMainCheckout(join(folder, "kit"))
    mkdirSync(join(kit, "src/server/page"), { recursive: true })
    mkdirSync(join(kit, "assets"), { recursive: true })
    writeFileSync(join(kit, "repos.json5"), "{}\n")
    writeFileSync(join(kit, "src/server/page/cli.ts"), "\n")
    writeFileSync(join(kit, "assets/spell-ui.js"), "// Spell UI\n")
    writeFileSync(
      join(kit, "package.json"),
      JSON.stringify({
        name: "kit",
        pageServer: { uiScript: "/_epic/assets/spell-ui.js", engineRoutes: { "/_epic/assets/": "assets" } }
      })
    )
    up = true
    web = new SRV.WebServer({ root: folder })
  })

  afterEach(async () => {
    await web.close()
    rmSync(folder, { recursive: true, force: true })
  })

  /** a keeper over the fake kit, routed on `web`, listening */
  const keeper = async () => {
    const kept = new ServerKeeper({
      home: join(folder, "home"),
      repos: [{ name: "spell", checkout: kit }],
      control,
      editorKept: () => false
    })
    kept.route(web.router, web.guard)
    await web.listen({ port: 0 })
    await kept.look()
    return kept
  }

  it("a page server's row says when it started, what it's building, and where its log is", async () => {
    const kept = await keeper()
    expect(kept.servers().find((row) => row.id === "spell/page server")).toMatchObject({
      state: "running",
      started: "2026-11-25T11:00:00.000Z",
      building: ["epic-docs"],
      log: join(kit, ".spell-server.log")
    })
    expect(kept.servers().find((row) => row.id === "spell/editor")).toMatchObject({
      log: join(kit, ".spell-server.editor.log")
    })
  })

  it("GET /api/servers/log:  the last 50 lines, colours out;  none yet, or no such server:  []", async () => {
    await keeper()
    const id = encodeURIComponent("spell/page server")
    expect(JSON.parse((await ask(web.port, "GET", `/api/servers/log?id=${id}`)).text)).toMatchObject({ lines: [] })
    const lines = Array.from({ length: 80 }, (_, index) => `\x1b[2mpage server\x1b[0m line ${index + 1}`)
    writeFileSync(join(kit, ".spell-server.log"), `${lines.join("\n")}\n`)
    const answer = JSON.parse((await ask(web.port, "GET", `/api/servers/log?id=${id}`)).text)
    expect(answer.lines).toHaveLength(LOG_LINES)
    expect(answer.lines.at(0)).toBe("page server line 31")
    expect(answer.lines.at(-1)).toBe("page server line 80")
    expect(JSON.parse((await ask(web.port, "GET", "/api/servers/log?id=nothing")).text)).toEqual({
      id: "nothing",
      lines: []
    })
  })

  it("GET /servers/:  the page, told its token and Spell UI's address;  the script and Spell UI served beside it", async () => {
    await keeper()
    const page = await ask(web.port, "GET", "/servers/")
    expect(page.status).toBe(200)
    expect(page.text).toContain(
      `window.SPELL_KEEPER = {"token":"${web.guard.token}","uiScript":"/_epic/assets/spell-ui.js"`
    )
    expect((await ask(web.port, "GET", "/servers/servers.js")).text).toContain("function drawCards")
    expect((await ask(web.port, "GET", "/_epic/assets/spell-ui.js")).text).toBe("// Spell UI\n")
    expect((await ask(web.port, "GET", "/servers")).status).toBe(302)
  })

  it("without Spell UI's bundle on disk, the page is told none, and draws a plain table", async () => {
    rmSync(join(kit, "assets/spell-ui.js"))
    await keeper()
    const page = await ask(web.port, "GET", "/servers/")
    expect(page.text).toContain("window.SPELL_KEEPER = {")
    expect(page.text).not.toContain('"uiScript"')
  })

  it("lastLines():  a long log read from its end only;  missing:  []", () => {
    const log = join(folder, "long.log")
    writeFileSync(log, `${"x".repeat(200_000)}\nlast but one\nlast\n`)
    expect(lastLines(log, 2)).toEqual(["last but one", "last"])
    expect(lastLines(join(folder, "none.log"), 2)).toEqual([])
  })
})

describe("the Spell Servers page's sections and cards (epic `editor` I374)", () => {
  /** a server as `/api/servers` lists it:  of `worktree` (none:  a main checkout's), used at `used` */
  const server = (name: string, worktree?: string, used?: string): KeptServer => ({
    id: `spell/${worktree ? `${worktree}/` : ""}${name}`,
    repo: "spell",
    name,
    what: "",
    checkout: "/kit",
    state: "running" as const,
    canStart: true,
    ...(worktree && { worktree }),
    ...(used && { used })
  })

  it("sections():  This Mac, Spell (capital S), then Epics, its worktrees the one used most recently first", async () => {
    const { sections } = await import("spell/server/keeper/servers.js")
    const keeper = { ...server("server keeper"), repo: "" }
    const shown = sections([
      keeper,
      server("page server"),
      server("editor"),
      server("page server", "old", "2026-11-20T10:00:00.000Z"),
      server("page server", "busy", "2026-11-26T10:00:00.000Z"),
      server("editor", "busy"),
      server("page server", "never")
    ])
    expect(shown.map(({ heading, level, servers }) => [heading, level, servers.length])).toEqual([
      ["This Mac", 2, 1],
      ["Spell", 2, 2],
      ["Epics", 2, 0],
      ["⎇ busy", 3, 2],
      ["⎇ old", 3, 1],
      ["⎇ never", 3, 1]
    ])
    // no worktree:  no Epics heading;  another repo keeps its own name
    expect(sections([{ ...server("page server"), repo: "acme" }]).map(({ heading }) => heading)).toEqual(["acme"])
  })

  it("factsOf():  what it's for and how long it's been up, the name's tooltip", async () => {
    const { factsOf } = await import("spell/server/keeper/servers.js")
    const up: KeptServer = { ...server("page server"), what: "epic pages", started: "2026-11-26T10:00:00.000Z" }
    expect(factsOf(up, Date.parse("2026-11-26T10:06:00.000Z"))).toBe("epic pages\nUp for 6\u00a0min")
    expect(factsOf({ ...up, state: "stopped", why: "stopped by hand" })).toBe(
      "epic pages\nNot running\nstopped by hand"
    )
  })

  it("lastWorkedOn():  a worktree's newest git work, from its git folder's HEAD log and index;  none:  undefined", () => {
    const folder = realpathSync(mkdtempSync(join(tmpdir(), "worked-on-")))
    try {
      const own = join(folder, "main/.git/worktrees/seo")
      mkdirSync(join(own, "logs"), { recursive: true })
      mkdirSync(join(folder, "seo"))
      writeFileSync(join(folder, "seo/.git"), `gitdir: ${own}\n`)
      writeFileSync(join(own, "logs/HEAD"), "x\n")
      writeFileSync(join(own, "index"), "x\n")
      utimesSync(join(own, "logs/HEAD"), new Date("2026-11-20T10:00:00Z"), new Date("2026-11-20T10:00:00Z"))
      utimesSync(join(own, "index"), new Date("2026-11-25T10:00:00Z"), new Date("2026-11-25T10:00:00Z"))
      expect(lastWorkedOn(join(folder, "seo"))).toBe("2026-11-25T10:00:00.000Z")
      expect(lastWorkedOn(join(folder, "nowhere"))).toBeUndefined()
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
