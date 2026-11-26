import { spawn, spawnSync } from "node:child_process"
import { X509Certificate } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { isIPv6 } from "node:net"
import { homedir } from "node:os"
import { join } from "node:path"

import { PortBook } from "./PortBook"

/****************
 * ### `LocalCertificate`
 * A certificate this machine's browsers trust, for a local server's HTTPS (and so HTTP/2):  made by mkcert.
 * - mkcert keeps its own certificate authority on this machine;  that authority signs one certificate for `names`.
 *   - the page server's:  `localhost`, `127.0.0.1` and `::1`, in `~/.spell/localhost/` (`forPageServer()`)
 *   - the house-network site's (the app's `LocalSite`):  its own names and folder, the same steps
 * - `state`:  what's missing, in order:  mkcert, the files, the names, the date, the Mac's trust
 * - `make()`:  the files, with mkcert;  no password asked
 * - `trust()`:  this Mac trusts mkcert's authority, asking for the password once in the terminal (`sudo`)
 * - `trustInWindow()`:  the same with no terminal, for this person only:  the Mac asks in a window of its own
 * - `undo()`:  the files go;  the authority stays trusted, since the house-network site's certificate needs it too
 * - Every outside program goes through `CertificateTools`, so tests run none of them.
 * - Node built-ins only:  the kit's server and the app's command line both use it.
 * - Firefox keeps a list of its own, apart from the Mac's (`firefox`):  mkcert fills it only with NSS's `certutil`
 *   installed (`brew install nss`), and only for a profile Firefox has made (`trustInFirefox()`).
 ****************/
export class LocalCertificate {
  /** the folder its two files are in */
  readonly folder: string

  /** the names it's made for:  the first is the one checked for trust */
  readonly names: string[]

  /**
   * more names it's made for when they're there, asked afresh each time:  the page server's, each worktree's two
   * (`PortBook.hostNames()`, epic `editor` P49);  one missing never makes it less than `"ready"`:  `addMoreNames()`
   * makes it again
   */
  readonly moreNames: () => string[]

  /** the certificate's file */
  readonly certificate: string

  /** its key's file:  NEVER copied anywhere else */
  readonly key: string

  /** what runs outside programs */
  private readonly tools: CertificateTools

  /** `process.platform` */
  private readonly platform: string

  /** where Firefox may be installed:  each a path to its app */
  private readonly firefoxApps: string[]

  /** the folder Firefox keeps its profiles in, each with its own list of trusted certificates */
  private readonly firefoxProfiles: string

  constructor({
    folder,
    names,
    moreNames = () => [],
    file = "certificate",
    tools = certificateTools(),
    platform = process.platform,
    firefoxApps = FIREFOX_APPS,
    firefoxProfiles = FIREFOX_PROFILES
  }: LocalCertificateProps) {
    this.folder = folder
    this.names = names
    this.moreNames = moreNames
    this.certificate = join(folder, `${file}.pem`)
    this.key = join(folder, `${file}-key.pem`)
    this.tools = tools
    this.platform = platform
    this.firefoxApps = firefoxApps
    this.firefoxProfiles = firefoxProfiles
  }

  /**
   * The page server's certificate:  for `localhost`, `127.0.0.1` and `::1`, in `~/.spell/localhost/`.
   * - and each worktree's two host names, `editor.localhost` and `editor--app.localhost`, from the port book
   *   (`moreNames`):  browsers refuse a `*.localhost` wildcard, so each is listed (epic `editor` P49, J366)
   * - `SPELL_CERTIFICATE_DIR` puts it elsewhere (a test, a measurement)
   */
  static forPageServer(props: Partial<LocalCertificateProps> = {}): LocalCertificate {
    return new LocalCertificate({
      folder: process.env.SPELL_CERTIFICATE_DIR || join(homedir(), ".spell", "localhost"),
      names: PAGE_SERVER_NAMES,
      moreNames: () => new PortBook().hostNames(),
      file: "localhost",
      ...props
    })
  }

