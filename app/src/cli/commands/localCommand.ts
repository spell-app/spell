import { spawn, spawnSync } from "child_process"
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "fs"
import { request } from "http"
import { homedir, networkInterfaces } from "os"
import { basename, join } from "path"
import { createInterface } from "readline"
import { setTimeout as sleep } from "timers/promises"

import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import { MailCatcher } from "spell/server/signIn"
import { HOME_ORG, LOCAL_PERSON } from "spell/app/spaces/models/projectGroups"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { CLOUD_PORT, SpellCloud } from "spell/app/spaces/server/node/routes/SpellCloud"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** Where the site's addresses are unless `--address` says otherwise. */
const DEFAULT_ADDRESSES = ["https://test.spell.app", "https://test.spell.space"]

/** The certificate the old shell scripts made:  taken over, so nobody has to trust a new one. */
const OLD_CERTIFICATE = "test.spell.app+1.pem"
/** That certificate's key. */
const OLD_KEY = "test.spell.app+1-key.pem"

/** The name a Mac keeps Gmail's password under, readable by root alone. */
const POSTFIX_PASSWORDS = "/etc/postfix/sasl_passwd"

/** Marks the line `setup` adds to the hosts file. */
const HOSTS_MARK = "# spell space local"

/** A `--home`:  a path of the site, with nothing in it that could break out of the Caddy file. */
const HOME_PATH = /^\/[^\s"{}]*$/

/** Where a sign-in mail's link is. */
const SIGN_IN_LINK = /https?:\/\/\S+\/sign-in\/confirm\S*/

/** What `sign-in` opens until a page has been named. */
const DEFAULT_PAGE = "/apps/@spell/examples/FamilyCookbook"

/** How many times `sign-in` looks for its mail, and how long between. */
const MAIL_LOOKS = 20
const MAIL_LOOK_MS = 250

/** How many times `start` checks that something it stopped has let go of its port, and how long between. */
const PORT_LOOKS = 25
const PORT_LOOK_MS = 200

/**
 * `spell space local setup | start | mail | sign-in`:  see `LocalSite`.
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function localCommand(verb: string, targets: string[], options: LocalOptions): Promise<number> {
  const site = new LocalSite()
  if (verb === "setup") return site.setup(options)
  if (verb === "start") return site.start(options)
  if (verb === "mail") return site.mail(options)
  return site.signIn(targets[0], targets[1])
}

/** Options of `spell space local`. */
export type LocalOptions = {
  /** Where the site is reached, `https://test.spell.app`:  each needs `setup` to have made its name. */
  address?: string[]
  /** `start`:  the page the bare address goes to, remembered:  `/apps/@rs/OrgAdmin`. */
  home?: string
  /** `setup`:  take the names away again. */
  undo?: boolean
  /** `mail`:  the Gmail address it sends as;  default this machine's person's email. */
  gmail?: string
  /** `mail`:  ask for the app password again. */
  newPassword?: boolean
}

/****************
 * ### `LocalSite`
 * Spell's cloud at real-looking addresses, for one house network, on a Mac (epic `atmosphere` T57).
 * - Nothing public changes:  the names exist only in each Mac's hosts file, and the certificate only there.
 * - `setup [--undo]`:  this Mac's certificate, names and trust, and a folder for another Mac that has no `spell`
 * - `start [--address <url>]... [--home <path>]`:  the cloud and Caddy together, until `Ctrl-C`
 *   - Caddy turns `https://test.spell.app` into the cloud's local port, and sends a bare `/` to the home page,
 *     so the cloud's own routes don't change
 *   - real mail by itself, once `mail` has run
 * - `mail [--gmail <address>] [--new-password]`:  the Mac's own postfix relays through Gmail
 * - `sign-in [email] [page]`:  asks for the link, finds it in the cloud's caught mail, opens it
 * - Its files are in `~/.spell/local-site`.
 * - Every outside command goes through `LocalTools`, so tests run none of them.
 *   - MUST:  the Gmail password only ever goes to a command's standard input, never its arguments.
 * - The cloud is a child process, NOT run in this one:  `environment.mail` is read as spaces load.
 * - Node only.
 ****************/
export class LocalSite {
  /** What runs outside commands. */
  private readonly tools: LocalTools
  /** Its files:  `~/.spell/local-site`. */
  private readonly folder: string
  /** Where the shell scripts kept theirs, a certificate taken over from. */
  private readonly oldFolder: string
  /** This Mac's hosts file. */
  private readonly hostsFile: string
  /** The spaces folder, an org's own Admin page looked for in. */
  private readonly spacesDir: string
  /** This machine's person's email. */
  private readonly machineEmail: () => Promise<string>
  /** What this machine runs on. */
  private readonly platform: string

  constructor({
    tools = macTools(),
    folder = join(homedir(), ".spell", "local-site"),
    oldFolder = join(homedir(), ".spell", "house-site"),
    hostsFile = "/etc/hosts",
    spacesDir = environment.spellSpacesDir,
    machineEmail = machinePersonEmail,
    platform = process.platform
  }: LocalSiteProps = {}) {
    this.tools = tools
    this.folder = folder
    this.oldFolder = oldFolder
    this.hostsFile = hostsFile
    this.spacesDir = spacesDir
    this.machineEmail = machineEmail
    this.platform = platform
  }

  ////////////////
  // ## setup
  ////////////////

  /**
   * SIDE EFFECT:  this Mac reaches the site by its names:  certificate, trust, hosts file, and the other Mac's folder.
   * - Run again it asks for nothing it already has.
   * - `undo`:  the names go;  the certificate stays, for next time.
   * - throws `CliError` off a Mac, or with mkcert or caddy missing
   */
  async setup({ address, undo }: LocalOptions): Promise<number> {
    this.macOrDie()
    if (undo) {
      const names = this.settings.names ?? namesOf(DEFAULT_ADDRESSES)
      this.changeHosts(names, undefined)
      console.log(`Done:  ${names.join(" and ")} are gone from this Mac.`)
      return 0
    }
    this.toolsOrDie(["mkcert", "caddy"])
    this.takeOverOldCertificate()
    const addresses = address?.length ? address : (this.settings.addresses ?? DEFAULT_ADDRESSES)
    const names = namesOf(addresses)

    if (!this.certificateCovers(names)) {
      mkdirSync(this.folder, { recursive: true })
      this.tools.run("mkcert", ["-cert-file", this.certificate, "-key-file", this.key, ...names])
    }
    this.remember({ addresses, names })

    const rootFile = this.rootCertificate()
    const isTrusted = this.tools.succeeds("security", [
      "verify-cert",
      "-q",
      "-L",
      "-c",
      this.certificate,
      "-p",
      "ssl",
      "-s",
      names[0]!
    ])
    if (!isTrusted) {
      this.sudo(`Trusting the site's certificate on this Mac`, TRUST_COMMAND(rootFile))
    }
    // this Mac reaches itself, so the line is right whatever address the network gives it
    this.changeHosts(names, "127.0.0.1")

    const partner = this.writePartnerFolder(names, rootFile)
    console.log(`Done:  this Mac reaches ${names.join(" and ")}.  Next:  spell space local start`)
    if (partner) console.log(`For another Mac on this network, copy this folder over and run its script:  ${partner}`)
    return 0
  }

  /**
   * SIDE EFFECT:  the hosts file names `names` at `address`, or not at all without one;  DNS flushed if it changed.
   * - Rewrites the whole file through `sudo tee`:  so nothing here is a shell string.
   */
  private changeHosts(names: string[], address: string | undefined): void {
    const current = readFileSync(this.hostsFile, "utf8")
    const changed = hostsWith(current, names, address)
    if (changed === current) return
    this.sudo(`Changing this Mac's hosts file`, ["tee", this.hostsFile], changed)
    this.sudo(`Telling this Mac to forget the addresses it remembered`, ["dscacheutil", "-flushcache"])
    this.sudo(`...and its name lookup, too`, ["killall", "-HUP", "mDNSResponder"])
  }

  /**
   * SIDE EFFECT:  the folder for another Mac, its address current:  the path, or `undefined` with no network.
   * - MUST:  the root certificate alone, NEVER its key, `rootCA-key.pem`.
   */
  private writePartnerFolder(names: string[], rootFile: string): string | undefined {
    const lanAddress = this.tools.lanAddress()
    if (!lanAddress) {
      console.log(`This Mac isn't on a network, so there's no folder for another Mac yet.`)
      return undefined
    }
    const partner = join(this.folder, "for-partner")
    mkdirSync(partner, { recursive: true })
    copyFileSync(rootFile, join(partner, "rootCA.pem"))
    const script = join(partner, "trust-this-mac.sh")
    writeFileSync(script, partnerScript(lanAddress, names))
    chmodSync(script, 0o755)
    return partner
  }

  /** The certificate authority's public file;  - throws `CliError` when mkcert names none */
  private rootCertificate(): string {
    const caRoot = this.tools.output("mkcert", ["-CAROOT"]).trim()
    if (!caRoot) throw new CLI.CliError("mkcert didn't say where its certificates are:  run mkcert -CAROOT to see why")
    return join(caRoot, "rootCA.pem")
  }

  /** SIDE EFFECT:  the shell scripts' certificate moves in, the first time;  their folder is left as it was. */
  private takeOverOldCertificate(): void {
    const [certificate, key] = [join(this.oldFolder, OLD_CERTIFICATE), join(this.oldFolder, OLD_KEY)]
    if (existsSync(this.certificate) || !existsSync(certificate) || !existsSync(key)) return
    mkdirSync(this.folder, { recursive: true })
    copyFileSync(certificate, this.certificate)
    copyFileSync(key, this.key)
    chmodSync(this.key, 0o600)
    this.remember({ names: namesOf(DEFAULT_ADDRESSES) })
  }

  /** Whether the certificate is there, and made for every one of `names`. */
  private certificateCovers(names: string[]): boolean {
    const covered = this.settings.names ?? []
    return existsSync(this.certificate) && names.every((name) => covered.includes(name))
  }

  ////////////////
  // ## start
  ////////////////

  /**
   * SIDE EFFECT:  the cloud and Caddy run until `Ctrl-C`, or until either stops:  then both do.
   * - Stops a cloud already on its port, and a Caddy already on the HTTPS one:  anything else there is left alone.
   * - `home` is remembered.
   * - throws `CliError` off a Mac, before `setup`, or with a name `setup` didn't make
   */
  async start({ address, home }: LocalOptions): Promise<number> {
    this.macOrDie()
    this.toolsOrDie(["caddy"])
    this.takeOverOldCertificate()
    const addresses = address?.length ? address : (this.settings.addresses ?? DEFAULT_ADDRESSES)
    const names = namesOf(addresses)
    if (!this.certificateCovers(names)) {
      const flags = address?.length ? address.map((each) => ` --address ${each}`).join("") : ""
      throw new CLI.CliError(`This Mac isn't set up for ${names.join(" and ")} yet:  spell space local setup${flags}`)
    }

    const homePage = this.homePage(home)
    const caddyFile = join(this.folder, "Caddyfile")
    writeFileSync(caddyFile, caddyFileFor({ names, certificate: this.certificate, key: this.key, homePage }))

    await this.stopListeners(CLOUD_PORT)
    await this.stopListeners(HTTPS_PORT, "caddy")

    const mailEnvironment = await this.mailEnvironment()
    this.tellAboutStart(addresses, homePage, mailEnvironment)

    const logFile = join(this.folder, "caddy.log")
    const children = [
      this.tools.start(process.execPath, [SPELL_BIN(), ...cloudArguments(addresses)], { env: mailEnvironment }),
      this.tools.start("caddy", ["run", "--config", caddyFile], { logFile })
    ]
    return this.untilStopped(children, logFile)
  }

  /** What `start` waits for:  a `Ctrl-C` is a clean stop;  a program ending on its own is not. */
  private async untilStopped(children: LocalChild[], logFile: string): Promise<number> {
    let wasAsked = false
    const stopBoth = () => {
      wasAsked = true
      for (const child of children) child.stop()
    }
    process.once("SIGINT", stopBoth)
    process.once("SIGTERM", stopBoth)
    try {
      await Promise.race(children.map((child) => child.exited))
      const stoppedByItself = !wasAsked
      for (const child of children) child.stop()
      await Promise.all(children.map((child) => child.exited))
      if (!stoppedByItself) return 0
      console.error(`The site stopped by itself.  Caddy's log is ${logFile};  the cloud's is above.`)
      return 1
    } finally {
      process.off("SIGINT", stopBoth)
      process.off("SIGTERM", stopBoth)
    }
  }

  /**
   * The page a bare address goes to:  `home`, remembered;  else the one remembered;
   * else the Admin page of the first org in the spaces folder;  else none.
   * - throws `CliError` for a `home` that's not a path of the site
   */
  private homePage(home: string | undefined): string | undefined {
    if (home !== undefined) {
      if (!HOME_PATH.test(home))
        throw new CLI.CliError(`--home takes a page's path:  /apps/@rs/OrgAdmin, not "${home}"`)
      this.remember({ home })
      return home
    }
    return this.settings.home ?? this.firstOrgAdminPage()
  }

  /** The Admin page of the first org here but Spell's own, by name;  `undefined` for none. */
  private firstOrgAdminPage(): string | undefined {
    const spell = `@${HOME_ORG}`
    const org = readdirSync(this.spacesDir)
      .filter((name) => name.startsWith("@") && name !== spell)
      .sort()
      .find((name) => existsSync(join(this.spacesDir, name, "OrgAdmin", "__project.json5")))
    return org && `/apps/${org}/OrgAdmin`
  }

  /** The cloud's real-mail settings once postfix relays;  empty, so its mail stays in the catcher, before. */
  private async mailEnvironment(): Promise<Record<string, string>> {
    if (!this.tools.output("postconf", ["-h", "relayhost"]).trim()) return {}
    return { SPELL_MAIL: "sendmail", SPELL_MAIL_FROM: this.settings.mailFrom ?? (await this.machineEmail()) }
  }

  /** SIDE EFFECT:  says where the site will be, and how mail will go. */
  private tellAboutStart(addresses: string[], homePage: string | undefined, mail: Record<string, string>): void {
    console.log(`Spell's local site, until Ctrl-C:`)
    for (const address of addresses) console.log(`  ${address}`)
    if (homePage) console.log(`The bare address goes to ${homePage}  (--home changes it)`)
    const lanAddress = this.tools.lanAddress()
    if (lanAddress) console.log(`Another Mac on this network reaches it through this one:  ${lanAddress}`)
    console.log(
      mail.SPELL_MAIL
        ? `Mail:  real, through Gmail, as ${mail.SPELL_MAIL_FROM}.`
        : `Mail:  caught on this Mac (spell space cloud mail).  For real mail:  spell space local mail, then start again.`
    )
  }

  /**
   * SIDE EFFECT:  what's listening on `port` is stopped, and has let go of it;  when `only` is given, just that program.
   * - Waits only so long:  whatever still holds the port then says so itself, as the next program can't start.
   */
  private async stopListeners(port: number, only?: string): Promise<void> {
    const listening = () =>
      this.tools
        .output("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"])
        .split(/\s+/)
        .filter(Boolean)
    const ours = listening().filter(
      (pid) => !only || basename(this.tools.output("ps", ["-o", "comm=", "-p", pid]).trim()) === only
    )
    if (!ours.length) return
    for (const pid of ours) this.tools.stop(Number(pid))
    for (let look = 0; look < PORT_LOOKS && listening().some((pid) => ours.includes(pid)); look++) {
      await this.tools.sleep(PORT_LOOK_MS)
    }
  }

  ////////////////
  // ## mail
  ////////////////

  /**
   * SIDE EFFECT:  the Mac's postfix sends everything through Gmail, as `gmail`, and a test mail goes out.
   * - Asks for the app password only when there's none, or with `newPassword`.
   * - The password goes to `tee`'s standard input, into a file made root-only first.
   * - throws `CliError` off a Mac, or for an empty password
   */
  async mail({ gmail, newPassword }: LocalOptions): Promise<number> {
    this.macOrDie()
    const from = gmail ?? (await this.machineEmail())
    this.sudo(`Setting up this Mac's postfix to send through Gmail`, ["-v"])

    if (newPassword || !this.tools.succeeds("sudo", ["test", "-s", POSTFIX_PASSWORDS])) {
      const password = (await this.tools.askSecret(`Gmail app password for ${from} (it won't show): `)).replace(
        /\s/g,
        ""
      )
      if (!password) throw new CLI.CliError("No password given:  make one at https://myaccount.google.com/apppasswords")
      this.tools.run("sudo", ["touch", POSTFIX_PASSWORDS])
      this.tools.run("sudo", ["chmod", "600", POSTFIX_PASSWORDS])
      this.tools.run("sudo", ["tee", POSTFIX_PASSWORDS], { input: `[smtp.gmail.com]:587 ${from}:${password}\n` })
      this.tools.run("sudo", ["postmap", POSTFIX_PASSWORDS])
      this.tools.run("sudo", ["chmod", "600", `${POSTFIX_PASSWORDS}.db`])
    }

    this.tools.run("sudo", ["postconf", "-e", ...POSTFIX_SETTINGS])
    this.tools.run("sudo", ["postfix", this.tools.succeeds("sudo", ["postfix", "status"]) ? "reload" : "start"])
    this.remember({ mailFrom: from })

    this.tools.run("/usr/sbin/sendmail", ["-t", "-i"], {
      input: `Subject: Spell test mail\nFrom: ${from}\nTo: ${from}\n\nIf you can read this, this Mac sends through Gmail.\n`
    })
    console.log(`Sent a test mail to ${from}.  Not there in a minute?  Run:  mailq`)
    console.log(`Next:  spell space local start, again if it's running`)
    return 0
  }

  ////////////////
  // ## sign-in
  ////////////////

  /**
   * SIDE EFFECT:  asks the running cloud for a link, opens it, then opens `page` once the person says they've confirmed.
   * - Asks the cloud directly, naming the site's host:  so the link starts with the address they'll use,
   *   and no certificate is involved.
   * - `page` is remembered:  a path, or `@rs/OrgAdmin`, which means `/apps/@rs/OrgAdmin`.
   * - throws `CliError` with no cloud running, when it refuses, or with no mail turning up
   */
  async signIn(_email: string | undefined, _page: string | undefined): Promise<number> {
    const record = this.tools.cloud()
    if (!record) throw new CLI.CliError("Spell's cloud isn't running:  spell space local start")
    const email = _email ?? (await this.machineEmail())
    const site = record.address ?? `http://127.0.0.1:${record.port}`
    const page = _page ? (_page.startsWith("/") ? _page : `/apps/${_page}`) : (this.settings.page ?? DEFAULT_PAGE)

    const before = await this.tools.newestMailTo(email)
    const { status, text } = await this.tools.post(`http://127.0.0.1:${record.port}/api/sign-in/ask`, {
      headers: { host: new URL(site).host, origin: site, "content-type": "application/json" },
      body: JSON.stringify({ email })
    })
    if (status !== 200) throw new CLI.CliError(`The cloud said no (${status}):  ${errorIn(text)}`)

    const link = await this.newLinkFor(email, before)
    this.remember({ page })
    this.tools.open(link)
    console.log(`Press "Yes, sign me in" in your browser, then come back here.`)
    await this.tools.askLine("Press Return to open the page... ")
    this.tools.open(`${site}${page}`)
    return 0
  }

  /** The link in the mail that came after `before`;  - throws `CliError` when none comes */
  private async newLinkFor(email: string, before: string | undefined): Promise<string> {
    for (let look = 0; look < MAIL_LOOKS; look++) {
      const newest = await this.tools.newestMailTo(email)
      const link = newest && newest !== before ? SIGN_IN_LINK.exec(newest)?.[0] : undefined
      if (link) return link
      await this.tools.sleep(MAIL_LOOK_MS)
    }
    throw new CLI.CliError(`No sign-in mail came for ${email}:  spell space cloud mail ${email}`)
  }

  ////////////////
  // ## Shared
  ////////////////

  /** The site's certificate, in its folder. */
  private get certificate(): string {
    return join(this.folder, "site.pem")
  }

  /** The certificate's key, in its folder:  NEVER copied anywhere else. */
  private get key(): string {
    return join(this.folder, "site-key.pem")
  }

  /** What it remembers between commands. */
  private get settings(): LocalSettings {
    return SRV.DataFile.read<LocalSettings>(join(this.folder, "settings.json5")) ?? {}
  }

  /** SIDE EFFECT:  `change` is remembered, with what's remembered already. */
  private remember(change: LocalSettings): void {
    mkdirSync(this.folder, { recursive: true })
    SRV.DataFile.write(join(this.folder, "settings.json5"), { ...this.settings, ...change })
  }

  /** SIDE EFFECT:  says why, as `sudo` is about to ask for a password, then runs it. */
  private sudo(why: string, args: string[], input?: string): void {
    console.log(`${why}.  It may ask for this Mac's password.`)
    this.tools.run("sudo", args, input === undefined ? {} : { input })
  }

  /** - throws `CliError` anywhere but a Mac:  its steps are the Mac's */
  private macOrDie(): void {
    if (this.platform !== "darwin") throw new CLI.CliError("spell space local is for a Mac, and this isn't one.")
  }

  /** - throws `CliError` naming exactly what to install, if any of `names` is missing */
  private toolsOrDie(names: string[]): void {
    const missing = names.filter((name) => !this.tools.has(name))
    if (missing.length)
      throw new CLI.CliError(`This needs ${missing.join(" and ")}:  brew install ${missing.join(" ")}`)
  }
}

