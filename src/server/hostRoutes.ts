import { readFileSync } from "node:fs"
import type { IncomingMessage } from "node:http"
import { connect } from "node:net"
import { dirname, join } from "node:path"
import type { Duplex } from "node:stream"
import { fileURLToPath } from "node:url"

import type { Handler } from "spell/server"
import { PidFile, editorAddressOf } from "./PidFile"
import { EDITOR_SUFFIX, PortBook, hostNameOf } from "./PortBook"
import { proxyTo, proxyUpgrade } from "./proxy"
import { Request } from "./Request"

/****************
 * ### `HostRoutes`
 * ONE ADDRESS PER WORKTREE, through main's page server (epic `editor` P49):  each request's NAME is looked at first,
 * so a browser only ever uses main's port.
 * - `<worktree>.localhost:4747`:  passed on to that worktree's page server, on its booked port (`PortBook`)
 * - `<worktree>--app.localhost:4747`:  its editor, so the editor and its reload stay at `/`
 * - websockets too (live reload, the editor's reload):  `upgrade()`
 * - not running:  its start asked for (`start`, the server keeper's);  a page asked for meanwhile gets the names page
 *   saying it's starting, which loads the page once it answers;  anything else waits for it
 * - an unknown name:  the names page, listing the worktrees, each one's name a link
 * - `/_spell/names` (`NAMES_API`), on any name:  the worktrees and how each stands, for the names page
 * - plain `localhost:4747` (and main's editor on 3000) stay as they are:  this answers only a NAMED host
 * - every `*.localhost` name reaches this machine only (browsers resolve them to loopback), so letting them in
 *   (`isNamedHost()`, the guard's `allowHosts()`) opens nothing to another machine
 * - a page's own same-origin writes go on as the worktree's server's own origin, so its guard takes them
 * - knows no keeper, no page server, no git:  the worktrees and how to start one are handed in
 ****************/
export class HostRoutes {
  /** the worktrees reached by name, `[name, checkout]`, asked afresh each time */
  readonly worktrees: () => [string, string][]

  /** start checkout `checkout`'s page server (its editor comes with it);  resolves once asked */
  readonly start: (checkout: string) => Promise<unknown>

  /** where a worktree's ports are written down */
  readonly book: PortBook

  /** Spell UI's script for the names page (the settings' `uiScript`);  none:  plain HTML */
  readonly uiScript?: string

  /** how long a request that isn't a page waits for a server starting, ms */
  readonly waitMs: number

  /** whether main's page server answers `path` itself while the worktree isn't running:  the engine's files the names page loads */
  readonly mainServes: (path: string) => boolean

  /** starts under way, by checkout:  a second request doesn't ask again */
  private starting = new Map<string, Promise<unknown>>()

  constructor({
    worktrees,
    start,
    book = new PortBook(),
    uiScript,
    waitMs = START_WAIT_MS,
    mainServes = () => false
  }: {
    worktrees: () => [string, string][]
    start: (checkout: string) => Promise<unknown>
    book?: PortBook
    uiScript?: string
    waitMs?: number
    mainServes?: (path: string) => boolean
  }) {
    this.worktrees = worktrees
    this.start = start
    this.book = book
    this.uiScript = uiScript
    this.waitMs = waitMs
    this.mainServes = mainServes
  }

  /** `host` (`editor--app.localhost:4747`) as a name:  the worktree's name, and whether it's its editor;  else `undefined` */
  static nameOf(host: string | undefined): { name: string; isEditor: boolean } | undefined {
    const found = NAMED_HOST.exec(host ?? "")
    if (!found) return undefined
    return { name: found[1]!, isEditor: found[2] !== undefined }
  }

  /** whether `host` is a name this answers (the guard's `allowHosts()`):  any `<name>.localhost`, with a port or not */
  static isNamedHost = (host: string): boolean => NAMED_HOST.test(host)

