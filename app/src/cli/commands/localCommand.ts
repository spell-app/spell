import { spawnSync } from "child_process"
import { chmodSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { request } from "http"
import { homedir, networkInterfaces } from "os"
import { join } from "path"
import { createInterface } from "readline"

import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import { MailCatcher } from "spell/server/signIn"
import environment from "spell/app/spaces/server/node/environment"
import {
  DEFAULT_ADDRESSES,
  LocalSiteError,
  LocalSiteServer,
  localSiteTools,
  machinePersonEmail,
  namesOf,
  type LocalSiteRun,
  type LocalSiteTools
} from "spell/app/spaces/server/node/routes/LocalSiteServer"
import { SpellCloud } from "spell/app/spaces/server/node/routes/SpellCloud"

/** The name a Mac keeps Gmail's password under, readable by root alone. */
const POSTFIX_PASSWORDS = "/etc/postfix/sasl_passwd"

/** Marks the line `setup` adds to the hosts file. */
const HOSTS_MARK = "# spell space local"

/** What's said after anything that needs the site started again:  nobody starts it by hand now. */
const RESTART_THE_SITE = "spell server stop, then spell server start, from the main checkout"

/** Where a sign-in mail's link is. */
const SIGN_IN_LINK = /https?:\/\/\S+\/sign-in\/confirm\S*/

/** What `sign-in` opens until a page has been named. */
const DEFAULT_PAGE = "/apps/@spell/examples/FamilyCookbook"

/** How many times `sign-in` looks for its mail, and how long between. */
const MAIL_LOOKS = 20
const MAIL_LOOK_MS = 250

/**
 * `spell space local setup | start | stop | mail | sign-in`:  see `LocalSite`.
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 * - A `LocalSiteError` is a mistake to say plainly, as `CLI.CliError` is.
 */
export async function localCommand(verb: string, targets: string[], options: LocalOptions): Promise<number> {
  try {
    const site = new LocalSite()
    if (verb === "setup") return await site.setup(options)
    if (verb === "start") return await site.start(options)
    if (verb === "stop") return await site.stop()
    if (verb === "mail") return await site.mail(options)
    return await site.signIn(targets[0], targets[1])
  } catch (error) {
    if (error instanceof LocalSiteError) throw new CLI.CliError(error.message)
    throw error
  }
}

/**
 * The app's part of `spell server stop all`, the `stopAllServers` hook:  the local site stops, as a plain `stop` doesn't.
 * - Only from the main checkout (`root`):  a worktree's `stop all` is no reason to take the site down.
 * - Its line for the table;  `undefined` off a Mac, or on a Mac it's never been set up on.
 * - NEVER throws:  a failure is its line.
 */
export async function stopLocalSiteWithAll(root: string, site = new LocalSite()): Promise<string | undefined> {
  if (!site.needsStopping) return undefined
  const checkout = SRV.checkoutOf(root)
  if (!checkout || checkout.root !== checkout.main) return "local site:  left alone:  the main checkout's runs it"
  try {
    return `local site:  ${await site.stopSite()}`
  } catch (error) {
    return `local site:  ${(error as Error).message}`
  }
}

/** Options of `spell space local`. */
export type LocalOptions = {
  /** Where the site is reached, `https://test.spell.app`:  each needs `setup` to have made its name. */
  address?: string[]
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
 * - The main checkout's page server runs the site by itself, once `setup` has been run:  spaces' `LocalSiteServer`.
 * - `setup [--undo]`:  this Mac's certificate, names and trust, and a folder for another Mac that has no `spell`
 * - `start [--address <url>]...`:  the cloud and Caddy together, here in this terminal, until `Ctrl-C`:  to watch it
 *   - Caddy turns `https://test.spell.app` into the cloud's local port
 *   - real mail by itself, once `mail` has run
 *   - while the page server runs the site, it says so and leaves it alone
 * - `stop`:  the site stops, the page server's or a terminal's;  the next page server to start starts it again (T63)
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
  /** The running site, and this Mac's certificate and settings:  the page server's, too. */
  private readonly server: LocalSiteServer
  /** This Mac's hosts file. */
  private readonly hostsFile: string
  /** This machine's person's email. */
  private readonly machineEmail: () => Promise<string>
  /** What this machine runs on. */
  private readonly platform: string

  constructor({
    tools = macTools(),
    folder = join(homedir(), ".spell", "local-site"),
    oldFolder = join(homedir(), ".spell", "house-site"),
    hostsFile = "/etc/hosts",
    machineEmail = machinePersonEmail,
    platform = process.platform
  }: LocalSiteProps = {}) {
    this.tools = tools
    this.server = new LocalSiteServer({ tools, folder, oldFolder, machineEmail, platform })
    this.hostsFile = hostsFile
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
   * - throws `LocalSiteError` off a Mac, or with mkcert or caddy missing
   */
  async setup({ address, undo }: LocalOptions): Promise<number> {
    const { server } = this
    server.macOrDie()
    if (undo) {
      const names = server.settings.names ?? namesOf(DEFAULT_ADDRESSES)
      this.changeHosts(names, undefined)
      console.log(`Done:  ${names.join(" and ")} are gone from this Mac.`)
      return 0
    }
    server.toolsOrDie(["mkcert", "caddy"])
    server.takeOverOldCertificate()
    const addresses = address?.length ? address : (server.settings.addresses ?? DEFAULT_ADDRESSES)
    const names = namesOf(addresses)

    if (!server.certificateCovers(names)) {
      mkdirSync(server.folder, { recursive: true })
      this.tools.run("mkcert", ["-cert-file", server.certificate, "-key-file", server.key, ...names])
    }
    server.remember({ addresses, names })

    const rootFile = this.rootCertificate()
    const isTrusted = this.tools.succeeds("security", [
      "verify-cert",
      "-q",
      "-L",
      "-c",
      server.certificate,
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
    console.log(`Done:  this Mac reaches ${names.join(" and ")}.`)
    this.tellAboutEditor(addresses)
    console.log(`The page server runs the site from now on.  To start it now:  ${RESTART_THE_SITE}`)
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
    const partner = join(this.server.folder, "for-partner")
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

  ////////////////
  // ## start
  ////////////////

  /**
   * SIDE EFFECT:  the site runs here, until `Ctrl-C`, or until either of its programs stops:  then both do.
   * - For someone who wants to watch it:  the main checkout's page server runs it by itself.
   * - While the page server runs it, this says so and leaves it alone:  the page server would otherwise be left
   *   thinking it had a site, and `Ctrl-C` would take the site away until its next restart.
   * - throws `LocalSiteError` off a Mac, before `setup`, with a name `setup` didn't make,
   *   or with a port held by something else
   */
  async start({ address }: LocalOptions): Promise<number> {
    if (this.server.runner?.by === "the page server") return this.tellAboutPageServer()
    const run = await this.server.launch({ address, by: "a terminal" })
    this.tellAboutStart(run)
    return this.untilStopped(run)
  }

  /** SIDE EFFECT:  says the page server has it, and where to watch. */
  private tellAboutPageServer(): number {
    console.log(`The page server is already running the site, so this leaves it alone.`)
    console.log(`To watch it:  tail -f ${this.server.logFile}`)
    console.log(`To run it here instead:  spell space local stop, then spell space local start`)
    return 0
  }

  ////////////////
  // ## stop
  ////////////////

  /**
   * SIDE EFFECT:  the site stops, whoever's running it, and says so.
   * - throws `LocalSiteError` off a Mac, or while the page server is updating it
   */
  async stop(): Promise<number> {
    this.server.macOrDie()
    console.log(`The site:  ${await this.server.stopSite()}.`)
    return 0
  }

  /** Whether `spell server stop all` has anything to do here:  a Mac that's been set up. */
  get needsStopping(): boolean {
    return this.platform === "darwin" && this.server.isSetUp
  }

  /** SIDE EFFECT:  the site stops;  what became of it.  - throws `LocalSiteError` while the page server is updating it */
  stopSite(): Promise<string> {
    return this.server.stopSite()
  }

  /** What `start` waits for:  a `Ctrl-C` is a clean stop;  a program ending on its own is not. */
  private async untilStopped(run: LocalSiteRun): Promise<number> {
    const stop = () => run.stop()
    process.once("SIGINT", stop)
    process.once("SIGTERM", stop)
    try {
      if ((await run.ended) === "asked") return 0
      console.error(`The site stopped by itself.  Caddy's log is ${run.logFile};  the cloud's is above.`)
      return 1
    } finally {
      process.off("SIGINT", stop)
      process.off("SIGTERM", stop)
    }
  }

  /** SIDE EFFECT:  says which address is the editor's, and that it's for this house network alone (epic `atmosphere` P39). */
  private tellAboutEditor(addresses: string[]): void {
    const editorName = this.server.editorNameFor(addresses)
    if (!editorName) return
    console.log(`https://${editorName} is Spell's editor, for this house network ONLY:`)
    console.log(`  it runs as this Mac's person with no sign-in, so anyone who reaches it edits as you.`)
  }

  /** SIDE EFFECT:  says where the site is, and how mail goes. */
  private tellAboutStart({ addresses, mail }: LocalSiteRun): void {
    console.log(`Spell's local site, until Ctrl-C:`)
    for (const address of addresses) console.log(`  ${address}`)
    this.tellAboutEditor(addresses)
    const lanAddress = this.tools.lanAddress()
    if (lanAddress) console.log(`Another Mac on this network reaches it through this one:  ${lanAddress}`)
    console.log(
      mail.SPELL_MAIL
        ? `Mail:  real, through Gmail, as ${mail.SPELL_MAIL_FROM}.`
        : `Mail:  caught on this Mac (spell space cloud mail).  For real mail:  spell space local mail, then start again.`
    )
  }

  ////////////////
  // ## mail
  ////////////////

  /**
   * SIDE EFFECT:  the Mac's postfix sends everything through Gmail, as `gmail`, and a test mail goes out.
   * - Asks for the app password only when there's none, or with `newPassword`.
   * - The password goes to `tee`'s standard input, into a file made root-only first.
   * - throws `LocalSiteError` off a Mac, `CliError` for an empty password
   */
  async mail({ gmail, newPassword }: LocalOptions): Promise<number> {
    this.server.macOrDie()
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
    this.server.remember({ mailFrom: from })

    this.tools.run("/usr/sbin/sendmail", ["-t", "-i"], {
      input: `Subject: Spell test mail\nFrom: ${from}\nTo: ${from}\n\nIf you can read this, this Mac sends through Gmail.\n`
    })
    console.log(`Sent a test mail to ${from}.  Not there in a minute?  Run:  mailq`)
    console.log(`The site sends real mail the next time it starts.  To start it again now:  ${RESTART_THE_SITE}`)
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
    if (!record) throw new CLI.CliError("Spell's cloud isn't running:  spell server start, or spell space local start")
    const email = _email ?? (await this.machineEmail())
    const site = record.address ?? `http://127.0.0.1:${record.port}`
    const page = _page
      ? _page.startsWith("/")
        ? _page
        : `/apps/${_page}`
      : (this.server.settings.page ?? DEFAULT_PAGE)

    const before = await this.tools.newestMailTo(email)
    const { status, text } = await this.tools.post(`http://127.0.0.1:${record.port}/api/sign-in/ask`, {
      headers: { host: new URL(site).host, origin: site, "content-type": "application/json" },
      body: JSON.stringify({ email })
    })
    if (status !== 200) throw new CLI.CliError(`The cloud said no (${status}):  ${errorIn(text)}`)

    const link = await this.newLinkFor(email, before)
    this.server.remember({ page })
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

  /** SIDE EFFECT:  says why, as `sudo` is about to ask for a password, then runs it. */
  private sudo(why: string, args: string[], input?: string): void {
    console.log(`${why}.  It may ask for this Mac's password.`)
    this.tools.run("sudo", args, input === undefined ? {} : { input })
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
  /** This machine's person's email. */
  machineEmail?: () => Promise<string>
  /** `process.platform`. */
  platform?: string
}

/** Everything `LocalSite` does outside itself:  a test's stand-in runs none of it. */
export type LocalTools = LocalSiteTools & {
  /** Whether a program ends well, on this terminal.  - NEVER throws */
  succeeds(command: string, args: string[]): boolean
  /** Run a program on this terminal, `input` its standard input.  - throws `CliError` when it fails, naming no input */
  run(command: string, args: string[], options?: { input?: string }): void
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

////////////////
// ## Pure helpers
////////////////

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

/** The `LocalTools` that really run things. */
function macTools(): LocalTools {
  const catcher = new MailCatcher({ folder: join(environment.cloudDir, "mail") })
  return {
    ...localSiteTools(),
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
