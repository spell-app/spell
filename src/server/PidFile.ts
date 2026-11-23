import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"

import { waitUntil } from "spell/util/timing"
import type { ServerInfo } from "spell/server"
import { checkoutOf } from "./checkout"
import { endProcess, isProcessAlive } from "./Heartbeat"
import { SERVER_API } from "./liveClient"
import { LoadedCode } from "./LoadedCode"
import { isFree } from "./ports"
// Import directly:  through the `SRV` barrel, the Linker's HTML parser lands in spell-epic's extension (I58)
import { HttpError } from "./server.types"

// The process check, beside the heartbeat since epic `coherence` P28:  re-exported, so `SRV.isProcessAlive()` stays
export { endProcess, isProcessAlive } from "./Heartbeat"

/**
 * The file where a background server says where it is, holding its `ServerInfo`:
 * `<root>/<name>` (default `.spell-server.json`).
 * - running means:  the file's server answers `/api/server` (`SERVER_API`) for THIS root
 *   - a pid file left by a crash, or by a server on another checkout's root, is not running
 * - `ensure()` starts one detached if none runs, or restarts one older than its code (`isOlderThanCode()`):
 *   the files it loaded (`LoadedCode`), else its `sources`
 * - `stop()` sends it `SIGTERM`, and waits for its process to end (`SIGKILL` after 10s)
 * - `stop({ restart: true })`, as `ensure()` does for one older than its code:  the server is told it's a restart
 *   (`isRestarting()`), so what can carry over to the next one stays up:  the editor's vite (epic `epic-engine` I329)
 * - a FIXED `port` (the main checkout's page server, 4747):  `ensure()` and `stop()` also stop this root's server
 *   holding it when the file names another, and `ensure()` starts the new one only once the port is free
 *   (epic `epic-engine` I332)
 * - ONE page server per SPACES on a kit:  `forPageServer()`.
 *   A project running its page server on the kit (`spell server local --spaces spaces`) has a record of
 *   its own, `.spell-server.<folder>-<hash>.json` (`spacesFileName()`), and its own write token, restart note and log
 *   beside it;  and a server counts as this file's only when it serves the same spaces (`ServerInfo.spaces`).
 *   - Why:  a project's page server wrote over the kit's own record;  Spell's editor then sent the
 *     project's write token, and `spell server start all` took the project's server for Spell's, off its port, and
 *     stopped it.
 * - From the goals tools' `launch.js` (`ensureServer`, `serverStatus`, `stopServer`).
 */
export class PidFile {
  /** folder the server serves */
  readonly root: string

  /** the pid file */
  readonly file: string

  /**
   * the spaces its server serves, when they aren't the kit's own (`forPageServer()`):  a project's;
   * `undefined`:  the kit's spell.spaces, or a server with no spaces (the epic server)
   */
  readonly spaces?: string

  constructor(root: string, name = PAGE_SERVER_FILE, spaces?: string) {
    this.root = resolve(root)
    this.file = join(this.root, name)
    this.spaces = spaces === undefined ? undefined : resolve(spaces)
  }

  /**
   * The page server's pid file at kit `root`, for the page server serving `spaces`.
   * - `spaces`:  default `SPELL_SPACES_DIR` (the page server's `--spaces`), as the page server itself reads them
   * - the kit's own spell.spaces (`defaultSpacesOf()`), or none:  `.spell-server.json`, as always
   * - any other, a project's:  its own file, `.spell-server.my-app-1a2b3c4d.json` (`spacesFileName()`)
   */
  static forPageServer(root: string, spaces: string | undefined = process.env.SPELL_SPACES_DIR): PidFile {
    const own = spaces === undefined || resolve(spaces) === defaultSpacesOf(root) ? undefined : resolve(spaces)
    return new PidFile(root, spacesFileName(PAGE_SERVER_FILE, own), own)
  }

  /**
   * Does `info`, a server's answer at `SERVER_API`, say it's this file's:  this root, these spaces?
   * - a server from before `ServerInfo.spaces`, or one with none:  the kit's own spaces
   */
  isServing(info: ServerInfo | undefined): boolean {
    return info?.root === this.root && (info.spaces === undefined ? undefined : resolve(info.spaces)) === this.spaces
  }