/** Constructor props of a `LocalSite`:  all of them a test's, each defaulting to the real one. */
export type LocalSiteProps = {
  /** What runs outside commands. */
  tools?: LocalTools
  /** Its files. */
  folder?: string
  /** Where the old shell scripts kept theirs. */
  oldFolder?: string
  /** This Mac's hosts file. */
  hostsFile?: string
  /** The spaces folder. */
  spacesDir?: string
  /** This machine's person's email. */
  machineEmail?: () => Promise<string>
  /** `process.platform`. */
  platform?: string
}

/** What `LocalSite` remembers, in its folder's `settings.json5`. */
type LocalSettings = {
  /** Where the site is reached. */
  addresses?: string[]
  /** The names its certificate was made for. */
  names?: string[]
  /** The page a bare address goes to. */
  home?: string
  /** The page `sign-in` opened last. */
  page?: string
  /** The Gmail address `mail` set up. */
  mailFrom?: string
}

/** Everything `LocalSite` does outside itself:  a test's stand-in runs none of it. */
export type LocalTools = {
  /** Whether a program is installed. */
  has(command: string): boolean
  /** What a program prints;  empty when it fails.  - NEVER throws */
  output(command: string, args: string[]): string
  /** Whether a program ends well, on this terminal.  - NEVER throws */
  succeeds(command: string, args: string[]): boolean
  /** Run a program on this terminal, `input` its standard input.  - throws `CliError` when it fails, naming no input */
  run(command: string, args: string[], options?: { input?: string }): void
  /** Start a program that keeps running. */
  start(command: string, args: string[], options: { env?: Record<string, string>; logFile?: string }): LocalChild
  /** Ask a process to stop. */
  stop(pid: number): void
  /** Wait. */
  sleep(ms: number): Promise<unknown>
  /** Open in the default browser. */
  open(url: string): void
  /** This Mac's address on its network. */
  lanAddress(): string | undefined
  /** Ask for a line that isn't shown as it's typed. */
  askSecret(question: string): Promise<string>
  /** Ask for a line. */
  askLine(question: string): Promise<string>
  /** The running cloud's record. */
  cloud(): { port: number; address?: string | undefined } | undefined
  /** The newest mail caught for `email`, as text. */
  newestMailTo(email: string): Promise<string | undefined>
  /** POST to the cloud on this machine, with `Host` set. */
  post(
    url: string,
    options: { headers: Record<string, string>; body: string }
  ): Promise<{ status: number; text: string }>
}

