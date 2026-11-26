import { spawn, type ChildProcess } from "node:child_process"
import {
  closeSync,
  existsSync,
  fstatSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { stripVTControlCharacters } from "node:util"

import { SRV } from "spell/server"
import environment from "spell/app/spaces/server/node/environment"
import { defaultSpellSpacesDir, orgGroupFolders, spellSpacesDir } from "spell/app/spaces/server/node/spellSpacesDir"
import {
  PAGE_SERVER_PREFIXES,
  SERVER_TOKEN_HEADER,
  TOKEN_PREFIXES,
  WEBSOCKET_PREFIXES,
  editorPageFor
} from "spell/app/spaces/server/node/routes/editorPaths"

/**
 * The editor UI -- vite's dev server for the app's build folder, `app/` (what `yarn start:dev` runs), with hot reload -- as a child
 * of the PAGE server:  it starts when the page server listens, and stops when it stops (`appRoutes.ts`).  So however
 * the page server starts -- `spell server`, `spell app serve`, an opener, VS Code -- the site header's "Editor" works.
 * - Port:  `SPELL_EDITOR_PORT`, else `VITE_PORT`, else 3000, if free;  taken (another checkout's editor):  any free
 *   one.
 *   - 3000 is the MAIN checkout's alone (epic `epic-engine` I449):  a worktree's editor takes the port written down
 *     for it (`SRV.PortBook`, 4900 up), never the main one's, so main's editor is never pushed off 3000.  The real URL goes in `<root>/.spell-server.editor.json` (`EDITOR_FILE`) once it answers, where `/editor`
 *   and `spell app serve` find it.
 * - ONE editor per page server's spaces (`--spaces`, `SPELL_SPACES_DIR`):  its record and
 *   log are named by them (`editorFileName()`), so two projects whose page servers run on one kit (two checkouts of
 *   one project, each with its own `spaces/`) each get their own vite, on its own port.
 *   - Why:  the record was one per kit, and the second page server took the first one's vite for the last page
 *     server's, on another port, and stopped it:  the main checkout's editor went away.
 * - ONE editor per checkout's spaces (epic `epic-engine` I455):
 *   - every other vite run in its app folder that no record names is stopped as it starts (`stopStrays()`)
 *   - the last page server's, still ending as a restart begins, is waited for, then taken over or stopped (`adopt()`)
 *   - main's also stops a worktree's vite found on 3000;  a worktree's listens on 127.0.0.1 alone
 *   - a vite that ends by itself is started again in a moment (`relaunchSoon()`)
 *   - why:  three of main's at once, on 3000, 3001 and 3002, each page server's restart starting one more
 * - It reaches the page server's `/api` through vite's proxy, by IP:  `localhost` may be ::1 first, where the page
 *   server doesn't listen.
 * - Its output goes to `<root>/.spell-server.editor.log`, straight from vite:  the record is written when vite itself
 *   says it's ready there.
 * - It OUTLIVES a page server's restart (`PidFile.stop({ restart })`;  epic `epic-engine` I329):
 *   - but not when it's off its port and that port is free again (`isOnWantedPort()`, I449):  it starts anew there
 *   the next page server takes it over (`adopt()`), so the editor's pages keep running, with no reload.
 *   - Not when what it runs on changed since it started:  the packages (`packagesStamp()`), the page server's port,
 *     or whether it listens on this machine alone.  Then it's stopped, and a new one starts:  an install's new
 *     package resolves (`epic merge codemirror`'s `@codemirror/lang-css`, epic `epic-engine` T89).
 *   - Its write token, the page server's, it reads from the page server's token file as each request goes on
 *     (`pageServerProxy()`):  the next page server's is new.
 *   - Why (Owen, 2026-11-17, I329):  every merge into `main` that changed the page server's code reloaded the editor
 *     under him, at test.spell.app.
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

  /** the pid of a vite the last page server started, taken over (`adopt()`):  not our child, stopped by its pid */
  private adoptedPid?: number

  /** the built editor's server, in an npm install (`serveBuilt()`) */
  private built?: SRV.WebServer

  /** `stop()` was called:  a start under way picks no more ports */
  private isStopped = false

  /** what the last vite that got ready was started with:  a vite that ends by itself is started again with it */
  private relaunchWith?: { pagePort: number; guard: SRV.Guard; thisMachineOnly: boolean }

  /** when this page server started its editor again by itself, newest last:  at most `RELAUNCHES` an hour */
  private relaunches: number[] = []

  /** the spaces the page server serves:  what names the record (`editorFileName()`) */
  readonly spaces: string

  constructor(root: string, spaces = spellSpacesDir) {
    this.root = root
    this.spaces = spaces
    this.portPicked = new Promise((resolve) => (this.pickedPort = resolve))
  }

  /** `<root>/.spell-server.editor.json`, or this page server's spaces' (`editorFileName()`):  `{ url, pid }` of the running editor */
  get recordFile(): string {
    return editorRecordFile(this.root, this.spaces)
  }

  /** its page server's pid file, by the spaces they serve (`SRV.PidFile.forPageServer()`) */
  get pageServerFile(): SRV.PidFile {
    return SRV.PidFile.forPageServer(this.root, this.spaces)
  }

  /** vite's output:  `<root>/.spell-server.editor.log`, or this page server's spaces' (`editorFileName()`) */
  get logFile(): string {
    return join(this.root, editorFileName(this.spaces, EDITOR_LOG))
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
    // a worktree's editor is for this Mac alone:  127.0.0.1, never every address (epic `epic-engine` I455)
    thisMachineOnly ||= Boolean(SRV.checkoutOf(this.root)?.worktree)
    if (isBuiltEditor()) return this.pickedPort(await this.serveBuilt(pagePort, guard, { thisMachineOnly }))
    const kept = await this.adopt(pagePort, guard, { thisMachineOnly })
    await this.stopStrays()
    if (kept) {
      this.relaunchWith = { pagePort, guard, thisMachineOnly }
      this.watchAdopted()
      return this.pickedPort(kept)
    }
    const log = this.logFile
    const taken: number[] = []
    for (let tries = 0; tries < PORT_TRIES && !this.isStopped; tries++) {
      const port = await editorPort({ root: this.root, thisMachineOnly, taken })
      if (this.isStopped) break
      this.port = port
      guard.allowOriginPort(port)
      const outcome = await this.launch(port, pagePort, guard, { thisMachineOnly, log })
      if (outcome === "ready") {
        this.relaunchWith = { pagePort, guard, thisMachineOnly }
        return this.pickedPort(port)
      }
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
    { thisMachineOnly, log }: { thisMachineOnly: boolean; log: string }
  ): Promise<"ready" | "port taken" | "ended"> {
    const env = {
      ...process.env,
      VITE_PORT: String(port),
      PORT: String(pagePort),
      API_SERVER: "127.0.0.1",
      SPELL_SERVER_TOKEN: guard.token,
      // its page server's, by the spaces they serve:  another project's on this kit has its own
      SPELL_SERVER_TOKEN_FILE: this.pageServerFile.tokenFile,
      ...(thisMachineOnly && { SPELL_EDITOR_THIS_MACHINE_ONLY: "1" })
    }
    // its output straight to the log, not through a pipe to us:  it outlives a restart of ours (`adopt()`)
    const from = existsSync(log) ? statSync(log).size : 0
    const out = openSync(log, "a")
    const child = spawn(process.execPath, [vpScript(), "dev", "--port", String(port), "--strictPort"], {
      cwd: APP_DIR,
      env,
      detached: true,
      stdio: ["ignore", out, out]
    })
    closeSync(out)
    this.child = child
    const stamp = packagesStamp(this.root)
    return new Promise((settle) => {
      // the record once IT says it's ready, in the log:  a fetch could be answered by another checkout's editor
      // holding the port, before ours fails with "already in use" (`--strictPort`)
      let ready = false
      const output = () => stripVTControlCharacters(readFrom(log, from))
      const looking = setInterval(() => {
        if (ready || !READY.test(output())) return
        ready = true
        clearInterval(looking)
        if (this.child !== child) return
        this.record({
          url: `http://localhost:${port}/`,
          pid: child.pid!,
          pagePort,
          server: process.pid,
          thisMachineOnly,
          packages: stamp
        })
        settle("ready")
      }, READY_LOOK_MS)
      child.on("exit", () => {
        clearInterval(looking)
        const wasOurs = this.child === child
        if (wasOurs) {
          this.child = undefined
          rmSync(this.recordFile, { force: true })
        }
        settle(!ready && PORT_IN_USE.test(output()) ? "port taken" : "ended")
        if (wasOurs && ready) this.relaunchSoon()
      })
    })
  }

  /**
   * SIDE EFFECT:  a vite that was ready and ended by itself (killed, crashed) started again in a moment, on the same
   * page server, so the editor comes back without waiting for the server keeper (epic `epic-engine` I455)
   * - not once `stop()` was called, nor while the page server restarts (the next one takes it over)
   * - at most `RELAUNCHES` an hour:  one that keeps ending is left down, for the keeper and the person
   * - NEVER throws
   */
  private relaunchSoon(): void {
    const how = this.relaunchWith
    if (!how || this.isStopped || this.pageServerFile.isRestarting()) return
    const now = Date.now()
    this.relaunches = this.relaunches.filter((at) => now - at < 60 * 60_000)
    if (this.relaunches.length >= RELAUNCHES) {
      console.warn(`editor:  vite ended ${RELAUNCHES} times this hour;  left down until the page server restarts`)
      return
    }
    this.relaunches.push(now)
    console.warn("editor:  vite ended by itself;  starting it again")
    setTimeout(() => {
      if (this.isStopped || this.child) return
      this.start(how.pagePort, how.guard, { thisMachineOnly: how.thisMachineOnly }).catch((error: unknown) =>
        console.error("editor:  couldn't start vite again:", error)
      )
    }, RELAUNCH_WAIT_MS).unref()
  }

  /**
   * SIDE EFFECT:  the vite taken over from the last page server (`adoptedPid`) watched, every `ADOPTED_LOOK_MS`:
   * it's no child of ours, so no `exit` event says it ended;  once it's gone, its record goes and it starts again
   * (`relaunchSoon()`), as our own child's would
   */
  private watchAdopted(): void {
    const pid = this.adoptedPid
    if (!pid) return
    const watching = setInterval(() => {
      if (this.adoptedPid !== pid) return clearInterval(watching)
      if (SRV.isProcessAlive(pid)) return
      clearInterval(watching)
      this.adoptedPid = undefined
      rmSync(this.recordFile, { force: true })
      this.relaunchSoon()
    }, ADOPTED_LOOK_MS)
    watching.unref()
  }

  /**
   * SIDE EFFECT:  every OTHER editor in the way stopped, so this checkout has ONE (epic `epic-engine` I455), found by
   * process, never by a record (`editorsInTheWay()`):
   * - a vite run in this checkout's app folder that no record names:  left by a page server that died, or by one that
   *   started its own beside it
   * - the main checkout's:  a vite of ANOTHER checkout (a worktree's) on 3000, main's port alone
   * - never one another spaces' page server on this kit runs (its record names it, its page server alive)
   * - NEVER throws
   */
  private async stopStrays(): Promise<void> {
    try {
      const processes = SRV.Processes.table({ args: true })
      const editors = [...processes].filter(([, { command }]) => EDITOR_COMMAND.test(command)).map(([pid]) => pid)
      if (!editors.length) return
      const folders = SRV.Processes.folderOf(editors)
      const ports = SRV.Processes.portsOf(editors)
      const isMain = !SRV.checkoutOf(this.root)?.worktree
      const strays = editorsInTheWay({
        editors: editors.map((pid) => ({
          pid,
          parent: processes.get(pid)?.ppid,
          folder: folders.get(pid),
          port: ports.get(pid)
        })),
        appDir: realPathOf(APP_DIR),
        keep: this.editorsOfRecord(),
        mainPort: isMain ? environment.vitePort : undefined
      })
      for (const pid of strays) {
        console.warn(`editor:  stopping vite (pid ${pid}, in ${folders.get(pid)}):  one editor per checkout`)
        await endGroup(pid)
      }
    } catch (error) {
      console.error("editor:  couldn't look for other editors:", error)
    }
  }

  /** the vites a record in this kit names (ours, kept, and other spaces' page servers' while they run) */
  private editorsOfRecord(): Set<number> {
    const pids = new Set<number>()
    for (const pid of [this.child?.pid, this.adoptedPid]) if (pid) pids.add(pid)
    let names: string[] = []
    try {
      names = readdirSync(this.root).filter((name) => EDITOR_RECORD_NAME.test(name))
    } catch {
      return pids
    }
    for (const name of names) {
      try {
        const record = JSON.parse(readFileSync(join(this.root, name), "utf8")) as Partial<EditorRecord>
        const isOurs = join(this.root, name) === this.recordFile
        if (record.pid && (isOurs || !record.server || SRV.isProcessAlive(record.server))) pids.add(record.pid)
      } catch {
        // not a record
      }
    }
    return pids
  }

  /**
   * Take over the vite the last page server left running for us (`stop()` in a restart), when it still fits:
   * resolves to its port, or `undefined` to start a new one.
   * - fits:  alive, answering its address, for the same page server port and address, on the same packages
   *   (`packagesStamp()`)
   * - one that doesn't fit is stopped first, so its port is free for the new one
   * - one whose page server (`server`) still runs, and isn't this one:  the last page server, still ending as a
   *   restart begins;  waited for, up to `waitMs`, then taken over or stopped as any other (epic `epic-engine` I455)
   *   - the record is this page server's spaces' alone (`editorFileName()`), so it's never another project's
   *   - before:  left running, and one of our own started beside it, on the next port up:  three of main's at once
   * - NEVER throws
   */
  private async adopt(
    pagePort: number,
    guard: SRV.Guard,
    { thisMachineOnly }: { thisMachineOnly: boolean },
    waitMs = STOP_WAIT_MS
  ): Promise<number | undefined> {
    const kept = this.readRecord()
    if (!kept?.pid || !SRV.isProcessAlive(kept.pid)) return undefined
    const server = kept.server
    if (server && server !== process.pid && SRV.isProcessAlive(server)) {
      for (let waited = 0; waited < waitMs && SRV.isProcessAlive(server); waited += STOP_LOOK_MS)
        await sleep(STOP_LOOK_MS)
      if (SRV.isProcessAlive(server))
        console.warn(
          `editor:  page server ${server} still runs;  its vite (pid ${kept.pid}) is this checkout's one editor now`
        )
    }
    const fits =
      kept.pagePort === pagePort &&
      kept.thisMachineOnly === thisMachineOnly &&
      kept.packages === packagesStamp(this.root) &&
      (await this.isOnWantedPort(kept.url))
    if (fits && kept.url && (await answers(kept.url))) {
      this.adoptedPid = kept.pid
      this.port = Number(new URL(kept.url).port)
      guard.allowOriginPort(this.port)
      console.warn(`editor:  kept vite (pid ${kept.pid}) at ${kept.url}, from the last page server`)
      return this.port
    }
    console.warn(`editor:  stopping vite (pid ${kept.pid}):  ${fits ? "it doesn't answer" : "what it runs on changed"}`)
    await endGroup(kept.pid)
    rmSync(this.recordFile, { force: true })
    return undefined
  }

  /**
   * whether a kept editor at `url` is where this page server wants it, or that port is held:  so an editor that
   * landed off its port (main's on 3001, while a worktree's held 3000) moves back once the port is free
   * (epic `epic-engine` I449)
   */
  private async isOnWantedPort(url: string | undefined): Promise<boolean> {
    if (!url) return false
    const wanted = await worktreeEditorPort(this.root, Number(process.env.SPELL_EDITOR_PORT) || environment.vitePort)
    if (Number(new URL(url).port) === wanted) return true
    return !((await SRV.isFree(wanted, "0.0.0.0")) && (await SRV.isFree(wanted, "::")))
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
    const web = EditorServer.builtServer({ dir: BUILT_EDITOR, pagePort, token: () => guard.token })
    const wanted = await editorPort({ root: this.root, thisMachineOnly })
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
   * A server, not listening yet, for a BUILT editor in `dir`:  its files, else its `run.html` for a `/run/...` address
   * and its `index.html` for every other (`editorPageFor()`);
   * the page server's paths (`PAGE_SERVER_PREFIXES`) passed on to it at `pagePort`, websockets too,
   * `token()` added where vite's proxy adds the write token.
   * - what an npm install serves (`serveBuilt()`), and what `spell perf run` measures (a build in a temporary folder)
   * - `token`:  none, no token is added
   * - `certificate`:  HTTPS and HTTP/2 too, on the same port (`SRV.WebServer`'s);  `spell perf run --https`'s
   * - cached as a deploy would be (`caching: "normal"`;  epic `solid-2-final` P2):  Vite's hashed chunks in `assets/`
   *   kept a year, everything else (`index.html`, the runner's fixed name) checked each time;  compressed, each built
   *   file's brotli copy beside it (`brotliCopies()`)
   */
  static builtServer({
    dir,
    pagePort,
    token,
    certificate
  }: {
    dir: string
    pagePort: number
    token?: () => string
    certificate?: SRV.CertificateFiles
  }): SRV.WebServer {
    const web = new SRV.WebServer({
      certificate,
      mounts: [{ prefix: "/", dir, hashed: SRV.hashedIn("assets") }],
      caching: "normal",
      checkHost: false
    })
    const pass = SRV.proxyTo(() => pagePort)
    for (const prefix of PAGE_SERVER_PREFIXES) {
      const withToken = token && TOKEN_PREFIXES.includes(prefix)
      web.router.use(prefix, (request, reply) => {
        if (withToken) request.headers[SERVER_TOKEN_HEADER] = token()
        return pass(request, reply, () => {})
      })
    }
    for (const prefix of WEBSOCKET_PREFIXES) {
      const withToken = token && TOKEN_PREFIXES.includes(prefix)
      web.upgrade(prefix, (raw, socket, head) => {
        // a live room's opening request carries the token, as a data folder's requests do
        if (withToken) raw.headers[SERVER_TOKEN_HEADER] = token()
        SRV.proxyUpgrade(raw, socket, head, pagePort)
      })
    }
    // the page the address opens:  the run page for `/run/...`, else the editor (`editorPageFor()`);
    // a build from before the run page has none, and runs it in the editor
    web.fallback.use((request, reply, next) => {
      if (request.method !== "GET") return next()
      const page = editorPageFor(request.originalUrl, orgGroupFolders())
      const file = existsSync(join(dir, page)) ? page : "index.html"
      return reply.set("Cache-Control", "no-cache").sendFile(join(dir, file))
    })
    return web
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
    const pid = this.child?.pid ?? this.adoptedPid
    // a restart:  vite stays up, and its record, for the next page server to take over (`adopt()`)
    if (pid && this.pageServerFile.isRestarting()) {
      this.child?.unref()
      this.child = undefined
      return
    }
    this.child = undefined
    this.adoptedPid = undefined
    rmSync(this.recordFile, { force: true })
    if (pid) await endGroup(pid)
  }

  /** Write the record of the vite that said it's ready. */
  private record(record: EditorRecord): void {
    writeFileSync(this.recordFile, `${JSON.stringify(record, null, 2)}\n`)
  }

  /** The record, or `undefined` with none.  NEVER throws. */
  private readRecord(): Partial<EditorRecord> | undefined {
    try {
      return JSON.parse(readFileSync(this.recordFile, "utf8")) as Partial<EditorRecord>
    } catch {
      return undefined
    }
  }
}

/**
 * `<root>/.spell-server.editor.json`, while the editor runs:  read by `/editor` and `spell app serve` (`url`), and by
 * the next page server (`EditorServer.adopt()`).
 */
type EditorRecord = {
  /** where it answers:  `http://localhost:3001/` */
  url: string
  /** vite's pid, its process group's too;  the built editor's:  the page server's */
  pid: number
  /** the page server's port vite passes requests on to */
  pagePort?: number
  /** the pid of the page server that started it:  while that runs, no other page server stops it (`adopt()`) */
  server?: number
  /** listens on this machine alone */
  thisMachineOnly?: boolean
  /** the packages it started on:  `packagesStamp()` */
  packages?: string
}

/**
 * The packages of kit `kit` (the page server's root), as files that change when an install does:
 * their sizes and change times, one string.
 * - the lockfile, the kit's and the app folder's manifests, and yarn's own record of what's installed
 * - a vite started on other packages is never taken over (`EditorServer.adopt()`):  it would keep the imports it
 *   couldn't resolve before
 */
function packagesStamp(kit: string): string {
  return [join(kit, "yarn.lock"), join(kit, "package.json"), join(APP_DIR, "..", "package.json"), YARN_STATE(kit)]
    .map((file) => {
      try {
        const { size, mtimeMs } = statSync(file)
        return `${size}:${mtimeMs}`
      } catch {
        return "-"
      }
    })
    .join(",")
}

/** yarn's record of what it installed, rewritten by every install. */
const YARN_STATE = (kit: string) => join(kit, "node_modules", ".yarn-state.yml")

/** `file` from byte `from` on, as text;  `""` with none.  NEVER throws. */
function readFrom(file: string, from: number): string {
  let fd: number | undefined
  try {
    fd = openSync(file, "r")
    const text = Buffer.alloc(Math.max(0, fstatSync(fd).size - from))
    readSync(fd, text, 0, text.length, from)
    return text.toString()
  } catch {
    return ""
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}

/** Does something answer at `url` within a second?  NEVER throws. */
async function answers(url: string | undefined): Promise<boolean> {
  if (!url) return false
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000), redirect: "manual" })
    return true
  } catch {
    return false
  }
}

/**
 * End process group `pid` (vite and everything it started), and wait for it to END (epic `epic-engine` I274, r68).
 * - `SIGTERM`;  `SIGKILL` if it's still there after `STOP_WAIT_MS`
 * - NEVER throws
 */
async function endGroup(pid: number): Promise<void> {
  const signal = (name: NodeJS.Signals) => {
    try {
      process.kill(-pid, name)
    } catch {
      // not a group's leader (a vite found by process), or already gone
      try {
        process.kill(pid, name)
      } catch {
        // already gone
      }
    }
  }
  signal("SIGTERM")
  for (let waited = 0; waited < STOP_WAIT_MS && SRV.isProcessAlive(pid); waited += STOP_LOOK_MS)
    await sleep(STOP_LOOK_MS)
  if (SRV.isProcessAlive(pid)) signal("SIGKILL")
}

/** Where the editor is recorded, relative to the checkout:  read by `appRoutes.ts`'s `/editor` and `spell app serve`. */
export const EDITOR_FILE = ".spell-server.editor.json"

/** vite's output, relative to the checkout. */
const EDITOR_LOG = ".spell-server.editor.log"

/**
 * The name of the editor's file `name` (`EDITOR_FILE`, `EDITOR_LOG`) for a page server serving `spaces`
 * (one per spaces):
 * - the default spell.spaces:  `name` itself, `.spell-server.editor.json`
 * - any other:  with its folder's name and a hash of its path, `.spell-server.editor.my-feature-1a2b3c4d.json`,
 *   from `.../my-feature/spaces`:  the folder holding `spaces/` when that's its name, so it reads as the checkout
 * - the page server's own record is named the same way (`SRV.spacesFileName()`)
 */
export function editorFileName(spaces: string = spellSpacesDir, name: string = EDITOR_FILE): string {
  const folder = resolve(spaces)
  return SRV.spacesFileName(name, folder === defaultSpellSpacesDir ? undefined : folder)
}

/** Where the editor of a page server on `root` serving `spaces` is recorded:  read by `/editor` and `spell app serve`. */
export function editorRecordFile(root: string, spaces: string = spellSpacesDir): string {
  return join(root, editorFileName(spaces))
}

/** How often `launch()` looks in the log for vite saying it's ready. */
const READY_LOOK_MS = 100

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

/** How many times an hour a page server starts its editor again by itself (`relaunchSoon()`), and after how long. */
const RELAUNCHES = 3
const RELAUNCH_WAIT_MS = 2000

/** How often a vite taken over from the last page server is looked at, to see it's still there (`watchAdopted()`). */
const ADOPTED_LOOK_MS = 3000

/** An editor's command line, as `ps` shows it:  `vp dev` (`launch()`'s) or the vite under it, `vite.js dev`. */
const EDITOR_COMMAND = /(?:\/vite-plus\/bin\/vp|\/vite\/bin\/vite\.js) dev\b/

/** A record's file name:  `editorFileName()`'s, for any spaces */
const EDITOR_RECORD_NAME = /^\.spell-server\.editor(?:\..+)?\.json$/

/**
 * The editors to stop before this checkout starts its own (`EditorServer.stopStrays()`):  pure, for its tests
 * - one in `appDir` that `keep` doesn't name, nor its parent:  a stray of this checkout
 * - with `mainPort` (the main checkout's):  one of another folder listening there, a worktree's on main's port
 * - one whose folder can't be told is left alone
 */
export function editorsInTheWay({
  editors,
  appDir,
  keep,
  mainPort
}: {
  editors: { pid: number; parent?: number; folder?: string; port?: number }[]
  appDir: string
  keep: Set<number>
  mainPort?: number
}): number[] {
  const isKept = (editor: { pid: number; parent?: number }) =>
    keep.has(editor.pid) || (editor.parent !== undefined && keep.has(editor.parent))
  return editors
    .filter((editor) => editor.folder !== undefined && !isKept(editor))
    .filter((editor) => editor.folder === appDir || (mainPort !== undefined && editor.port === mainPort))
    .map((editor) => editor.pid)
}

/** How long `stop()` waits for vite to end before `SIGKILL`, and how often it looks. */
const STOP_WAIT_MS = 5000
const STOP_LOOK_MS = 100

/**
 * The editor's port:  the wanted one if free on IPv4 AND IPv6 (vite listens on 0.0.0.0), else any free one.
 * - NOTE: both:  on macOS `::` binds even while another process holds `0.0.0.0:<port>` -- another checkout's editor.
 * - `thisMachineOnly`:  the house site's editor, whose port is in Caddy's file:  `steadyPort()`.
 * - `root`:  the page server's;  a WORKTREE's never wants the main checkout's port (`worktreeEditorPort()`)
 */
async function editorPort({
  root,
  thisMachineOnly,
  taken = []
}: {
  root: string
  thisMachineOnly: boolean
  taken?: number[]
}): Promise<number> {
  const wanted = await worktreeEditorPort(root, Number(process.env.SPELL_EDITOR_PORT) || environment.vitePort)
  const isFreeEverywhere = async (port: number) =>
    !taken.includes(port) && (await SRV.isFree(port, "0.0.0.0")) && (await SRV.isFree(port, "::"))
  if (thisMachineOnly) return (await steadyPort(wanted, isFreeEverywhere)) ?? SRV.freePort()
  return (await isFreeEverywhere(wanted)) ? wanted : SRV.freePort()
}

/**
 * The port a page server at `root` asks its editor to take, `wanted` but in a worktree:
 * - a WORKTREE asking for the main checkout's port (3000, `environment.vitePort`):  the port written down for its
 *   editor instead (`SRV.PortBook`, the same one `PageServer` hands it), so main's editor keeps 3000
 *   (epic `epic-engine` I449:  a worktree's editor, started before the port book, took 3000 and main's landed on 3001)
 * - anything else, the main checkout, a port given by hand:  `wanted`
 */
export async function worktreeEditorPort(root: string, wanted: number): Promise<number> {
  if (wanted !== environment.vitePort || !SRV.checkoutOf(root)?.worktree) return wanted
  return new SRV.PortBook().portFor(root, "editor")
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

/** `folder`'s real path, as `lsof` names a process's folder;  `folder` itself when it can't be told */
function realPathOf(folder: string): string {
  try {
    return realpathSync(folder)
  } catch {
    return folder
  }
}