  /** the file's info, or `undefined` if missing or unreadable */
  read(): ServerInfo | undefined {
    if (!existsSync(this.file)) return undefined
    try {
      return JSON.parse(readFileSync(this.file, "utf8")) as ServerInfo
    } catch {
      return undefined
    }
  }

  /** write `info` */
  write(info: ServerInfo): void {
    writeFileSync(this.file, `${JSON.stringify(info, null, 2)}\n`)
  }

  /**
   * The running server's write token, beside its pid file, for a program this machine's person runs against it
   * (epic `data` P40):  `spell run --target py` hands it to a Python program, which writes its places with it.
   * - `<file>` with `.token.json` for `.json`:  `{ pid, token }`, readable by this machine's person only
   *   (mode 0600), as the cloud keeps its own (`cloud.json`)
   * - NOT in `ServerInfo`:  `/api/server` answers that, and must never answer the token
   */
  get tokenFile(): string {
    return this.file.replace(/\.json$/, ".token.json")
  }

  /**
   * The running server's loaded-code record (`LoadedCode`), beside its pid file:  `<file>` with `.code.json` for
   * `.json`, so each page server on a kit keeps its own -- Spell's `.spell-server.code.json`, a project's
   * `.spell-server.<folder>-<hash>.code.json`
   */
  get codeFile(): string {
    return this.file.replace(/\.json$/, ".code.json")
  }

  /** SIDE EFFECT:  write this process's server's write `token` -- see `tokenFile` */
  writeToken(token: string): void {
    writeFileSync(this.tokenFile, `${JSON.stringify({ pid: process.pid, token })}\n`, { mode: 0o600 })
  }

  /** The running server's write token -- see `tokenFile`;  `undefined` with none, or one a server that's gone left */
  readToken(): string | undefined {
    try {
      const { pid, token } = JSON.parse(readFileSync(this.tokenFile, "utf8")) as { pid?: number; token?: string }
      return pid !== undefined && isProcessAlive(pid) ? token : undefined
    } catch {
      return undefined
    }
  }

  /**
   * `<file>` with `.restart.json` for `.json`:  `{ pid, pids }` of the servers being stopped to start again
   * (`stop({ restart })`).
   * - read by each stopping server itself (`isRestarting()`), as it stops;  a stale one names pids that are gone
   * - `pid`:  the first, for a server on code from before `pids` (epic `epic-engine` I332)
   */
  get restartFile(): string {
    return this.file.replace(/\.json$/, ".restart.json")
  }

  /**
   * Is this process's server (`pid`) being stopped only to start again (`stop({ restart: true })`)?
   * - then a route module may leave up what the next server takes over:  the editor's vite (`EditorServer.stop()`)
   * - NEVER throws
   */
  isRestarting(pid = process.pid): boolean {
    try {
      const note = JSON.parse(readFileSync(this.restartFile, "utf8")) as { pid?: number; pids?: number[] }
      return note.pid === pid || Boolean(note.pids?.includes(pid))
    } catch {
      return false
    }
  }

  /** remove the file if it's `pid`'s (default:  this process's) -- a newer server may own it by now;  its token's too */
  removeIfOurs(pid = process.pid): void {
    if (this.read()?.pid === pid) rmSync(this.file, { force: true })
    try {
      if ((JSON.parse(readFileSync(this.tokenFile, "utf8")) as { pid?: number }).pid === pid) rmSync(this.tokenFile)
    } catch {
      // none, or unreadable:  nothing of ours to remove
    }
  }

  /** the running server's info and base URL (`http://127.0.0.1:<port>`), or `undefined` */
  async status(): Promise<RunningServer | undefined> {
    const info = this.read()
    if (!info) return undefined
    const base = `http://127.0.0.1:${info.port}`
    const answer = await serverAt(base)
    return answer && this.isServing(answer) ? { ...answer, base } : undefined
  }

