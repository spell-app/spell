import { spawn } from "node:child_process"
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { every } from "spell/util/timing"
import { slug } from "spell/util/string"
import { SRV, type Handler } from "spell/server"
import { PageServer } from "spell/server/page"
import { REPOS_FILE } from "spell/server/kitFolders"

import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"
import { EpicConfig } from "spell/epic/config/EpicConfig"

import { ServerFacts } from "./ServerFacts"
import type { KeptServer, KeptServerState, Repo, ServersAnswer } from "./server.types"

/****************
 * ### `ServerKeeper`
 * The SERVER KEEPER (epic `epic-engine` P82):  ONE program per machine, the epic hub, keeps every project's web
 * servers up on their main code, so none goes down when an epic closes, and no epic starts or stops main's by itself.
 * - It looks at every server every 10 seconds (`LOOK_SECONDS`), and at once when asked (`look()`, a session's start).
 * - Its servers, per repo the hub serves (`RepoList`):
 *   - the MAIN checkout's page server, in a Spell kit:  always on;  started when it's down, restarted when it runs older
 *     than its code (main moved:  `PageServer.ensureHere()`);  a stop asked for by hand (`spell server stop`) LEAVES it
 *     stopped, until Start
 *   - its editor:  watched, from its record;  it comes and goes with the page server, so it has no buttons
 *   - the repo's OWN servers, from its `.epic/config.json5` (`servers`:  a proxy server, say):  watched, by a URL or a
 *     port;  started when down if it names a `start` command, else only shown
 *   - each WORKTREE's page server:  on demand (its first opener starts it), on the port written down for it
 *     (`SRV.PortBook`), and stopped after 30 minutes with no request and no page open (`IDLE_MINUTES`)
 *   - the hub itself, which serves the Servers tab
 * - Asked by others through `SRV.KeeperLink`:  its record, `~/.spell/server-keeper.json`, names it, and
 *   `POST /api/servers/<start|stop|restart>` does it;  every main-checkout start, stop and restart of the page server
 *   comes here (`PageServer.ensure()`, `stop()`, `restart()`)
 * - The Servers tab's data:  `GET /api/servers` (`ServersAnswer`), `GET /api/servers/dot` (the tab's red dot)
 * - Its own code newer than its start (main moved under it):  it hands over to a fresh hub (`epic hub ensure`, run
 *   detached), so it keeps on the main code too
 * - What a stop by hand holds:  `<home>/server-keeper.json`, `{ held: [<server id>] }`
 * - The page servers it's handed (`control`) and the clock (`now`) are its tests' to change.
 ****************/
export class ServerKeeper {
  /** the epic home:  the hold file, the own servers' logs */
  readonly home: string

  /** the repos the hub serves */
  readonly repos: Repo[]

  /** how it starts, stops and asks a checkout's page server */
  readonly control: PageServerControl

  /** the clock, ms */
  readonly now: () => number

  /** every server, as the last look found it, by id */
  private rows = new Map<string, KeptServer>()

  /** a look under way:  the next waits for it */
  private looking?: Promise<void>

  /** stops the timer */
  private stopLooking?: () => void

  /** when each server was last started by the keeper, ms:  one that won't come up is tried again only after a while */
  private lastStart = new Map<string, number>()

  /** the record `SRV.KeeperLink` reads */
  private readonly link = new SRV.KeeperLink()

  /** called when the keeper's own code is newer than its start:  default, a fresh hub (`handOver()`) */
  private readonly onStale: () => void

  /** whether `onStale` ran */
  private handedOver = false

  /** the hub's address, once `start()` has it */
  private base?: string

  constructor({
    home,
    repos,
    control = PAGE_SERVERS,
    now = Date.now,
    onStale
  }: {
    home: string
    repos: Repo[]
    control?: PageServerControl
    now?: () => number
    onStale?: () => void
  }) {
    this.home = home
    this.repos = repos
    this.control = control
    this.now = now
    this.onStale = onStale ?? (() => this.handOver())
  }

