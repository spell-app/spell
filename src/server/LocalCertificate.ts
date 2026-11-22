import { spawnSync } from "node:child_process"
import { X509Certificate } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { isIPv6 } from "node:net"
import { homedir } from "node:os"
import { join } from "node:path"

/****************
 * ### `LocalCertificate`
 * A certificate this machine's browsers trust, for a local server's HTTPS (and so HTTP/2):  made by mkcert.
 * - mkcert keeps its own certificate authority on this machine;  that authority signs one certificate for `names`.
 *   - the page server's:  `localhost`, `127.0.0.1` and `::1`, in `~/.spell/localhost/` (`forPageServer()`)
 *   - the house-network site's (the app's `LocalSite`):  its own names and folder, the same steps
 * - `state`:  what's missing, in order:  mkcert, the files, the names, the date, the Mac's trust
 * - `make()`:  the files, with mkcert;  no password asked
 * - `trust()`:  this Mac trusts mkcert's authority, asking for the password once in the terminal (`sudo`)
 * - `undo()`:  the files go;  the authority stays trusted, since the house-network site's certificate needs it too
 * - Every outside program goes through `CertificateTools`, so tests run none of them.
 * - Node built-ins only:  the kit's server and the app's command line both use it.
 * - Firefox keeps a list of its own:  mkcert fills it only with `certutil` installed (the page server guide).
 ****************/
export class LocalCertificate {
  /** the folder its two files are in */
  readonly folder: string

  /** the names it's made for:  the first is the one checked for trust */
  readonly names: string[]

  /** the certificate's file */
  readonly certificate: string

  /** its key's file:  NEVER copied anywhere else */
  readonly key: string

  /** what runs outside programs */
  private readonly tools: CertificateTools

  /** `process.platform` */
  private readonly platform: string

  constructor({
    folder,
    names,
    file = "certificate",
    tools = certificateTools(),
    platform = process.platform
  }: LocalCertificateProps) {
    this.folder = folder
    this.names = names
    this.certificate = join(folder, `${file}.pem`)
    this.key = join(folder, `${file}-key.pem`)
    this.tools = tools
    this.platform = platform
  }

  /**
   * The page server's certificate:  for `localhost`, `127.0.0.1` and `::1`, in `~/.spell/localhost/`.
   * - `SPELL_CERTIFICATE_DIR` puts it elsewhere (a test, a measurement)
   */
  static forPageServer(props: Partial<LocalCertificateProps> = {}): LocalCertificate {
    return new LocalCertificate({
      folder: process.env.SPELL_CERTIFICATE_DIR || join(homedir(), ".spell", "localhost"),
      names: PAGE_SERVER_NAMES,
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
    this.tools.run("mkcert", ["-cert-file", this.certificate, "-key-file", this.key, ...this.names])
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
  /** its files' name:  `<file>.pem` and `<file>-key.pem`;  default `certificate` */
  file?: string
  /** what runs outside programs;  default the real ones */
  tools?: CertificateTools
  /** `process.platform` */
  platform?: string
}

/** What a `LocalCertificate` lacks:  `state`. */
export type CertificateState = "no-mkcert" | "missing" | "uncovered" | "expired" | "untrusted" | "ready"

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
    }
  }
}
