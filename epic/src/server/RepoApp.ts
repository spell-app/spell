import { spawn, type ChildProcess } from "node:child_process"
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs"
import { delimiter, dirname, join } from "node:path"

import type { SRV } from "spell/server"

import { EpicConfig, type EpicApp } from "spell-epic/config/EpicConfig"

import { APP_API, type AppStatus, type Repo } from "./server.types"

/****************
 * ### `RepoApp`
 * A repo's APP on the epic server (epic `epic-engine` I49):  what the top bar's App tab opens, `/editor/`.
 * - Declared by the repo:  its `.epic/config.json5`'s `"app"` (`EpicApp`):  where it answers, and what starts it.
 *   - spell-app's:  the editor, recorded in `.spell-server.editor.json` once its page server has started it
 *     (spaces' `EditorServer`), started by `spell server start`
 * - The tab's click (`route()`), at `<path>` for the default repo and `/r/<repo><path>` for each:
 *   - the app answers:  a redirect to it
 *   - it doesn't:  its `start` command, run DETACHED from the repo's main checkout (it outlives the epic server),
 *     its output to `<home>/app-<repo>.log`;  then a "Starting ..." page that polls `/api/app/<repo>` (`status()`)
 *     and goes to the app once it answers, so the click never hangs
 *   - no app declared, or nothing to start it:  a page saying so (never a 404)
 * - The config is read at each click, so an edit to `"app"` counts without a restart;  only `path` is read once,
 *   as the server starts.
 * - Its URL checked as spell-app's page server's `/editor` checks it (spaces' `appRoutes.ts`, `editorUrl()`):
 *   the record's `url`, which answers within a second.
 ****************/
export class RepoApp {
  /** the repo whose app it is */
  readonly repo: Repo

  /** where its start command's output goes:  `<home>/app-<repo>.log` */
  readonly logFile: string

  /** its address under a repo prefix, `editor/`:  the config's `path`, read once */
  readonly path: string

  /** the start in progress:  its process, when it began, and how it ended */
  private starting?: { child: ChildProcess; since: number; exit?: number | null }

  /** how long a start may take before the page gives up, in ms */
  static TIMEOUT = 120_000