/** A program `LocalTools.start()` started. */
export type LocalChild = {
  /** Resolves with its exit code as it ends. */
  exited: Promise<number>
  /** Ask it to stop. */
  stop(): void
}

////////////////
// ## Pure helpers
////////////////

/** Where HTTPS listens. */
const HTTPS_PORT = 443

/** What postfix needs to send everything through Gmail. */
const POSTFIX_SETTINGS = [
  "relayhost = [smtp.gmail.com]:587",
  "smtp_sasl_auth_enable = yes",
  `smtp_sasl_password_maps = hash:${POSTFIX_PASSWORDS}`,
  "smtp_sasl_security_options = noanonymous",
  "smtp_sasl_mechanism_filter = plain",
  "smtp_tls_security_level = encrypt",
  "smtp_tls_CAfile = /etc/ssl/cert.pem",
  "inet_interfaces = loopback-only"
]

/** The `sudo` arguments that make every program on this Mac trust `rootFile`. */
const TRUST_COMMAND = (rootFile: string): string[] => [
  "security",
  "add-trusted-cert",
  "-d",
  "-r",
  "trustRoot",
  "-k",
  "/Library/Keychains/System.keychain",
  rootFile
]

/** This checkout's `spell` program. */
const SPELL_BIN = (): string => join(environment.repoDir, "..", "bin", "spell.mjs")

