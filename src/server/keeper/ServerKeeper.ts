import { spawn } from "node:child_process"
import {
  closeSync,
  copyFileSync,
  existsSync,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { every } from "spell/util/timing"
import { slug } from "spell/util/string"
import { SRV, type Handler } from "spell/server"
import { PageServer, pageServerSettings } from "spell/server/page"
import { REPOS_FILE } from "spell/server/kitFolders"

import { HttpsSwitch, afterAnswer } from "./HttpsSwitch"
import { KeeperList } from "./KeeperList"
import {
  EDITOR_SPACES_API,
  HTTPS_API,
  RESTART_ALL_API,
  HANDS_OFF_API,
  KEEPER_HOLDS_FILE,
  KEEPER_LOG_FILE,
  KEEPER_SERVER_LOGS,
  LOG_LINES,
  SERVER_LOG_API,
  SERVERS_PAGE,
  type KeptServerLog,
  SPELL_KEEPER,
  type EditorSpaces,
  type HandsOff,
  type HttpsTurn,
  type KeeperRepo,
  type KeeperServer,
  type KeptServer,
  type KeptServerState,
  type KeptServersAnswer
} from "./keeper.types"

/****************
 * ### `ServerKeeper`
 * The SERVER KEEPER:  ONE program per machine keeps every project's web servers up on their main code, so none goes
 * down when a worktree closes, and nothing starts or stops main's by itself.
 * - Spell's own since epic `editor` P48:  `spell keeper start` runs it as a program of its own (`KeeperProgram`);
 *   the epic hub ran it before (epic `epic-engine` P82), and still does until it hands over (below, "Handing over")
 * - It looks at every server every 10 seconds (`LOOK_SECONDS`), and at once when asked (`look()`).
 * - What it keeps, for each main checkout it's handed (`repos`;  Spell's own:  its list, `KeeperList`):
 *   - the main checkout's page server, in a Spell kit:  always on;  started when it's down, restarted when it runs
 *     older than its code (main moved:  `PageServer.ensureHere()`);  a stop asked for by hand (`spell server stop`)
 *     LEAVES it stopped, until Start
 *   - its editor:  it comes and goes with the page server (its child), so it's kept through it:  when the page server
 *     serves one (`editorKept`:  its settings run the app's routes), an editor down under a running page server
 *     restarts the page server, at most once every `EDITOR_RETRY_MINUTES` (3);  its Start and Restart do the same;
 *     else it's only watched, with no buttons
 *   - the checkout's OWN servers (`serversOf`:  Spell's own, those `spell keeper add` registered;  the hub's, each
 *     repo's `.epic/config.json5` `servers`):  watched, by a URL or a port;  started when down if one names a `start`
 *     command, else only shown
 *   - each WORKTREE's page server, found from git's own records (`<main>/.git/worktrees/`):  on demand (its first
 *     opener starts it), on the port written down for it (`SRV.PortBook`), and stopped after 30 minutes with no
 *     request and no page open (`IDLE_MINUTES`)
 *   - itself, a row of its own (`self`)
 * - What it starts carries its mark (`SRV.KEEPER_START_VARIABLE`, epic `epic-engine` P84):  main's page server and
 *   editor refuse an agent's start without it (`SRV.KeeperLink.refusedStart()`)
 * - Asked by others through `SRV.KeeperLink`:  its record, `~/.spell/server-keeper.json`, names it, and
 *   `POST /api/servers/<start|stop|restart>` does it;  every main-checkout start, stop and restart of the page server
 *   comes here (`PageServer.ensure()`, `stop()`, `restart()`)
 * - HANDING OVER (epic `editor` P48):  the record says WHICH keeper wrote it (`name`:  `spell`, `epic hub`), and a
 *   keeper that finds it naming another live keeper STEPS ASIDE:  it stops keeping, forwards what it's asked to the
 *   one in charge, and takes the record back if that one goes;  so there's always one keeping, never two
 *   - `start()` takes the record unless another kind of keeper holds it live (`takeOver` takes it anyway:
 *     `spell keeper start`), so the epic hub's keeper leaves Spell's alone, and a fresh hub replaces an old one
 *   - `onStepAside`:  what else happens then (Spell's program exits)
 * - The Servers tab's data:  `GET /api/servers` (`KeptServersAnswer`, plus the hub's `moreAnswer`), `GET
 *   /api/servers/dot` (the tab's red dot)
 * - HTTPS for the page servers, on and off from the tab (`https`, an `HttpsSwitch`;  epic `epic-engine` T164):
 *   `POST /api/servers/https`
 * - the page server's certificate WATCHED (T164):  each look compares its two files (`HttpsSwitch.filesStamp`) with the
 *   last;  made, made again or deleted (the tab's switch, or `spell server certificate` / `--undo` in a terminal),
 *   every main page server is restarted, so it takes HTTPS or drops it with no restart by hand
 * - HANDS OFF (T164):  a switch on the tab, kept in the holds file until turned off (`handsOff`):  while it's on, the
 *   keeper starts, stops and restarts nothing of main's by itself (no keep-alive, no editor restart, no checkout's own
 *   server, no certificate restart), but still looks and reports;  the person's own buttons still work.  Turned off,
 *   it looks at once:  what's down comes back, and a certificate changed meanwhile is taken up
 * - Restart all (T164):  `POST /api/servers/restart-all`, every main page server restarted, its editor with it, held
 *   ones too
 * - Its own code newer than its start (main moved under it):  `onStale`, which hands over to a fresh keeper
 * - What a stop by hand holds:  `<home>/server-keeper-holds.json`, `{ held: [<server id>], handsOff }`;  carried over
 *   once from `legacyHolds` (the epic home's `server-keeper.json`), and written there too while one is handed in, so
 *   the epic tooling's command guard still reads the hands-off switch
 * - NEVER imports the epic tooling:  what's the hub's is handed in (`repos`, `serversOf`, `editorKept`, `self`,
 *   `moreAnswer`, `onStale`, `legacyHolds`)
 * - The page servers it's handed (`control`), the clock (`now`) and the HTTPS switch (`https`) are its tests' to change.
 ****************/
export class ServerKeeper {
  /** the keeper's home:  the holds file, the own servers' logs */
  readonly home: string

  /** which keeper this is, in its record:  `spell`, `epic hub` */
  readonly name: string

  /** how it starts, stops and asks a checkout's page server */
  readonly control: PageServerControl

  /** the clock, ms */
  readonly now: () => number

  /** HTTPS on the page servers, turned on and off from the tab */
  readonly https: HttpsSwitch

  /** every server, as the last look found it, by id */
  private rows = new Map<string, KeptServer>()

  /** the page server's certificate files as the last look found them (`HttpsSwitch.filesStamp`) */
  private certificateStamp?: string

  /** a look under way:  the next waits for it */
  private looking?: Promise<void>

  /** stops the timer */
  private stopLooking?: () => void

  /** when each server was last started by the keeper, ms:  one that won't come up is tried again only after a while */
  private lastStart = new Map<string, number>()

  /** the record `SRV.KeeperLink` reads */
  private readonly link = new SRV.KeeperLink()

  /** the main checkouts it keeps, asked afresh each look */
  private readonly reposNow: () => KeeperRepo[]

  /** a checkout's own servers */
  private readonly serversOf: (repo: KeeperRepo) => KeeperServer[]

  /** whether main checkout `checkout`'s editor is kept through its page server */
  private readonly editorKept: (checkout: string) => boolean

  /** its own row's name and words */
  private readonly self: { id: string; name: string; what: string }

  /** more for `GET /api/servers` (the hub's:  what merged into main, what waits) */
  private readonly moreAnswer?: () => object

  /** called when the keeper's own code is newer than its start */
  private readonly onStale?: () => void

  /** called when it steps aside for another keeper */
  private readonly onStepAside?: (holder: SRV.KeeperRecord) => void

  /** the epic home's old holds file:  carried over once, and kept in step */
  private readonly legacyHolds?: string

  /** whether `onStale` ran */
  private handedOver = false

  /** its address and write token, once `start()` has them */
  private base?: string
  private token?: string

  /** the keeper in charge while this one stands aside, else `undefined` */
  private holder?: SRV.KeeperRecord

  constructor({
    home = SRV.keeperHome(),
    name = SPELL_KEEPER,
    repos,
    serversOf,
    editorKept = pageServerServesEditor,
    self = SELF,
    moreAnswer,
    legacyHolds,
    control = PAGE_SERVERS,
    now = Date.now,
    onStale,
    onStepAside,
    https
  }: {
    home?: string
    name?: string
    /** default:  the keeper's list (`KeeperList`), read each look */
    repos?: KeeperRepo[] | (() => KeeperRepo[])
    /** default:  the servers the keeper's list registers for the checkout */
    serversOf?: (repo: KeeperRepo) => KeeperServer[]
    editorKept?: (checkout: string) => boolean
    self?: { id: string; name: string; what: string }
    moreAnswer?: () => object
    legacyHolds?: string
    control?: PageServerControl
    now?: () => number
    onStale?: () => void
    onStepAside?: (holder: SRV.KeeperRecord) => void
    /** default:  the page servers' certificate, a turn asking for a look, which sees its files change */
    https?: HttpsSwitch
  } = {}) {
    this.home = home
    this.name = name
    const list = new KeeperList({ home })
    this.reposNow = typeof repos === "function" ? repos : repos ? () => repos : () => list.checkouts
    this.serversOf = serversOf ?? ((repo) => list.serversOf(repo.checkout))
    this.editorKept = editorKept
    this.self = self
    this.moreAnswer = moreAnswer
    this.legacyHolds = legacyHolds
    this.control = control
    this.now = now
    this.https = https ?? new HttpsSwitch({ changed: () => this.look() })
    this.onStale = onStale
    this.onStepAside = onStepAside
    this.carryHolds()
  }

  /** the main checkouts it keeps, now */
  get repos(): KeeperRepo[] {
    return this.reposNow()
  }

  /** whether another keeper is in charge, and this one only forwards (`holder`) */
  get isAside(): boolean {
    return this.holder !== undefined
  }

  /**
   * Start keeping:  write the record others ask it by, look now, then every `LOOK_SECONDS`.
   * - `base`, `token`:  its address and write token, for the record
   * - `isStale`:  whether its code is newer than its start, asked at most once a minute
   * - `takeOver`:  take the record from whichever keeper holds it (`spell keeper start`);  else only from one of its
   *   own kind, or none (above, "Handing over")
   */
  start({
    base,
    token,
    isStale,
    takeOver = false
  }: {
    base: string
    token: string
    isStale?: () => boolean
    takeOver?: boolean
  }): this {
    this.base = base
    this.token = token
    const holder = this.link.running()
    if (!holder || takeOver || (holder.keeper ?? UNNAMED_KEEPER) === this.name) this.takeRecord()
    else this.standAside(holder)
    // what it starts carries its mark, so main's page server and editor know the keeper started them, though an
    // agent's session started it (`SRV.KeeperLink.refusedStart()`, epic `epic-engine` P84)
    process.env[SRV.KEEPER_START_VARIABLE] = "1"
    let staleAsked = 0
    const look = () => {
      if (!this.isInCharge()) return
      // its own code, at most once a minute:  a walk of every code file
      const asksStale = this.now() - staleAsked >= STALE_LOOK_SECONDS * 1000
      if (asksStale) staleAsked = this.now()
      if (asksStale && isStale?.() && !this.handedOver && this.onStale) {
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
  // ## Handing over
  ////////////////

  /**
   * Whether this keeper is in charge now, the record read again:  another live keeper's record, and it steps aside;
   * none, or a dead one's, and it takes the record (back).  NEVER throws.
   */
  private isInCharge(): boolean {
    const record = this.link.read()
    if (record && record.pid !== process.pid && SRV.isProcessAlive(record.pid)) {
      if (this.holder?.pid !== record.pid) this.standAside(record)
      return false
    }
    if (!record || record.pid !== process.pid) {
      if (this.holder) console.log(`server keeper (${this.name}):  the keeper in charge is gone;  keeping again`)
      this.takeRecord()
    }
    return true
  }

  /** SIDE EFFECT:  the record written as this keeper's;  it's in charge */
  private takeRecord(): void {
    this.holder = undefined
    if (this.base && this.token)
      this.link.write({ pid: process.pid, base: this.base, token: this.token, keeper: this.name })
  }

  /** SIDE EFFECT:  `holder` is in charge:  this keeper keeps nothing, and forwards what it's asked */
  private standAside(holder: SRV.KeeperRecord): void {
    this.holder = holder
    console.log(
      `server keeper (${this.name}):  ${holder.keeper ?? UNNAMED_KEEPER}'s keeper (pid ${holder.pid}) is in charge;  ` +
        "standing aside"
    )
    this.onStepAside?.(holder)
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

  /** the look itself;  standing aside, the rows of the keeper in charge */
  private async lookNow(): Promise<void> {
    if (this.holder) return this.lookThroughHolder(this.holder)
    await this.watchCertificate()
    const rows: KeptServer[] = [this.selfRow()]
    for (const repo of this.repos) {
      try {
        rows.push(...(await this.lookAtRepo(repo)))
      } catch (error) {
        console.error(`server keeper:  couldn't look at ${repo.name}'s servers:`, error)
      }
    }
    this.rows = new Map(rows.map((row) => [row.id, row]))
  }

  /** the rows the keeper in charge last saw, as its own `GET /api/servers` answers.  NEVER throws */
  private async lookThroughHolder(holder: SRV.KeeperRecord): Promise<void> {
    try {
      const response = await fetch(`${holder.base}${SRV.KEEPER_API}`, { signal: AbortSignal.timeout(HOLDER_WAIT_MS) })
      const answer = (await response.json()) as KeptServersAnswer
      this.rows = new Map(answer.servers.map((row) => [row.id, row]))
    } catch {
      // it doesn't answer:  the rows as they were, until the record says who's in charge
    }
  }

  /** its own row:  it answers, or this wouldn't run */
  private selfRow(): KeptServer {
    const base = this.base
    return {
      id: this.self.id,
      repo: "",
      name: this.self.name,
      what: this.self.what,
      checkout: this.home,
      address: base && `${base}/`,
      state: "running",
      started: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      log: join(this.home, KEEPER_LOG_FILE),
      canStart: false
    }
  }

  /** `repo`'s servers:  its main page server and editor, its own, its worktrees' */
  private async lookAtRepo(repo: KeeperRepo): Promise<KeptServer[]> {
    const rows: KeptServer[] = []
    if (isKit(repo.checkout)) {
      const pageServer = await this.keepMainPageServer(repo)
      rows.push(pageServer, await this.keepMainEditor(repo, pageServer))
    }
    for (const server of this.serversOf(repo)) rows.push(await this.keepOwnServer(repo, server))
    if (isKit(repo.checkout)) rows.push(...(await this.lookAtWorktrees(repo)))
    return rows
  }

  /** The main checkout's page server, kept up:  started when down, restarted when older than its code;  held:  left. */
  private async keepMainPageServer(repo: KeeperRepo): Promise<KeptServer> {
    const id = idOf(repo, "page server")
    const row = {
      ...this.row(id, repo, repo.checkout, "page server", "epic pages, guides, the app's calls"),
      log: SRV.serverLogOf(repo.checkout, "page server")
    }
    const handsOff = this.isHandsOff
    if (handsOff || this.held().includes(id)) {
      const running = await this.control.status(repo.checkout)
      return running
        ? { ...row, ...howItStands(running), state: "running", address: `${running.base}/` }
        : { ...row, state: "stopped", why: handsOff ? HANDS_OFF_WHY : STOPPED_BY_HAND }
    }
    if (this.isWaitingAfterFailure(id)) return this.rows.get(id) ?? { ...row, state: "down" }
    try {
      const before = await this.control.status(repo.checkout)
      if (!before) this.lastStart.set(id, this.now())
      const server = await this.control.ensure(repo.checkout)
      const since = server.launched ? new Date(this.now()).toISOString() : this.rows.get(id)?.since
      return {
        ...row,
        ...howItStands(server),
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
  private editorRow(repo: KeeperRepo, checkout: string, worktree?: string): KeptServer {
    const row = this.row(
      idOf(repo, "editor", worktree),
      repo,
      checkout,
      "editor",
      "the Spell app;  it comes with the page server",
      worktree
    )
    const address = SRV.editorAddressOf(checkout)
    const log = SRV.serverLogOf(checkout, "editor")
    if (!address) return { ...row, log, canStart: false, state: "stopped" }
    // its record is written as it first answers:  its time, the editor's start
    const started = statSync(join(checkout, SRV.EDITOR_FILE), { throwIfNoEntry: false })?.mtime.toISOString()
    return { ...row, log, canStart: false, state: "running", address, ...(started && { started }) }
  }

  /**
   * The main checkout's editor, kept through its page server, when that serves one (`editorKept`):
   * - down under a running page server:  the page server restarted, which brings it back;  tried again only after
   *   `EDITOR_RETRY_MINUTES`, so an editor that won't build never keeps main's pages restarting
   * - the page server stopped or down:  stopped too, it comes back with it
   * - started less than `EDITOR_WAIT_SECONDS` ago (the page server's restart):  starting, Vite may be building
   */
  private async keepMainEditor(repo: KeeperRepo, pageServer: KeptServer): Promise<KeptServer> {
    const row = this.editorRow(repo, repo.checkout)
    if (!this.editorKept(repo.checkout)) return row
    const kept: KeptServer = { ...row, canStart: true, actions: ["start", "restart"] }
    if (row.state === "running") return kept
    if (pageServer.state !== "running") return { ...kept, state: "stopped", why: "It comes back with the page server." }
    if (this.isHandsOff) return { ...kept, state: "stopped", why: HANDS_OFF_WHY }
    const started = Math.max(this.lastStart.get(row.id) ?? 0, pageServer.since ? Date.parse(pageServer.since) : 0)
    if (this.now() - started < EDITOR_WAIT_SECONDS * 1000) return { ...kept, state: "starting" }
    const tried = this.lastStart.get(row.id)
    if (tried !== undefined && this.now() - tried < EDITOR_RETRY_MINUTES * 60_000)
      return { ...kept, state: "down", why: EDITOR_DOWN }
    await this.restartForEditor(repo)
    return { ...kept, state: "starting", why: "started:  it was down" }
  }

  /** the main page server restarted, so its editor starts with it.  SIDE EFFECT:  the editor's last start, now */
  private async restartForEditor(repo: KeeperRepo): Promise<SRV.KeeperAnswer> {
    this.lastStart.set(idOf(repo, "editor"), this.now())
    await this.control.stop(repo.checkout)
    return { ...(await this.control.ensure(repo.checkout)), state: "starting" }
  }

  /** One of the checkout's own servers (`serversOf`), watched;  started when down, if it says how. */
  private async keepOwnServer(repo: KeeperRepo, server: KeeperServer): Promise<KeptServer> {
    const id = idOf(repo, server.name)
    const row: KeptServer = {
      ...this.row(id, repo, repo.checkout, server.name, server.what ?? "", undefined),
      own: true,
      log: this.ownLogOf(repo, server),
      canStart: Boolean(server.start),
      address: addressOf(server.check)
    }
    if (await isAnswering(server.check)) return { ...row, state: "running" }
    if (!server.start) return { ...row, state: "down", why: "Spell doesn't know how to start it, so start it yourself" }
    if (this.held().includes(id)) return { ...row, state: "stopped", why: STOPPED_BY_HAND }
    if (this.isHandsOff) return { ...row, state: "stopped", why: HANDS_OFF_WHY }
    if (this.isWaitingAfterFailure(id)) return { ...row, state: "starting" }
    this.startOwn(repo, server)
    return { ...row, state: "starting", why: "started:  it was down" }
  }

  /** each worktree's page server and editor:  shown while it has one, stopped after `IDLE_MINUTES` unused */
  private async lookAtWorktrees(repo: KeeperRepo): Promise<KeptServer[]> {
    const rows: KeptServer[] = []
    const book = new SRV.PortBook()
    for (const [worktree, checkout] of SRV.worktreesOf(repo.checkout)) {
      const booked = book.portsOf(checkout)["page server"]
      const hasRecord = existsSync(join(checkout, PAGE_SERVER_FILE))
      if (!booked && !hasRecord) continue
      const id = idOf(repo, "page server", worktree)
      const row = {
        ...this.row(id, repo, checkout, "page server", "its own pages, on demand", worktree),
        log: SRV.serverLogOf(checkout, "page server"),
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
        ...howItStands(running),
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
   * - main's editor (`start`, `restart`):  its page server restarted, which brings it back (`keepMainEditor()`)
   * - throws `SRV.HttpError` 404 for a server it doesn't keep, 400 for one it can't start
   */
  async act(action: SRV.KeeperAction, checkout: string, server = "page server"): Promise<SRV.KeeperAnswer> {
    // standing aside:  the keeper in charge does it
    if (this.holder) {
      const answer = await this.link.ask(action, { checkout, server })
      if (answer) return answer
    }
    const { repo, worktree } = this.whereIs(checkout)
    const id = idOf(repo, server, worktree)
    const own = worktree ? undefined : this.serversOf(repo).find((each) => each.name === server)
    // only what the keeper starts by itself is held:  main's page server, the repo's own
    const holds = Boolean(own) || server === "page server"
    if (holds && action === "stop" && !worktree) this.hold(id, true)
    if (holds && action !== "stop") this.hold(id, false)
    let answer: SRV.KeeperAnswer
    if (own) answer = await this.actOnOwn(action, repo, own)
    else if (server === "editor" && !worktree && action !== "stop" && this.editorKept(repo.checkout))
      answer = await this.restartForEditor(repo)
    else if (server === "page server") answer = await this.actOnPageServer(action, worktree ? checkout : repo.checkout)
    else throw new SRV.HttpError(400, `the ${server} comes with the page server:  ${action} that instead`)
    void this.look()
    return answer
  }

  /**
   * SIDE EFFECT:  the page server's certificate files compared with the last look's;  changed (made, made again,
   * deleted), every main page server restarted, so it takes HTTPS or drops it.  The first look only notes them.
   */
  private async watchCertificate(): Promise<void> {
    // hands off:  the change waits, and is taken up once it's turned off
    if (this.isHandsOff) return
    const stamp = this.https.filesStamp
    const hasChanged = this.certificateStamp !== undefined && stamp !== this.certificateStamp
    this.certificateStamp = stamp
    if (!hasChanged) return
    this.https.forget()
    try {
      await this.restartMainPageServers()
    } catch (error) {
      console.error("server keeper:  the certificate changed, and a page server wouldn't restart:", error)
    }
  }

  /**
   * SIDE EFFECT:  every main page server restarted, its editor with it (its child)
   * - `withHeld`:  one stopped by hand too, which then runs (Restart all);  else it's left stopped, taking the
   *   certificate at its start
   */
  async restartMainPageServers({ withHeld = false }: { withHeld?: boolean } = {}): Promise<void> {
    for (const repo of this.repos) {
      if (!isKit(repo.checkout) || (!withHeld && this.held().includes(idOf(repo, "page server")))) continue
      await this.act("restart", repo.checkout)
    }
  }

  /** a page server, started, stopped or restarted here, never through the keeper again */
  private async actOnPageServer(action: SRV.KeeperAction, checkout: string): Promise<SRV.KeeperAnswer> {
    if (action === "stop") return { state: (await this.control.stop(checkout)) ? "stopped" : "not running" }
    if (action === "restart") await this.control.stop(checkout, { restart: true })
    return { ...(await this.control.ensure(checkout)), state: "running" }
  }

  /** one of the repo's own servers:  its pid isn't known, so a stop or restart stops what listens on its port */
  private async actOnOwn(action: SRV.KeeperAction, repo: KeeperRepo, server: KeeperServer): Promise<SRV.KeeperAnswer> {
    if (!server.start && action !== "stop") throw new SRV.HttpError(400, `${server.name} has no start command`)
    if (action !== "start") await stopListener(server.check)
    if (action === "stop") return { state: "stopped" }
    if (!(await isAnswering(server.check))) this.startOwn(repo, server)
    return { state: "starting" }
  }

  /** the repo and worktree checkout `checkout` is;  a 404 for one it doesn't keep */
  private whereIs(checkout: string): { repo: KeeperRepo; worktree?: string } {
    const repos = this.repos
    for (const repo of repos) {
      if (SRV.RealPath.same(repo.checkout, checkout)) return { repo }
      for (const [worktree, folder] of SRV.worktreesOf(repo.checkout))
        if (SRV.RealPath.same(folder, checkout)) return { repo, worktree }
    }
    throw new SRV.HttpError(
      404,
      `the server keeper keeps no servers of ${checkout}:  spell keeper add --checkout <its main checkout>`
    )
  }

  ////////////////
  // ## HTTP
  ////////////////

  /**
   * Its calls, on the hub's router:
   * - `GET /api/servers`:  the Servers tab's data (`KeptServersAnswer`, and `moreAnswer`'s)
   * - `GET /api/servers/dot`:  `{ dot, why }`, the tab's red dot:  a server that should be up is down
   * - `POST /api/servers/look`:  look now (a session's start)
   * - `POST /api/servers/https`, `{ turn: "on" | "off" }`:  HTTPS turned (`HttpsSwitch.turn()`), its status after
   * - `POST /api/servers/hands-off`, `{ on }`:  hands off turned on or off (`setHandsOff()`)
   * - `POST /api/servers/restart-all`:  `{ state: "restarting" }`, then every main page server restarted, its editor
   *   with it (`restartMainPageServers()`), just after the answer:  the call came through one of them
   * - `POST /api/servers/editor-spaces`, `{ repo, worktree? }`:  that checkout's `spaces/` served by the kit's page
   *   server (`showInEditor()`), then every main page server restarted, just after the answer
   * - `POST /api/servers/<start|stop|restart>`, `{ checkout, server }`:  `act()`
   * - every POST needs the hub's write token (`guard`)
   * - `GET /api/servers/log?id=<id>`:  the last `LOG_LINES` lines of that server's log (`KeptServerLog`)
   * - `GET /servers/`:  the Spell Servers page (`servers.html`, `servers.js`), with Spell UI from the docs pages'
   *   bundle (`uiFiles()`):  on the keeper's own port, so it answers while every page server is down (epic `editor` P49)
   */
  route(router: SRV.Router, guard: SRV.Guard): void {
    router.get(SERVERS_PAGE, (request, reply, next) =>
      request.path.endsWith("/") ? this.sendServersPage(reply, guard.token) : reply.redirect(SERVERS_PAGE)
    )
    router.get(`${SERVERS_PAGE}${SERVERS_SCRIPT}`, (_request, reply) =>
      reply
        .type("text/javascript; charset=utf-8")
        .noStore()
        .send(readFileSync(join(HERE, SERVERS_SCRIPT), "utf8"))
    )
    router.use((request, reply, next) => this.uiFiles()?.files.handle(request, reply, next) ?? next())
    router.get(SERVER_LOG_API, (request, reply) => reply.noStore().json(this.logOf(String(request.query.id ?? ""))))
    router.get(SRV.KEEPER_API, this.onAsked)
    router.get(`${SRV.KEEPER_API}/dot`, (_request, reply) => reply.noStore().json(this.dot()))
    router.post(`${SRV.KEEPER_API}/look`, guard.writeCheck, async (_request, reply) => {
      await this.look()
      reply.noStore().json({ servers: this.servers() })
    })
    // before `/:action`, which would take them for an action
    router.post(HTTPS_API, guard.writeCheck, SRV.parseBodies(), this.onHttps)
    router.post(HANDS_OFF_API, guard.writeCheck, SRV.parseBodies(), async (request, reply) => {
      const { on } = (request.body ?? {}) as Partial<HandsOff>
      if (typeof on !== "boolean") throw new SRV.HttpError(400, "on or off?  { on: true | false }")
      await this.setHandsOff(on)
      reply.noStore().json({ handsOff: this.isHandsOff })
    })
    router.post(EDITOR_SPACES_API, guard.writeCheck, SRV.parseBodies(), (request, reply) => {
      const { repo, worktree } = (request.body ?? {}) as { repo?: string; worktree?: string }
      if (!repo) throw new SRV.HttpError(400, "which repo?  { repo, worktree }")
      const orgs = this.showInEditor(repo, worktree)
      afterAnswer(() => this.restartMainPageServers({ withHeld: true }))
      reply.noStore().json({ state: "restarting", orgs })
    })
    router.post(RESTART_ALL_API, guard.writeCheck, (_request, reply) => {
      afterAnswer(() => this.restartMainPageServers({ withHeld: true }))
      reply.noStore().json({ state: "restarting" })
    })
    router.post(`${SRV.KEEPER_API}/:action`, guard.writeCheck, SRV.parseBodies(), this.onAct)
  }

  ////////////////
  // ## Spaces in the editor
  ////////////////

  /**
   * Each repo whose `spaces/` the kit's page server can serve (`EditorSpaces`), and which checkout it serves now, from
   * the more spaces file (`SRV.moreSpacesInFile()`):  none without a kit among the repos.
   * - a repo's `spaces/` holding an org's folder (`@acme/`), not Spell's own (`@spell`);  never a kit's
   * - `file`:  the more spaces file;  tests hand their own
   */
  editorSpaces(file: string = SRV.MORE_SPACES_FILE): EditorSpaces[] {
    const repos = this.repos
    if (!repos.some((repo) => isKit(repo.checkout))) return []
    const served = SRV.servedSpaces(SRV.moreSpacesInFile(file))
    return repos.flatMap((repo): EditorSpaces[] => {
      if (isKit(repo.checkout)) return []
      const orgs = SRV.orgsIn(join(repo.checkout, SPACES)).filter((org) => org !== "spell")
      if (!orgs.length) return []
      const isServed = (folder: string) =>
        served.some(({ dir, orgs: its }) => its.some((org) => orgs.includes(org)) && SRV.RealPath.same(dir, folder))
      const worktrees = SRV.worktreesOf(repo.checkout)
        .filter(([, folder]) => existsSync(join(folder, SPACES)))
        .sort(([one], [other]) => one.localeCompare(other))
      return [
        {
          repo: repo.name,
          orgs,
          checkouts: [
            { served: isServed(join(repo.checkout, SPACES)) },
            ...worktrees.map(([worktree, folder]) => ({ worktree, served: isServed(join(folder, SPACES)) }))
          ]
        }
      ]
    })
  }

  /**
   * Serve `repo`'s `spaces/` from its main checkout, or from `worktree`'s (`SRV.switchSpaces()`):  the orgs it serves.
   * - by name, never by a folder the page sends:  only a repo the hub serves, and one of its own worktrees
   * - the caller restarts the page server, which reads the file as it starts
   * - throws `SRV.HttpError` 404 for a repo or worktree it doesn't know, 400 for one with no `spaces/`
   */
  showInEditor(repo: string, worktree?: string, file: string = SRV.MORE_SPACES_FILE): string[] {
    const known = this.repos.find((each) => each.name === repo && !isKit(each.checkout))
    if (!known) throw new SRV.HttpError(404, `the hub serves no project named ${repo}`)
    const checkout = worktree
      ? SRV.worktreesOf(known.checkout).find(([name]) => name === worktree)?.[1]
      : known.checkout
    if (!checkout) throw new SRV.HttpError(404, `${repo} has no worktree named ${worktree}`)
    try {
      return SRV.switchSpaces(join(checkout, SPACES), { file })
    } catch (error) {
      if (error instanceof TypeError) throw new SRV.HttpError(400, error.message)
      throw error
    }
  }

  /**
   * The last `LOG_LINES` lines of server `id`'s log, colours taken out;  none yet, or no such server:  `[]`.
   * - NEVER throws
   */
  logOf(id: string): KeptServerLog {
    const file = this.rows.get(id)?.log
    return { id, ...(file && { file }), lines: file ? lastLines(file, LOG_LINES) : [] }
  }

  /**
   * The Spell UI files the Servers page loads:  the docs pages' bundle of the first kit the keeper keeps, as its
   * settings name it (`"uiScript"`, under one of its `"engineRoutes"`), with every engine route it loads from;  none:  `undefined`, and the page draws a
   * plain table.  Found once.  NEVER throws
   */
  uiFiles(): { script: string; files: SRV.StaticHandler } | undefined {
    if (this.foundUi !== undefined) return this.foundUi || undefined
    this.foundUi = false
    const kit = this.repos.find((repo) => isKit(repo.checkout))
    if (!kit) return undefined
    try {
      const settings = pageServerSettings(kit.checkout)
      const script = settings.uiScript
      const routes = Object.entries(settings.engineRoutes ?? {})
      if (!script || !routes.some(([prefix]) => script.startsWith(prefix))) return undefined
      // every engine route:  the bundle loads its packs from them too (`/_epic/pack/`)
      const mounts = routes.map(([prefix, folder]) => ({ prefix, dir: join(kit.checkout, folder) }))
      const files = new SRV.StaticHandler({ mounts })
      this.foundUi = { script, files }
    } catch (error) {
      console.error("server keeper:  can't find Spell UI for the Servers page;  it draws a plain table", error)
    }
    return this.foundUi || undefined
  }

  /** `uiFiles()`'s answer, once found;  `false`:  none */
  private foundUi?: { script: string; files: SRV.StaticHandler } | false

  /** the Servers page, told its write token and where Spell UI is (`window.SPELL_KEEPER`) */
  private sendServersPage(reply: SRV.Reply, token: string): void {
    const ui = this.uiFiles()
    const script = ui && existsSync(this.uiFileOnDisk(ui.script)) ? ui.script : undefined
    const config = { token, ...(script && { uiScript: script }), lookSeconds: LOOK_SECONDS }
    const page = readFileSync(join(HERE, SERVERS_HTML), "utf8").replace(
      CONFIG_MARK,
      `<script>window.SPELL_KEEPER = ${JSON.stringify(config).replaceAll("<", "\\u003c")}</script>`
    )
    reply.type("text/html; charset=utf-8").noStore().send(page)
  }

  /** the file Spell UI's script `address` is on disk */
  private uiFileOnDisk(address: string): string {
    const found = this.uiFiles()?.files.resolve(address)
    return found && "file" in found ? found.file : ""
  }

  /** `POST /api/servers/https` */
  private onHttps: Handler = async (request, reply) => {
    const { turn } = (request.body ?? {}) as Partial<HttpsTurn>
    if (turn !== "on" && turn !== "off") throw new SRV.HttpError(400, `which way?  { turn: "on" | "off" }`)
    reply.noStore().json(await this.https.turn(turn))
  }

  /** `GET /api/servers` */
  private onAsked: Handler = async (_request, reply) => {
    if (!this.rows.size) await this.look()
    const answer: KeptServersAnswer = {
      ...this.moreAnswer?.(),
      servers: this.servers(),
      lookSeconds: LOOK_SECONDS,
      keeper: this.holder?.keeper ?? this.name,
      https: this.https.status,
      ...(this.isHandsOff && { handsOff: true }),
      editorSpaces: this.editorSpaces()
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
    if (this.isHandsOff) return { dot: true, why: HANDS_OFF_DOT }
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
    repo: KeeperRepo,
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

  /** start one of the checkout's own servers in the background, its output in `<home>/servers/<repo>-<name>.log` */
  private startOwn(repo: KeeperRepo, server: KeeperServer): void {
    this.lastStart.set(idOf(repo, server.name), this.now())
    const log = this.ownLogOf(repo, server)
    mkdirSync(dirname(log), { recursive: true })
    const out = openSync(log, "a")
    const child = spawn(process.env.SHELL || "/bin/sh", ["-c", server.start!], {
      cwd: server.folder ?? repo.checkout,
      detached: true,
      stdio: ["ignore", out, out]
    })
    child.once("error", (error) => console.error(`server keeper:  ${server.name} won't start:`, error))
    child.unref()
  }

  /** one of the checkout's own servers' log:  `<home>/servers/<repo>-<name>.log` */
  private ownLogOf(repo: KeeperRepo, server: KeeperServer): string {
    return join(this.home, KEEPER_SERVER_LOGS, `${slug(`${repo.name}-${server.name}`, { as: "id" })}.log`)
  }

  /** the holds file */
  private get holdsFile(): string {
    return join(this.home, KEEPER_HOLDS_FILE)
  }

  /** the holds file:  the ids held stopped by hand, and whether the person has said hands off */
  private holds(): HoldFile {
    return readJson<HoldFile>(this.holdsFile) ?? {}
  }

  /** SIDE EFFECT:  the epic home's old holds file carried over, once:  when there's none here yet.  NEVER throws */
  private carryHolds(): void {
    if (!this.legacyHolds || existsSync(this.holdsFile) || !existsSync(this.legacyHolds)) return
    try {
      mkdirSync(this.home, { recursive: true })
      copyFileSync(this.legacyHolds, this.holdsFile)
    } catch (error) {
      console.error(`server keeper:  couldn't carry ${this.legacyHolds} over;  nothing held`, error)
    }
  }

  /** the ids held stopped by hand */
  private held(): string[] {
    return this.holds().held ?? []
  }

  /** whether the person is working on the servers themselves:  the keeper starts, stops and restarts nothing of main's */
  get isHandsOff(): boolean {
    return this.holds().handsOff === true
  }

  /**
   * SIDE EFFECT:  hands off turned on or off, kept in the hold file;  off, a look at once, so what's down comes back
   * and a certificate changed meanwhile is taken up
   */
  async setHandsOff(isOn: boolean): Promise<void> {
    if (isOn === this.isHandsOff) return
    this.writeHolds({ ...this.holds(), handsOff: isOn })
    if (!isOn) await this.look()
  }

  /** hold server `id` stopped, or let it go.  SIDE EFFECT:  writes the hold file */
  private hold(id: string, isHeld: boolean): void {
    const holds = this.holds()
    const held = new Set(holds.held ?? [])
    if (isHeld === held.has(id)) return
    if (isHeld) held.add(id)
    else held.delete(id)
    this.writeHolds({ ...holds, held: [...held] })
  }

  /** SIDE EFFECT:  the holds file written, and the old one with it while one is handed in;  `handsOff` only while on */
  private writeHolds({ held = [], handsOff }: HoldFile): void {
    const holds: HoldFile = { held, ...(handsOff && { handsOff }) }
    for (const file of [this.holdsFile, this.legacyHolds]) {
      if (!file) continue
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, `${JSON.stringify(holds, null, 2)}\n`)
    }
  }
}

/** How the keeper starts, stops and asks a checkout's page server:  a test hands its own. */
export type PageServerControl = {
  status: (checkout: string) => Promise<SRV.RunningServer | undefined>
  ensure: (checkout: string) => Promise<SRV.RunningServer & { launched: boolean }>
  stop: (checkout: string, options?: { restart?: boolean }) => Promise<boolean>
}

/** Its own row, when it's handed none:  Spell's keeper. */
const SELF = { id: "keeper", name: "server keeper", what: "keeps Spell's servers up" }

/**
 * The keeper a record names that says none:  the epic hub's, on code from before epic `editor` P48, wrote no name.
 * - a plain word, not an import:  the kit names nothing of the epic tooling
 */
const UNNAMED_KEEPER = "epic hub"

/** How long a keeper standing aside waits for the one in charge's rows, ms. */
const HOLDER_WAIT_MS = 5_000

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

/** What a main server says while hands off is on. */
const HANDS_OFF_WHY = "You're working on the servers yourself, so Spell won't start or restart this one for you."

/** The tab's dot while hands off is on. */
const HANDS_OFF_DOT =
  "Hands off:  Spell won't start, stop or restart your servers until you turn off the switch at the top of this tab."

/** What a server held stopped says. */
const STOPPED_BY_HAND = "You stopped it.  Press Start to turn it back on."

/** The calls `act()` takes. */
const ACTIONS: readonly SRV.KeeperAction[] = ["start", "stop", "restart"]

/** The hold file:  `held`, the servers stopped by hand;  `handsOff`, while the person works on them themselves. */
type HoldFile = { held?: string[]; handsOff?: boolean }

/** A checkout's page server record. */
const PAGE_SERVER_FILE = ".spell-server.json"

/** How long an editor may take to answer after its page server starts, seconds:  Vite may be building its cache. */
const EDITOR_WAIT_SECONDS = 90

/**
 * How long after the keeper restarted the page server for a down editor before it tries again, minutes.
 * - 3, not 10 (epic `epic-engine` I455):  the page server starts a vite that ends by itself again at once
 *   (`EditorServer.relaunchSoon()`), so the keeper's turn comes only when that didn't work
 */
const EDITOR_RETRY_MINUTES = 3

/** What a down editor's card says, in plain words (novice voice):  never a log file's name */
const EDITOR_DOWN =
  "The editor didn't start.\nPress Restart to try again.\nSpell also tries again by itself every few minutes."

/** How long a stop waits for a process to end before it kills it, ms. */
const STOP_WAIT_MS = 10_000

/** a server's id:  `<repo>/<name>`, a worktree's `<repo>/<worktree>/<name>` */
function idOf(repo: KeeperRepo, name: string, worktree?: string): string {
  return [repo.name, worktree, name].filter(Boolean).join("/")
}

/** a project's spaces folder, in its checkout:  `spaces/` */
const SPACES = "spaces"

/** whether `checkout` is a Spell kit, which runs a page server of its own */
function isKit(checkout: string): boolean {
  return existsSync(join(checkout, REPOS_FILE)) && existsSync(join(checkout, "src/server/page/cli.ts"))
}

/**
 * whether main checkout `checkout`'s page server serves an editor:  its settings run the app's routes, which start
 * the editor (spell-app's `EditorServer`), as `spell server start all` reads them.  NEVER throws
 */
function pageServerServesEditor(checkout: string): boolean {
  try {
    return pageServerSettings(checkout).routes?.some((route) => route.includes("appRoutes")) ?? false
  } catch {
    return false
  }
}

/** This folder:  the Servers page's files are beside this one. */
const HERE = dirname(fileURLToPath(import.meta.url))

/** The Servers page, and its script, beside this file. */
const SERVERS_HTML = "servers.html"
const SERVERS_SCRIPT = "servers.js"

/** Where `sendServersPage()` puts the page's settings. */
const CONFIG_MARK = "<!-- keeper settings -->"

/** How far back from a log's end `lastLines()` reads, bytes:  50 long lines and more. */
const LOG_TAIL_BYTES = 64 * 1024

/**
 * The last `count` lines of `file`, its colours (ANSI codes) taken out;  missing:  `[]`.
 * - only its last `LOG_TAIL_BYTES` read:  a log grows for weeks
 * - NEVER throws
 */
export function lastLines(file: string, count: number): string[] {
  let handle: number | undefined
  try {
    handle = openSync(file, "r")
    const size = fstatSync(handle).size
    const length = Math.min(size, LOG_TAIL_BYTES)
    const buffer = Buffer.alloc(length)
    readSync(handle, buffer, 0, length, size - length)
    const lines = buffer.toString("utf8").replace(ANSI_CODES, "").split(/\r?\n/)
    // a read that began part way into a line:  that line's end is dropped
    if (length < size) lines.shift()
    while (lines.length && lines.at(-1) === "") lines.pop()
    return lines.slice(-count)
  } catch {
    return []
  } finally {
    if (handle !== undefined) closeSync(handle)
  }
}

/** A terminal's colour and style codes, `\x1b[32m`. */
// oxlint-disable-next-line no-control-regex -- the escape character is what it matches
const ANSI_CODES = /\x1b\[[0-9;]*[A-Za-z]/g

/** what a page server's status call says of how it stands now:  when it started, what it's building */
function howItStands(info: SRV.RunningServer): Pick<KeptServer, "started" | "building"> {
  return { started: info.started, ...(info.building?.length && { building: info.building }) }
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
