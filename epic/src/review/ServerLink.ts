import { $fetch } from "spell/util/spell/$fetch"
import { MissingResourceError, ResponseError } from "spell/util/spell/ResponseErrors"

import {
  PLAN_DOC_PAGE,
  REVIEW_POLL_MS,
  SAGA_PAGE,
  SERVER_INFO,
  ServerWriteError,
  type ServerInfo,
  type ServerLinkOptions
} from "./review.types"

/****************
 * ### `ServerLink`
 * A page's LINK to the page server:  EVERY read, write and poll of the epic pages and the docs pages goes through one
 * (epic `coherence` C9).
 * - the review inbox's (`ReviewClient`), the running agents' (`AgentsClient`), the answer pages' forms (`AnswerForm`,
 *   `ChoicesForm`, `RunForm`), the epic page's own reads, the docs pages' comments and the syntax page
 * - served?  `isServed`:  a page the page server served, with its token, never from `file://`;
 *   `ServerLink.isServed()` for a page with no link of its own
 * - reads:  `get()`, over the kit's `$fetch()`:  a missing file or route (404) answers its `missing` default,
 *   any other failure throws a `ResponseError`;  no caller checks a response itself
 * - writes:  `post()`, with the server's write token (`x-server-token`, `SRV.Guard`);  a 403 on the token (the page
 *   server restarted since the page loaded) takes the server's new token from the page as it's served now, and
 *   tries once more, so nothing typed is refused for a restart
 *   - "as it's served now":  loaded in a hidden frame with no scripts (`readInFrame()`), as a page is served to the
 *     browser;  a script's `fetch()` of it gets the file as is, without the token (epic `epic-engine` P15:  until
 *     then, no refresh ever worked in a browser, and every write after a restart was refused)
 * - keeping fresh:  `watch()`, the poll, the page becoming visible, and the page server's word that a file changed
 *   (the files a caller cares about:  a name, or a test of the path)
 * - Node-safe at import, and without `watch()` / `pageOptions()`:  no `window` / `document` touched;  `fetch` comes
 *   in through `ServerLinkOptions`, so tests stub it
 * - Position in the import graph:  its peer types file only.  NEVER imports Solid, Spell UI or the `spell-epic` barrel.
 ****************/
export class ServerLink {
  /** The page server's info, a copy:  its token is replaced when the server restarts (`refreshToken()`). */
  readonly info: ServerInfo | undefined

  constructor(private readonly options: ServerLinkOptions) {
    this.info = options.server ? { ...options.server } : undefined
  }

  /** The page's own link, once made. */
  private static current: ServerLink | undefined

  /**
   * The page's own link, made on the first call (browser only):  for a page's reads and writes that belong to no
   * client of their own (`<epic-page>`'s See Also, a saga page's cards, the docs pages' comments, the syntax page).
   * - one per page, so its token refresh after a restart serves them all
   */
  static forPage(): ServerLink {
    ServerLink.current ??= new ServerLink(ServerLink.pageOptions())
    return ServerLink.current
  }

  /** The page's facts and `fetch`, as the browser has them (browser only):  `window.SPELL_SERVER`'s info. */
  static pageOptions(): ServerLinkOptions {
    return {
      page: location.pathname,
      server: (window as { SPELL_SERVER?: ServerInfo }).SPELL_SERVER,
      protocol: location.protocol,
      // late-bound:  the page's `fetch` as it is at each call (a test stubs it)
      fetch: (input, init) => window.fetch(input, init),
      readServed: (page) => ServerLink.readInFrame(window.document, page)
    }
  }