/** The arguments that serve the cloud at `addresses`. */
function cloudArguments(addresses: string[]): string[] {
  return ["space", "cloud", "serve", ...addresses.flatMap((address) => ["--address", address])]
}

/** The host names of `addresses`.  - throws `CliError` for one that isn't `https` */
function namesOf(addresses: string[]): string[] {
  return addresses.map((address) => {
    if (!address.startsWith("https://")) throw new CLI.CliError(`${address}:  the site needs https addresses`)
    return new URL(address).hostname
  })
}

/** The message in a refusal's body, or the body itself. */
function errorIn(text: string): string {
  try {
    return (JSON.parse(text) as { error?: string }).error ?? text
  } catch {
    return text
  }
}

/**
 * `hosts`, with its lines naming only `names` replaced by one line at `address`, or by none without one.
 * - The same text back when there's nothing to change, so a second run asks for nothing.
 * - A line naming anything else too is left alone, as are comments.
 */
export function hostsWith(hosts: string, names: string[], address: string | undefined): string {
  const namesOnly = (line: string) => {
    const [, ...hostNames] = (line.split("#")[0] ?? "").trim().split(/\s+/)
    return hostNames.length > 0 && hostNames.every((name) => names.includes(name))
  }
  const line = address && `${address} ${names.join(" ")} ${HOSTS_MARK}`
  const lines = hosts.split("\n")
  if (line && lines.filter(namesOnly).length === 1 && lines.includes(line)) return hosts
  const kept = lines.filter((each) => !namesOnly(each)).join("\n")
  if (!line) return kept
  return `${kept.replace(/\n*$/, "")}\n${line}\n`
}

