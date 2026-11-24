import { statSync } from "node:fs"

import { SRV } from "spell/server"

import type { HttpsState, HttpsStatus } from "./server.types"

/****************
 * ### `HttpsSwitch`
 * The Servers tab's switch for HTTPS (and HTTP/2) on the page servers (epic `epic-engine` T164):  whether it's on, and
 * turning it on or off from the page, with no terminal.
 * - ONE certificate for every page server of this Mac, `SRV.LocalCertificate.forPageServer()`:  its state, `make()`,
 *   `trustInWindow()` and `undo()` do the work, so nothing here repeats them
 * - turning on:  the certificate made (no password), then trusted, the Mac asking for the password in its own window
 *   (`trustInWindow()`:  the hub has no terminal for `sudo`)
 * - turning off:  its files go
 * - either way the switch restarts nothing itself:  the keeper sees the files change (`filesStamp`) and restarts main's
 *   page servers, as it does for `spell server certificate` in a terminal;  the switch only asks it to look
 *   (`changed`), just after the answer goes
 * - a worktree's page server takes it at its next start, as `spell server certificate` leaves it
 * - its state is read at most every `CACHE_MS`:  a Mac's trust check runs a program, and the tab asks every 10 seconds
 * - the hub's, beside its `ServerKeeper`;  a test hands a certificate on stand-in programs, and its own `changed`
 ****************/
export class HttpsSwitch {
  /** the page servers' certificate */
  readonly certificate: SRV.LocalCertificate

  /** asks the keeper to look now:  it sees the files changed, and restarts main's page servers */
  private readonly changed: () => Promise<void>

  /** the clock, ms */
  private readonly now: () => number

  /** the last status read, and when */
  private cached?: { status: HttpsStatus; at: number }

  constructor({
    certificate = SRV.LocalCertificate.forPageServer(),
    changed,
    now = Date.now
  }: {
    certificate?: SRV.LocalCertificate
    changed: () => Promise<void>
    now?: () => number
  }) {
    this.certificate = certificate
    this.changed = changed
    this.now = now
  }

  /** whether the page servers speak HTTPS, as the tab draws it.  NEVER throws */
  get status(): HttpsStatus {
    if (this.cached && this.now() - this.cached.at < CACHE_MS) return this.cached.status
    const status = HttpsSwitch.statusFor(this.certificate.state, this.certificate.isOnMac)
    this.cached = { status, at: this.now() }
    return status
  }

  /**
   * The certificate's two files as they stand, size and time each, `"none"` for one that isn't there:  what changes
   * when they're made, made again or deleted, by the tab or by `spell server certificate`.  NEVER throws
   */
  get filesStamp(): string {
    return [this.certificate.certificate, this.certificate.key]
      .map((file) => {
        try {
          const { size, mtimeMs } = statSync(file)
          return `${size}@${mtimeMs}`
        } catch {
          return "none"
        }
      })
      .join(" ")
  }

  /** forget the status read, so the next one reads it afresh:  the files changed */
  forget(): void {
    this.cached = undefined
  }

  /**
   * The tab's view of a certificate in state `certificate`:  its state, words and which buttons apply;  pure.
   * - `isOnMac`:  only a Mac can ask for the password in a window;  elsewhere Turn on says the command to type
   */
  static statusFor(certificate: SRV.CertificateState, isOnMac = true): HttpsStatus {
    const state = STATE_OF[certificate]
    const whyNot = certificate === "no-mkcert" ? NO_MKCERT : !isOnMac && state !== "on" ? NOT_A_MAC : undefined
    return {
      state,
      certificate,
      words: WORDS[state],
      ...(state === "on" && { address: SECURE_ADDRESS }),
      canTurnOn: state !== "on" && !whyNot,
      canTurnOff: certificate !== "missing" && certificate !== "no-mkcert",
      ...(whyNot && { whyNot })
    }
  }