  /**
   * Start keeping:  write the record others ask it by, look now, then every `LOOK_SECONDS`.
   * - `base`, `token`:  the hub's address and write token, for the record
   * - `isStale`:  whether the hub's code is newer than its start, asked at most once a minute
   */
  start({ base, token, isStale }: { base: string; token: string; isStale?: () => boolean }): this {
    this.base = base
    this.link.write({ pid: process.pid, base, token })
    let staleAsked = 0
    const look = () => {
      // its own code, at most once a minute:  a walk of every code file
      const asksStale = this.now() - staleAsked >= STALE_LOOK_SECONDS * 1000
      if (asksStale) staleAsked = this.now()
      if (asksStale && isStale?.() && !this.handedOver) {
        this.handedOver = true
        this.onStale()
      }
      void this.look().catch((error: unknown) =>
        console.error("server keeper:  a look failed;  the next one still comes", error)
      )
    }
    this.stopLooking = every(LOOK_SECONDS, look, { inBackground: true })
    look()
    return this
  }

  /** Stop keeping:  the timer, and the record if it's ours.  The servers stay up. */
  stop(): void {
    this.stopLooking?.()
    this.link.removeIfOurs()
  }

  ////////////////
  // ## Looking
  ////////////////

  /** One look at every server:  each row brought up to date, and what's down brought back.  NEVER throws. */
  look(): Promise<void> {
    // one at a time:  a look asked during another waits for it, then looks again
    const after = this.looking ?? Promise.resolve()
    const next = after.then(() => this.lookNow())
    this.looking = next.finally(() => {
      if (this.looking === next) this.looking = undefined
    })
    return next
  }

  /** every server's row, in the tab's order */
  servers(): KeptServer[] {
    return [...this.rows.values()]
  }

  /** the look itself */
  private async lookNow(): Promise<void> {
    const rows: KeptServer[] = [this.hubRow()]
    for (const repo of this.repos) {
      try {
        rows.push(...(await this.lookAtRepo(repo)))
      } catch (error) {
        console.error(`server keeper:  couldn't look at ${repo.name}'s servers:`, error)
      }
    }
    this.rows = new Map(rows.map((row) => [row.id, row]))
  }

  /** the hub's own row:  it answers, or this wouldn't run */
  private hubRow(): KeptServer {
    const base = this.base
    return {
      id: "hub",
      repo: "",
      name: "epic hub",
      what: "the epic pages of every project, and this tab",
      checkout: this.home,
      address: base && `${base}/`,
      state: "running",
      canStart: false
    }
  }

  /** `repo`'s servers:  its main page server and editor, its own, its worktrees' */
  private async lookAtRepo(repo: Repo): Promise<KeptServer[]> {
    const rows: KeptServer[] = []
    if (isKit(repo.checkout)) {
      rows.push(await this.keepMainPageServer(repo))
      rows.push(this.editorRow(repo, repo.checkout))
    }
    for (const server of EpicConfig.of(repo.checkout).servers) rows.push(await this.keepOwnServer(repo, server))
    if (isKit(repo.checkout)) rows.push(...(await this.lookAtWorktrees(repo)))
    return rows
  }

  /** The main checkout's page server, kept up:  started when down, restarted when older than its code;  held:  left. */
  private async keepMainPageServer(repo: Repo): Promise<KeptServer> {
    const id = idOf(repo, "page server")
    const row = this.row(id, repo, repo.checkout, "page server", "epic pages, guides, the app's calls")
    if (this.held().includes(id)) {
      const running = await this.control.status(repo.checkout)
      return running
        ? { ...row, state: "running", address: `${running.base}/` }
        : { ...row, state: "stopped", why: STOPPED_BY_HAND }
    }
    if (this.isWaitingAfterFailure(id)) return this.rows.get(id) ?? { ...row, state: "down" }
    try {
      const before = await this.control.status(repo.checkout)
      if (!before) this.lastStart.set(id, this.now())
      const server = await this.control.ensure(repo.checkout)
      const since = server.launched ? new Date(this.now()).toISOString() : this.rows.get(id)?.since
      return {
        ...row,
        state: "running",
        address: `${server.base}/`,
        ...(since && { since }),
        ...(server.launched && { why: before ? "restarted on main's new code" : "started:  it was down" })
      }
    } catch (error) {
      this.lastStart.set(id, this.now())
      return { ...row, state: "down", why: (error as Error).message }
    }
  }

