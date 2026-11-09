import { spawn, spawnSync } from "child_process"
import {
  appendFileSync,
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync
} from "fs"
import { homedir } from "os"
import { join } from "path"
import { setTimeout as sleep } from "timers/promises"

import { SRV } from "spell/server"
import type { ReportedServer } from "spell/server/page"
import { HOME_ORG, LOCAL_PERSON } from "spell/app/spaces/models/projectGroups"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { EDITOR_FILE } from "./EditorServer"
import { CLOUD_BROWSER_BUNDLE, CLOUD_PORT } from "./SpellCloud"

/** Where the site's addresses are unless `--address` says otherwise. */
export const DEFAULT_ADDRESSES = ["https://test.spell.app", "https://test.spell.space"]

/** The certificate the old shell scripts made:  taken over, so nobody has to trust a new one. */
const OLD_CERTIFICATE = "test.spell.app+1.pem"
/** That certificate's key. */
const OLD_KEY = "test.spell.app+1-key.pem"

/** How many times it checks that something it stopped has let go of its port, and how long between. */
const PORT_LOOKS = 25
const PORT_LOOK_MS = 200

/** How long `report()` gives a site just started to fall over:  Caddy finding its port taken says so at once. */
const SETTLE_MS = 1500

/** How often the lock is touched while it's held:  a build outlasts `SRV.FileLock`'s minute before a lock counts as a dead holder's. */
const LOCK_BEAT_MS = 20_000

/** Where HTTPS listens. */
const HTTPS_PORT = 443

/** How long Caddy holds a request while the cloud is down. */
const CADDY_HOLD = "30s"
/** How often it tries the cloud again meanwhile. */
const CADDY_HOLD_INTERVAL = "250ms"

/** How `ps` shows a cloud:  only that is stopped on the cloud's port. */
const CLOUD_PROGRAM = /\bspace cloud serve\b/
/** How `ps` shows Caddy:  only that is stopped on the HTTPS port. */
const CADDY_PROGRAM = /(^|\/)caddy(\s|$)/

/** The row's words when this Mac hasn't been set up. */
const NOT_SET_UP = "not set up:  spell space local setup"
/** The row's words in a worktree. */
const MAIN_CHECKOUT_ONLY = "the main checkout's page server runs it"
/** The row's word for a site running as it was found, on current code. */
const RUNNING = "running"
/** The row's word for a site this page server just started, or finished updating. */
const STARTED = "started"
/** The row's word while it builds and swaps, the old cloud still serving. */
const UPDATING = "updating"

/** Who the page server is, in a record. */
const PAGE_SERVER = "the page server"

/****************
 * ### `LocalSiteServer`
 * The house-network test site running:  Spell's cloud on its port, and Caddy on 443 in front of it (epic `atmosphere` T58).
 * - Two ways in, ONE way to start it (`launch()`):
 *   - the page server's:  `startWithPageServer()` when it listens
 *   - a terminal's:  `spell space local start`, `spell/app/cli`'s `LocalSite`
 * - The page server starts it only:
 *   - from the MAIN checkout:  a machine has one 443 and one 4949
 *   - on a Mac this has been set up on (`spell space local setup`, or the old scripts' certificate):
 *     anywhere else nothing happens, silently
 *   - while no terminal is running it:  a live run is left alone
 * - The page server's site OUTLIVES the page server (T63), so a restart, which every merge to `main` brings, leaves it up:
 *   - its programs run detached, with their record in `run.json5`:  their pids, and the code and settings they started from
 *   - a plain `spell server stop` leaves them;  `spell server stop all` and `spell space local stop` end them (`stopSite()`)
 * - A page server starting finds it running, and:
 *   - nothing changed:  leaves it alone, so a merge that doesn't touch the cloud causes no restart of it at all
 *   - the cloud's code or settings changed:  builds the bundle FIRST, the old cloud serving meanwhile, then swaps it
 *     - a build that fails leaves the old cloud serving, and says so in the log
 *     - Caddy holds each request through the gap of seconds (`caddyFileFor()`), so a page waits rather than errors;
 *       it keeps running throughout, unless its own file changed
 *   - ONE at a time:  a lock in its folder, so a second page server neither starts a second copy nor swaps twice
 * - REJECTED (Owen's suggestion, T63):  bringing the new cloud up on another port, and switching once it says it's ready.
 *   Two clouds running at once would both run the daily round and the retry queue (mail and backups twice),
 *   and split live rooms and sign-ins kept in memory.
 * - Replaces a cloud or a Caddy left on its ports, and only those:  anything else there is a failure, said in the log.
 * - A failure NEVER reaches the page server:  it's one line in the page server's log, and the reason in `site.log`.
 * - Its files are in `~/.spell/local-site`:  the certificate, `settings.json5`, `Caddyfile`, `site.log`, `run.json5`, `site.lock`.
 * - Every outside command goes through `LocalSiteTools`, so tests run none of them.
 * - Node only.  Spaces' own:  NEVER imports the app, lsp or cli folders (the command line imports this).
 ****************/
export class LocalSiteServer {
  /** Its files:  `~/.spell/local-site`. */
  readonly folder: string

