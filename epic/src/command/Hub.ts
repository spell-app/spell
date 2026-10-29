import { resolve } from "node:path"

import { CLI } from "spell/cli"
import { RealPath } from "spell/server/RealPath"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicHome } from "spell/epic/config/EpicHome"
import { RepoList } from "spell/epic/server/RepoList"
import { DEFAULT_EPIC_PORT, PID_FILE } from "spell/epic/server/server.types"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types"

/****************
 * ### `Hub`
 * `epic hub <verb>`:  the machine's ONE epic server (`EpicServer`, epic `epic-eject` P7).
 * It sits beside `epic server`, which is still each checkout's own page server.
 *
 * The same verbs as `epic server`:
 * - `serve [--port <n>]`:  run it in the foreground, until `Ctrl-C`
 * - `start` / `ensure [--port <n>]`:  start it in the background if it isn't running;
 *   JSON `{ base, port, pid, repos, launched ... }`
 *   - always on that port (default 4848):  never another, so open pages keep their address (epic `epic-engine` I69;
 *     `EpicServer.claimPort()`)
 * - `stop`:  stop it
 * - `status`:  JSON, exit 1 when it isn't running
 * - `url <file>`:  ensure it runs, then print the URL that serves `<file>` (a page in a registered repo's content)
 *
 * - Its repos:  `epic repo` (`Repos`);  `epic server <verb>` in a repo `epic init` set up registers that one first
 *   (`registerHere()`)
 * - Its files:  `~/.spell-epic/` (`server.json`, `server.log`).
 * - The server's code loads on first use (a dynamic `import()`):  the other verbs don't pay for it.
 ****************/
export class Hub {
  /** spell-epic's home folder:  the repo list, the pid file, the log */
  readonly home: string

  /** - `home`:  default the epic home (`EpicHome.folder()`:  `~/.spell-epic`, or `SPELL_EPIC_HOME`) */
  constructor({ home = EpicHome.folder() }: { home?: string } = {}) {
    this.home = resolve(home)
  }

  /** Run `epic hub <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args)
    const [verb, file] = positional
    const port = Number(flags.port ?? DEFAULT_EPIC_PORT)
    switch (verb) {
      case "serve":
        return this.serve(port)
      case "start":
      case "ensure":
        CLI.out(JSON.stringify(await this.ensure(port), null, 2))
        return EXIT.OK
      case "stop":
        CLI.out((await (await this.pidFile()).stop()) ? "stopped" : "not running")
        return EXIT.OK
      case "status": {
        const running = await (await this.pidFile()).status()
        CLI.out(running ? JSON.stringify(running, null, 2) : "not running")
        return running ? EXIT.OK : EXIT.ERRORS
      }
      case "url": {
        if (!file) throw new EpicCommandError("url:  which file?  epic hub url <file>", EXIT.USAGE)
        CLI.out(await this.urlOf(resolve(file), port))
        return EXIT.OK
      }
      default:
        throw new EpicCommandError(`unknown verb '${verb ?? ""}':  serve, start, ensure, stop, status or url`)
    }
  }

  /**
   * Register the repo `cwd` is in, when `epic init` set it up and the epic server doesn't serve it yet;
   * returns its name then, else `undefined`.
   * - for `epic server <verb>` in such a repo (`EpicProgram`):  its first `start` serves it, no `epic repo add` first
   * - says so on stderr:  stdout stays the verb's JSON
   * - SIDE EFFECT:  writes the repo list
   */
  registerHere(cwd = process.cwd()): string | undefined {
    if (!EpicConfig.ofSetUp(cwd)) return undefined
    const list = new RepoList({ home: this.home })
    const main = EpicConfig.mainOf(cwd)
    if (list.repos().some((repo) => RealPath.same(repo.checkout, main))) return undefined
    const repo = list.add(main)
    process.stderr.write(`epic server:  now serves ${repo.name} (${main});  epic repo list\n`)
    return repo.name
  }

  /**
   * `file`'s URL on the epic server, started first if need be.
   * - throws `EpicCommandError` for a file in no registered repo's content
   */
  async urlOf(file: string, port = DEFAULT_EPIC_PORT): Promise<string> {
    const path = new RepoList({ home: this.home }).urlPathFor(file)
    if (!path) throw new EpicCommandError(`${file} is in no registered repo's content:  epic repo list`)
    const { base } = await this.ensure(port)
    return `${base}${path}`
  }

  /**
   * The server, started in the background if it isn't running (`EpicServer.ensure()`), always on `port`.
   * - `port` taken by something else, or a server that won't start:  `EpicCommandError`, its message on one line,
   *   which the openers show (`pages.js` `ensureEpicServer()`)
   */
  async ensure(port = DEFAULT_EPIC_PORT) {
    if (!new RepoList({ home: this.home }).repos().length)
      throw new EpicCommandError("no repos to serve yet:  epic repo add <checkout>")
    const [{ EpicServer }, { SRV }] = await Promise.all([
      import("spell/epic/server/EpicServer"),
      import("spell/server")
    ])
    try {
      return await EpicServer.ensure(this.home, port)
    } catch (error) {
      if (error instanceof SRV.HttpError) throw new EpicCommandError(`epic server:  ${error.message}`, EXIT.ERRORS)
      throw error
    }
  }

  /** Serve in the foreground until `Ctrl-C`;  resolves to 0 once stopped. */
  private async serve(port: number): Promise<number> {
    const [{ EpicServer }, { SRV }] = await Promise.all([
      import("spell/epic/server/EpicServer"),
      import("spell/server")
    ])
    const server = await new EpicServer({ home: this.home }).start({ port })
    const repos = server.repos.map((repo) => `${repo.name}${repo.isDefault ? " (at /)" : ""}`).join(", ")
    CLI.out(`epic server:  ${server.web.url}/  (repos:  ${repos || "none"};  engine ${server.engine})`)
    await SRV.untilInterrupted(server.web.server, () => server.stop())
    return EXIT.OK
  }

  /** The server's pid file, `<home>/server.json`. */
  private async pidFile() {
    const { SRV } = await import("spell/server")
    return new SRV.PidFile(this.home, PID_FILE)
  }
}
