/**
 * Start, stop and restart the recipe box demo's servers from its page:  a ROUTE MODULE of the kit's page server (epic `data` I21).
 * - Starting needs something already running, so this can't live in the recipe servers:  the page server is always up.
 * - `GET /api/recipe-servers`:  whether they're running, and where;  `POST .../start`, `.../stop`, `.../restart`, behind `Guard`.
 * - ONE fixed command, the kit's `scripts/recipe-servers.ts`, run from the page server's own checkout.
 *   Nothing in a request says what to run:  no body is read.
 * - Registers nothing where that script isn't there:  a published kit has no demo.
 * - Node only;  a demo's, as `recipeDemo.ts` is.  Loaded by path:  nothing imports it but the script, for its constants.
 */
import { spawn } from "node:child_process"
import { closeSync, existsSync, openSync, readFileSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { SRV } from "spell/server"
import type { RouteModule } from "spell/server/page"

/** Where the recipe servers listen:  the demo's pages and examples name it. */
export const RECIPE_SERVERS_PORT = 4791

/** The folder they keep their recipes in, unless they're told another:  its CSV file is beside it, with `.csv`. */
export const RECIPE_SERVERS_FOLDER = join(tmpdir(), "spell-recipe-box")

/** What they print once every address answers. */
export const RECIPE_SERVERS_READY = "the recipe servers are ready"

/** The environment variable naming the process that started them:  they end when it does. */
export const RECIPE_SERVERS_PARENT = "RECIPE_SERVERS_PARENT"

/** The one command, from the checkout's root. */
const SCRIPT = "scripts/recipe-servers.ts"

/** Where this module answers. */
const API = "/api/recipe-servers"

/** How long they may take to start, in ms. */
const START_WAIT_MS = 30_000

/** How long they may take to stop before they're made to, in ms. */
const STOP_WAIT_MS = 5_000

/** What the page's told. */
export type RecipeServersStatus = {
  /** Running;  stopped;  or their port is held by something else. */
  state: "running" | "stopped" | "taken"
  /** Their port. */
  port: number
  /** The checkout these buttons run them from. */
  checkout: string
  /** Where the running ones were started from, if it can be told. */
  runningFrom?: string
  /** The CSV file they use when started here. */
  csvFile: string
  /** The folder they use when started here. */
  folder: string
}

/****************
 * ### `RecipeServersControl`
 * The recipe servers, as one process to start and stop.
 * - It finds them by asking what's running, not by remembering:  ones started by hand, or by an earlier page server, can be stopped too.
 * - It only ever ends a process running that script AND listening on that port.  Anything else on the port is said, by port, and left alone.
 * - One thing at a time:  a press during another waits its turn.
 * - NO ORPHANS:  what it starts is told its parent (`RECIPE_SERVERS_PARENT`), and ends when that does, however it ended.
 *   So a page server's restart stops them too, and the page says Stopped.
 ****************/
export class RecipeServersControl {
  /** The checkout. */
  private readonly root: string
  /** Their port. */
  private readonly port: number
  /** What it's doing now. */
  private turn: Promise<unknown> = Promise.resolve()

  constructor({ root, port = RECIPE_SERVERS_PORT }: RecipeServersControlProps) {
    this.root = root
    this.port = port
  }

  /** Where they stand.  - NEVER throws */
  async status(): Promise<RecipeServersStatus> {
    const here = {
      port: this.port,
      checkout: this.root,
      csvFile: `${RECIPE_SERVERS_FOLDER}.csv`,
      folder: RECIPE_SERVERS_FOLDER
    }
    if (await SRV.isFree(this.port)) return { ...here, state: "stopped" }
    const pid = this.listener()
    if (pid === undefined) return { ...here, state: "taken" }
    const runningFrom = SRV.Processes.folderOf([pid]).get(pid)
    return { ...here, state: "running", ...(runningFrom && { runningFrom }) }
  }

  /** Start them, unless they're running.  - throws `HttpError` 409 if the port's taken, 500 if they don't come up */
  start(): Promise<RecipeServersStatus> {
    return this.inTurn(() => this.startNow())
  }

  /** Stop them.  - throws `HttpError` 409 if the port's held by something else */
  stop(): Promise<RecipeServersStatus> {
    return this.inTurn(() => this.stopNow())
  }

  /** Stop them, put the recipes back to the first ones, and start them.  - throws as `start()` and `stop()` do */
  restart(): Promise<RecipeServersStatus> {
    return this.inTurn(async () => {
      await this.stopNow()
      for (const each of [RECIPE_SERVERS_FOLDER, `${RECIPE_SERVERS_FOLDER}.csv`])
        rmSync(each, { recursive: true, force: true })
      return this.startNow()
    })
  }

  /** Run `work` after what's before it. */
  private inTurn(work: () => Promise<RecipeServersStatus>): Promise<RecipeServersStatus> {
    const result = this.turn.then(work)
    this.turn = result.catch(() => {})
    return result
  }

  /** The process running the script and listening on the port. */
  private listener(): number | undefined {
    const running = [...SRV.Processes.table({ args: true })].filter(([, { command }]) => command.includes(SCRIPT))
    const ports = SRV.Processes.portsOf(running.map(([pid]) => pid))
    return [...ports].find(([, port]) => port === this.port)?.[0]
  }

  /** - throws `HttpError` 409:  naming the port */
  private refuseIfTaken({ state }: RecipeServersStatus): void {
    if (state !== "taken") return
    throw new SRV.HttpError(
      409,
      `Port ${this.port} is taken by another process, not the recipe servers:  it's left alone.`
    )
  }

  private async startNow(): Promise<RecipeServersStatus> {
    const status = await this.status()
    this.refuseIfTaken(status)
    if (status.state === "running") return status
    const log = `${RECIPE_SERVERS_FOLDER}.log`
    const output = openSync(log, "w")
    const child = spawn(process.execPath, [createRequire(join(this.root, "package.json")).resolve("tsx/cli"), SCRIPT], {
      cwd: this.root,
      // not the server's `TSX_TSCONFIG_PATH`:  it runs as it does at the kit's root, by hand
      env: { ...process.env, TSX_TSCONFIG_PATH: undefined, [RECIPE_SERVERS_PARENT]: `${process.pid}` },
      stdio: ["ignore", output, output],
      detached: true
    })
    closeSync(output)
    child.unref()
    let isOver = false
    child.once("exit", () => (isOver = true))
    child.once("error", () => (isOver = true))
    const deadline = Date.now() + START_WAIT_MS
    while (!isOver && Date.now() < deadline) {
      if (readFileSync(log, "utf8").includes(RECIPE_SERVERS_READY)) return this.status()
      await new Promise((done) => setTimeout(done, 100))
    }
    if (!isOver) child.kill()
    throw new SRV.HttpError(500, `The recipe servers didn't start;  what they said is in ${log}`)
  }

  private async stopNow(): Promise<RecipeServersStatus> {
    const status = await this.status()
    this.refuseIfTaken(status)
    const pid = this.listener()
    if (pid !== undefined) await SRV.endProcess(pid, STOP_WAIT_MS)
    return this.status()
  }
}

/** Constructor props of a `RecipeServersControl`. */
export type RecipeServersControlProps = {
  /** The checkout to run them from. */
  root: string
  /** Their port. */
  port?: number
}

const recipeServersRoutes: RouteModule = {
  name: "recipe-servers",
  setup({ root, router, guard }) {
    if (!existsSync(join(root, SCRIPT))) return
    const control = new RecipeServersControl({ root })
    router.get(API, async (_request, reply) => void reply.json(await control.status()))
    router.post(`${API}/start`, guard.writeCheck, async (_request, reply) => void reply.json(await control.start()))
    router.post(`${API}/stop`, guard.writeCheck, async (_request, reply) => void reply.json(await control.stop()))
    router.post(`${API}/restart`, guard.writeCheck, async (_request, reply) => void reply.json(await control.restart()))
  }
}

export default recipeServersRoutes
