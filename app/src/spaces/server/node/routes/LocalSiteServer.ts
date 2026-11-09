import { spawn, spawnSync } from "child_process"
import {
  appendFileSync,
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  rmSync,
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
import { CLOUD_PORT } from "./SpellCloud"

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

/** Where HTTPS listens. */
const HTTPS_PORT = 443

/** How `ps` shows a cloud:  only that is stopped on the cloud's port. */
const CLOUD_PROGRAM = /\bspace cloud serve\b/
/** How `ps` shows Caddy:  only that is stopped on the HTTPS port. */
const CADDY_PROGRAM = /(^|\/)caddy(\s|$)/

/** The row's words when this Mac hasn't been set up. */
const NOT_SET_UP = "not set up:  spell space local setup"
/** The row's words in a worktree. */
const MAIN_CHECKOUT_ONLY = "the main checkout's page server runs it"

/****************
 * ### `LocalSiteServer`
 * The house-network test site running:  Spell's cloud on its port, and Caddy on 443 in front of it (epic `atmosphere` T58).
 * - Two ways in, ONE way to start it (`launch()`):
 *   - the page server's:  `startWithPageServer()` when it listens, `stop()` when it stops, as `EditorServer`
 *   - a terminal's:  `spell space local start`, `spell/app/cli`'s `LocalSite`
 * - The page server starts it only:
 *   - from the MAIN checkout:  a machine has one 443 and one 4949
 *   - on a Mac this has been set up on (`spell space local setup`, or the old scripts' certificate):
 *     anywhere else nothing happens, silently
 *   - while no terminal or other page server is running it:  a live run is left alone
 * - Replaces a cloud or a Caddy left on its ports, and only those:  anything else there is a failure, said in the log.
 * - A failure NEVER reaches the page server:  it's one line in the page server's log, and the reason in `site.log`.
 * - Its files are in `~/.spell/local-site`:  the certificate, `settings.json5`, `Caddyfile`, `site.log`, `run.json5`.
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

  /** The page server's attempt to start it:  one per server, however often it's asked. */
  private starting?: Promise<void>
  /** The site this page server started, while it runs. */
  private run?: LocalSiteRun
  /** Why this page server isn't running it, for the table. */
  private whyNot?: string
  /** The page server has stopped:  a start still under way ends at once. */
  private wasStopped = false

  constructor({
    tools = localSiteTools(),
    folder = join(homedir(), ".spell", "local-site"),
    oldFolder = join(homedir(), ".spell", "house-site"),
    machineEmail = machinePersonEmail,
    platform = process.platform,
    isMainCheckout = false
  }: LocalSiteServerProps = {}) {
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

  /** SIDE EFFECT:  the site this page server started stops.  Nothing left running;  - NEVER throws */
  stop(): void {
    this.wasStopped = true
    this.run?.stop()
    this.run = undefined
  }

  /**
   * The site's row in `spell server start all`'s table:  `undefined` off a Mac, where it's no concern of anyone's.
   * - Waits for the start, then long enough for one that can't work to have said so.
   */
  async report(): Promise<ReportedServer | undefined> {
    if (this.platform !== "darwin") return undefined
    await this.startWithPageServer()
    if (this.run) await Promise.race([this.run.ended, this.tools.sleep(SETTLE_MS)])
    const row = { name: "local site", what: "the cloud and HTTPS, for this house network" }
    if (this.run) return { ...row, url: this.run.addresses[0]!, state: "running" }
    return { ...row, url: "-", state: this.whyNot ?? "not running" }
  }

  /** The one attempt `startWithPageServer()` makes. */
  private async startOnce(): Promise<void> {
    try {
      if (this.platform !== "darwin") return
      this.whyNot = this.reasonToStayOut
      if (this.whyNot) return

      const run = await this.launch({ by: "the page server" })
      if (this.wasStopped) {
        run.stop()
        return
      }
      this.run = run
      void run.ended.then((end) => this.noticeEnd(run, end)).catch((error: unknown) => this.failed(error))
    } catch (error) {
      this.failed(error)
    }
  }

  /** Why this page server shouldn't run the site, in the table's words;  `undefined` when it should. */
  private get reasonToStayOut(): string | undefined {
    if (!this.isMainCheckout) return MAIN_CHECKOUT_ONLY
    if (!this.isSetUp) return NOT_SET_UP
    const runner = this.runner
    return runner && `already running, from ${runner.by}`
  }

  /** SIDE EFFECT:  a site that ended without being asked is written down, for the table and the log. */
  private noticeEnd(run: LocalSiteRun, end: LocalSiteEnd): void {
    if (end !== "by itself" || this.run !== run) return
    this.run = undefined
    this.whyNot = `stopped by itself:  see ${this.logFile}`
    this.note("The site stopped by itself.")
  }

  /** SIDE EFFECT:  why it couldn't run, in its log, the page server's log and the table.  - NEVER throws */
  private failed(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.whyNot = `didn't start:  ${message}`
    console.error(`local site:  didn't start:  ${message}`)
    try {
      this.note(`Didn't start:  ${message}`)
    } catch {
      // its log can't be written:  the page server's has it
    }
  }

  /** Whether this Mac has what the site needs, the old scripts' certificate counting.  SIDE EFFECT:  takes that over. */
  private get isSetUp(): boolean {
    this.takeOverOldCertificate()
    return this.certificateCovers(namesOf(this.settings.addresses ?? DEFAULT_ADDRESSES))
  }

  ////////////////
  // ## Running it
  ////////////////

  /**
   * SIDE EFFECT:  the cloud and Caddy run, replacing a cloud or a Caddy left on their ports;  if either stops, both do.
   * - The ONE way the site starts.
   * - `by`:  who's running it, for anyone who asks while it runs
   * - The page server's run sends the cloud's output to the log too;  a terminal's shows it there.
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

    const caddyFile = join(this.folder, "Caddyfile")
    writeFileSync(caddyFile, caddyFileFor({ names, certificate: this.certificate, key: this.key }))

    await this.stopListeners(CLOUD_PORT, CLOUD_PROGRAM)
    await this.stopListeners(HTTPS_PORT, CADDY_PROGRAM)

    const mail = await this.mailEnvironment()
    const cloudLog = by === "the page server" ? { logFile: this.logFile } : {}
    const children = [
      this.tools.start(process.execPath, [SPELL_BIN(), ...cloudArguments(addresses)], { env: mail, ...cloudLog }),
      this.tools.start("caddy", ["run", "--config", caddyFile], { logFile: this.logFile })
    ]
    SRV.DataFile.write(this.runFile, { pid: process.pid, by } satisfies LocalSiteRunner)
    return this.runOf(children, addresses, mail)
  }

  /** What `launch()` hands back:  the two programs, as one thing that stops and ends together. */
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
   * Who's running the site now, if anyone is:  a record whose process has gone counts for nothing.
   * - NEVER throws.
   */
  get runner(): LocalSiteRunner | undefined {
    try {
      const runner = SRV.DataFile.read<LocalSiteRunner>(this.runFile)
      return runner && SRV.isProcessAlive(runner.pid) ? runner : undefined
    } catch {
      return undefined
    }
  }

  /** SIDE EFFECT:  the record of who's running it goes, if it's this process's. */
  private forgetRunner(): void {
    if (this.runner?.pid === process.pid) rmSync(this.runFile, { force: true })
  }

  /** The cloud's real-mail settings once postfix relays;  empty, so its mail stays in the catcher, before. */
  private async mailEnvironment(): Promise<Record<string, string>> {
    if (!this.tools.output("postconf", ["-h", "relayhost"]).trim()) return {}
    return { SPELL_MAIL: "sendmail", SPELL_MAIL_FROM: this.settings.mailFrom ?? (await this.machineEmail()) }
  }

  /**
   * SIDE EFFECT:  what's listening on `port` that `program` describes is stopped, and has let go of it.
   * - throws `LocalSiteError` when something else, or something that wouldn't stop, still holds the port:
   *   NEVER stops what isn't ours
   */
  private async stopListeners(port: number, program: RegExp): Promise<void> {
    const listening = () =>
      this.tools
        .output("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"])
        .split(/\s+/)
        .filter(Boolean)
    const ours = listening().filter((pid) => program.test(this.tools.output("ps", ["-o", "command=", "-p", pid])))
    for (const pid of ours) this.tools.stop(Number(pid))
    for (let look = 0; look < PORT_LOOKS && listening().some((pid) => ours.includes(pid)); look++) {
      await this.tools.sleep(PORT_LOOK_MS)
    }
    if (listening().length) throw new LocalSiteError(`port ${port} is held by something else`)
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
}

/** Who's running the site, in its folder's `run.json5`, while it runs. */
export type LocalSiteRunner = {
  /** The process running it. */
  pid: number
  /** In words:  `the page server`, `a terminal`. */
  by: LocalSiteRunnerName
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
  /** Start a program that keeps running. */
  start(command: string, args: string[], options: { env?: Record<string, string>; logFile?: string }): LocalSiteChild
  /** Ask a process to stop. */
  stop(pid: number): void
  /** Wait. */
  sleep(ms: number): Promise<unknown>
}

/** A program `LocalSiteTools.start()` started. */
export type LocalSiteChild = {
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

/** The arguments that serve the cloud at `addresses`. */
function cloudArguments(addresses: string[]): string[] {
  return ["space", "cloud", "serve", ...addresses.flatMap((address) => ["--address", address])]
}

/** The host names of `addresses`.  - throws `LocalSiteError` for one that isn't `https` */
export function namesOf(addresses: string[]): string[] {
  return addresses.map((address) => {
    if (!address.startsWith("https://")) throw new LocalSiteError(`${address}:  the site needs https addresses`)
    return new URL(address).hostname
  })
}

/** The Caddy file:  HTTPS for `names`, everything to the cloud. */
export function caddyFileFor({
  names,
  certificate,
  key
}: {
  names: string[]
  certificate: string
  key: string
}): string {
  return [
    `# Written by Spell's local site:  changes here are written over.`,
    `{`,
    `\tadmin off`,
    `}`,
    ``,
    `${names.join(", ")} {`,
    `\ttls "${certificate}" "${key}"`,
    `\treverse_proxy 127.0.0.1:${CLOUD_PORT}`,
    `}`,
    ``
  ].join("\n")
}

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
    start: (command, args, { env = {}, logFile }) => {
      const log = logFile ? openSync(logFile, "a") : undefined
      const child = spawn(command, args, {
        // not a page server's `TSX_TSCONFIG_PATH`:  `spell` registers its own settings
        env: { ...searching, ...env, TSX_TSCONFIG_PATH: undefined },
        stdio: log === undefined ? "inherit" : ["ignore", log, log]
      })
      const exited = new Promise<number>((resolve) => {
        // a program that can't start at all ends the same way, so the site stops and says so
        child.once("error", () => resolve(1))
        child.once("exit", (code) => resolve(code ?? 0))
      }).finally(() => {
        if (log !== undefined) closeSync(log)
      })
      return { exited, stop: () => void child.kill() }
    },
    stop: (pid) => process.kill(pid),
    sleep: (ms) => sleep(ms)
  }
}
