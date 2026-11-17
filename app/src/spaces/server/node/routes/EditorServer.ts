import { spawn, type ChildProcess } from "node:child_process"
import { createWriteStream, existsSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { stripVTControlCharacters } from "node:util"

import { SRV } from "spell/server"
import environment from "spell/app/spaces/server/node/environment"
import {
  PAGE_SERVER_PREFIXES,
  SERVER_TOKEN_HEADER,
  TOKEN_PREFIXES,
  WEBSOCKET_PREFIXES
} from "spell/app/spaces/server/node/routes/editorPaths"

/**
 * The editor UI -- vite's dev server for the app's build folder, `app/` (what `yarn start:dev` runs), with hot reload -- as a child
 * of the PAGE server:  it starts when the page server listens, and stops when it stops (`appRoutes.ts`).  So however
 * the page server starts -- `spell server`, `spell app serve`, an opener, VS Code -- the site header's "Editor" works.
 * - Port:  `SPELL_EDITOR_PORT`, else `VITE_PORT`, else 3000, if free;  taken (another checkout's editor):  any free
 *   one.  The real URL goes in `<root>/.spell-server.editor.json` (`EDITOR_FILE`) once it answers, where `/editor`
 *   and `spell app serve` find it.
 * - It reaches the page server's `/api` through vite's proxy, by IP:  `localhost` may be ::1 first, where the page
 *   server doesn't listen.
 * - Its output goes to `<root>/.spell-server.editor.log`, through a pipe:  the record is written when vite itself
 *   says it's ready.
 * - Runs vite's own script with this `node`, NOT `yarn start:dev`:  a page server launched by a `yarn` script
 *   inherits a PATH whose `yarn` is a temporary shim, gone once that script exits.
 * - In an npm install of `spell` (no vite, no source):  the BUILT editor, `app/dist/`, served by a small server of its own
 *   on the same port, passing the page server's paths on as vite would (`serveBuilt()`;  epic `repo-split` P26)
 * - `SPELL_NO_EDITOR=1`:  don't start it.
 * - NOTE: if the page server dies without stopping (kill -9), vite keeps running:  `yarn stop`, at spell-app's root.
 */
export class EditorServer {
  /** the page server's root, where its records go:  the kit (epic `repo-split` P16) */
  readonly root: string

  /** the port vite was told to take, once `start()` has picked it */
  port?: number

  /**
   * Resolves with `port` once `start()` has picked it, or `undefined` when it starts no editor (`SPELL_NO_EDITOR`).
   * - The house site waits for it before writing Caddy's file (epic `epic-engine` P74):
   *   picking a steady port can take 3 seconds (`steadyPort()`), and the default meanwhile is the wrong one.
   */
  readonly portPicked: Promise<number | undefined>

  /** settles `portPicked` */
  private pickedPort!: (port: number | undefined) => void

  /** the running vite, in its own process group */
  private child?: ChildProcess

  /** the built editor's server, in an npm install (`serveBuilt()`) */
  private built?: SRV.WebServer

  /** `stop()` was called:  a start under way picks no more ports */
  private isStopped = false

  constructor(root: string) {
    this.root = root
    this.portPicked = new Promise((resolve) => (this.pickedPort = resolve))
  }

  /** `<root>/.spell-server.editor.json`:  `{ url, pid }` of the running editor */
  get recordFile(): string {
    return join(this.root, EDITOR_FILE)
  }

  /**
   * Start vite, talking to the page server on `pagePort`;  resolves at once (vite takes seconds:  the page server
   * doesn't wait), and records the editor's URL once it answers.
   * - `guard`:  the page server's;  vite gets its write token, which its proxy adds to the project data folders'
   *   requests alone (`pageServerProxy()`), and the editor's origin may write (epic `language` T68)
   * - `thisMachineOnly`:  vite listens on this machine alone, when this machine's site gives it a house-network address
   *   (`LocalSiteServer.editorAddress`, epic `atmosphere` P39):  so Caddy, with what it refuses, is the one way in
   * - its port taken after all (`Port 3001 is already in use`):  it picks again, up to `PORT_TRIES` times, rather than
   *   leaving no editor (epic `epic-engine` I274, r68);  `portPicked` names the port it ends up on
   */
  async start(pagePort: number, guard: SRV.Guard, { thisMachineOnly = false } = {}): Promise<void> {
    if (process.env.SPELL_NO_EDITOR || this.child || this.built) return this.pickedPort(this.port)
    if (isBuiltEditor()) return this.pickedPort(await this.serveBuilt(pagePort, guard, { thisMachineOnly }))
    const log = createWriteStream(join(this.root, ".spell-server.editor.log"), { flags: "a" })
    const taken: number[] = []
    for (let tries = 0; tries < PORT_TRIES && !this.isStopped; tries++) {
      const port = await editorPort({ thisMachineOnly, taken })
      if (this.isStopped) break
      this.port = port
      guard.allowOriginPort(port)
      const outcome = await this.launch(port, pagePort, guard, { thisMachineOnly, log })
      if (outcome === "ready") return this.pickedPort(port)
      if (outcome !== "port taken") break
      taken.push(port)
    }
    this.pickedPort(this.port)
  }

  /**
   * SIDE EFFECT:  vite runs on `port`, recorded once it says it's ready;  what happened:
   * - `ready`:  it listens
   * - `port taken`:  it stopped at once, `--strictPort` finding the port held (an editor still letting go of it)
   * - `ended`:  it stopped for some other reason, or was stopped
   */
  private launch(
    port: number,
    pagePort: number,
    guard: SRV.Guard,
    { thisMachineOnly, log }: { thisMachineOnly: boolean; log: NodeJS.WritableStream }
  ): Promise<"ready" | "port taken" | "ended"> {
    const env = {
      ...process.env,
      VITE_PORT: String(port),
      PORT: String(pagePort),
      API_SERVER: "127.0.0.1",
      SPELL_SERVER_TOKEN: guard.token,
      ...(thisMachineOnly && { SPELL_EDITOR_THIS_MACHINE_ONLY: "1" })
    }
    const child = spawn(process.execPath, [vpScript(), "dev", "--port", String(port), "--strictPort"], {
      cwd: APP_DIR,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    })
    this.child = child
    return new Promise((settle) => {
      // its output to the log -- and the record once IT says it's ready:  a fetch could be answered by another
      // checkout's editor holding the port, before ours fails with "already in use" (`--strictPort`)
      let output = ""
      let ready = false
      const watch = (data: Buffer) => {
        log.write(data)
        if (ready) return
        output += data
        if (!READY.test(stripVTControlCharacters(output))) return
        ready = true
        if (this.child !== child) return
        this.record(`http://localhost:${port}/`, child)
        settle("ready")
      }
      child.stdout!.on("data", watch)
      child.stderr!.on("data", watch)
      child.on("exit", () => {
        if (this.child === child) {
          this.child = undefined
          rmSync(this.recordFile, { force: true })
        }
        settle(!ready && PORT_IN_USE.test(stripVTControlCharacters(output)) ? "port taken" : "ended")
      })
    })
  }

  /**
   * SIDE EFFECT:  the BUILT editor (`BUILT_EDITOR`) served on a port of its own, and recorded;  resolves to the port.
   * - what an npm install of `spell` runs, which ships the editor built (`yarn build`) and no vite config
   * - the page server's paths (`PAGE_SERVER_PREFIXES`) passed on to it, websockets too, its write token added where
   *   vite's proxy adds it;  every other path a file of the build, else its `index.html`
   * - `thisMachineOnly`:  as vite's, this machine alone;  else every address, as vite listens
   */
  private async serveBuilt(
    pagePort: number,
    guard: SRV.Guard,
    { thisMachineOnly }: { thisMachineOnly: boolean }
  ): Promise<number> {
    const web = new SRV.WebServer({ mounts: [{ prefix: "/", dir: BUILT_EDITOR }], checkHost: false })
    const pass = SRV.proxyTo(() => pagePort)
    for (const prefix of PAGE_SERVER_PREFIXES) {
      const withToken = TOKEN_PREFIXES.includes(prefix)
      web.router.use(prefix, (request, reply) => {
        if (withToken) request.headers[SERVER_TOKEN_HEADER] = guard.token
        return pass(request, reply, () => {})
      })
    }
    for (const prefix of WEBSOCKET_PREFIXES)
      web.upgrade(prefix, (raw, socket, head) => SRV.proxyUpgrade(raw, socket, head, pagePort))
    web.fallback.use((request, reply, next) =>
      request.method === "GET" ? reply.sendFile(join(BUILT_EDITOR, "index.html")) : next()
    )
    const wanted = await editorPort({ thisMachineOnly })
    const { port } = await web.listen({ port: wanted, host: thisMachineOnly ? "127.0.0.1" : "0.0.0.0" })
    this.port = port
    guard.allowOriginPort(port)
    this.built = web
    writeFileSync(
      this.recordFile,
      `${JSON.stringify({ url: `http://localhost:${port}/`, pid: process.pid }, null, 2)}\n`
    )
    return port
  }

  /**
   * Stop vite and everything it started, forget its record, and wait for it to END (epic `epic-engine` I274, r68).
   * - `SIGTERM` to its group;  `SIGKILL` if it's still there after `STOP_WAIT_MS`
   * - why wait:  the page server awaits its stop handlers before it exits, and a restart waits for that, so the next
   *   page server's editor finds the port free;  before, the old vite still held it, and the new one failed
   *   (`Port 3001 is already in use`) with no editor at all
   * - NEVER throws
   */
  async stop(): Promise<void> {
    this.isStopped = true
    const built = this.built
    this.built = undefined
    if (built) await built.close().catch(() => {})
    const pid = this.child?.pid
    this.child = undefined
    rmSync(this.recordFile, { force: true })
    if (!pid) return
    const signal = (name: NodeJS.Signals) => {
      try {
        process.kill(-pid, name)
      } catch {
        // already gone
      }
    }
    signal("SIGTERM")
    for (let waited = 0; waited < STOP_WAIT_MS && SRV.isProcessAlive(pid); waited += STOP_LOOK_MS)
      await sleep(STOP_LOOK_MS)
    if (SRV.isProcessAlive(pid)) signal("SIGKILL")
  }

  /** Write the record:  `url` is `child`'s, which said it's ready. */
  private record(url: string, child: ChildProcess): void {
    writeFileSync(this.recordFile, `${JSON.stringify({ url, pid: child.pid }, null, 2)}\n`)
  }
}

/** Where the editor is recorded, relative to the checkout:  read by `appRoutes.ts`'s `/editor` and `spell app serve`. */
export const EDITOR_FILE = ".spell-server.editor.json"

/** The app's build folder, `app/`, where vite runs (its `vite.config.ts`), and its builds are:  `dist/`, `dist-element/` ... */
export const APP_DIR = join(environment.packagesDir, "app")

/** The built editor, `yarn build`'s output (`app/dist/`):  what an npm install of `spell` serves (`serveBuilt()`). */
const BUILT_EDITOR = join(APP_DIR, "dist")

/**
 * Is this the published `spell`, its editor built and no vite config beside it (epic `repo-split` P26)?
 * - a checkout always runs vite, built or not:  its editor is the source, live
 */
function isBuiltEditor(): boolean {
  return !existsSync(join(APP_DIR, "vite.config.ts")) && existsSync(join(BUILT_EDITOR, "index.html"))
}

/**
 * Vite+'s command-line script, as `app/` resolves it:  run as `vp dev`.
 * - NOT `vite/bin/vite.js`:  `vite` is aliased to `@voidzero-dev/vite-plus-core`, which ships no bin.
 * - Looked up when vite starts, never as this file loads:  an npm install of `spell` may have no `vite-plus`.
 */
function vpScript(): string {
  return join(dirname(createRequire(join(APP_DIR, "package.json")).resolve("vite-plus/package.json")), "bin/vp")
}

/**
 * What vite prints once it listens:  `➜  Local:   http://localhost:3000/`.
 * - NOT `ready in`:  `vp dev` prints `VITE+ v1.0.0` with no timing.
 * - Tested on the output WITHOUT its colours:  with `CI` set (GitHub Actions), vite colours even into a pipe,
 *   `Local\x1b[22m:` (epic `repo-split` P12).
 */
const READY = /\bLocal:\s+http/

/** What vite prints when `--strictPort` finds its port held:  `Port 3001 is already in use`. */
const PORT_IN_USE = /\bis already in use\b/

/** How many ports `start()` tries before it gives up on an editor. */
const PORT_TRIES = 3

/** How long `stop()` waits for vite to end before `SIGKILL`, and how often it looks. */
const STOP_WAIT_MS = 5000
const STOP_LOOK_MS = 100

/**
 * The editor's port:  the wanted one if free on IPv4 AND IPv6 (vite listens on 0.0.0.0), else any free one.
 * - NOTE: both:  on macOS `::` binds even while another process holds `0.0.0.0:<port>` -- another checkout's editor.
 * - `thisMachineOnly`:  the house site's editor, whose port is in Caddy's file:  `steadyPort()`.
 */
async function editorPort({
  thisMachineOnly,
  taken = []
}: {
  thisMachineOnly: boolean
  taken?: number[]
}): Promise<number> {
  const wanted = Number(process.env.SPELL_EDITOR_PORT) || environment.vitePort
  const isFreeEverywhere = async (port: number) =>
    !taken.includes(port) && (await SRV.isFree(port, "0.0.0.0")) && (await SRV.isFree(port, "::"))
  if (thisMachineOnly) return (await steadyPort(wanted, isFreeEverywhere)) ?? SRV.freePort()
  return (await isFreeEverywhere(wanted)) ? wanted : SRV.freePort()
}

/**
 * A port that's the same from one page server to the next, so a restart doesn't change Caddy's file and restart Caddy
 * (epic `atmosphere` P39):  `undefined` when none of them is free.
 * - `wanted`, waiting a moment:  the last page server's editor is still letting go of it as a restart begins
 * - else the first free one just above it:  the same one each time, while the same things hold the others
 */
export async function steadyPort(
  wanted: number,
  isFree: (port: number) => Promise<boolean>,
  wait: (ms: number) => Promise<unknown> = sleep
): Promise<number | undefined> {
  for (let look = 0; look < WANTED_PORT_LOOKS; look++) {
    if (await isFree(wanted)) return wanted
    await wait(WANTED_PORT_LOOK_MS)
  }
  for (let port = wanted + 1; port <= wanted + SPARE_PORTS; port++) if (await isFree(port)) return port
  return undefined
}

/** How many times `steadyPort()` looks for the wanted port, and how long between:  3 seconds in all. */
const WANTED_PORT_LOOKS = 15
const WANTED_PORT_LOOK_MS = 200

/** How many ports above the wanted one `steadyPort()` tries. */
const SPARE_PORTS = 20
