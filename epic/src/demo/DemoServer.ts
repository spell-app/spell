import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import type { SRV } from "spell/server"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicServer } from "spell/epic/server/EpicServer"
import { repoPrefixFor } from "spell/epic/server/server.types"
import { ReviewStart, type StartResult, type WakeResult } from "spell/epic/tool/ReviewStart"

/****************
 * ### `DemoServer`
 * The demo checks' page server (`check-*-epics.mjs`):  spell-epic's `EpicServer`, of THIS checkout's code,
 * over a SCRATCH epic folder, that never reaches outside the check (epic `epic-engine` I11).
 *
 * ```js
 * const demo = await DemoServer.start({ content: join(HERE, "shots") })
 * await page.goto(`${demo.base}/epics/review-sample/review-sample.plan.html`)
 * demo.wakes   // => ["review-sample"]:  a Send nobody listened to
 * await demo.stop()
 * ```
 *
 * - its one repo, `demo`, is this checkout, its epic folder `content`:
 *   - a copy at `<content>/epics/<name>/<name>.plan.html` is served at `/epics/<name>/<name>.plan.html`,
 *     so its links (`../../guides/...`) lead where a real page's do
 *   - the real epic folder's other folders (`guides`, `pages`, `brand` ...) are served beside the copies, at
 *     their own prefixes (`/guides/` ...):  NEVER its `epics`
 *     - mounted, not linked into `content`:  a link there would put the real pages under `src/`, for `tsc` and the
 *       linter to walk
 *   - the route modules are this checkout's, set up for it (`EpicServer`'s `ROUTE_MODULES`)
 *   - the bundles as they are on disk (`yarn pack:build`, `spell bundle --stale` first):  it builds none
 *     (`EpicServer`'s `bundles: false`, epic `epic-engine` I186)
 *     - a build in the background, as the real server's, finished mid-check:  live reload reloaded the pages under
 *       it, and the steps it was in the middle of failed one run in two;  and it wrote committed generated files
 *       from whatever was half-edited in the checkout
 *   - and live reload follows the copies only, never the code (`watchCode: false`):  the checkout's own page server
 *     rebuilds its bundles as its sources change (epic `epic-engine` P54), which reloaded the pages too
 * - NOTHING outside the check is touched:
 *   - a wake (Send or its countdown with nobody listening) never types into a window, opens a session or
 *     launches one:  `ReviewStart`'s `wake()` is stubbed, recording the epic in `wakes`, and answering what a
 *     machine with no VS Code window would (`no-vscode`);  the review pill's `start()` likewise (`starts`)
 *   - a DOCS page's wake (`wakeFor()`) too, before it claims the wake in the epic's inbox:  the comments routes find
 *     a docs page's epic through this checkout's REAL epic folder (its owner, or the standing `feedback`, epic
 *     `epic-engine` T9), whose inbox a check must never write
 *   - and in case the stub misses, the window registries are an empty folder of its own
 *     (`SPELL_EPIC_WINDOWS_DIR`, `SPELL_WINDOWS_DIR`)
 *   - airplane mode is off, whatever this machine's switch says (`SPELL_AIRPLANE_FILE`, a file that isn't there):
 *     the pages say "nobody is listening", never "queued for when you land"
 *   - spell-epic's home folder is its own (`SPELL_EPIC_HOME`):  no pid file, no repo list read
 * - write the copies BEFORE `start()`:  it waits a moment for their file events (`SETTLE_MS`), so no page it serves
 *   reloads for them
 * - SIDE EFFECT:  sets those env vars for this process, and stubs `ReviewStart` for it, until `stop()`
 ****************/
export class DemoServer {
  /** the server underneath */
  readonly server: EpicServer

  /** its address, `http://127.0.0.1:<port>` */
  readonly base: string

  /** the epics a wake was asked for, in order */
  readonly wakes: string[]

  /** the epics the review pill asked to start */
  readonly starts: string[]

  /** the scratch folder:  the empty window registry, the home folder */
  private readonly scratch: string

  /** what `stop()` puts back */
  private readonly restore: () => void