  /**
   * This root's server answering on `port`, whichever pid the file names;  else `undefined`.
   * - finds one the file lost track of:  one of two started at once, whose pid file the other wrote over
   *   (epic `epic-engine` I332)
   * - NEVER throws
   */
  async ourServerOn(port: number): Promise<RunningServer | undefined> {
    const base = `http://127.0.0.1:${port}`
    const answer = await serverAt(base)
    return answer && this.isServing(answer) ? { ...answer, base } : undefined
  }

  /**
   * The running server, started in the background first if none runs.
   * - `command`:  argv that runs it in the foreground, e.g. `[node, --import, tsx, cli.ts, serve]`
   * - `log`:  file for its output (default:  the pid file's, `.log` for `.json`:  `<root>/.spell-server.log`)
   * - waits up to `timeout` ms (15s) for it to answer
   * - `port`:  the port it MUST hold (the main checkout's page server, 4747;  epic `epic-engine` I332)
   *   - a running one on another port is restarted, and this root's server holding `port` is stopped with it
   *   - one holding `port` the file doesn't name, on current code:  taken as the running one, its pid file rewritten
   *   - the new one starts only once `port` is free;  throws `HttpError` 409 while something else holds it
   * - SIDE EFFECT:  may spawn `command` detached, in `root`
   */
  async ensure({
    command,
    env,
    log,
    sources = [],
    timeout = 15_000,
    port
  }: EnsureOptions): Promise<RunningServer & { launched: boolean }> {
    const running = await this.status()
    const holder = port ? await this.ourServerOn(port) : undefined
    const isCurrent = (server: RunningServer) => !this.isOlderThanCode(server, sources)
    if (running && (!port || running.port === port) && isCurrent(running)) return { ...running, launched: false }
    if (!running && holder && isCurrent(holder)) {
      const { base: _base, ...info } = holder
      this.write(info)
      return { ...holder, launched: false }
    }
    // older than its code (a merge changed it since):  a fresh one, so pages get the new routes (I5 of `skillz`);
    // off its port:  a fresh one on it (I332)
    if (running || holder) await this.stop({ restart: true, port })
    else await this.stopUnanswering()
    if (port) await this.takePort(port)
    const out = openSync(log ?? this.file.replace(/\.json$/, ".log"), "a")
    const [program, ...args] = command
    spawn(program!, args, {
      cwd: this.root,
      detached: true,
      stdio: ["ignore", out, out],
      env: { ...process.env, ...env }
    }).unref()
    // Until it answers, looking every 0.1s;  gives up after `timeout`
    const status = await waitUntil(() => this.status(), { timeout: timeout / 1000 })
    if (status) return { ...status, launched: true }
    throw new HttpError(503, `the server for ${this.root} didn't start in ${timeout / 1000}s:  see its log`)
  }

  /**
   * Is `running` older than the code it runs, so `ensure()` restarts it?
   * - by the files it LOADED, when it keeps a record of them (`LoadedCode`, epic `epic-engine` I309):
   *   one of them changed or gone since it loaded it;  its OWN record, `codeFile`, never another spaces' server's
   * - else (an older server, one started by hand, another kind of server):  any code file under `sources` newer
   *   than its start (`newestChange()`)
   */
  isOlderThanCode(running: RunningServer, sources: string[]): boolean {
    return LoadedCode.isChanged(this.codeFile, running.pid) ?? newestChange(sources) > Date.parse(running.started)
  }