  /** What runs outside commands. */
  private readonly tools: LocalSiteTools
  /** Where the shell scripts kept theirs, a certificate taken over from. */
  private readonly oldFolder: string
  /** This machine's person's email. */
  private readonly machineEmail: () => Promise<string>
  /** What this machine runs on. */
  private readonly platform: string
  /** Whether this is the main checkout's server:  a worktree's never starts it. */
  private readonly isMainCheckout: boolean
  /** The port the editor's dev server is on, for Caddy's file. */
  private readonly editorPort: () => number | undefined

  /** The page server's attempt to start it:  one per server, however often it's asked. */
  private starting?: Promise<void>
  /** The programs this page server started, while they run:  none when it found the site already running. */
  private run?: LocalSiteRun
  /** Its row's state in the table:  `running`, `started`, `updating`, or why not. */
  private state?: string
  /** The page server has stopped:  an update not yet at its swap ends there. */
  private wasStopped = false
  /** An update is under way, in the background. */
  private isUpdating = false
  /** The bundle's build, while it runs:  stopped with the page server. */
  private building?: LocalSiteChild
  /** The lock this process holds, and what keeps it fresh. */
  private held?: { lock: SRV.FileLock; beat: NodeJS.Timeout }

  constructor({
    tools = localSiteTools(),
    folder = join(homedir(), ".spell", "local-site"),
    oldFolder = join(homedir(), ".spell", "house-site"),
    machineEmail = machinePersonEmail,
    platform = process.platform,
    isMainCheckout = false,
    editorPort = recordedEditorPort
  }: LocalSiteServerProps = {}) {
    this.editorPort = editorPort
    this.tools = tools
    this.folder = folder
    this.oldFolder = oldFolder
    this.machineEmail = machineEmail
    this.platform = platform
    this.isMainCheckout = isMainCheckout
  }

  ////////////////
  // ## With the page server
  ////////////////

  /**
   * SIDE EFFECT:  the site runs, if this page server should run it (see the class).
   * - The same promise however often it's called, so one server never starts two.
   * - NEVER throws.
   */
  startWithPageServer(): Promise<void> {
    return (this.starting ??= this.startOnce())
  }

  /**
   * SIDE EFFECT:  the page server is going:  the site stays up, and only a build under way ends (the next start does it).
   * - NEVER throws
   */
  stop(): void {
    this.wasStopped = true
    this.building?.stop()
    this.letGoOfLock()
    this.run = undefined
  }

  /**
   * The site's row in `spell server start all`'s table:  `undefined` off a Mac, where it's no concern of anyone's.
   * - Waits for the start, then long enough for one that can't work to have said so;
   *   never for an update's build, which takes minutes:  it says `updating`.
   */
  async report(): Promise<ReportedServer | undefined> {
    if (this.platform !== "darwin") return undefined
    await this.startWithPageServer()
    if (this.run) await Promise.race([this.run.ended, this.tools.sleep(SETTLE_MS)])
    const row = { name: "local site", what: "the cloud and HTTPS, for this house network" }
    const url = this.run?.addresses[0] ?? this.runner?.detached?.addresses[0] ?? "-"
    return { ...row, url, state: this.state ?? "not running" }
  }

  /** The one attempt `startWithPageServer()` makes. */
  private async startOnce(): Promise<void> {
    try {
      if (this.platform !== "darwin") return
      this.state = this.reasonToStayOut
      if (this.state) return
      if (!this.takeLock()) {
        this.state = UPDATING
        return
      }
      await this.startOrUpdate()
    } catch (error) {
      this.failed(error)
    } finally {
      if (!this.isUpdating) this.letGoOfLock()
    }
  }

  /** Why this page server shouldn't run the site, in the table's words;  `undefined` when it should. */
  private get reasonToStayOut(): string | undefined {
    if (!this.isMainCheckout) return MAIN_CHECKOUT_ONLY
    if (!this.isSetUp) return NOT_SET_UP
    const runner = this.runner
    return runner && !runner.detached ? `already running, from ${runner.by}` : undefined
  }

  /**
   * SIDE EFFECT:  the site is started if it isn't running;  if it's running on old code or settings, an update starts.
   * - Answers once the update is under way:  it finishes in the background, the old cloud serving, and lets go of the lock.
   */
  private async startOrUpdate(): Promise<void> {
    const running = this.runner?.detached
    if (!running) {
      this.watch(await this.launch({ by: PAGE_SERVER }))
      this.state = STARTED
      return
    }
    const wanted = {
      code: this.tools.cloudVersion(),
      addresses: this.settings.addresses ?? DEFAULT_ADDRESSES,
      mail: await this.mailEnvironment()
    }
    const caddyText = this.caddyFileText(namesOf(wanted.addresses))
    const changes = {
      cloud:
        running.code !== wanted.code ||
        JSON.stringify(running.addresses) !== JSON.stringify(wanted.addresses) ||
        JSON.stringify(running.mail) !== JSON.stringify(wanted.mail),
      caddy: this.currentCaddyFileText !== caddyText
    }
    if (!changes.cloud && !changes.caddy) {
      this.state = RUNNING
      return
    }

    this.state = UPDATING
    this.isUpdating = true
    // deliberately not waited for:  a build takes minutes, and the old cloud serves meanwhile
    void this.update(running, wanted, changes)
      .catch((error: unknown) => this.failed(error))
      .finally(() => {
        this.isUpdating = false
        this.letGoOfLock()
      })
  }

