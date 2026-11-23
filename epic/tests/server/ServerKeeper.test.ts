import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { createServer, type Server } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

import { IDLE_MINUTES, ServerKeeper, type PageServerControl } from "spell/epic/server/ServerKeeper"
import type { Repo } from "spell/epic/server/server.types"

describe("ServerKeeper:  every project's servers kept up (epic `epic-engine` P82)", () => {
  let folder: string
  let main: string
  let repo: Repo
  let servers: FakeServers
  let now: number

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "server-keeper-")))
    main = fakeMainCheckout(join(folder, "kit"))
    // a Spell kit:  its marker and its page server's command line
    mkdirSync(join(main, "src/server/page"), { recursive: true })
    writeFileSync(join(main, "repos.json5"), "{}\n")
    writeFileSync(join(main, "src/server/page/cli.ts"), "\n")
    mkdirSync(join(main, ".epic"), { recursive: true })
    writeFileSync(join(main, ".epic/config.json5"), `{ worktreesFolder: "../worktrees" }\n`)
    repo = { name: "kit", checkout: main, content: join(folder, "kit.epics"), prefix: "/r/kit/", isDefault: true }
    servers = new FakeServers()
    now = Date.parse("2026-11-23T12:00:00Z")
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  /** a keeper over `repo`, the fake page servers and the clock */
  const keeper = () =>
    new ServerKeeper({ home: join(folder, "home"), repos: [repo], control: servers.control, now: () => now })

  /** the row of `id` */
  const rowOf = (kept: ServerKeeper, id: string) => kept.servers().find((row) => row.id === id)

  it("start:  main's page server down is started, and the row says so", async () => {
    const kept = keeper()
    await kept.look()
    expect(servers.ensured).toEqual([main])
    expect(rowOf(kept, "kit/page server")).toMatchObject({ state: "running", why: "started:  it was down" })
  })

  it("restart:  a page server older than its code comes back on the new code;  a current one is left alone", async () => {
    servers.running.add(main)
    const kept = keeper()
    await kept.look()
    expect(rowOf(kept, "kit/page server")).toMatchObject({ state: "running" })
    expect(rowOf(kept, "kit/page server")?.why).toBeUndefined()
    servers.stale.add(main)
    await kept.look()
    expect(rowOf(kept, "kit/page server")).toMatchObject({ why: "restarted on main's new code" })
  })

  it("a stop by hand is HELD:  the keeper leaves it stopped until Start", async () => {
    servers.running.add(main)
    const kept = keeper()
    await kept.act("stop", main)
    expect(servers.running.has(main)).toBe(false)
    servers.ensured = []
    await kept.look()
    expect(servers.ensured).toEqual([])
    expect(rowOf(kept, "kit/page server")).toMatchObject({ state: "stopped" })
    expect(kept.dot()).toEqual({ dot: false })
    expect(await kept.act("start", main)).toMatchObject({ state: "running", launched: true })
    await kept.look()
    expect(rowOf(kept, "kit/page server")).toMatchObject({ state: "running" })
  })

  it("restart, asked:  stopped as a restart, then started", async () => {
    servers.running.add(main)
    await keeper().act("restart", main)
    expect(servers.stops).toEqual([{ checkout: main, restart: true }])
    expect(servers.running.has(main)).toBe(true)
  })

  it(`idle stop:  a worktree's page server unused for ${IDLE_MINUTES} minutes, with no page open, is stopped`, async () => {
    const worktree = fakeWorktree(main, join(folder, "worktrees", "seo"))
    writeFileSync(join(worktree, ".spell-server.json"), "{}\n")
    servers.running.add(worktree)
    servers.lastRequest.set(worktree, new Date(now - 10 * 60_000).toISOString())
    const kept = keeper()
    await kept.look()
    expect(rowOf(kept, "kit/seo/page server")).toMatchObject({ state: "running", worktree: "seo" })
    now += IDLE_MINUTES * 60_000
    await kept.look()
    expect(servers.running.has(worktree)).toBe(false)
    expect(rowOf(kept, "kit/seo/page server")).toMatchObject({
      state: "stopped",
      why: "stopped after 30 minutes unused"
    })
    // a worktree's on demand:  no red dot for it
    expect(kept.dot()).toEqual({ dot: false })
  })

  it("a page open keeps a worktree's server up, however long since its last request", async () => {
    const worktree = fakeWorktree(main, join(folder, "worktrees", "seo"))
    writeFileSync(join(worktree, ".spell-server.json"), "{}\n")
    servers.running.add(worktree)
    servers.pages.set(worktree, 1)
    servers.lastRequest.set(worktree, new Date(now - 3 * 3_600_000).toISOString())
    await keeper().look()
    expect(servers.running.has(worktree)).toBe(true)
  })

  it("a project's own servers:  watched by port;  started by its command;  one without, down and shown", async () => {
    const holder: Server = createServer()
    await new Promise<void>((done) => holder.listen(0, "127.0.0.1", done))
    const port = (holder.address() as { port: number }).port
    const marker = join(folder, "proxy-started")
    const nothingThere = await SRV.freePort()
    writeFileSync(
      join(main, ".epic/config.json5"),
      JSON.stringify({
        worktreesFolder: "../worktrees",
        servers: [
          { name: "proxy server", check: String(port), what: "the outside API" },
          { name: "mail catcher", check: String(nothingThere), start: `touch ${JSON.stringify(marker)}` }
        ]
      })
    )
    servers.running.add(main)
    try {
      const kept = keeper()
      await kept.look()
      expect(rowOf(kept, "kit/proxy server")).toMatchObject({ state: "running", own: true, canStart: false })
      expect(rowOf(kept, "kit/mail catcher")).toMatchObject({ state: "starting", canStart: true })
      await new Promise((done) => setTimeout(done, 300))
      expect(readFileSync(marker, "utf8")).toBe("")
      await new Promise<void>((done) => holder.close(() => done()))
      await kept.look()
      expect(rowOf(kept, "kit/proxy server")).toMatchObject({ state: "down" })
      expect(kept.dot()).toEqual({ dot: true, why: "Down:  kit's proxy server" })
    } finally {
      holder.close()
    }
  })

  it("a checkout the hub doesn't serve:  404", async () => {
    await expect(keeper().act("start", join(folder, "elsewhere"))).rejects.toMatchObject({ status: 404 })
  })
})

/** Page servers in memory:  which run, which are older than their code, what was asked. */
class FakeServers {
  running = new Set<string>()
  stale = new Set<string>()
  pages = new Map<string, number>()
  lastRequest = new Map<string, string>()
  ensured: string[] = []
  stops: { checkout: string; restart: boolean }[] = []

  /** the server of `checkout`, as `PidFile.status()` gives it */
  private info(checkout: string): SRV.RunningServer {
    return {
      pid: 1,
      port: 4747,
      root: checkout,
      started: "2026-11-23T11:00:00Z",
      base: "http://127.0.0.1:4747",
      pages: this.pages.get(checkout) ?? 0,
      ...(this.lastRequest.has(checkout) && { lastRequest: this.lastRequest.get(checkout) })
    }
  }

  readonly control: PageServerControl = {
    status: async (checkout) => (this.running.has(checkout) ? this.info(checkout) : undefined),
    ensure: async (checkout) => {
      this.ensured.push(checkout)
      const launched = !this.running.has(checkout) || this.stale.has(checkout)
      this.running.add(checkout)
      this.stale.delete(checkout)
      return { ...this.info(checkout), launched }
    },
    stop: async (checkout, options) => {
      this.stops.push({ checkout, restart: Boolean(options?.restart) })
      return this.running.delete(checkout)
    }
  }
}
