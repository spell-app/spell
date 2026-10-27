import { AGENTS_API, AGENTS_FILE, agentsOf, type RunningAgent, type ServerLinkOptions } from "./review.types"
import { PageStore } from "./PageStore"
import { ServerLink } from "./ServerLink"

/****************
 * ### `AgentsClient`
 * An epic page's RUNNING AGENTS, as the page sees them (epic `skillz` P3):  the epic's list.
 * - read from and written to the page server's agents routes (`src/tools/agentRoutes.ts`)
 * - one client per page (`forPage()`), a `PageStore` the panel follows (`subscribe()`)
 * - `<epic-page>` draws its "Agents running" panel from it (`<epic-agents>`)
 *
 * - LISTED only when the page is an epic page served with a token, and the list answers (`listed`):
 *   never from `file://`, nor from a server without the route
 * - every reply is the whole list:  a redirect's answer replaces what's shown
 * - a REDIRECT:  Owen's note to one agent (`POST redirect { page, name, note }`), written through its `ServerLink`
 *   (the token, and its one refresh when the page server restarted)
 * - it re-reads the list (`watch()`, as the review inbox does):
 *   - every `REVIEW_POLL_MS` while the page is visible
 *   - when the page becomes visible
 *   - when the page server says the list's file changed (`agents.json5`, beside the epic page)
 * - Node-safe at import, and without `watch()`:  no `window` / `document` touched;
 *   `fetch` comes in through `ServerLinkOptions`, so tests stub it
 * - Position in the import graph:  its peers (types, `ServerLink`, `PageStore`) only.
 *   NEVER imports Solid, Spell UI or the `spell-epic` barrel:  the panel bridges its changes (`subscribe()`)
 *   into its own signal.
 ****************/
export class AgentsClient extends PageStore {
  /** The running agents as last read or written, oldest first. */
  agents: RunningAgent[] = []

  /** Served with a token, and the list answered:  the panel shows while an agent runs. */
  listed = false

  /** The page server, as the list is written to it:  the write token, its refresh, the watch. */
  private readonly link: ServerLink

  /** Redirects in flight:  a poll's answer can't overwrite what they're about to. */
  private writing = 0

  /** `start()`'s promise:  one start per client. */
  private starting: Promise<boolean> | undefined

  constructor(private readonly options: ServerLinkOptions) {
    super()
    this.link = new ServerLink(options)
  }

  ////////////////
  // ## The page's client
  ////////////////

  /**
   * The page's client, made and started on the first call (browser only), and `watch()`ing the page once listed.
   * - SIDE EFFECT:  the first call reads the list and starts polling
   * - a test hands it its own (`adopt()`)
   */
  static forPage(): AgentsClient {
    return AgentsClient.onePerPage(() => {
      const client = new AgentsClient(ServerLink.pageOptions())
      void client
        .start()
        .then((listed) => listed && client.watch(window))
        .catch((error: unknown) => console.error("AgentsClient:  couldn't start", error))
      return client
    })
  }

  ////////////////
  // ## Start and refresh
  ////////////////

  /**
   * Read the list;  if it answers, the page is listed.
   * - true when listed
   * - once per client
   * - only an epic page served with a token (`ServerLink.servesPlanDoc`):  else it never asks
   * - NEVER throws
   */
  start(): Promise<boolean> {
    this.starting ??= this.begin()
    return this.starting
  }

  /** `start()`'s work. */
  private async begin(): Promise<boolean> {
    if (!this.link.servesPlanDoc || !(await this.load())) return false
    this.listed = true
    this.changed()
    return true
  }

  /** Keep the list fresh on `window`'s page (`ServerLink.watch()`, on `agents.json5`).  Returns the undo. */
  watch(window: Window): () => void {
    const listFile = this.link.file.replace(/[^/]*$/, AGENTS_FILE)
    return ServerLink.watch(window, listFile, () => void this.refresh())
  }

  /**
   * Read the list again (a poll, the page server's word) unless a redirect is in flight;  true when it answered.
   * - NEVER throws
   */
  async refresh(): Promise<boolean> {
    if (this.writing) return false
    const read = await this.load()
    if (read) this.changed()
    return read
  }

  ////////////////
  // ## Redirect
  ////////////////

  /**
   * Send Owen's `note` to running agent `name` (`POST redirect`).
   * - it waits in the list, untold, until a session passes it on
   * - the reply, the list after, is shown
   * - throws a `ServerWriteError` saying why, for people:  an empty or long note, an agent gone, no server
   */
  async redirect(name: string, note: string): Promise<void> {
    this.writing++
    try {
      this.agents = agentsOf(await this.link.post(`${AGENTS_API}/redirect`, { page: this.options.page, name, note }))
    } finally {
      this.writing--
    }
    this.changed()
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Read the list;  true when it answered (a redirect in flight wins:  its answer is newer). */
  private async load(): Promise<boolean> {
    try {
      const reply = await this.link.getForPage<unknown>(AGENTS_API)
      if (reply === undefined) return false
      const read = agentsOf(reply)
      if (!this.writing) this.agents = read
      return true
    } catch {
      return false
    }
  }
}