  ////////////////
  // ## What's there
  ////////////////

  /**
   * What it lacks, the first thing missing:  `"ready"` when it's there, current, covers every name, and is trusted.
   * - `"no-mkcert"`, `"missing"`, `"uncovered"`, `"expired"`, `"untrusted"`
   * - NEVER throws
   */
  get state(): CertificateState {
    if (!existsSync(this.certificate) || !existsSync(this.key))
      return this.tools.has("mkcert") ? "missing" : "no-mkcert"
    const read = this.read()
    if (!read) return "missing"
    const covered = read.names.map(sameName)
    if (!this.names.every((name) => covered.includes(sameName(name)))) return "uncovered"
    if (read.validTo.getTime() <= Date.now() + EXPIRY_MARGIN_MS) return "expired"
    return this.isTrusted ? "ready" : "untrusted"
  }

  /**
   * Whether this machine trusts the certificate, for its first name.
   * - a Mac:  `security verify-cert`, which reads the keychains and changes nothing
   * - elsewhere:  mkcert's own install (`mkcert -install`) is what trusts it, and there's no asking;
   *   so it counts as trusted once its authority's file is there
   */
  get isTrusted(): boolean {
    if (this.platform !== "darwin") return Boolean(this.authorityFile && existsSync(this.authorityFile))
    return this.tools.succeeds("security", [
      "verify-cert",
      "-q",
      "-L",
      "-c",
      this.certificate,
      "-p",
      "ssl",
      "-s",
      this.names[0]!
    ])
  }

  /** whether it's on a Mac:  only a Mac asks for the password in a window of its own (`trustInWindow()`) */
  get isOnMac(): boolean {
    return this.platform === "darwin"
  }

  /**
   * Whether Firefox trusts it too:  it keeps its own list of trusted certificates, apart from the Mac's.
   * - `"none"`:  no Firefox installed, or not a Mac
   * - `"no-nss"`:  Firefox, but no `certutil` (NSS, `brew install nss`), which mkcert needs to add to Firefox's list
   * - `"no-profile"`:  Firefox has never been opened, so it has no list yet
   * - `"untrusted"`:  a profile that doesn't hold mkcert's authority;  `trustInFirefox()` adds it
   * - `"trusted"`:  every profile holds it
   * - NEVER throws
   */
  get firefox(): FirefoxState {
    if (this.platform !== "darwin" || !this.firefoxApps.some((app) => existsSync(app))) return "none"
    if (!this.tools.has("certutil")) return "no-nss"
    const profiles = this.firefoxProfileFolders()
    if (!profiles.length) return "no-profile"
    const holds = (folder: string) =>
      MKCERT_AUTHORITY.test(this.tools.output("certutil", ["-L", "-d", `sql:${folder}`]))
    return profiles.every(holds) ? "trusted" : "untrusted"
  }

  /** The key and certificate, for `https` / `http2`, when it's `"ready"`;  else `undefined`.  - NEVER throws */
  get tls(): CertificateFiles | undefined {
    if (this.state !== "ready") return undefined
    try {
      return { key: readFileSync(this.key, "utf8"), cert: readFileSync(this.certificate, "utf8") }
    } catch {
      return undefined
    }
  }

  /** mkcert's authority's public file, `rootCA.pem`;  `undefined` without mkcert.  NEVER its key. */
  get authorityFile(): string | undefined {
    const folder = this.tools.has("mkcert") ? this.tools.output("mkcert", ["-CAROOT"]).trim() : ""
    return folder ? join(folder, "rootCA.pem") : undefined
  }

  ////////////////
  // ## Changing it
  ////////////////