  /** the checkout named `name`, else `undefined` */
  checkoutNamed(name: string): string | undefined {
    return this.worktrees().find(([worktree]) => hostNameOf(worktree) === name)?.[1]
  }

  /** every worktree, its addresses and whether its page server answers:  `NAMES_API`'s answer.  NEVER throws */
  async names(port: number, secure: boolean): Promise<NamedWorktree[]> {
    const scheme = secure ? "https" : "http"
    return Promise.all(
      this.worktrees().map(async ([worktree, checkout]) => {
        const name = hostNameOf(worktree)
        const booked = this.portOf(checkout, false)
        return {
          name,
          worktree,
          address: `${scheme}://${name}${LOCALHOST}:${port}/`,
          editor: `${scheme}://${name}${EDITOR_SUFFIX}${LOCALHOST}:${port}/`,
          running: booked !== undefined && (await isAnswering(booked))
        }
      })
    )
  }

  /** middleware, first on main's page server:  a named host's request answered here, any other passed on */
  handle: Handler = async (request, reply, next) => {
    const named = HostRoutes.nameOf(request.get("host"))
    if (!named) return next()
    const port = Number(/:(\d+)$/.exec(request.get("host") ?? "")?.[1] ?? 0)
    const isSecure = Boolean((request.raw.socket as { encrypted?: boolean }).encrypted)
    if (request.path === NAMES_API) return void reply.noStore().json(await this.names(port, isSecure))
    const checkout = this.checkoutNamed(named.name)
    const isPage = request.method === "GET" && /text\/html/.test(request.get("accept") ?? "")
    if (!checkout) {
      if (isPage) return this.sendNamesPage(reply, { name: named.name, state: "unknown" })
      return void reply.status(404).type("text/plain; charset=utf-8").send(`no worktree named ${named.name}`)
    }
    const isOwnFile = !isPage && this.mainServes(request.path)
    const target = await this.targetOf(checkout, named.isEditor, { wait: !isPage && !isOwnFile })
    // the names page's own files (Spell UI), while the worktree starts:  main's
    if (target === undefined && isOwnFile) return next()
    if (target === undefined) {
      if (isPage) return this.sendNamesPage(reply, { name: named.name, state: "starting" })
      return void reply.status(503).type("text/plain; charset=utf-8").send(`${named.name} is still starting`)
    }
    asOwnOrigin(request.raw, target)
    await proxyTo(() => target)(request, reply, next)
  }

  /** whether a websocket upgrade is a named host's (`WebServer.upgrade()`'s claim) */
  claimsUpgrade = (request: Request): boolean => HostRoutes.nameOf(request.get("host")) !== undefined