  /**
   * SIDE EFFECT:  the site runs what's `wanted`:  the bundle built first, the cloud then swapped;  Caddy only if its file changed.
   * - A build that fails leaves the old cloud serving.
   * - throws if a port won't come free:  `startOnce()`'s `failed()` says so
   */
  private async update(
    running: LocalSiteDetached,
    wanted: LocalSiteWanted,
    changes: { cloud: boolean; caddy: boolean }
  ): Promise<void> {
    const pids = { cloud: running.cloud, caddy: running.caddy }
    const children: LocalSiteChild[] = []

    if (changes.cloud) {
      if (!(await this.bundleBuilt()) || this.wasStopped) return
      this.tools.stop(running.cloud)
      await this.stopListeners(CLOUD_PORT, CLOUD_PROGRAM)
      this.portFreeOrDie(CLOUD_PORT)
      const cloud = this.startCloud(wanted.addresses, wanted.mail, PAGE_SERVER)
      children.push(cloud)
      pids.cloud = cloud.pid
    }
    if (changes.caddy) {
      this.writeCaddyFile(namesOf(wanted.addresses))
      this.tools.stop(running.caddy)
      await this.stopListeners(HTTPS_PORT, CADDY_PROGRAM)
      this.portFreeOrDie(HTTPS_PORT)
      const caddy = this.startCaddy(PAGE_SERVER)
      children.push(caddy)
      pids.caddy = caddy.pid
    }

    this.writeRecord({ ...pids, ...wanted })
    if (children.length) this.watch(this.runOf(children, wanted.addresses, wanted.mail))
    this.state = STARTED
  }

  /**
   * SIDE EFFECT:  the browser bundle is current, built by a child while the old cloud keeps serving;  whether it worked.
   * - A failure is one line in the log, and the table says the old code is still running.
   */
  private async bundleBuilt(): Promise<boolean> {
    this.note("Updating:  building the browser bundle, the old cloud still serving.")
    this.building = this.tools.start(process.execPath, [SPELL_BIN(), "space", "cloud", "build"], {
      logFile: this.logFile
    })
    const exitCode = await this.building.exited
    this.building = undefined
    if (exitCode === 0 || this.wasStopped) return exitCode === 0
    const why = `the update's build failed, so the old cloud keeps serving:  see ${this.logFile}`
    this.state = `running the old code:  ${why}`
    console.error(`local site:  ${why}`)
    this.note(why)
    return false
  }

  /** SIDE EFFECT:  `run` is what this page server is keeping an eye on:  a program ending by itself is noted. */
  private watch(run: LocalSiteRun): void {
    this.run = run
    void run.ended.then((end) => this.noticeEnd(run, end)).catch((error: unknown) => this.failed(error))
  }

  /** SIDE EFFECT:  a site that ended without being asked is written down, for the table and the log. */
  private noticeEnd(run: LocalSiteRun, end: LocalSiteEnd): void {
    if (end !== "by itself" || this.run !== run) return
    this.run = undefined
    this.state = `stopped by itself:  see ${this.logFile}`
    this.note("The site stopped by itself.")
  }

  /** SIDE EFFECT:  why it couldn't run, in its log, the page server's log and the table.  - NEVER throws */
  private failed(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.state = `didn't start:  ${message}`
    console.error(`local site:  didn't start:  ${message}`)
    try {
      this.note(`Didn't start:  ${message}`)
    } catch {
      // its log can't be written:  the page server's has it
    }
  }

  /**
   * The editor's address on the house network, `https://test.spell.app`, when this page server's site has one:
   * only the main checkout's, on a Mac set up for it (epic `atmosphere` P39).
   * - NEVER throws:  a settings file it can't read just means no editor there.
   */
  get editorAddress(): string | undefined {
    try {
      if (this.platform !== "darwin" || !this.isMainCheckout || !this.isSetUp) return undefined
      const name = this.editorNameFor(this.settings.addresses ?? DEFAULT_ADDRESSES)
      return name && `https://${name}`
    } catch {
      return undefined
    }
  }

  /** Which of `addresses` is the editor's, as its host name;  `undefined` for none. */
  editorNameFor(addresses: string[]): string | undefined {
    return editorNameAmong(namesOf(addresses), this.settings.editorAddress)
  }

  /** Whether this Mac has what the site needs, the old scripts' certificate counting.  SIDE EFFECT:  takes that over. */
  get isSetUp(): boolean {
    this.takeOverOldCertificate()
    return this.certificateCovers(namesOf(this.settings.addresses ?? DEFAULT_ADDRESSES))
  }

  ////////////////
  // ## Running it
  ////////////////