  /** the editor's row:  up while its record's address answers;  it comes with the page server */
  private editorRow(repo: Repo, checkout: string, worktree?: string): KeptServer {
    const row = this.row(
      idOf(repo, "editor", worktree),
      repo,
      checkout,
      "editor",
      "the Spell app;  it comes with the page server",
      worktree
    )
    const record = readJson<{ url?: string; pid?: number }>(join(checkout, EDITOR_FILE))
    const isUp = record?.url !== undefined && record.pid !== undefined && SRV.isProcessAlive(record.pid)
    return { ...row, canStart: false, state: isUp ? "running" : "stopped", ...(isUp && { address: record.url }) }
  }

  /** One of the repo's own servers (`EpicConfig.servers`), watched;  started when down, if it says how. */
  private async keepOwnServer(repo: Repo, server: OwnServer): Promise<KeptServer> {
    const id = idOf(repo, server.name)
    const row: KeptServer = {
      ...this.row(id, repo, repo.checkout, server.name, server.what ?? "", undefined),
      own: true,
      canStart: Boolean(server.start),
      address: addressOf(server.check)
    }
    if (await isAnswering(server.check)) return { ...row, state: "running" }
    if (!server.start) return { ...row, state: "down", why: "Spell doesn't know how to start it, so start it yourself" }
    if (this.held().includes(id)) return { ...row, state: "stopped", why: STOPPED_BY_HAND }
    if (this.isWaitingAfterFailure(id)) return { ...row, state: "starting" }
    this.startOwn(repo, server)
    return { ...row, state: "starting", why: "started:  it was down" }
  }

  /** each worktree's page server and editor:  shown while it has one, stopped after `IDLE_MINUTES` unused */
  private async lookAtWorktrees(repo: Repo): Promise<KeptServer[]> {
    const rows: KeptServer[] = []
    const book = new SRV.PortBook()
    for (const [worktree, checkout] of worktreesOf(repo.checkout)) {
      const booked = book.portsOf(checkout)["page server"]
      const hasRecord = existsSync(join(checkout, PAGE_SERVER_FILE))
      if (!booked && !hasRecord) continue
      const id = idOf(repo, "page server", worktree)
      const row = {
        ...this.row(id, repo, checkout, "page server", "its own pages, on demand", worktree),
        ...(booked && { port: booked })
      }
      const running = await this.control.status(checkout)
      if (!running) {
        rows.push({ ...row, state: "stopped", why: this.rows.get(id)?.why ?? "starts when you open one of its pages" })
        continue
      }
      // a server on code from before P82 says neither:  never stopped, as nothing says it's unused
      const idle = running.lastRequest === undefined ? 0 : this.now() - Date.parse(running.lastRequest)
      if (running.pages === 0 && idle > IDLE_MINUTES * 60_000) {
        await this.control.stop(checkout)
        rows.push({ ...row, state: "stopped", why: `stopped after ${IDLE_MINUTES} minutes unused` })
        continue
      }
      rows.push({
        ...row,
        state: "running",
        address: `${running.base}/`,
        ...(running.lastRequest && { lastRequest: running.lastRequest })
      })
      rows.push(this.editorRow(repo, checkout, worktree))
    }
    return rows
  }

  ////////////////
  // ## Asked to act
  ////////////////