  /** a named host's websocket upgrade, passed on;  a worktree not running or unknown:  refused */
  upgrade = async (raw: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> => {
    const named = HostRoutes.nameOf(new Request(raw).get("host"))
    const checkout = named && this.checkoutNamed(named.name)
    const target = checkout && (await this.targetOf(checkout, named.isEditor, { wait: true }))
    if (!target) return void socket.destroy()
    asOwnOrigin(raw, target)
    proxyUpgrade(raw, socket, head, target)
  }

  /**
   * The port a worktree's page server (or editor) answers on;  not answering, its start asked for, then:
   * - `wait`:  waited for, at most `waitMs`;  `undefined` if it didn't come
   * - else `undefined` at once:  the caller shows that it's starting
   */
  async targetOf(checkout: string, isEditor: boolean, { wait }: { wait: boolean }): Promise<number | undefined> {
    const answering = async () => {
      const port = this.portOf(checkout, isEditor)
      return port !== undefined && (await isAnswering(port)) ? port : undefined
    }
    const now = await answering()
    if (now !== undefined) return now
    this.startOnce(checkout)
    if (!wait) return undefined
    const until = Date.now() + this.waitMs
    while (Date.now() < until) {
      await new Promise((done) => setTimeout(done, POLL_MS))
      const port = await answering()
      if (port !== undefined) return port
    }
    return undefined
  }

  /**
   * the port a worktree's page server (or editor) keeps:  the one written down for it (`PortBook`), else the one its
   * record names (a server started before the book, on any free port)
   */
  portOf(checkout: string, isEditor: boolean): number | undefined {
    const booked = this.book.portsOf(checkout)[isEditor ? "editor" : "page server"]
    if (booked !== undefined) return booked
    if (!isEditor) return PidFile.forPageServer(checkout).read()?.port
    const address = editorAddressOf(checkout)
    return address ? Number(new URL(address).port) || undefined : undefined
  }

  /** its start asked for, once while one is under way.  NEVER throws:  a failed start is logged */
  private startOnce(checkout: string): void {
    if (this.starting.has(checkout)) return
    const started = this.start(checkout)
      .catch((error: unknown) => console.error(`page server:  couldn't start ${checkout}'s servers by name:`, error))
      .finally(() => this.starting.delete(checkout))
    this.starting.set(checkout, started)
  }

  /** the names page:  a worktree starting, or a name nobody has (the list) */
  private sendNamesPage(reply: Parameters<Handler>[1], state: { name: string; state: "starting" | "unknown" }): void {
    const config = { ...state, ...(this.uiScript && { uiScript: this.uiScript }) }
    const page = readFileSync(join(HERE, "names.html"), "utf8")
      .replace(
        CONFIG_MARK,
        `<script>window.SPELL_NAMES = ${JSON.stringify(config).replaceAll("<", "\\u003c")}</script>`
      )
      .replace(SCRIPT_MARK, `<script type="module">${readFileSync(join(HERE, "names.js"), "utf8")}</script>`)
    reply
      .status(state.state === "unknown" ? 404 : 503)
      .type("text/html; charset=utf-8")
      .noStore()
      .send(page)
  }
}

/** A worktree as the names page lists it (`NAMES_API`). */
export type NamedWorktree = { name: string; worktree: string; address: string; editor: string; running: boolean }

/** The names page's call, on any named host:  every worktree and how it stands. */
export const NAMES_API = "/_spell/names"

/** What every name ends in. */
const LOCALHOST = ".localhost"

/** A named host:  `<name>[--app].localhost[:port]`, its name letters, digits and dashes. */
const NAMED_HOST = /^([a-z0-9](?:[a-z0-9-]*?[a-z0-9])?)(--app)?\.localhost(?::\d+)?$/i

/** How long a request that isn't a page waits for a worktree's server to start, ms:  a cold start builds its bundles. */
const START_WAIT_MS = 90_000

/** How often a waiting request looks again, ms. */
const POLL_MS = 500

/** This folder:  the names page's files are beside this one. */
const HERE = dirname(fileURLToPath(import.meta.url))

/** Where the names page's settings and script go. */
const CONFIG_MARK = "<!-- names settings -->"
const SCRIPT_MARK = "<!-- names script -->"

/**
 * SIDE EFFECT:  a same-origin request's `Origin` (`http://editor.localhost:4747`) made the worktree server's own
 * (`http://127.0.0.1:<port>`), so its guard takes the page's writes;  any other origin is left, and refused there
 */
function asOwnOrigin(raw: IncomingMessage, port: number): void {
  const origin = raw.headers.origin
  const host = raw.headers.host ?? raw.headers[":authority"]
  if (!origin || typeof host !== "string") return
  try {
    if (new URL(origin).host === host) raw.headers.origin = `http://127.0.0.1:${port}`
  } catch {
    // not an address:  left for the server behind to refuse
  }
}

/** whether something listens on `port` on this machine.  NEVER throws */
function isAnswering(port: number): Promise<boolean> {
  return new Promise((done) => {
    const socket = connect(port, "127.0.0.1")
    const end = (isUp: boolean) => {
      socket.destroy()
      done(isUp)
    }
    socket.setTimeout(500, () => end(false))
    socket.once("connect", () => end(true))
    socket.once("error", () => end(false))
  })
}