  /**
   * SIDE EFFECT:  the cloud and Caddy run, replacing a cloud or a Caddy left on their ports.
   * - The ONE way the site starts.
   * - `by`:  who's running it, for anyone who asks while it runs
   * - A terminal's:  children of that terminal;  if either stops, both do.
   * - The page server's:  detached, so they outlive it (the class), the cloud's output going to the log too.
   * - throws `LocalSiteError` off a Mac, without Caddy, before `setup`, with a name `setup` didn't make,
   *   or with its port held by something else
   */
  async launch({ address, by }: LaunchOptions): Promise<LocalSiteRun> {
    this.macOrDie()
    this.toolsOrDie(["caddy"])
    this.takeOverOldCertificate()
    const addresses = address?.length ? address : (this.settings.addresses ?? DEFAULT_ADDRESSES)
    const names = namesOf(addresses)
    if (!this.certificateCovers(names)) {
      const flags = address?.length ? address.map((each) => ` --address ${each}`).join("") : ""
      throw new LocalSiteError(`This Mac isn't set up for ${names.join(" and ")} yet:  spell space local setup${flags}`)
    }

    this.writeCaddyFile(names)
    await this.stopListeners(CLOUD_PORT, CLOUD_PROGRAM)
    await this.stopListeners(HTTPS_PORT, CADDY_PROGRAM)
    this.portFreeOrDie(CLOUD_PORT)
    this.portFreeOrDie(HTTPS_PORT)

    const mail = await this.mailEnvironment()
    const cloud = this.startCloud(addresses, mail, by)
    const caddy = this.startCaddy(by)
    if (by === PAGE_SERVER) {
      const code = this.tools.cloudVersion()
      this.writeRecord({ cloud: cloud.pid, caddy: caddy.pid, code, addresses, mail })
    } else {
      SRV.DataFile.write(this.runFile, { pid: process.pid, by } satisfies LocalSiteRunner)
    }
    return this.runOf([cloud, caddy], addresses, mail)
  }

  /** SIDE EFFECT:  the cloud is starting;  the page server's detached, with its output in the log. */
  private startCloud(addresses: string[], mail: Record<string, string>, by: LocalSiteRunnerName): LocalSiteChild {
    const cloudLog = by === PAGE_SERVER ? { logFile: this.logFile } : {}
    return this.tools.start(
      process.execPath,
      [SPELL_BIN(), ...cloudArguments(addresses, this.editorNameFor(addresses))],
      {
        env: mail,
        ...cloudLog,
        detached: by === PAGE_SERVER
      }
    )
  }

  /** SIDE EFFECT:  Caddy is starting, on the file last written. */
  private startCaddy(by: LocalSiteRunnerName): LocalSiteChild {
    return this.tools.start("caddy", ["run", "--config", this.caddyFile], {
      logFile: this.logFile,
      detached: by === PAGE_SERVER
    })
  }

  /** SIDE EFFECT:  the record of a site that outlives this page server, as of now. */
  private writeRecord(detached: LocalSiteDetached): void {
    SRV.DataFile.write(this.runFile, { pid: process.pid, by: PAGE_SERVER, detached } satisfies LocalSiteRunner)
  }

  /**
   * SIDE EFFECT:  the site stops, whoever's running it:  a page server's programs, or a terminal's (it sees the signal).
   * - What's on its ports that's ours stops too, so a site left from before this record existed goes as well.
   * - throws `LocalSiteError` while an update is under way:  stopping now would have it start again
   */
  async stopSite(): Promise<"stopped" | "not running"> {
    if (!this.takeLock()) throw new LocalSiteError("The site is being updated:  try again in a minute.")
    try {
      const runner = this.runner
      if (runner?.by === "a terminal") this.tools.stop(runner.pid)
      for (const pid of runner?.detached ? [runner.detached.cloud, runner.detached.caddy] : []) this.tools.stop(pid)
      const stopped =
        (await this.stopListeners(CLOUD_PORT, CLOUD_PROGRAM)) + (await this.stopListeners(HTTPS_PORT, CADDY_PROGRAM))
      rmSync(this.runFile, { force: true })
      return runner || stopped ? "stopped" : "not running"
    } finally {
      this.letGoOfLock()
    }
  }

  /** What `launch()` hands back:  the programs, as one thing that stops and ends together. */
  private runOf(children: LocalSiteChild[], addresses: string[], mail: Record<string, string>): LocalSiteRun {
    let wasAsked = false
    const stop = () => {
      wasAsked = true
      this.forgetRunner()
      for (const child of children) child.stop()
    }
    const untilEnded = async (): Promise<LocalSiteEnd> => {
      await Promise.race(children.map((child) => child.exited))
      const end = wasAsked ? "asked" : "by itself"
      for (const child of children) child.stop()
      await Promise.all(children.map((child) => child.exited))
      this.forgetRunner()
      return end
    }
    return { addresses, mail, logFile: this.logFile, stop, ended: untilEnded() }
  }

  /**
   * Who's running the site now, if anyone is:  a record whose processes have gone counts for nothing.
   * - A detached site by its programs, both of them, each by what it is:  a pid can be reused after a reboot.
   * - NEVER throws.
   */
  get runner(): LocalSiteRunner | undefined {
    const runner = this.record
    if (!runner) return undefined
    const { detached } = runner
    if (!detached) return SRV.isProcessAlive(runner.pid) ? runner : undefined
    return this.isProgram(detached.cloud, CLOUD_PROGRAM) && this.isProgram(detached.caddy, CADDY_PROGRAM)
      ? runner
      : undefined
  }

  /** The record of who's running it, whether or not they still are.  - NEVER throws */
  private get record(): LocalSiteRunner | undefined {
    try {
      return SRV.DataFile.read<LocalSiteRunner>(this.runFile)
    } catch {
      return undefined
    }
  }

  /** Whether `pid` is a process that `program` describes. */
  private isProgram(pid: number | string, program: RegExp): boolean {
    return program.test(this.tools.output("ps", ["-o", "command=", "-p", `${pid}`]))
  }