  /**
   * SIDE EFFECT:  the certificate's files are made again, by mkcert, for every name.
   * - asks for nothing:  mkcert writes two files, and makes its authority the first time
   * - throws `CertificateError` without mkcert, naming how to install it
   */
  make(): void {
    this.mkcertOrDie()
    mkdirSync(this.folder, { recursive: true })
    const names = [...new Set([...this.names, ...this.moreNames()])]
    this.tools.run("mkcert", ["-cert-file", this.certificate, "-key-file", this.key, ...names])
  }

  /** `moreNames` the certificate doesn't list yet;  none, or no certificate:  `[]`.  NEVER throws */
  get missingNames(): string[] {
    const read = this.read()
    if (!read) return []
    const covered = read.names.map(sameName)
    return this.moreNames().filter((name) => !covered.includes(sameName(name)))
  }

  /**
   * SIDE EFFECT:  made again for every name when it's `"ready"` and `moreNames` lists one it doesn't:  a worktree
   * booked since;  whether it was.
   * - asks for nothing:  mkcert's authority is trusted already, so no password
   * - the page servers take the new files in place (`WebServer.useCertificate()`), with no restart
   * - NEVER throws:  a failure is logged, and it stays as it was
   */
  addMoreNames(): boolean {
    try {
      if (!this.missingNames.length || this.state !== "ready") return false
      this.make()
      return true
    } catch (error) {
      console.error("LocalCertificate.addMoreNames():  couldn't make it again for the worktrees' names", error)
      return false
    }
  }

  /**
   * SIDE EFFECT:  made again only when it's missing, out of date, or doesn't cover every name;  its new state.
   * - asks for nothing:  what `spell server start` runs, which may have no terminal
   * - NEVER throws:  without mkcert, or when mkcert fails, its state says why
   */
  makeIfNeeded(): CertificateState {
    const before = this.state
    if (before !== "missing" && before !== "uncovered" && before !== "expired") return before
    try {
      this.make()
    } catch {
      return before
    }
    return this.state
  }

  /**
   * SIDE EFFECT:  this machine trusts mkcert's authority, so every certificate it signs.
   * - a Mac:  the System keychain, through `sudo`:  it asks for the password, once, in the terminal
   * - elsewhere:  `mkcert -install`, which asks the same way
   * - throws `CertificateError` without mkcert, or when trusting fails
   */
  trust(): void {
    this.mkcertOrDie()
    if (this.platform !== "darwin") return this.tools.run("mkcert", ["-install"])
    const authority = this.authorityFile
    if (!authority || !existsSync(authority))
      throw new CertificateError("mkcert didn't say where its certificates are:  run mkcert -CAROOT to see why")
    this.tools.run("sudo", TRUST_COMMAND(authority))
  }

  /**
   * SIDE EFFECT:  this person's login keychain trusts mkcert's authority, the Mac asking for their password in a
   * window of its own:  `trust()` for a program with no terminal (the Servers tab's Turn on, epic `epic-engine` T164)
   * - no `sudo`:  the trust is this person's, not the whole Mac's, which every browser they run honours
   * - waits while the window is open, never holding up the program that asks
   * - throws `CertificateError` without mkcert, off a Mac (only a terminal can ask there), or when the person
   *   cancels or trusting fails
   */
  async trustInWindow(): Promise<void> {
    this.mkcertOrDie()
    if (this.platform !== "darwin") throw new CertificateError(NEEDS_TERMINAL)
    const authority = this.authorityFile
    if (!authority || !existsSync(authority))
      throw new CertificateError("mkcert didn't say where its certificates are:  run mkcert -CAROOT to see why")
    await this.tools.ask("security", TRUST_IN_WINDOW_COMMAND(authority))
  }

  /**
   * SIDE EFFECT:  Firefox trusts mkcert's authority too, in every profile:  `mkcert -install`, which uses `certutil`.
   * - asks for nothing once the Mac trusts it (`trust()` first):  mkcert sees that, and only fills Firefox's lists
   * - throws `CertificateError` without mkcert, or when it fails
   */
  trustInFirefox(): void {
    this.mkcertOrDie()
    this.tools.run("mkcert", ["-install"])
  }