  /**
   * Do `action` to server `server` of checkout `checkout`, as `SRV.KeeperLink.ask()` and the tab's buttons ask;
   * the server as it stands after.
   * - `start`:  a server held stopped is let go and started
   * - `stop`:  stopped and HELD stopped:  the keeper starts it no more until Start (a worktree's:  just stopped)
   * - `restart`:  stopped, then started, on its code now
   * - throws `SRV.HttpError` 404 for a server it doesn't keep, 400 for one it can't start
   */
  async act(action: SRV.KeeperAction, checkout: string, server = "page server"): Promise<SRV.KeeperAnswer> {
    const { repo, worktree } = this.whereIs(checkout)
    const id = idOf(repo, server, worktree)
    const own = worktree ? undefined : EpicConfig.of(repo.checkout).servers.find((each) => each.name === server)
    if (action === "stop" && !worktree) this.hold(id, true)
    if (action !== "stop") this.hold(id, false)
    let answer: SRV.KeeperAnswer
    if (own) answer = await this.actOnOwn(action, repo, own)
    else if (server === "page server") answer = await this.actOnPageServer(action, worktree ? checkout : repo.checkout)
    else throw new SRV.HttpError(400, `the ${server} comes with the page server:  start or restart that instead`)
    void this.look()
    return answer
  }

  /** a page server, started, stopped or restarted here, never through the keeper again */
  private async actOnPageServer(action: SRV.KeeperAction, checkout: string): Promise<SRV.KeeperAnswer> {
    if (action === "stop") return { state: (await this.control.stop(checkout)) ? "stopped" : "not running" }
    if (action === "restart") await this.control.stop(checkout, { restart: true })
    return { ...(await this.control.ensure(checkout)), state: "running" }
  }

  /** one of the repo's own servers:  its pid isn't known, so a stop or restart stops what listens on its port */
  private async actOnOwn(action: SRV.KeeperAction, repo: Repo, server: OwnServer): Promise<SRV.KeeperAnswer> {
    if (!server.start && action !== "stop") throw new SRV.HttpError(400, `${server.name} has no start command`)
    if (action !== "start") await stopListener(server.check)
    if (action === "stop") return { state: "stopped" }
    if (!(await isAnswering(server.check))) this.startOwn(repo, server)
    return { state: "starting" }
  }

  /** the repo and worktree checkout `checkout` is;  a 404 for one the hub doesn't serve */
  private whereIs(checkout: string): { repo: Repo; worktree?: string } {
    for (const repo of this.repos) {
      if (SRV.RealPath.same(repo.checkout, checkout)) return { repo }
      for (const [worktree, folder] of worktreesOf(repo.checkout))
        if (SRV.RealPath.same(folder, checkout)) return { repo, worktree }
    }
    throw new SRV.HttpError(404, `the server keeper keeps no servers of ${checkout}:  epic repos add <checkout>`)
  }

  ////////////////
  // ## HTTP
  ////////////////

  /**
   * Its calls, on the hub's router:
   * - `GET /api/servers`:  the Servers tab's data (`ServersAnswer`)
   * - `GET /api/servers/dot`:  `{ dot, why }`, the tab's red dot:  a server that should be up is down
   * - `POST /api/servers/look`:  look now (a session's start)
   * - `POST /api/servers/<start|stop|restart>`, `{ checkout, server }`:  `act()`
   * - every POST needs the hub's write token (`guard`)
   */
  route(router: SRV.Router, guard: SRV.Guard): void {
    router.get(SRV.KEEPER_API, this.onAsked)
    router.get(`${SRV.KEEPER_API}/dot`, (_request, reply) => reply.noStore().json(this.dot()))
    router.post(`${SRV.KEEPER_API}/look`, guard.writeCheck, async (_request, reply) => {
      await this.look()
      reply.noStore().json({ servers: this.servers() })
    })
    router.post(`${SRV.KEEPER_API}/:action`, guard.writeCheck, SRV.parseBodies(), this.onAct)
  }

  /** `GET /api/servers` */
  private onAsked: Handler = async (_request, reply) => {
    if (!this.rows.size) await this.look()
    const answer: ServersAnswer = {
      servers: this.servers(),
      lookSeconds: LOOK_SECONDS,
      ...ServerFacts.of(this.repos)
    }
    reply.noStore().json(answer)
  }