  /** SIDE EFFECT:  the record of who's running it goes, if it's this process's. */
  private forgetRunner(): void {
    if (this.record?.pid === process.pid) rmSync(this.runFile, { force: true })
  }

  ////////////////
  // ## One at a time
  ////////////////

  /**
   * SIDE EFFECT:  takes the site's lock, kept fresh until `letGoOfLock()`;  whether it got it.
   * - Held all through a build, which outlasts the minute after which `SRV.FileLock` counts a lock as a dead holder's.
   * - One attempt, no waiting:  whoever holds it is already doing the work.
   */
  private takeLock(): boolean {
    mkdirSync(this.folder, { recursive: true })
    const lock = new SRV.FileLock(join(this.folder, "site"))
    // twice:  the first try only clears a stale lock
    if (!lock.tryAcquire() && !lock.tryAcquire()) return false
    const beat = setInterval(() => {
      try {
        const now = new Date()
        utimesSync(lock.lockFile, now, now)
      } catch {
        // let go of already:  nothing to keep fresh
      }
    }, LOCK_BEAT_MS)
    beat.unref()
    this.held = { lock, beat }
    return true
  }

  /** SIDE EFFECT:  the lock is free again, if this process held it. */
  private letGoOfLock(): void {
    if (!this.held) return
    clearInterval(this.held.beat)
    this.held.lock.release()
    this.held = undefined
  }

  ////////////////
  // ## Its programs and ports
  ////////////////

  /** The cloud's real-mail settings once postfix relays;  empty, so its mail stays in the catcher, before. */
  private async mailEnvironment(): Promise<Record<string, string>> {
    if (!this.tools.output("postconf", ["-h", "relayhost"]).trim()) return {}
    return { SPELL_MAIL: "sendmail", SPELL_MAIL_FROM: this.settings.mailFrom ?? (await this.machineEmail()) }
  }

  /** The pids listening on `port`. */
  private listening(port: number): string[] {
    return this.tools
      .output("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"])
      .split(/\s+/)
      .filter(Boolean)
  }

  /**
   * SIDE EFFECT:  what's listening on `port` that `program` describes is stopped, and has let go of it;  how many.
   * - NEVER stops what isn't ours
   */
  private async stopListeners(port: number, program: RegExp): Promise<number> {
    const ours = this.listening(port).filter((pid) => this.isProgram(pid, program))
    for (const pid of ours) this.tools.stop(Number(pid))
    for (let look = 0; look < PORT_LOOKS && this.listening(port).some((pid) => ours.includes(pid)); look++) {
      await this.tools.sleep(PORT_LOOK_MS)
    }
    return ours.length
  }

  /** - throws `LocalSiteError` when something else, or something that wouldn't stop, holds `port` */
  private portFreeOrDie(port: number): void {
    if (this.listening(port).length) throw new LocalSiteError(`port ${port} is held by something else`)
  }

  /** SIDE EFFECT:  a dated line in its log. */
  private note(message: string): void {
    mkdirSync(this.folder, { recursive: true })
    appendFileSync(this.logFile, `${new Date().toISOString()}  ${message}\n`)
  }

  ////////////////
  // ## This Mac's set-up
  ////////////////

  /** The site's certificate, in its folder. */
  get certificate(): string {
    return join(this.folder, "site.pem")
  }

  /** The certificate's key, in its folder:  NEVER copied anywhere else. */
  get key(): string {
    return join(this.folder, "site-key.pem")
  }

  /** Where the site's output goes when nobody's watching it, and why it stopped. */
  get logFile(): string {
    return join(this.folder, "site.log")
  }

  /** Who's running it now. */
  private get runFile(): string {
    return join(this.folder, "run.json5")
  }

  /** Caddy's settings. */
  private get caddyFile(): string {
    return join(this.folder, "Caddyfile")
  }

  /** What the Caddy file holds now;  `undefined` before there's one. */
  private get currentCaddyFileText(): string | undefined {
    return existsSync(this.caddyFile) ? readFileSync(this.caddyFile, "utf8") : undefined
  }

  /** What the Caddy file should say for `names`. */
  private caddyFileText(names: string[]): string {
    const name = editorNameAmong(names, this.settings.editorAddress)
    const editor = name ? { name, port: this.editorPort() ?? environment.vitePort } : undefined
    return caddyFileFor({ names, certificate: this.certificate, key: this.key, editor })
  }

  /** SIDE EFFECT:  the Caddy file says what it should for `names`. */
  private writeCaddyFile(names: string[]): void {
    writeFileSync(this.caddyFile, this.caddyFileText(names))
  }

  /** What it remembers between commands. */
  get settings(): LocalSettings {
    return SRV.DataFile.read<LocalSettings>(join(this.folder, "settings.json5")) ?? {}
  }

  /** SIDE EFFECT:  `change` is remembered, with what's remembered already. */
  remember(change: LocalSettings): void {
    mkdirSync(this.folder, { recursive: true })
    SRV.DataFile.write(join(this.folder, "settings.json5"), { ...this.settings, ...change })
  }

  /** SIDE EFFECT:  the shell scripts' certificate moves in, the first time;  their folder is left as it was. */
  takeOverOldCertificate(): void {
    const [certificate, key] = [join(this.oldFolder, OLD_CERTIFICATE), join(this.oldFolder, OLD_KEY)]
    if (existsSync(this.certificate) || !existsSync(certificate) || !existsSync(key)) return
    mkdirSync(this.folder, { recursive: true })
    copyFileSync(certificate, this.certificate)
    copyFileSync(key, this.key)
    chmodSync(this.key, 0o600)
    this.remember({ names: namesOf(DEFAULT_ADDRESSES) })
  }

  /** Whether the certificate is there, and made for every one of `names`. */
  certificateCovers(names: string[]): boolean {
    const covered = this.settings.names ?? []
    return existsSync(this.certificate) && names.every((name) => covered.includes(name))
  }

  /** - throws `LocalSiteError` anywhere but a Mac:  its steps are the Mac's */
  macOrDie(): void {
    if (this.platform !== "darwin") throw new LocalSiteError("spell space local is for a Mac, and this isn't one.")
  }

  /** - throws `LocalSiteError` naming exactly what to install, if any of `names` is missing */
  toolsOrDie(names: string[]): void {
    const missing = names.filter((name) => !this.tools.has(name))
    if (missing.length)
      throw new LocalSiteError(`This needs ${missing.join(" and ")}:  brew install ${missing.join(" ")}`)
  }
}