  /**
   * SIDE EFFECT:  HTTPS turned `on` or `off` for every page server;  the status after.
   * - the keeper, asked to look just after, restarts main's page servers to take it (`filesStamp`)
   * - `on`:  made when it's missing or out of date, then trusted when it isn't (the Mac's password window, which this
   *   waits for);  already on:  nothing happens
   * - `off`:  the certificate's files go;  mkcert's authority stays trusted (the house-network site uses it too)
   * - throws `SRV.HttpError` 409 when it can't:  no mkcert, not a Mac, the person cancelled;  its message says what
   *   to do, for the tab to show
   */
  async turn(to: "on" | "off"): Promise<HttpsStatus> {
    const before = this.certificate.state
    this.cached = undefined
    if (to === "off") {
      if (before === "missing" || before === "no-mkcert") return this.status
      this.certificate.undo()
    } else {
      if (before === "ready") return this.status
      const status = HttpsSwitch.statusFor(before, this.certificate.isOnMac)
      if (status.whyNot) throw new SRV.HttpError(409, status.whyNot)
      try {
        if (this.certificate.makeIfNeeded() === "untrusted") await this.certificate.trustInWindow()
      } catch (error) {
        if (!(error instanceof SRV.CertificateError)) throw error
        console.error("https switch:  trusting the certificate failed:", error.message)
        throw new SRV.HttpError(409, NOT_TRUSTED)
      }
      this.cached = undefined
      if (this.certificate.state !== "ready") throw new SRV.HttpError(409, NOT_TRUSTED)
    }
    afterAnswer(() => this.changed())
    return this.status
  }
}

/**
 * SIDE EFFECT:  `work` run `RESTART_DELAY_MS` after the answer, never before it, its failure logged:  a tab's call
 * comes through main's page server, which a restart would cut off mid-answer
 */
export function afterAnswer(work: () => Promise<void>): void {
  setTimeout(() => {
    void work().catch((error: unknown) => console.error("server keeper:  a restart after an answer failed", error))
  }, RESTART_DELAY_MS).unref?.()
}

/** How long after its answer a restart waits, ms:  the answer's way back through main's page server. */
export const RESTART_DELAY_MS = 500

/** How long a status read stands, ms:  about one of the tab's looks. */
const CACHE_MS = 8_000

/** Where browsers open the main page server's pages, once it's on. */
const SECURE_ADDRESS = "https://localhost:4747/"

/** The tab's state for each certificate state. */
const STATE_OF: Record<SRV.CertificateState, HttpsState> = {
  ready: "on",
  missing: "off",
  "no-mkcert": "off",
  untrusted: "needs-trust",
  expired: "out-of-date",
  uncovered: "out-of-date"
}

/** What each state means, for the card's tooltip:  checked in the novice voice (`epic voice check`). */
const WORDS: Record<HttpsState, string> = {
  on:
    "Your pages open over a secure link, with a padlock (this is called HTTPS).\n" +
    "The secure link lets your browser fetch many files at once, so big pages load faster.",
  off: "Your pages open over a plain link, with no padlock (HTTP).\nTurn on the secure link (HTTPS) so big pages load faster.",
  "needs-trust":
    "The secure link (HTTPS) is almost ready.\nPress Turn on, and your Mac will ask for your password to finish.",
  "out-of-date": "The secure link (HTTPS) has expired.\nPress Turn on to renew it."
}

/** Why Turn on can't, without mkcert. */
const NO_MKCERT =
  "First, install a small free helper called mkcert.  It makes the secure link work on your Mac.\n" +
  "1. Open the Terminal app (where you type commands).\n" +
  "2. Type:  brew install mkcert\n" +
  "3. Come back here and press Turn on.\n" +
  "This uses Homebrew, a free installer for Mac apps.  If you don't have it, get it at brew.sh first."

/** Why Turn on can't, off a Mac:  only a terminal can ask for the password there. */
const NOT_A_MAC = "To turn this on, open a terminal (where you type commands) and type:  spell server certificate"

/** What's said when the Mac didn't trust it:  the person cancelled, or trusting failed. */
const NOT_TRUSTED =
  "The secure link is still off, because your Mac didn't get your password.\n" +
  "To try again, press Turn on.\n" +
  "Still not working?  Open the Terminal app and type:  spell server certificate\n" +
  "That sets up the secure link by hand."