/** The Caddy file:  HTTPS for `names`, a bare address to `homePage`, the rest to the cloud. */
export function caddyFileFor({
  names,
  certificate,
  key,
  homePage
}: {
  names: string[]
  certificate: string
  key: string
  homePage: string | undefined
}): string {
  return [
    `# Written by spell space local start:  changes here are written over.`,
    `{`,
    `\tadmin off`,
    `}`,
    ``,
    `${names.join(", ")} {`,
    `\ttls "${certificate}" "${key}"`,
    ...(homePage ? [`\tredir / ${homePage}`] : []),
    `\treverse_proxy 127.0.0.1:${CLOUD_PORT}`,
    `}`,
    ``
  ].join("\n")
}

/** This Mac's address on its network, Wi-Fi or wired first:  `undefined` off every network. */
export function lanAddressOf(interfaces: ReturnType<typeof networkInterfaces>): string | undefined {
  const addressesOf = (name: string) =>
    (interfaces[name] ?? []).filter((each) => each.family === "IPv4" && !each.internal).map((each) => each.address)
  const names = Object.keys(interfaces)
  return [...names.filter((name) => name.startsWith("en")), ...names].flatMap(addressesOf)[0]
}

/**
 * The script for a Mac with no `spell`, which trusts the certificate and adds the names.
 * - The one shell script Spell writes:  a Mac that isn't set up to develop Spell has nothing else to run.
 */