/** Constructor props of a `LocalSiteServer`:  all but `isMainCheckout` a test's, each defaulting to the real one. */
export type LocalSiteServerProps = {
  /** What runs outside commands. */
  tools?: LocalSiteTools
  /** Its files. */
  folder?: string
  /** Where the old shell scripts kept theirs. */
  oldFolder?: string
  /** This machine's person's email. */
  machineEmail?: () => Promise<string>
  /** `process.platform`. */
  platform?: string
  /** Whether this is the main checkout's page server;  default no. */
  isMainCheckout?: boolean
  /** The port the editor's dev server is on;  default what the page server's record says, for a terminal's site. */
  editorPort?: () => number | undefined
}

/** What's wrong, in words for the person:  the command line prints it plainly. */
export class LocalSiteError extends Error {}
LocalSiteError.prototype.name = "LocalSiteError"

/** What a `LocalSiteServer` remembers, in its folder's `settings.json5`. */
export type LocalSettings = {
  /** Where the site is reached. */
  addresses?: string[]
  /** The names its certificate was made for. */
  names?: string[]
  /** The page `sign-in` opened last. */
  page?: string
  /** The Gmail address `mail` set up. */
  mailFrom?: string
  /**
   * Which address is the editor's (epic `atmosphere` P39):  one of `addresses`, or `false` for none.
   * - Unset:  the first of two or more;  with a single address it's all the cloud, as before.
   */
  editorAddress?: string | false
}

/** Who's running the site, in its folder's `run.json5`, while it runs. */
export type LocalSiteRunner = {
  /** The process that started it:  a terminal's stops it by being stopped. */
  pid: number
  /** In words:  `the page server`, `a terminal`. */
  by: LocalSiteRunnerName
  /** A site that outlives the page server that started it (T63). */
  detached?: LocalSiteDetached
}

/** What a page server's site runs, and what it started from:  to tell, at the next start, whether it's current. */
export type LocalSiteDetached = LocalSiteWanted & {
  /** The cloud's process. */
  cloud: number
  /** Caddy's process. */
  caddy: number
}

/** What the cloud started from:  each compared at the next page server's start. */
export type LocalSiteWanted = {
  /** A version over the cloud's own code and its browser bundle's sources (`LocalSiteTools.cloudVersion()`). */
  code: string
  /** Where it's reached. */
  addresses: string[]
  /** Its mail settings. */
  mail: Record<string, string>
}

/** Who can run the site. */
export type LocalSiteRunnerName = "the page server" | "a terminal"

/** What `launch()` takes. */
export type LaunchOptions = {
  /** Where it's reached;  default what `setup` made. */
  address?: string[] | undefined
  /** Who's running it. */
  by: LocalSiteRunnerName
}

/** How a run ended:  someone stopped it, or one of its programs did. */
export type LocalSiteEnd = "asked" | "by itself"

/** The site, running. */
export type LocalSiteRun = {
  /** Where it's reached. */
  addresses: string[]
  /** The cloud's mail settings:  empty while its mail stays in the catcher. */
  mail: Record<string, string>
  /** Where Caddy's output goes. */
  logFile: string
  /** SIDE EFFECT:  asks both programs to stop. */
  stop(): void
  /** Resolves once both have ended. */
  ended: Promise<LocalSiteEnd>
}

/** Everything a `LocalSiteServer` does outside itself:  a test's stand-in runs none of it. */
export type LocalSiteTools = {
  /** Whether a program is installed. */
  has(command: string): boolean
  /** What a program prints;  empty when it fails.  - NEVER throws */
  output(command: string, args: string[]): string
  /** Start a program that keeps running;  `detached`:  it outlives this process. */
  start(
    command: string,
    args: string[],
    options: { env?: Record<string, string>; logFile?: string; detached?: boolean }
  ): LocalSiteChild
  /** Ask a process to stop.  - NEVER throws */
  stop(pid: number): void
  /** Wait. */
  sleep(ms: number): Promise<unknown>
  /** A version over the cloud's own code:  it changes when a restart of the cloud would run something different. */
  cloudVersion(): string
}