  constructor(repo: Repo, home: string) {
    this.repo = repo
    this.logFile = join(home, `app-${repo.name}.log`)
    this.path = this.settings().settings.app.path.replace(/^\/+/, "").replace(/\/*$/, "/")
  }

  /** the repo's config, fresh:  the defaults when it won't read */
  private settings(): { app: EpicApp | undefined; settings: { app: EpicApp }; error?: string } {
    try {
      const config = new EpicConfig(this.repo.checkout)
      return { app: config.app, settings: config.settings }
    } catch (error) {
      return { app: undefined, settings: EpicConfig.DEFAULTS, error: (error as Error).message }
    }
  }

  /** The app's URL, by its config:  its record's (`urlFile`) while that's there, else `url`;  `undefined`:  none. */
  urlOf(app: EpicApp): string | undefined {
    if (app.urlFile && existsSync(app.urlFile)) {
      try {
        const { url } = JSON.parse(readFileSync(app.urlFile, "utf8")) as { url?: unknown }
        if (typeof url === "string" && url) return url
      } catch {
        // a record half-written:  as if not there
      }
    }
    return app.url || undefined
  }

  /** What the "Starting ..." page polls, and the click decides by. */
  async status(): Promise<AppStatus> {
    const { app, error } = this.settings()
    const base = { repo: this.repo.name, log: this.logFile }
    if (!app) return { ...base, declared: false, up: false, starting: false, ...(error && { failed: error }) }
    const url = this.urlOf(app)
    const up = url !== undefined && (await answers(url))
    if (up) this.starting = undefined
    const start = this.starting
    const failed = up || !start ? undefined : startFailure(start, app.start)
    return {
      ...base,
      declared: true,
      up,
      ...(url && { url }),
      starting: !!start && !failed,
      canStart: !!app.start,
      ...(start && { since: new Date(start.since).toISOString() }),
      ...(failed && { failed })
    }
  }

  /**
   * Run the app's `start` command, DETACHED, from the repo's main checkout, its output to `logFile`;  unless a start
   * is under way already (two clicks start it once).
   * - `node` on its `PATH` first:  the one running this server
   * - none of this server's own settings passed on (`EPIC_CHECKOUT` ...):  the app finds its own
   * - returns whether it started one
   */
  start(command: string): boolean {
    if (this.starting && !startFailure(this.starting, command)) return false
    mkdirSync(dirname(this.logFile), { recursive: true })
    const log = openSync(this.logFile, "a")
    writeSync(log, `\n--- ${new Date().toISOString()}  ${command}  (in ${this.repo.checkout})\n`)
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH}`
    }
    for (const name of NOT_PASSED) delete env[name]
    const child = spawn(command, {
      shell: true,
      cwd: this.repo.checkout,
      detached: true,
      stdio: ["ignore", log, log],
      env
    })
    closeSync(log)
    const start: NonNullable<RepoApp["starting"]> = { child, since: Date.now() }
    child.on("exit", (code) => void (start.exit = code))
    child.on("error", () => void (start.exit = -1))
    child.unref()
    this.starting = start
    return true
  }

  /**
   * Answer the App tab's click at `prefix` + `path` (`/editor/`, `/r/<repo>/editor/`):
   * the app answers:  a redirect;  else start it and send the "Starting ..." page;  none:  a page saying so.
   */
  route(router: SRV.Router, prefix: string): void {
    router.get(`${prefix}${this.path}`, async (_request, reply) => {
      reply.set("Cache-Control", "no-store")
      const status = await this.status()
      if (status.up) return void reply.redirect(status.url!)
      const { app } = this.settings()
      if (app?.start && !status.starting) this.start(app.start)
      reply.type("text/html").send(this.page(await this.status()))
    })
  }

  /** Answer `/api/app/<repo>`:  `status()`, as JSON. */
  static routeStatus(router: SRV.Router, apps: RepoApp[]): void {
    router.get(`${APP_API}/:repo`, async (request, reply) => {
      const app = apps.find((each) => each.repo.name === request.params.repo)
      if (!app) return void reply.status(404).json({ error: `no repo ${request.params.repo}` })
      reply.set("Cache-Control", "no-store").json(await app.status())
    })
  }

  /** The page the click gets while the app isn't up:  starting (it polls), or why it can't. */
  page(status: AppStatus): string {
    const name = escape(this.repo.name)
    const log = `<code>${escape(this.logFile)}</code>`
    const config = `<code>${escape(join(this.repo.checkout, EpicConfig.FILE))}</code>`
    const body = !status.declared
      ? `<h1>${name} has no app</h1>
<p>The App tab opens a repo's app, and ${name} declares none${status.failed ? `:  its config won't read (${escape(status.failed)})` : ""}.</p>
<p>To give it one, add <code>"app"</code> to ${config}:</p>
<pre>"app": {
  "path": "/editor/",
  "url": "http://localhost:3000/",
  "start": "the shell command that starts it, from the main checkout"
}</pre>`
      : !status.canStart
        ? `<h1>${name}'s app isn't running</h1>
<p>Nothing answers at <code>${escape(status.url ?? "(no URL yet)")}</code>, and ${config} names no <code>"start"</code> command to run.  Start it, then reload.</p>`
        : `<h1 id="title">Starting ${name}'s app…</h1>
<p id="said">Its start command runs in the background;  this page goes to the app once it answers.</p>
<p class="quiet">Output:  ${log}</p>
<script>
  const since = Date.now()
  const said = document.getElementById("said")
  async function poll() {
    const status = await fetch(${JSON.stringify(`${APP_API}/${encodeURIComponent(this.repo.name)}`)}, { cache: "no-store" })
      .then((answer) => answer.json())
      .catch(() => undefined)
    if (status?.up) return location.replace(status.url)
    const waited = Math.round((Date.now() - since) / 1000)
    if (status?.failed) {
      document.getElementById("title").textContent = "${name}'s app didn't start"
      said.textContent = status.failed + ".  See its output, below;  reload to try again."
      return
    }
    said.textContent = "Its start command runs in the background;  this page goes to the app once it answers (" + waited + "s)."
    setTimeout(poll, 700)
  }
  poll()
</script>`
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}:  App</title>
<style>
  :root { color-scheme: light dark; font: 15px/1.5 system-ui, sans-serif; }
  body { max-width: 40rem; margin: 4rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  pre { padding: 0.75rem; border-radius: 4px; background: color-mix(in srgb, currentColor 8%, transparent); overflow-x: auto; }
  .quiet { opacity: 0.7; font-size: 0.9em; overflow-wrap: anywhere; }
</style></head>
<body>${body}</body></html>
`
  }
}

/** Whether `url` answers within a second:  any HTTP answer counts. */
async function answers(url: string): Promise<boolean> {
  try {
    const answer = await fetch(url, { signal: AbortSignal.timeout(1000), redirect: "manual" })
    await answer.body?.cancel()
    return true
  } catch {
    return false
  }
}

/** Why start `start` (of command `command`) failed:  it exited with an error, or the app didn't answer in time. */
function startFailure(start: { since: number; exit?: number | null }, command: string): string | undefined {
  if (start.exit !== undefined && start.exit !== 0)
    return `"${command}" exited with ${start.exit === null ? "a signal" : `code ${start.exit}`}`
  if (Date.now() - start.since > RepoApp.TIMEOUT)
    return `It didn't answer within ${Math.round(RepoApp.TIMEOUT / 1000)} seconds of "${command}"`
  return undefined
}

/** `text` safe in HTML. */
function escape(text: string): string {
  return text.replace(/[&<>"]/g, (char) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[char]};`)
}

/**
 * The epic server's own settings, never passed on to an app it starts:  its checkout (`EPIC_CHECKOUT`, which
 * spell-app's page server's epic routes would read), its home, its `tsx` config, and yarn's starting folder
 * (`INIT_CWD`, which `spell server` takes as the checkout).
 */
const NOT_PASSED = ["EPIC_CHECKOUT", "SPELL_EPIC_HOME", "TSX_TSCONFIG_PATH", "INIT_CWD"]