export function partnerScript(lanAddress: string, names: string[]): string {
  const line = names.join(" ")
  const pattern = names.map((name) => name.replaceAll(".", "\\.")).join(" ")
  return [
    `#!/bin/bash`,
    `# Makes this Mac reach Spell's local site at ${names.join(" and ")}.  Asks for this Mac's password.`,
    `#   ./trust-this-mac.sh          set it up`,
    `#   ./trust-this-mac.sh --undo   take the names away again`,
    `# Written by spell space local setup, on the Mac the site runs on.`,
    `set -euo pipefail`,
    `cd "$(dirname "$0")"`,
    ``,
    `sudo sed -i '' '/ ${pattern}$/d' /etc/hosts`,
    `if [ "\${1:-}" != "--undo" ]; then`,
    `  echo "${lanAddress} ${line}" | sudo tee -a /etc/hosts >/dev/null`,
    `  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain rootCA.pem`,
    `fi`,
    `sudo dscacheutil -flushcache`,
    `sudo killall -HUP mDNSResponder`,
    `echo "Done.  Restart your browser if it's open."`,
    ``
  ].join("\n")
}

////////////////
// ## The real tools
////////////////

/** This machine's person's email. */
async function machinePersonEmail(): Promise<string> {
  const storage = new DiskStorage(environment.spellSpacesDir)
  try {
    const { person } = await new PeopleStore(storage).person(LOCAL_PERSON, HOME_ORG)
    const email = person?.emails.items[0]
    if (!email) throw new CLI.CliError(`${LOCAL_PERSON}@${HOME_ORG} has no email:  say which one to use`)
    return email
  } finally {
    storage.close()
  }
}