/** A program `LocalSiteTools.start()` started. */
export type LocalSiteChild = {
  /** Its process;  -1 when it couldn't start. */
  pid: number
  /** Resolves with its exit code as it ends. */
  exited: Promise<number>
  /** Ask it to stop. */
  stop(): void
}

////////////////
// ## Pure helpers
////////////////

/** This checkout's `spell` program. */
const SPELL_BIN = (): string => join(environment.repoDir, "..", "bin", "spell.mjs")

/**
 * The arguments that serve the cloud at `addresses`.
 * - The editor's address last:  the first is where the cloud's mails' links start, and Caddy sends the editor's elsewhere.
 */
function cloudArguments(addresses: string[], editorName: string | undefined): string[] {
  const isEditors = (address: string) => new URL(address).hostname === editorName
  const inOrder = [...addresses.filter((address) => !isEditors(address)), ...addresses.filter(isEditors)]
  return ["space", "cloud", "serve", ...inOrder.flatMap((address) => ["--address", address])]
}

/** The port the page server's record says the editor is on;  the usual one with no record.  - NEVER throws */
function recordedEditorPort(): number | undefined {
  try {
    const record = SRV.DataFile.read<{ url: string }>(join(environment.repoDir, "..", EDITOR_FILE))
    return record ? Number(new URL(record.url).port) : undefined
  } catch {
    return undefined
  }
}

/**
 * Which of `names` is the editor's:  what `editorAddress` in the settings says, else the first of two or more.
 * - `undefined`, for no editor:  a single address, `editorAddress: false`, or one naming none of `names`.
 * - throws `LocalSiteError` for an `editorAddress` that isn't `https`
 */
export function editorNameAmong(names: string[], editorAddress: string | false | undefined): string | undefined {
  if (editorAddress === false) return undefined
  if (editorAddress === undefined) return names.length >= 2 ? names[0] : undefined
  const [name] = namesOf([editorAddress])
  return names.includes(name!) ? name : undefined
}

/** The host names of `addresses`.  - throws `LocalSiteError` for one that isn't `https` */
export function namesOf(addresses: string[]): string[] {
  return addresses.map((address) => {
    if (!address.startsWith("https://")) throw new LocalSiteError(`${address}:  the site needs https addresses`)
    return new URL(address).hostname
  })
}

/**
 * The Caddy file:  HTTPS for `names`, each to the cloud, but the `editor`'s (epic `atmosphere` P39), which `editorSite()` writes.
 * - `lb_try_duration` holds each request up to 30s while what's behind it is down, trying again every 250ms:
 *   during a swap (T63) a page waits a few seconds, and never shows an error.
 *   A failed connection is retried for every method (Caddy's own rule), so a write waits too.
 */
export function caddyFileFor({
  names,
  certificate,
  key,
  editor
}: {
  names: string[]
  certificate: string
  key: string
  editor?: CaddyEditorSite | undefined
}): string {
  const tls = `\ttls "${certificate}" "${key}"`
  const cloudNames = names.filter((name) => name !== editor?.name)
  return [
    `# Written by Spell's local site:  changes here are written over.`,
    `{`,
    `\tadmin off`,
    `}`,
    ``,
    ...(cloudNames.length ? [`${cloudNames.join(", ")} {`, tls, ...caddyProxyTo(CLOUD_PORT), `}`, ``] : []),
    ...(editor ? editorSite(editor, tls, cloudNames[0]) : [])
  ].join("\n")
}

/** The editor's address in the Caddy file:  its name, and the port its dev server is on. */
export type CaddyEditorSite = {
  /** Its host name. */
  name: string
  /** The dev server's port. */
  port: number
}

/** The lines that pass a request on to `port`, holding it while what's there is down;  `settings`:  more lines inside. */
function caddyProxyTo(port: number, settings: string[] = []): string[] {
  return [
    `\treverse_proxy 127.0.0.1:${port} {`,
    `\t\tlb_try_duration ${CADDY_HOLD}`,
    `\t\tlb_try_interval ${CADDY_HOLD_INTERVAL}`,
    ...settings,
    `\t}`
  ]
}

/**
 * The editor's address, in the Caddy file (epic `atmosphere` P39):  the editor's running dev server, live reload and all.
 * - HOUSE NETWORK ONLY:  the editor runs as this machine's person, with no sign-in, so anyone who reaches this address
 *   edits as them.  A public address needs the production build and sign-in first.
 * - A page of an org's opened here goes on to the cloud's address (`cloudName`), so tabs already open keep working.
 *   - `/apps/@...` and an org's home, `/@rs`:  one part only, as the dev server's own files are `/@vite/client`, `/@fs/...`.
 * - To the dev server and the page server behind it, a request here is one from this machine's editor:
 *   - `Host`:  the dev server's own, which it answers (no name of ours in its settings)
 *   - `Origin`:  this address's alone becomes the dev server's, so what checks a write's origin needs no new rule
 *     - NEVER every `Origin`:  a page on any other site, posting here, would then pass as this machine's own
 * - Never passed on to this machine's person, from elsewhere on the network:
 *   - `/api/changes`:  a request into one of this machine's Claude sessions
 *   - saving a theme into Spell UI's source
 *   - the API's test routes
 * - No editor running:  a plain message once the hold (`caddyProxyTo()`) runs out.
 */
