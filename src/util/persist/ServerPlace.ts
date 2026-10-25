import type { PrefForgetRequest, PrefKeysAnswer, PrefLoadAnswer, PrefSaveRequest } from "./persist.types"
import { WaitedOnPlace } from "./WaitedOnPlace"

/****************
 * ### `ServerPlace`
 * A waited-on `PrefPlace` on a server:  a person's preferences follow them to every browser they use.
 * - It speaks a small protocol under its URL, `/api/prefs` by default:
 *   four requests, written out above `PrefLoadAnswer` ("The server's protocol").
 *   - spell-app's spaces answer it on the page server, keeping each store in the person's space (`__prefs/`).
 * - Values travel as JSON:  plain data only (no `Blob`, no `Date`).
 * - Each request is its own:  `PrefStore.update()` reads, then saves, one at a time in this page.
 * - NEVER throws when the server fails (offline, refused, an error):  it logs, and a read answers `undefined`.
 * - `ServerPlace.shared`:  the one on the page server's `/api/prefs`, which every store on the page uses.
 ****************/
export class ServerPlace extends WaitedOnPlace {
  readonly description = "the server"
  /** Where it asks:  `/api/prefs`, or a test server's. */
  readonly url: string

  constructor({ url = SERVER_URL, fetch }: ServerPlaceProps = {}) {
    super()
    this.url = url.replace(/\/+$/, "")
    this.fetch = fetch ?? ((input, init) => globalThis.fetch(input, init))
  }

  /**
   * The one on the page server's `/api/prefs`, made on first use.
   * - STATIC:  one server answers every store on the page.
   */
  static get shared(): ServerPlace {
    return (ServerPlace._shared ??= new ServerPlace())
  }
  private static _shared: ServerPlace | undefined

  ////////////////
  // ## Waited on
  ////////////////

  async load(store: string, key: string): Promise<unknown> {
    const answer = await this.ask<PrefLoadAnswer>("load", store, key, `load?${query({ store, key })}`)
    return answer?.value
  }

  async save(store: string, key: string, value: unknown): Promise<void> {
    const body: PrefSaveRequest = value === undefined ? { store, key } : { store, key, value }
    await this.ask<PrefLoadAnswer>("save", store, key, "save", body)
  }

  async loadKeys(store: string): Promise<string[]> {
    const answer = await this.ask<PrefKeysAnswer>("loadKeys", store, "", `keys?${query({ store, under: "" })}`)
    return answer?.keys ?? []
  }

  async removeUnder(store: string, prefix: string): Promise<void> {
    const body: PrefForgetRequest = { store, under: prefix }
    await this.ask<PrefKeysAnswer>("removeUnder", store, prefix, "forget", body)
  }

  ////////////////
  // ## Asking
  ////////////////

  /** Fetches:  `ServerPlaceProps.fetch`. */
  private fetch: typeof globalThis.fetch

  /**
   * Ask the server for `path` (under `url`):  a GET, or with `body`, a POST of it as JSON.
   * - Its answer's JSON;  a failure (offline, an error status) is logged, and answers `undefined`.
   */
  private async ask<T>(
    method: string,
    store: string,
    key: string,
    path: string,
    body?: object
  ): Promise<T | undefined> {
    try {
      const response = await this.fetch(`${this.url}/${path}`, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}:  ${await response.text()}`)
      return (await response.json()) as T
    } catch (error) {
      console.error(`ServerPlace.${method}():  ${this.url} refused \`${store}\` \`${key}\`:`)
      console.error(error)
      return undefined
    }
  }
}

/** Props for a `ServerPlace`. */
export type ServerPlaceProps = {
  /** Where to ask:  default `/api/prefs`, the page server's. */
  url?: string
  /** How to ask:  default the browser's `fetch`;  a test's stand-in. */
  fetch?: typeof globalThis.fetch
}

/** The page server's prefs:  spell-app's spaces answer it. */
const SERVER_URL = "/api/prefs"

/** `values` as a query string. */
function query(values: Record<string, string>): string {
  return new URLSearchParams(values).toString()
}