  /**
   * Stop the running server, if any, and wait for its PROCESS to end;  returns whether one was stopped.
   * - `SIGTERM`, then `SIGKILL` if it's still there after `wait` ms (`STOP_WAIT_MS`, 10s);  see `endProcess()`
   * - why the process, not its answers:  it stops answering before it lets go of its port
   *   (its route modules stop first, and the bundles' build).
   *   `ensure()` started the new one while the old one still held the port,
   *   so the new one took ANOTHER port, and every open page on the usual one found the server down
   *   (epic `airplane`, 2026-10-10:  the log shows a start on port 54516)
   * - `restart`:  another server starts right after (`ensure()`, `epic merge`):  it says so first (`restartFile`), so
   *   the editor's vite stays up for the next one, and the editor's pages don't reload (epic `epic-engine` I329)
   * - `port`:  the port the server must hold:  this root's server answering there is stopped too, when the file names
   *   another (epic `epic-engine` I332:  an orphan kept 4747, and every restart after took a new port)
   */
  async stop({ wait = STOP_WAIT_MS, restart = false, port }: StopOptions = {}): Promise<boolean> {
    const running = await this.status()
    const holder = port ? await this.ourServerOn(port) : undefined
    const pids = [...new Set([running?.pid, holder?.pid].filter((pid) => pid !== undefined))]
    if (!pids.length) return false
    if (restart) writeFileSync(this.restartFile, `${JSON.stringify({ pid: pids[0], pids })}\n`)
    try {
      await Promise.all(pids.map((pid) => endProcess(pid, wait)))
    } finally {
      if (restart) rmSync(this.restartFile, { force: true })
    }
    return true
  }

  /**
   * Wait for `port` to be free, for a server that MUST listen there (epic `epic-engine` I332).
   * - this root's server still on it (one too busy to answer `stop()`'s ask within a second):  stopped, then waited for
   * - throws `HttpError` 409 while something else holds it, naming what answers there
   */
  private async takePort(port: number): Promise<void> {
    const isPortFree = () => isFree(port)
    if (await waitUntil(isPortFree, { timeout: PORT_WAIT_MS / 1000 })) return
    const holder = await serverAt(`http://127.0.0.1:${port}`)
    if (holder && this.isServing(holder)) {
      await endProcess(holder.pid, STOP_WAIT_MS)
      if (await waitUntil(isPortFree, { timeout: PORT_WAIT_MS / 1000 })) return
    }
    const who = holder ? `the server of ${holder.root} (pid ${holder.pid})` : "another program"
    throw new HttpError(
      409,
      `the server for ${this.root} must listen on port ${port}, but ${who} holds it:  ` +
        `stop that (lsof -nP -iTCP:${port} -sTCP:LISTEN names it), then start again`
    )
  }

  /**
   * Stop the pid file's server when it's alive and still holds its port, but doesn't answer `SERVER_API`.
   * - That's this checkout's server on code from before its calls moved under `/api/` (epic `people-and-orgs` P16),
   *   which `status()` can't see.
   *   Left running, it would keep the port, and every page, on the old code.
   * - only the pid the file names, for THIS root and spaces, while something answers HTTP on its port
   * - NEVER throws
   */
  private async stopUnanswering(): Promise<void> {
    const info = this.read()
    if (!info || !this.isServing({ ...info, root: resolve(info.root) }) || !isProcessAlive(info.pid)) return
    try {
      await fetch(`http://127.0.0.1:${info.port}/`, { signal: AbortSignal.timeout(1000), redirect: "manual" })
    } catch {
      // nothing on its port:  no server to stop
      return
    }
    await endProcess(info.pid, STOP_WAIT_MS)
  }
}

/**
 * What the server at `base` (`http://127.0.0.1:<port>`) says of itself at `SERVER_API`:  its `ServerInfo`;
 * `undefined` when nothing answers within a second, or the answer isn't a server's info (it has no `root`).
 * - any server's, not only a pid file's:  `PidFile.status()` asks its file's, then checks it serves this root;
 *   spell-epic's VS Code extension asks the one a page came from (its epic server answers more:  `EpicServerInfo`)
 * - NEVER throws
 */
export async function serverAt(base: string): Promise<ServerInfo | undefined> {
  try {
    const answer = await fetch(`${base}${SERVER_API}`, { signal: AbortSignal.timeout(1000) })
    const info = (await answer.json()) as Partial<ServerInfo> | null
    return typeof info?.root === "string" ? (info as ServerInfo) : undefined
  } catch {
    return undefined
  }
}

/** The page server's record at the kit's root, for the kit's own spaces:  a project's is named by its (`spacesFileName()`). */
export const PAGE_SERVER_FILE = ".spell-server.json"