/** The `LocalTools` that really run things. */
function macTools(): LocalTools {
  const catcher = new MailCatcher({ folder: join(environment.cloudDir, "mail") })
  return {
    has: (command) => spawnSync("/usr/bin/which", [command], { stdio: "ignore" }).status === 0,
    output: (command, args) => {
      const { status, stdout } = spawnSync(command, args, { encoding: "utf8" })
      return status === 0 ? stdout : ""
    },
    succeeds: (command, args) => spawnSync(command, args, { stdio: ["inherit", "ignore", "inherit"] }).status === 0,
    run: (command, args, { input } = {}) => {
      const stdio = input === undefined ? "inherit" : (["pipe", "ignore", "inherit"] as const)
      const { status, error } = spawnSync(command, args, {
        stdio: stdio as "inherit",
        ...(input !== undefined && { input })
      })
      if (status !== 0) {
        throw new CLI.CliError(`${command} ${args.join(" ")} didn't work${error ? `:  ${error.message}` : ""}`)
      }
    },
    start: (command, args, { env = {}, logFile }) => {
      const log = logFile ? openSync(logFile, "a") : undefined
      const child = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: log === undefined ? "inherit" : ["ignore", log, log]
      })
      const exited = new Promise<number>((resolve) => {
        child.once("exit", (code) => {
          if (log !== undefined) closeSync(log)
          resolve(code ?? 0)
        })
      })
      return { exited, stop: () => void child.kill() }
    },
    stop: (pid) => process.kill(pid),
    sleep: (ms) => sleep(ms),
    open: (url) => void SRV.openBrowser(url),
    lanAddress: () => lanAddressOf(networkInterfaces()),
    askSecret: (question) => {
      // the terminal stops showing what's typed, and shows it again even if reading fails
      spawnSync("stty", ["-echo"], { stdio: "inherit" })
      return readLine(question).finally(() => {
        spawnSync("stty", ["echo"], { stdio: "inherit" })
        process.stdout.write("\n")
      })
    },
    askLine: readLine,
    cloud: () => SpellCloud.record(),
    newestMailTo: async (email) => (await catcher.newestTo(email))?.text,
    post: (url, { headers, body }) =>
      new Promise((resolve, reject) => {
        const asking = request(url, { method: "POST", headers }, (answer) => {
          let text = ""
          answer.setEncoding("utf8")
          answer.on("data", (chunk: string) => (text += chunk))
          answer.on("end", () => resolve({ status: answer.statusCode ?? 0, text }))
        })
        asking.on("error", reject)
        asking.end(body)
      })
  }
}

/** One line from the terminal. */
function readLine(question: string): Promise<string> {
  const reader = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise<string>((resolve) => reader.question(question, resolve)).finally(() => reader.close())
}