  private constructor(fields: {
    server: EpicServer
    wakes: string[]
    starts: string[]
    scratch: string
    restore: () => void
  }) {
    this.server = fields.server
    this.base = `http://127.0.0.1:${fields.server.info.port}`
    this.wakes = fields.wakes
    this.starts = fields.starts
    this.scratch = fields.scratch
    this.restore = fields.restore
  }

  /**
   * Serve `content` (made if missing) on a free port near `port`, the real epic folder's folders beside it;
   * the server, its address, and what it was asked to wake.
   */
  static async start({
    content,
    port = 47_600 + Math.floor(Math.random() * 300),
    epicUi,
    mounts = []
  }: {
    content: string
    port?: number
    /** the folder to serve at `/components/epics/`:  a check's scratch copy of `src/docs/` (`EpicServer`'s `epicUi`) */
    epicUi?: string
    /**
     * more folders served, before the rest:  a check's scratch copy of another component set at its address
     * (`/components/app/`), its site bundle and its pack (`check-comments-epic-ui.mjs --set app`)
     */
    mounts?: SRV.Mount[]
  }) {
    const scratch = mkdtempSync(join(tmpdir(), "epic-demo-"))
    const windows = join(scratch, "windows")
    mkdirSync(windows)
    const env = {
      SPELL_EPIC_WINDOWS_DIR: windows,
      SPELL_WINDOWS_DIR: windows,
      SPELL_AIRPLANE_FILE: join(scratch, "airplane.json"),
      SPELL_EPIC_HOME: join(scratch, "home")
    }
    const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]))
    Object.assign(process.env, env)
    const wakes: string[] = []
    const starts: string[] = []
    const { wake, wakeFor, start } = ReviewStart.prototype
    ReviewStart.prototype.wake = async (epic: string): Promise<WakeResult> => {
      wakes.push(epic)
      const command = ReviewStart.commandFor(epic)
      return { state: "no-vscode", command, sessions: [], did: "", message: `No VS Code window is open (a demo check)` }
    }
    ReviewStart.prototype.wakeFor = async function (this: ReviewStart, _planDoc: string, epic: string) {
      return this.wake(epic)
    }
    ReviewStart.prototype.start = async (epic: string): Promise<StartResult> => {
      starts.push(epic)
      const command = ReviewStart.commandFor(epic)
      return { state: "none", command, sessions: [], message: `Nothing started (a demo check)` }
    }
    const restore = () => {
      Object.assign(ReviewStart.prototype, { wake, wakeFor, start })
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }

    const folder = resolve(content)
    mkdirSync(join(folder, "epics"), { recursive: true })
    const made = new EpicServer({
      home: env.SPELL_EPIC_HOME,
      engine: ENGINE,
      repos: [{ name: "demo", checkout: ENGINE, content: folder, prefix: repoPrefixFor("demo"), isDefault: true }],
      epicUi
    })
    for (const mount of mounts) made.web.files.mount(mount)
    for (const [name, dir] of sharedFolders()) made.web.files.mount({ prefix: `/${name}/`, dir })
    const server = await made.start({ port, pidFile: false, bundles: false, watchCode: false })
    // the copies a check just wrote:  macOS reports them to the new watcher late, and live reload would reload a page
    // opened before that
    await new Promise((settled) => setTimeout(settled, SETTLE_MS))
    return new DemoServer({ server, wakes, starts, scratch, restore })
  }

  /** Stop the server, put the env and `ReviewStart` back, remove the scratch folder. */
  async stop(): Promise<void> {
    await this.server.stop()
    this.restore()
    rmSync(this.scratch, { recursive: true, force: true })
  }
}

/** How long a new server waits for the file events of what was written just before it started, in ms. */
const SETTLE_MS = 1000

/** This checkout:  `src/demo/` is two folders down. */
const ENGINE = resolve(fileURLToPath(import.meta.url), "..", "..", "..")

/**
 * The real epic folder's folders, as `[name, folder]`:  every one but `epics` (the copies') and the hidden ones,
 * served at `/<name>/` (the longest prefix wins over the epic folder's `/`).
 */
function sharedFolders(): [string, string][] {
  const real = EpicConfig.of(ENGINE).contentFolder
  if (!existsSync(real)) return []
  return readdirSync(real, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "epics" && !entry.name.startsWith("."))
    .map((entry) => [entry.name, join(real, entry.name)])
}