  /** `POST /api/servers/<action>` */
  private onAct: Handler = async (request, reply) => {
    const action = request.params.action as SRV.KeeperAction
    if (!ACTIONS.includes(action)) throw new SRV.HttpError(404, `no such call:  ${request.path}`)
    const { checkout, server } = request.body as { checkout?: string; server?: string }
    if (!checkout) throw new SRV.HttpError(400, "which checkout?  { checkout, server }")
    reply.noStore().json(await this.act(action, checkout, server))
  }

  /** the tab's red dot:  every server that should be up and isn't, named */
  dot(): { dot: boolean; why?: string } {
    const down = this.servers().filter((row) => row.state === "down")
    if (!down.length) return { dot: false }
    return {
      dot: true,
      why: `Down:  ${down.map((row) => (row.repo ? `${row.repo}'s ${row.name}` : row.name)).join(", ")}`
    }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** a row's facts every look gives */
  private row(
    id: string,
    repo: Repo,
    checkout: string,
    name: string,
    what: string,
    worktree?: string
  ): KeptServer & { state: KeptServerState } {
    return {
      id,
      repo: repo.name,
      name,
      what,
      checkout,
      ...(worktree && { worktree }),
      state: "down",
      canStart: true
    }
  }

  /** whether server `id` was started less than `RETRY_SECONDS` ago:  not tried again yet */
  private isWaitingAfterFailure(id: string): boolean {
    const at = this.lastStart.get(id)
    return at !== undefined && this.now() - at < RETRY_SECONDS * 1000 && this.rows.get(id)?.state !== "running"
  }

  /** start one of the repo's own servers in the background, its output in `<home>/servers/<repo>-<name>.log` */
  private startOwn(repo: Repo, server: OwnServer): void {
    this.lastStart.set(idOf(repo, server.name), this.now())
    const folder = join(this.home, LOGS)
    mkdirSync(folder, { recursive: true })
    const out = openSync(join(folder, `${slug(`${repo.name}-${server.name}`, { as: "id" })}.log`), "a")
    const child = spawn(process.env.SHELL || "/bin/sh", ["-c", server.start!], {
      cwd: server.folder ?? repo.checkout,
      detached: true,
      stdio: ["ignore", out, out]
    })
    child.once("error", (error) => console.error(`server keeper:  ${server.name} won't start:`, error))
    child.unref()
  }

  /** the ids held stopped by hand */
  private held(): string[] {
    return readJson<{ held?: string[] }>(join(this.home, HOLD_FILE))?.held ?? []
  }

  /** hold server `id` stopped, or let it go.  SIDE EFFECT:  writes the hold file */
  private hold(id: string, isHeld: boolean): void {
    const held = new Set(this.held())
    if (isHeld === held.has(id)) return
    if (isHeld) held.add(id)
    else held.delete(id)
    mkdirSync(this.home, { recursive: true })
    writeFileSync(join(this.home, HOLD_FILE), `${JSON.stringify({ held: [...held] }, null, 2)}\n`)
  }

  /**
   * a fresh hub, on the code now:  `epic hub ensure` on this hub's own port, detached;  it stops this one
   * - its port named:  `ensure` on the default port would stop this one and start the next THERE (it did, in a test)
   */
  private handOver(): void {
    const port = this.base ? new URL(this.base).port : undefined
    const args = [EngineFiles.bin, "hub", "ensure", ...(port ? ["--port", port] : [])]
    spawn(process.execPath, args, { detached: true, stdio: "ignore" }).unref()
  }
}

/** How the keeper starts, stops and asks a checkout's page server:  a test hands its own. */
export type PageServerControl = {
  status: (checkout: string) => Promise<SRV.RunningServer | undefined>
  ensure: (checkout: string) => Promise<SRV.RunningServer & { launched: boolean }>
  stop: (checkout: string, options?: { restart?: boolean }) => Promise<boolean>
}

/** One of a repo's own servers, as `EpicConfig.servers` gives it. */
type OwnServer = ReturnType<EpicConfig["servers"]["at"]> & {}

/** The real page servers, never through the keeper (it IS the keeper):  `ensureHere()`, `stopHere()`. */
const PAGE_SERVERS: PageServerControl = {
  status: (checkout) => SRV.PidFile.forPageServer(checkout).status(),
  ensure: (checkout) => PageServer.ensureHere(checkout),
  stop: (checkout, options) => PageServer.stopHere(checkout, options)
}

/** How often the keeper looks at every server, seconds (Owen's C1:  every 10 seconds). */
export const LOOK_SECONDS = 10

/** How long a worktree's page server may go unused before it's stopped, minutes. */
export const IDLE_MINUTES = 30

/** How often the keeper asks whether its own code is newer than its start, seconds. */
const STALE_LOOK_SECONDS = 60

/** How long after a start the keeper waits before starting the same server again, seconds. */
const RETRY_SECONDS = 60

/** What a server held stopped says. */
const STOPPED_BY_HAND = "You stopped it.  Press Start to turn it back on."

/** The calls `act()` takes. */
const ACTIONS: readonly SRV.KeeperAction[] = ["start", "stop", "restart"]

/** What a stop by hand holds, in the epic home. */
const HOLD_FILE = "server-keeper.json"

/** The own servers' logs' folder, in the epic home. */
const LOGS = "servers"

/** A checkout's page server record. */
const PAGE_SERVER_FILE = ".spell-server.json"

/** A checkout's editor record (spell-app's `EditorServer`). */
const EDITOR_FILE = ".spell-server.editor.json"

/** How long a stop waits for a process to end before it kills it, ms. */
const STOP_WAIT_MS = 10_000

/** a server's id:  `<repo>/<name>`, a worktree's `<repo>/<worktree>/<name>` */
function idOf(repo: Repo, name: string, worktree?: string): string {
  return [repo.name, worktree, name].filter(Boolean).join("/")
}

/** whether `checkout` is a Spell kit, which runs a page server of its own */
function isKit(checkout: string): boolean {
  return existsSync(join(checkout, REPOS_FILE)) && existsSync(join(checkout, "src/server/page/cli.ts"))
}

/** the worktrees of main checkout `main`, each `[name, folder]` */
function worktreesOf(main: string): [string, string][] {
  const found = new Map<string, string>()
  for (const folder of EpicConfig.of(main).worktreesFolders) {
    if (!existsSync(folder)) continue
    for (const entry of readdirSync(folder, { withFileTypes: true }))
      if (entry.isDirectory() && !entry.name.startsWith(".") && !found.has(entry.name))
        found.set(entry.name, join(folder, entry.name))
  }
  return [...found]
}

/** `check`'s address:  a URL as it is, a port as `http://127.0.0.1:<port>/` */
function addressOf(check: string): string {
  return /^\d+$/.test(check) ? `http://127.0.0.1:${check}/` : check
}

/** whether `check` answers:  a URL any HTTP answer, a port something listening.  NEVER throws. */
async function isAnswering(check: string): Promise<boolean> {
  if (/^\d+$/.test(check)) return !(await SRV.isFree(Number(check)))
  try {
    await fetch(check, { signal: AbortSignal.timeout(2000), redirect: "manual" })
    return true
  } catch {
    return false
  }
}

/** stop whatever listens on `check`'s port (`SRV.Processes.portsOf()`), never this process.  NEVER throws. */
async function stopListener(check: string): Promise<void> {
  const port = /^\d+$/.test(check) ? Number(check) : Number(new URL(check).port || 80)
  const ports = SRV.Processes.portsOf([...SRV.Processes.table().keys()])
  for (const [pid, listening] of ports)
    if (listening === port && pid !== process.pid) await SRV.endProcess(pid, STOP_WAIT_MS)
}

/** `file` as JSON;  missing or unreadable:  `undefined` */
function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch {
    return undefined
  }
}
