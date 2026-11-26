import { spawn } from "node:child_process"
import { mkdirSync, openSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { waitUntil } from "spell/util/timing"
import { SRV } from "spell/server"

import { KeeperList } from "./KeeperList"
import { ServerKeeper } from "./ServerKeeper"
import { DEFAULT_KEEPER_PORT, KEEPER_LOG_FILE, SPELL_KEEPER } from "./keeper.types"

/****************
 * ### `KeeperProgram`
 * Spell's server keeper as a program of its own, `spell keeper` (epic `editor` P48):  a small web server for the
 * keeper's calls (`ServerKeeper.route()`), the keeper, and its record.
 * - `run()`:  in this process, until it's stopped or another keeper takes over (`spell keeper local`)
 * - `start()`:  in the background, its output in `~/.spell/keeper.log`, taking over from whichever keeper holds the
 *   record (`spell keeper start`)
 * - `ensure()`:  `start()` only when no keeper runs;  the epic hub's keeper counts, unless `takeOver`
 *   (`spell keeper ensure`, which every `spell` command runs, detached)
 * - It names no command line:  the caller hands the one that runs `spell keeper local` (`command`), since only the
 *   CLI knows where its bin is
 ****************/
export class KeeperProgram {
  /** the keeper's home:  its record's folder, its list, its log */
  readonly home: string

  /** the command line that runs `spell keeper local`:  the program, then its arguments */
  readonly command: string[]

  /** - `home`:  default `SRV.keeperHome()` */
  constructor({ home = SRV.keeperHome(), command }: { home?: string; command: string[] }) {
    this.home = home
    this.command = command
  }

  /** the keeper in charge, from its record;  none:  `undefined` */
  static running(): SRV.KeeperRecord | undefined {
    return new SRV.KeeperLink().running()
  }

  /**
   * Run the keeper in this process:  its server listening (`port`, else any free one), the record taken over, every
   * server looked at.  Resolves once it listens;  the process runs on.
   * - another keeper taking the record later:  this one stops, and the process ends
   * - its code changing under it (main moved):  a fresh one started (`start()`), which takes over
   */
  async run({ port = DEFAULT_KEEPER_PORT }: { port?: number } = {}): Promise<ServerKeeper> {
    const web = new SRV.WebServer({ root: this.home })
    const started = Date.now()
    const keeper: ServerKeeper = new ServerKeeper({
      home: this.home,
      onStale: () => void this.start().catch((error: unknown) => console.error("server keeper:  no fresh one", error)),
      onStepAside: () => {
        keeper.stop()
        void web.close().finally(() => process.exit(0))
      }
    })
    keeper.route(web.router, web.guard)
    const { url } = await web.listen({ port, fallback: true })
    console.log(`server keeper:  listening at ${url}, keeping ${new KeeperList({ home: this.home }).file}`)
    for (const signal of ["SIGINT", "SIGTERM"] as const)
      process.once(signal, () => {
        keeper.stop()
        void web.close().finally(() => process.exit(0))
      })
    keeper.start({
      base: url,
      token: web.guard.token,
      takeOver: true,
      isStale: () => SRV.newestChange([CODE_FOLDER]) > started
    })
    return keeper
  }

  /**
   * Start a keeper in the background, and wait until its record names it;  that record.
   * - it takes over from whichever keeper holds the record, which then stops keeping
   * - throws `Error` when none came up in `START_WAIT_MS`, naming the log
   */
  async start(): Promise<SRV.KeeperRecord> {
    const before = KeeperProgram.running()?.pid
    mkdirSync(this.home, { recursive: true })
    const log = join(this.home, KEEPER_LOG_FILE)
    const out = openSync(log, "a")
    const [program, ...args] = this.command
    const child = spawn(program!, args, { detached: true, stdio: ["ignore", out, out], env: process.env })
    child.unref()
    const record = await waitUntil(
      () => {
        const now = KeeperProgram.running()
        return now && now.pid !== before && now.keeper === SPELL_KEEPER ? now : undefined
      },
      { timeout: START_WAIT_MS / 1000, every: 0.2 }
    )
    if (!record) throw new Error(`the server keeper didn't start:  see ${log}`)
    return record
  }

  /**
   * Start one only when no keeper is in charge;  the one in charge, and whether it was started now.
   * - the epic hub's keeper counts as one, unless `takeOver`:  then only Spell's own does
   */
  async ensure({ takeOver = false }: { takeOver?: boolean } = {}): Promise<{
    record: SRV.KeeperRecord
    started: boolean
  }> {
    const running = KeeperProgram.running()
    if (running && (!takeOver || running.keeper === SPELL_KEEPER)) return { record: running, started: false }
    return { record: await this.start(), started: true }
  }
}

/** The keeper's code:  `src/server/`, whose change makes a running keeper hand over to a fresh one. */
const CODE_FOLDER = dirname(dirname(fileURLToPath(import.meta.url)))

/** How long `start()` waits for the new keeper's record, ms:  a cold `tsx` start. */
const START_WAIT_MS = 30_000