  /**
   * Page `page` as the page server serves it to the browser now (its `window.SPELL_SERVER` injected):  loaded in a
   * hidden frame in `document`, its scripts off, then read and dropped.
   * - its own address (`?spell-token=<now>`):  a browser won't frame a page inside itself
   * - throws when it doesn't load in `timeout` ms, or loads as an error page (no server):  not readable
   */
  static readInFrame(document: Document, page: string, timeout = FRAME_TIMEOUT_MS): Promise<string> {
    return new Promise((done, fail) => {
      const frame = document.createElement("iframe")
      // same origin, so it can be read;  no `allow-scripts`, so nothing on it runs
      frame.setAttribute("sandbox", "allow-same-origin")
      frame.setAttribute("aria-hidden", "true")
      frame.hidden = true
      const finish = (read: () => string) => {
        clearTimeout(timer)
        try {
          done(read())
        } catch (failure) {
          fail(failure as Error)
        } finally {
          frame.remove()
        }
      }
      const notLoaded = (): string => {
        throw new Error("the page didn't load")
      }
      const timer = setTimeout(() => finish(notLoaded), timeout)
      frame.addEventListener("load", () => {
        // the empty document a frame starts with:  the page is still to come
        if (frame.contentDocument?.URL === "about:blank") return
        finish(() => frame.contentDocument!.documentElement.outerHTML)
      })
      frame.src = `${page}${page.includes("?") ? "&" : "?"}spell-token=${Date.now()}`
      document.body.append(frame)
    })
  }

  /**
   * Was this page served by the page server, with its write token, and not opened from `file://`?
   * - `server`, `protocol`:  the page's (`window.SPELL_SERVER`, `location.protocol`);  default this browser's
   * - the ONE test:  off the page server, a page reads and writes nothing (it says so, or keeps its draft in the browser)
   */
  static isServed(
    server: { token?: string } | undefined = (globalThis as { SPELL_SERVER?: ServerInfo }).SPELL_SERVER,
    protocol: string | undefined = globalThis.location?.protocol
  ): boolean {
    return !!server?.token && ServerLink.canRead(protocol)
  }

  /**
   * Can this page READ from a server:  anything but `file://`.  A GET needs no token, so a page asks even when the
   * page server didn't serve it the write token (a test page, a plain static server).
   */
  static canRead(protocol: string | undefined = globalThis.location?.protocol): boolean {
    return protocol !== "file:"
  }

  /** Was this link's page served by the page server (`ServerLink.isServed()`)? */
  get isServed(): boolean {
    return ServerLink.isServed(this.info, this.options.protocol)
  }

  /**
   * Do the page server's epic-page routes answer this page?  An epic page's own path (`PLAN_DOC_PAGE`:  any other page
   * gets a 403), served with a token, never from `file://`.  Else a client never asks.
   */
  get servesPlanDoc(): boolean {
    return this.isServed && PLAN_DOC_PAGE.test(this.options.page)
  }

  /**
   * Do the page server's REVIEW routes answer this page?  An epic page, as `servesPlanDoc`, or a saga page's own path
   * (`SAGA_PAGE`, epic `epic-workflow` P15):  its marks and comments wait in its own inbox.
   */
  get servesReviews(): boolean {
    if (this.servesPlanDoc) return true
    return this.isServed && SAGA_PAGE.test(this.options.page)
  }

  /** The page's file, as the page server announces changes (`spell-server:changed`'s `path`). */
  get file(): string {
    return this.info?.file ?? this.options.page
  }

  /**
   * GET route `url` as JSON (`$fetch()`, never from the browser's cache);  `query`:  its query, e.g. `{ page }`.
   * - `missing`:  what a 404 answers (no such file, a route an older server lacks), and what a page from `file://`
   *   answers without asking (`canRead()`);  default `undefined`
   * - throws any other failure as `$fetch()` does:  a `ResponseError` (`OfflineError`, a 500's ...), its message the
   *   route's own `error` when it said one;  a caller that shows nothing on one says so, `.catch(() => missing)`
   */
  async get<T>(
    url: string,
    { query, missing }: { query?: Record<string, string>; missing?: T } = {}
  ): Promise<T | undefined> {
    if (!ServerLink.canRead(this.options.protocol)) return missing
    try {
      // the query in the caller's order:  `$fetch()`'s own sorts its keys
      const search = query && new URLSearchParams(query).toString()
      const reply = await $fetch<T>({
        url,
        query: search,
        format: "json",
        cache: "no-store",
        fetch: this.options.fetch
      })
      return reply ?? missing
    } catch (failure) {
      if (failure instanceof MissingResourceError) return missing
      if (failure instanceof ResponseError) failure.message = routeError(failure.message) ?? failure.message
      throw failure
    }
  }

  /** GET route `url` for this link's page (`?page=`), as `get()` does. */
  getForPage<T>(url: string, { missing }: { missing?: T } = {}): Promise<T | undefined> {
    return this.get(url, { query: { page: this.options.page }, missing })
  }

