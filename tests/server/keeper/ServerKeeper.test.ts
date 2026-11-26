import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { createServer, type Server } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

import { IDLE_MINUTES, KeeperList, ServerKeeper, type KeeperRepo, type PageServerControl } from "spell/server/keeper"

describe("ServerKeeper:  every project's servers kept up (epic `epic-engine` P82;  Spell's own since epic `editor` P48)", () => {
  let folder: string
  let main: string
  let repo: KeeperRepo
  let servers: FakeServers
  let now: number

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "server-keeper-")))
    main = fakeMainCheckout(join(folder, "kit"))
    // a Spell kit:  its marker and its page server's command line
    mkdirSync(join(main, "src/server/page"), { recursive: true })
    writeFileSync(join(main, "repos.json5"), "{}\n")
    writeFileSync(join(main, "src/server/page/cli.ts"), "\n")
    repo = { name: "kit", checkout: main }
    servers = new FakeServers()
    now = Date.parse("2026-11-23T12:00:00Z")
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  /** a keeper over `repo` (its servers from the list in its home), the fake page servers and the clock */
  const keeper = ({ editorKept = () => false }: { editorKept?: (checkout: string) => boolean } = {}) =>
    new ServerKeeper({
      home: join(folder, "home"),
      repos: [repo],
      control: servers.control,
      now: () => now,
      editorKept
    })

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

  // epic `epic-engine` T167:  the Servers page links a worktree by its name, which starts it when it's stopped
  it("a worktree's page server is at its name through main's page server, running or not", async () => {
    const worktree = fakeWorktree(main, join(folder, "worktrees", "seo"))
    writeFileSync(join(worktree, ".spell-server.json"), "{}\n")
    writeFileSync(join(main, ".spell-server.json"), JSON.stringify({ pid: process.pid, port: 4747 }))
    servers.running.add(worktree)
    const kept = keeper()
    await kept.look()
    expect(rowOf(kept, "kit/seo/page server")).toMatchObject({
      state: "running",
      address: "http://seo.localhost:4747/"
    })
    servers.running.delete(worktree)
    await kept.look()
    expect(rowOf(kept, "kit/seo/page server")).toMatchObject({
      state: "stopped",
      address: "http://seo.localhost:4747/"
    })
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

  it("a worktree marked in use (`epic turns` waiting or running there) keeps its server up, unused or not (I459)", async () => {
    vi.stubEnv(SRV.KEEPER_HOME_VARIABLE, join(folder, "home"))
    const worktree = fakeWorktree(main, join(folder, "worktrees", "seo"))
    writeFileSync(join(worktree, ".spell-server.json"), "{}\n")
    servers.running.add(worktree)
    servers.lastRequest.set(worktree, new Date(now - 3 * 3_600_000).toISOString())
    const done = SRV.CheckoutUse.hold(join(worktree, "src"), "epic turns:  yarn test")
    try {
      await keeper().look()
      expect(servers.running.has(worktree)).toBe(true)
    } finally {
      done()
      vi.unstubAllEnvs()
    }
    await keeper().look()
    expect(servers.running.has(worktree)).toBe(false)
  })

  it("a project's own servers:  watched by port;  started by its command;  one without, down and shown", async () => {
    const holder: Server = createServer()
    await new Promise<void>((done) => holder.listen(0, "127.0.0.1", done))
    const port = (holder.address() as { port: number }).port
    const marker = join(folder, "proxy-started")
    const nothingThere = await SRV.freePort()
    // registered with `spell keeper add`, for this checkout
    const list = new KeeperList({ home: join(folder, "home") })
    list.addServer({ name: "proxy server", check: String(port), what: "the outside API", checkout: main })
    list.addServer({
      name: "mail catcher",
      check: String(nothingThere),
      start: `touch ${JSON.stringify(marker)}`,
      checkout: main
    })
    // another checkout's:  not this one's
    list.addServer({ name: "elsewhere", check: String(nothingThere), checkout: join(folder, "other") })
    servers.running.add(main)
    try {
      const kept = keeper()
      await kept.look()
      expect(rowOf(kept, "kit/proxy server")).toMatchObject({ state: "running", own: true, canStart: false })
      expect(rowOf(kept, "kit/mail catcher")).toMatchObject({ state: "starting", canStart: true })
      expect(rowOf(kept, "kit/elsewhere")).toBeUndefined()
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

  it("main's editor, when its page server serves one:  down under a running page server restarts it, then waits", async () => {
    servers.running.add(main)
    const kept = keeper({ editorKept: () => true })
    await kept.look()
    expect(servers.stops).toEqual([{ checkout: main, restart: false }])
    expect(rowOf(kept, "kit/editor")).toMatchObject({
      state: "starting",
      canStart: true,
      actions: ["start", "restart"]
    })
    // Vite building:  still starting;  then down, and not restarted again for a while
    now += 60_000
    await kept.look()
    expect(rowOf(kept, "kit/editor")).toMatchObject({ state: "starting" })
    now += 60_000
    await kept.look()
    expect(rowOf(kept, "kit/editor")).toMatchObject({ state: "down" })
    expect(kept.dot()).toMatchObject({ dot: true, why: "Down:  kit's editor" })
    expect(servers.stops).toHaveLength(1)
    // its Restart restarts the page server;  its Stop isn't offered, and refused
    await kept.act("restart", main, "editor")
    expect(servers.stops).toHaveLength(2)
    await expect(kept.act("stop", main, "editor")).rejects.toMatchObject({ status: 400 })
    // up:  running, left alone
    writeFileSync(
      join(main, ".spell-server.editor.json"),
      JSON.stringify({ url: "http://127.0.0.1:5173/", pid: process.pid })
    )
    await kept.look()
    expect(rowOf(kept, "kit/editor")).toMatchObject({ state: "running", address: "http://127.0.0.1:5173/" })
    expect(servers.stops).toHaveLength(2)
  })

  it("main's editor, when its page server serves none:  only watched", async () => {
    servers.running.add(main)
    const kept = keeper()
    await kept.look()
    expect(rowOf(kept, "kit/editor")).toMatchObject({ state: "stopped", canStart: false })
    expect(servers.stops).toEqual([])
  })

  it("a checkout the hub doesn't serve:  404", async () => {
    await expect(keeper().act("start", join(folder, "elsewhere"))).rejects.toMatchObject({ status: 404 })
  })

  describe("a project's spaces in the editor:  its main, or a worktree's", () => {
    /** a project beside the kit, `@acme` in its `spaces/`, with worktree `fix`;  the keeper over both */
    const withProject = () => {
      const app = fakeMainCheckout(join(folder, "acme-app"))
      mkdirSync(join(app, "spaces/@acme/tools/dash"), { recursive: true })
      const fix = fakeWorktree(app, join(folder, "acme-app.worktrees", "fix"))
      mkdirSync(join(fix, "spaces/@acme/tools/dash"), { recursive: true })
      const project: KeeperRepo = { name: "acme-app", checkout: app }
      const kept = new ServerKeeper({ home: join(folder, "home"), repos: [repo, project], control: servers.control })
      return { app, fix, kept, file: join(folder, "more-spaces.json5") }
    }

    it("editorSpaces():  the project's checkouts, main first, none shown until one is", () => {
      const { kept, file } = withProject()
      expect(kept.editorSpaces(file)).toEqual([
        { repo: "acme-app", orgs: ["acme"], checkouts: [{ served: false }, { worktree: "fix", served: false }] }
      ])
    })

    it("showInEditor():  the worktree's spaces served in place of main's, and back;  one folder per org", () => {
      const { app, fix, kept, file } = withProject()
      expect(kept.showInEditor("acme-app", undefined, file)).toEqual(["acme"])
      expect(kept.editorSpaces(file)[0]?.checkouts).toEqual([{ served: true }, { worktree: "fix", served: false }])
      expect(kept.showInEditor("acme-app", "fix", file)).toEqual(["acme"])
      expect(kept.editorSpaces(file)[0]?.checkouts).toEqual([{ served: false }, { worktree: "fix", served: true }])
      expect(SRV.moreSpacesInFile(file)).toEqual([join(fix, "spaces")])
      kept.showInEditor("acme-app", undefined, file)
      expect(SRV.moreSpacesInFile(file)).toEqual([join(app, "spaces")])
    })

    it("showInEditor():  by name only:  an unknown project or worktree is 404, the kit itself too", () => {
      const { kept, file } = withProject()
      expect(() => kept.showInEditor("nobody", undefined, file)).toThrow(expect.objectContaining({ status: 404 }))
      expect(() => kept.showInEditor("acme-app", "gone", file)).toThrow(expect.objectContaining({ status: 404 }))
      expect(() => kept.showInEditor("kit", undefined, file)).toThrow(expect.objectContaining({ status: 404 }))
    })
  })
})

describe("ServerKeeper:  handing over, one keeper in charge (epic `editor` P48)", () => {
  let folder: string
  let record: string
  let before: string | undefined

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "keeper-handover-")))
    record = join(folder, "server-keeper.json")
    before = process.env[SRV.KEEPER_FILE_VARIABLE]
    process.env[SRV.KEEPER_FILE_VARIABLE] = record
    vi.useFakeTimers({ toFake: ["setInterval"] })
  })

  afterEach(() => {
    vi.useRealTimers()
    if (before === undefined) delete process.env[SRV.KEEPER_FILE_VARIABLE]
    else process.env[SRV.KEEPER_FILE_VARIABLE] = before
    rmSync(folder, { recursive: true, force: true })
  })

  /** a keeper named `name`, keeping nothing, on fake page servers */
  const keeperNamed = (name: string, options: { onStepAside?: () => void } = {}) =>
    new ServerKeeper({ home: join(folder, "home"), name, repos: [], control: new FakeServers().control, ...options })

  /** the record as written */
  const read = () => new SRV.KeeperLink().read()

  /** a record of a live keeper of another process (this one's parent), named `keeper` */
  const otherKeeper = (keeper: string) =>
    new SRV.KeeperLink().write({ pid: process.ppid, base: "http://127.0.0.1:9", token: "t", keeper })

  it("no keeper:  it takes the record, naming itself", () => {
    const kept = keeperNamed("spell").start({ base: "http://127.0.0.1:1", token: "a" })
    expect(read()).toEqual({ pid: process.pid, base: "http://127.0.0.1:1", token: "a", keeper: "spell" })
    expect(kept.isAside).toBe(false)
    kept.stop()
    expect(read()).toBeUndefined()
  })

  it("Spell's keeper live:  the epic hub's stands aside, keeps nothing, and leaves the record alone", () => {
    otherKeeper("spell")
    let asides = 0
    const hub = keeperNamed("epic hub", { onStepAside: () => void asides++ }).start({ base: "http://h", token: "b" })
    expect(hub.isAside).toBe(true)
    expect(asides).toBe(1)
    expect(read()).toMatchObject({ pid: process.ppid, keeper: "spell" })
    hub.stop()
    expect(read()).toMatchObject({ pid: process.ppid })
  })

  it("the one in charge gone:  the one standing aside takes the record back at its next look", () => {
    otherKeeper("spell")
    const hub = keeperNamed("epic hub").start({ base: "http://h", token: "b" })
    expect(hub.isAside).toBe(true)
    new SRV.KeeperLink().write({ pid: 2 ** 22 + 7, base: "http://gone", token: "x", keeper: "spell" })
    vi.advanceTimersByTime(10_000)
    expect(hub.isAside).toBe(false)
    expect(read()).toMatchObject({ pid: process.pid, keeper: "epic hub" })
    hub.stop()
  })

  it("takeOver (`spell keeper start`), or one of its own kind:  it takes the record;  the other steps aside", () => {
    otherKeeper("epic hub")
    const spell = keeperNamed("spell").start({ base: "http://s", token: "c", takeOver: true })
    expect(spell.isAside).toBe(false)
    expect(read()).toMatchObject({ pid: process.pid, keeper: "spell" })
    spell.stop()
    otherKeeper("epic hub")
    const freshHub = keeperNamed("epic hub").start({ base: "http://h2", token: "d" })
    expect(read()).toMatchObject({ pid: process.pid, keeper: "epic hub", base: "http://h2" })
    freshHub.stop()
  })

  it("a record from before P48 names no keeper:  it's the epic hub's", () => {
    new SRV.KeeperLink().write({ pid: process.ppid, base: "http://old", token: "e" })
    const spell = keeperNamed("spell").start({ base: "http://s", token: "c" })
    expect(spell.isAside).toBe(true)
    spell.stop()
  })

  it("the holds:  carried over once from the epic home's old file, and written back there while it's handed in", async () => {
    const legacy = join(folder, "epic-home", "server-keeper.json")
    mkdirSync(join(folder, "epic-home"), { recursive: true })
    writeFileSync(legacy, JSON.stringify({ held: ["kit/page server"], handsOff: true }))
    const kept = new ServerKeeper({ home: join(folder, "home"), repos: [], legacyHolds: legacy })
    expect(kept.isHandsOff).toBe(true)
    expect(JSON.parse(readFileSync(join(folder, "home", "server-keeper-holds.json"), "utf8"))).toMatchObject({
      held: ["kit/page server"]
    })
    await kept.setHandsOff(false)
    expect(JSON.parse(readFileSync(legacy, "utf8"))).toEqual({ held: ["kit/page server"] })
    // carried ONCE:  the old file changing again changes nothing here
    writeFileSync(legacy, JSON.stringify({ handsOff: true }))
    expect(new ServerKeeper({ home: join(folder, "home"), repos: [], legacyHolds: legacy }).isHandsOff).toBe(false)
  })
})

describe("KeeperList:  what Spell's keeper keeps, `~/.spell/keeper.json5`", () => {
  let folder: string

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "keeper-list-")))
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("checkouts added once, by their folder's name;  servers by name per checkout, replaced, refused without a check", () => {
    const list = new KeeperList({ home: join(folder, "home") })
    expect(list.exists).toBe(false)
    expect(list.checkouts).toEqual([])
    expect(list.addCheckout(join(folder, "kit"))).toBe(true)
    expect(list.addCheckout(join(folder, "kit"))).toBe(false)
    expect(list.exists).toBe(true)
    expect(list.checkouts).toEqual([{ name: "kit", checkout: join(folder, "kit") }])
    list.addServer({ name: "proxy", check: "8080", checkout: join(folder, "kit") })
    list.addServer({ name: "proxy", check: "8081", checkout: join(folder, "kit") })
    list.addServer({ name: "proxy", check: "9000", checkout: join(folder, "work") })
    expect(list.serversOf(join(folder, "kit"))).toEqual([
      { name: "proxy", check: "8081", checkout: join(folder, "kit") }
    ])
    expect(list.serversOf()).toHaveLength(2)
    expect(() => list.addServer({ name: "x", check: "" })).toThrow(TypeError)
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
