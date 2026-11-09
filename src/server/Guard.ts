import { randomBytes } from "node:crypto"

import type { Handler } from "spell/server"
// Import directly:  through the `SRV` barrel, the Linker's HTML parser lands in spell-epic's extension (I58)
import { Request } from "./Request"
import { HttpError } from "./server.types"

/**
 * Guards a local server:  only pages it served itself may write to it.
 * - `checkHost`:  every request's `Host` must be this server's own (`127.0.0.1:<port>`, `localhost:<port>`),
 *   so a web page elsewhere can't reach us by pointing its own name at 127.0.0.1 (DNS rebinding)
 * - `checkWrite`:  a write must carry this run's `token` (header `x-server-token`),
 *   which only pages we served know (`window.SPELL_SERVER.token`)
 *   - and, if it sends an `Origin`, a same-origin one
 * - the token changes every run:  a page served by an older run must reload
 * - A device signed in (`request.person`, put there by `SignInCheck`, epic `atmosphere` P3) needs no token:
 *   its cookie is the proof, sent by none but our own pages (`SameSite=Strict`), and still from our own origin.
 *   - `tokenCheck`:  the token only, never a sign-in:  what only this machine's person may do (an invite)
 * - It stays for the local page server:  this run's token is how a page it served writes, signed in or not.
 * - From the goals server's POST checks.
 */
export class Guard {
  /** this run's secret;  pages get it in `window.SPELL_SERVER` */
  readonly token: string

  /** allowed `Host` headers;  set by `allowPort()` once the port is known */
  private hosts = new Set<string>()

  /** allowed `Origin` headers */
  private origins = new Set<string>()

  /** more `Host` headers allowed, each by a test:  `allowHosts()` */
  private hostTests: ((host: string) => boolean)[] = []

  constructor({ token = randomBytes(16).toString("hex") }: { token?: string } = {}) {
    this.token = token
  }

  /** accept requests addressed to this server on `port` */
  allowPort(port: number): this {
    for (const host of [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]) {
      this.hosts.add(host)
      this.origins.add(`http://${host}`)
    }
    return this
  }

  /**
   * Accept writes from pages served on this machine's `port` too, which a proxy passes on to us:  the editor's dev
   * server (`EditorServer`, epic `language` T68).  Their origin only:  their requests are addressed to that port, not ours.
   */
  allowOriginPort(port: number): this {
    for (const host of [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]) this.origins.add(`http://${host}`)
    return this
  }

  /**
   * Accept requests addressed to `address` too, `https://spell.example.org`:  where people reach a server from outside,
   * through whatever gives it that address (epic `atmosphere` P8).  Its host, and its origin for writes.
   */
  allowAddress(address: string): this {
    const { host, origin } = new URL(address)
    this.hosts.add(host)
    this.origins.add(origin)
    return this
  }

  /**
   * Accept requests addressed to any host `test` says yes to, its port left on:
   * a cloud's AT Protocol handles, `ana.rs.spell.space` (epic `atmosphere` P16).
   * - Their hosts only, never their origins:  a page served under one writes nothing.
   * - Safe from DNS rebinding only for names WE own:  `test` must say yes to no one else's.
   */
  allowHosts(test: (host: string) => boolean): this {
    this.hostTests.push(test)
    return this
  }

  /** `HttpError(403)` unless `request` is addressed to us */
  checkHost(request: Request): void {
    const host = request.get("host") ?? ""
    if (!this.hosts.has(host) && !this.hostTests.some((test) => test(host))) throw new HttpError(403, "unknown host")
  }

  /** `HttpError(403)` unless `request` carries the token, or comes from a device signed in;  from our own origin */
  checkWrite(request: Request): void {
    if (request.person === undefined) this.checkToken(request)
    const origin = request.get("origin")
    if (origin && !this.origins.has(origin)) throw new HttpError(403, "wrong origin")
  }

  /** `HttpError(403)` unless `request` carries this run's token, whoever's signed in;  from our own origin */
  checkToken(request: Request): void {
    if (request.get("x-server-token") !== this.token) throw new HttpError(403, "bad token:  reload the page")
    const origin = request.get("origin")
    if (origin && !this.origins.has(origin)) throw new HttpError(403, "wrong origin")
  }

  /** middleware:  `checkHost` */
  hostCheck: Handler = (request, _reply, next) => {
    this.checkHost(request)
    next()
  }

  /** middleware:  `checkWrite` */
  writeCheck: Handler = (request, _reply, next) => {
    this.checkWrite(request)
    next()
  }

  /** middleware:  `checkToken` */
  tokenCheck: Handler = (request, _reply, next) => {
    this.checkToken(request)
    next()
  }
}