/**
 * The name of a server's file `name` (`.spell-server.json`, `.spell-server.editor.log`) for a server serving `spaces`
 * (the editor's and the page server's):
 * - `spaces` `undefined`:  the kit's own spell.spaces:  `name` itself
 * - any other:  with its folder's name and a hash of its path, `.spell-server.my-app-1a2b3c4d.json`, from
 *   `.../my-app/spaces`:  the folder holding `spaces/` when that's its name, so it reads as the checkout
 */
export function spacesFileName(name: string, spaces: string | undefined): string {
  if (spaces === undefined) return name
  return name.replace(/(\.\w+)$/, `.${spacesTag(spaces)}$1`)
}

/**
 * The ONE tag naming what belongs to spaces folder `spaces` when they aren't the kit's own:  its folder's name and a
 * hash of its path, `my-app-1a2b3c4d` from `.../my-app/spaces` (the folder holding `spaces/` when that's its name, so
 * it reads as the checkout).
 * - the page server's and the editor's files (`spacesFileName()`), and spell-app's build folder for those spaces
 *   (`build/spell-spaces.my-app-1a2b3c4d/`), so two checkouts of one project never share any of them
 */
export function spacesTag(spaces: string): string {
  const folder = resolve(spaces)
  const named = basename(folder) === "spaces" ? basename(dirname(folder)) : basename(folder)
  return `${named.replace(/[^\w.-]+/g, "-")}-${createHash("sha256").update(folder).digest("hex").slice(0, 8)}`
}

/**
 * The kit's own spaces, spell.spaces, for a kit at `root`:  beside its MAIN checkout, so every worktree shares them
 * (as spell-app's `defaultSpellSpacesDir`).
 */
export function defaultSpacesOf(root: string): string {
  return resolve(dirname(checkoutOf(resolve(root))?.main ?? resolve(root)), "spell.spaces")
}

/** How long `stop()` lets a server end by itself before `SIGKILL`, in ms. */
const STOP_WAIT_MS = 10_000

/** How long `ensure()` waits for a fixed port to be free once ours are stopped, in ms. */
const PORT_WAIT_MS = 5_000

/** A server that answered:  its info and base URL, `http://127.0.0.1:<port>`. */
export type RunningServer = ServerInfo & { base: string }

/**
 * `PidFile.ensure()` options.
 * - `command`:  argv to run
 * - `env`:  added to ours
 * - `log`:  output file
 * - `timeout`:  ms to wait
 * - `sources`:  folders of the server's code
 *   - a running server that started before a `.ts` / `.js` file in them last changed is restarted
 * - `port`:  the port it must hold;  none:  any
 */
export type EnsureOptions = {
  command: string[]
  env?: Record<string, string>
  log?: string
  sources?: string[]
  timeout?: number
  port?: number
}

/**
 * `PidFile.stop()` options.
 * - `wait`:  ms before `SIGKILL` (`STOP_WAIT_MS`)
 * - `restart`:  another server starts right after;  the stopping ones are told so (`restartFile`)
 * - `port`:  the port the server must hold:  this root's server there is stopped too, when the file names another
 */
export type StopOptions = { wait?: number; restart?: boolean; port?: number }

/**
 * The newest modification time (ms) of the code files under `folders`, all the way down;  0 for none.
 * - code:  `.ts`, `.js`, `.mjs`
 * - skips `node_modules`, `_assets` (built pages' assets, not the server's code) and dot folders
 * - a missing folder counts as nothing
 */
export function newestChange(folders: string[]): number {
  let newest = 0
  for (const folder of folders) {
    if (!existsSync(folder)) continue
    for (const path of readdirSync(folder, { recursive: true }) as string[]) {
      if (!CODE.test(path) || SKIPPED.test(path)) continue
      newest = Math.max(newest, statSync(join(folder, path)).mtimeMs)
    }
  }
  return newest
}

/** A code file `newestChange()` counts. */
const CODE = /\.(ts|js|mjs)$/

/** Folders `newestChange()` skips, anywhere in a path. */
const SKIPPED = /(^|[/\\])(node_modules|_assets|\.[^/\\]+)[/\\]/