  /** SIDE EFFECT:  the certificate's two files go.  mkcert's authority stays trusted. */
  undo(): void {
    rmSync(this.certificate, { force: true })
    rmSync(this.key, { force: true })
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** - throws `CertificateError` naming how to install mkcert, when it isn't */
  private mkcertOrDie(): void {
    if (!this.tools.has("mkcert")) throw new CertificateError(INSTALL_MKCERT)
  }

  /** Firefox's profile folders that hold a list of trusted certificates (`cert9.db`).  - NEVER throws */
  private firefoxProfileFolders(): string[] {
    try {
      return readdirSync(this.firefoxProfiles)
        .map((name) => join(this.firefoxProfiles, name))
        .filter((folder) => existsSync(join(folder, "cert9.db")))
    } catch {
      return []
    }
  }

  /** The names and end date in its certificate file;  `undefined` when it can't be read.  - NEVER throws */
  private read(): { names: string[]; validTo: Date } | undefined {
    try {
      const x509 = new X509Certificate(readFileSync(this.certificate))
      const names = (x509.subjectAltName ?? "")
        .split(/,\s*/)
        .map((each) => each.replace(/^(DNS|IP Address):/, ""))
        .filter(Boolean)
      return { names, validTo: new Date(x509.validTo) }
    } catch {
      return undefined
    }
  }
}

/** `name` as a certificate's names are compared:  an IPv6 address shortened, `0:0:0:0:0:0:0:1` => `::1` */
function sameName(name: string): string {
  return isIPv6(name) ? new URL(`http://[${name}]`).hostname.slice(1, -1) : name
}

/** Constructor props of a `LocalCertificate`. */
export type LocalCertificateProps = {
  /** the folder its files go in */
  folder: string
  /** the names it's made for:  the first is the one checked for trust */
  names: string[]
  /** more names it's made for when they're there, asked each time (`LocalCertificate.moreNames`);  default none */
  moreNames?: () => string[]
  /** its files' name:  `<file>.pem` and `<file>-key.pem`;  default `certificate` */
  file?: string
  /** what runs outside programs;  default the real ones */
  tools?: CertificateTools
  /** `process.platform` */
  platform?: string
  /** where Firefox may be installed;  default `FIREFOX_APPS` */
  firefoxApps?: string[]
  /** where Firefox keeps its profiles;  default `FIREFOX_PROFILES` */
  firefoxProfiles?: string
}

/** What a `LocalCertificate` lacks:  `state`. */
export type CertificateState = "no-mkcert" | "missing" | "uncovered" | "expired" | "untrusted" | "ready"

/** Whether Firefox trusts it too:  `firefox`. */
export type FirefoxState = "none" | "no-nss" | "no-profile" | "untrusted" | "trusted"

/** A certificate's two files' text, as `https.createServer()` and `http2.createSecureServer()` take them. */
export type CertificateFiles = { key: string; cert: string }

/** The programs a `LocalCertificate` runs:  a test's are stand-ins. */
export type CertificateTools = {
  /** whether a program is installed */
  has(command: string): boolean
  /** what a program prints;  empty when it fails.  - NEVER throws */
  output(command: string, args: string[]): string
  /** whether a program succeeds, its output hidden.  - NEVER throws */
  succeeds(command: string, args: string[]): boolean
  /** run a program in this terminal, which it may ask for a password in;  - throws `CertificateError` when it fails */
  run(command: string, args: string[]): void
  /**
   * run a program that asks in a window of its own (the Mac's password window), waiting without blocking;
   * - throws `CertificateError` when it fails, or the person cancels
   */
  ask(command: string, args: string[]): Promise<void>
}

/** What's wrong, in words for the person:  the command line prints it plainly. */
export class CertificateError extends Error {}
CertificateError.prototype.name = "CertificateError"

/** The page server's names:  every way this machine is reached by itself. */
export const PAGE_SERVER_NAMES = ["localhost", "127.0.0.1", "::1"]

/** How to install mkcert, for the person. */
export const INSTALL_MKCERT =
  "You need to install a small program called mkcert first.  It makes certificates your computer trusts.\n" +
  "On a Mac, type this in a terminal (it needs Homebrew, a Mac app installer):  brew install mkcert\n" +
  "On Windows or Linux, follow the steps at https://github.com/FiloSottile/mkcert#installation"

/** Where a Mac may have Firefox:  each of its editions, for everyone or for this person. */
const FIREFOX_APPS = ["/Applications", join(homedir(), "Applications")].flatMap((folder) =>
  ["Firefox", "Firefox Developer Edition", "Firefox Nightly"].map((name) => join(folder, `${name}.app`))
)

/** Where Firefox keeps its profiles on a Mac. */
const FIREFOX_PROFILES = join(homedir(), "Library", "Application Support", "Firefox", "Profiles")

/** What `certutil -L` lists for mkcert's authority, in a Firefox profile. */
const MKCERT_AUTHORITY = /mkcert development CA/

/** A certificate this close to its end date is made again:  a week. */
const EXPIRY_MARGIN_MS = 7 * 24 * 60 * 60 * 1000

/** The arguments, after `sudo`, that make every program on this Mac trust `authorityFile`. */
export const TRUST_COMMAND = (authorityFile: string): string[] => [
  "security",
  "add-trusted-cert",
  "-d",
  "-r",
  "trustRoot",
  "-k",
  "/Library/Keychains/System.keychain",
  authorityFile
]

/**
 * The arguments, after `security`, that make this person's programs trust `authorityFile`, asking in the Mac's own
 * password window:  no `-d` (the whole Mac's settings), so no `sudo`
 */
export const TRUST_IN_WINDOW_COMMAND = (authorityFile: string): string[] => [
  "add-trusted-cert",
  "-r",
  "trustRoot",
  "-k",
  join(homedir(), "Library", "Keychains", "login.keychain-db"),
  authorityFile
]

/** What's said off a Mac, where only a terminal can ask for the password. */
const NEEDS_TERMINAL = "To trust the certificate, type this in a terminal:  spell server certificate"

/** Where a Mac keeps the programs this runs:  a server started from an app may have a short `PATH`. */
const SEARCH_PATH = [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", "/usr/sbin", "/usr/bin", "/sbin", "/bin"]
  .filter(Boolean)
  .join(process.platform === "win32" ? ";" : ":")

/** The `CertificateTools` that really run programs. */
export function certificateTools(): CertificateTools {
  const env = { ...process.env, PATH: SEARCH_PATH }
  return {
    has: (command) =>
      spawnSync(process.platform === "win32" ? "where" : "which", [command], { stdio: "ignore", env }).status === 0,
    output: (command, args) => {
      const { status, stdout } = spawnSync(command, args, { encoding: "utf8", env })
      return status === 0 ? stdout : ""
    },
    succeeds: (command, args) => spawnSync(command, args, { stdio: "ignore", env }).status === 0,
    run: (command, args) => {
      const { status, error } = spawnSync(command, args, { stdio: "inherit", env })
      if (status !== 0)
        throw new CertificateError(`${command} ${args.join(" ")} didn't work${error ? `:  ${error.message}` : ""}`)
    },
    ask: (command, args) =>
      new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"], env })
        let said = ""
        child.stderr.on("data", (chunk: Buffer) => (said += chunk.toString()))
        child.once("error", (error) => reject(new CertificateError(`${command} didn't start:  ${error.message}`)))
        child.once("close", (status) =>
          status === 0
            ? resolve()
            : reject(new CertificateError(`${command} ${args[0]} didn't work${said.trim() ? `:  ${said.trim()}` : ""}`))
        )
      })
  }
}