  /**
   * POST `body` as JSON to route `url`, with the write token;  returns the reply.
   * - a 403 on the token:  takes the server's new token (`refreshToken()`) and tries once more
   * - throws a `ServerWriteError` saying why, for people:  the route's `error`, a stale token, no server
   */
  async post(url: string, body: object, { keepalive = false }: { keepalive?: boolean } = {}): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      let response: Response
      try {
        response = await this.options.fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-server-token": this.info?.token ?? "" },
          body: JSON.stringify(body),
          keepalive
        })
      } catch (failure) {
        throw new ServerWriteError(`couldn't reach the page server (${(failure as Error).message})`)
      }
      const reply = (await response.json().catch(() => ({}))) as { error?: string }
      if (response.ok) return reply
      const stale = response.status === 403 && /token/i.test(reply.error ?? "")
      if (stale && attempt === 0 && (await this.refreshToken())) continue
      throw new ServerWriteError(
        stale
          ? "the page server restarted since this page loaded:  reload the page"
          : (reply.error ?? `couldn't save (${response.status})`)
      )
    }
  }

  /**
   * Keep a page fresh on `window`:  `refresh()` every `every` ms while visible (default `REVIEW_POLL_MS`), when the
   * page becomes visible, and when the page server says a file it cares about changed (`spell-server:changed`, the
   * page's live client:  never a connection of our own, each holds one of Chrome's 6 per host).  Returns the undo.
   * - `files`:  the file's URL path (`/epics/x/x.inbox.json5`), or a test of each changed path (decoded);
   *   `undefined`:  none, only the poll and the page coming back into view
   * - a data file named (`<name>.json5`) by its old name too, `<name>.json`:  a checkout on older code writes that
   *   (epic `epic-workflow` P21)
   * - `every`:  `0` for no poll;  `polls`:  poll only while it answers true (a docs page's Send, while it shows)
   * - the one poll of every page (epic `coherence` C9):  a page that polls writes none of its own
   */
  static watch(
    window: Window,
    files: string | ((path: string) => boolean) | undefined,
    refresh: () => void,
    { every = REVIEW_POLL_MS, polls }: { every?: number; polls?: () => boolean } = {}
  ): () => void {
    const { document } = window
    const cares = typeof files === "function" ? files : namedFiles(files)
    const timer = every
      ? window.setInterval(() => {
          if (document.visibilityState === "visible" && (polls?.() ?? true)) refresh()
        }, every)
      : undefined
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    const onFile = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path
      if (path && cares(decodeURIComponent(path))) refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("spell-server:changed", onFile)
    return () => {
      if (timer !== undefined) window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("spell-server:changed", onFile)
    }
  }

  /**
   * Take the page server's CURRENT write token from the page as it serves it now (its `window.SPELL_SERVER`):  a
   * restarted server has a new one.  True when it changed.
   * - the page:  `readServed()` (a frame, in the browser), else `fetch()`ed
   * - NEVER throws
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const { page, readServed } = this.options
      const html = readServed
        ? await readServed(page)
        : await (await this.options.fetch(page, { cache: "no-store" })).text()
      const fresh = (JSON.parse(SERVER_INFO.exec(html)?.[1] ?? "null") as ServerInfo | null)?.token
      if (!fresh || !this.info || fresh === this.info.token) return false
      this.info.token = fresh
      return true
    } catch {
      return false
    }
  }
}

/** How long `readInFrame()` waits for the page to load, in ms. */
const FRAME_TIMEOUT_MS = 10_000

/** The `error` a route answered in its JSON body (`{ error }`, `SRV.HttpError`), or `undefined`. */
function routeError(body: string): string | undefined {
  try {
    const error = (JSON.parse(body) as { error?: unknown } | null)?.error
    return typeof error === "string" ? error : undefined
  } catch {
    return undefined
  }
}

/** `watch()`'s test for file `file`:  it, or its old `.json` name;  none for `undefined`. */
function namedFiles(file: string | undefined): (path: string) => boolean {
  if (!file) return () => false
  const names = [file, file.replace(/\.json5$/, ".json")]
  return (path) => names.includes(path)
}