function editorSite({ name, port }: CaddyEditorSite, tls: string, cloudName: string | undefined): string[] {
  return [
    `# Spell's editor, for this house network only:  it runs as this machine's person, with no sign-in.`,
    `${name} {`,
    tls,
    ...(cloudName
      ? [
          `\t# A page of an org's opened here goes on to the cloud;  never the dev server's own files (/@vite/...).`,
          `\t@cloudPages path_regexp ${CLOUD_PAGES}`,
          `\tredir @cloudPages https://${cloudName}{uri}`
        ]
      : []),
    `\t# For this machine alone:  requests into its Claude sessions, the API's test routes, themes saved into Spell UI.`,
    `\t@refused path ${REFUSED_FOR_THE_EDITOR}`,
    `\t@themeSaves {`,
    `\t\tpath /api/themes/*`,
    `\t\tnot method GET HEAD`,
    `\t}`,
    `\trespond @refused "${REFUSED_ANSWER}" 403`,
    `\trespond @themeSaves "${REFUSED_ANSWER}" 403`,
    ...caddyProxyTo(port, [
      `\t\theader_up Host localhost:${port}`,
      `\t\theader_up Origin "^https://${name.replaceAll(".", "\\.")}$" "http://localhost:${port}"`
    ]),
    `\thandle_errors {`,
    `\t\trespond "Spell's editor isn't running on this Mac:  it starts with the page server (spell server start)." 502`,
    `\t}`,
    `}`,
    ``
  ]
}

/** An org's programs and its home, which are the cloud's:  at the editor's address they go on to the cloud's. */
const CLOUD_PAGES = "^(/apps/@.*|/@[A-Za-z0-9_-]+/?)$"

/** What's refused at the editor's address:  see `editorSite()`. */
const REFUSED_FOR_THE_EDITOR = "/api/changes /api/changes/* /api/test /api/missing /api/not-authorized /api/error"

/** The answer to what's refused there. */
const REFUSED_ANSWER = "This is only for this Mac, not this address."

////////////////
// ## The real tools
////////////////

/** Where a Mac keeps the programs this runs:  a page server opened from an app may have a short `PATH`. */
const SEARCH_PATH = [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", "/usr/sbin", "/usr/bin", "/sbin", "/bin"]
  .filter(Boolean)
  .join(":")

/** This machine's person's email.  - throws `LocalSiteError` when they have none */
export async function machinePersonEmail(): Promise<string> {
  const storage = new DiskStorage(environment.spellSpacesDir)
  try {
    const { person } = await new PeopleStore(storage).person(LOCAL_PERSON, HOME_ORG)
    const email = person?.emails.items[0]
    if (!email) throw new LocalSiteError(`${LOCAL_PERSON}@${HOME_ORG} has no email:  say which one to use`)
    return email
  } finally {
    storage.close()
  }
}

/** The `LocalSiteTools` that really run things. */
export function localSiteTools(): LocalSiteTools {
  const searching = { ...process.env, PATH: SEARCH_PATH }
  return {
    has: (command) => spawnSync("/usr/bin/which", [command], { stdio: "ignore", env: searching }).status === 0,
    output: (command, args) => {
      const { status, stdout } = spawnSync(command, args, { encoding: "utf8", env: searching })
      return status === 0 ? stdout : ""
    },
    start: (command, args, { env = {}, logFile, detached = false }) => {
      const log = logFile ? openSync(logFile, "a") : undefined
      const child = spawn(command, args, {
        // not a page server's `TSX_TSCONFIG_PATH`:  `spell` registers its own settings
        env: { ...searching, ...env, TSX_TSCONFIG_PATH: undefined },
        detached,
        stdio: log === undefined ? "inherit" : ["ignore", log, log]
      })
      // detached:  this process may end first, and mustn't wait for it
      if (detached) child.unref()
      const exited = new Promise<number>((resolve) => {
        // a program that can't start at all ends the same way, so the site stops and says so
        child.once("error", () => resolve(1))
        child.once("exit", (code) => resolve(code ?? 0))
      }).finally(() => {
        if (log !== undefined) closeSync(log)
      })
      return { pid: child.pid ?? -1, exited, stop: () => void child.kill() }
    },
    stop: (pid) => {
      try {
        process.kill(pid)
      } catch {
        // gone already:  what was asked for
      }
    },
    sleep: (ms) => sleep(ms),
    cloudVersion: () =>
      `${SRV.codeVersion(cloudCode())()}-${new SRV.Bundle(environment.repoDir, CLOUD_BROWSER_BUNDLE).sourcesHash()}`
  }
}

/**
 * The cloud's own code on this checkout, for `cloudVersion()`:  what `spell space cloud serve` loads and serves.
 * - More than it needs, on purpose:  a needless swap is seconds;  a missed change would serve old code.
 * - Not everything:  a merge touching only the docs, the epic engine or the editor mustn't swap anything.
 * - Its browser bundle's sources are counted through that bundle's own hash, `.tsx` and CSS included.
 */
export function cloudCode(): string[] {
  const { packageFolder, spaceFolders } = environment
  return [
    ...["spell/server", "spell/places", "spell/util", "spell/parser", "spell/app/spaces/server"].map(packageFolder),
    packageFolder("spell/app/spaces/models"),
    join(packageFolder("spell/app/cli"), "commands", "cloudCommand.ts"),
    join(spaceFolders.builtins, "@spell", "library", "people", "people.lib.ts")
  ]
}
