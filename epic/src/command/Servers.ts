import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import { RealPath } from "spell/server/RealPath"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { RepoList } from "spell/epic/server/RepoList"
import type { KeptServer, Repo, ServersAnswer } from "spell/epic/server/server.types"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types"
import { Hub } from "./Hub"

/****************
 * ### `Servers`
 * `epic servers <verb>`:  the ONE way an agent asks for a MAIN checkout's servers to start, stop or restart (epic
 * `epic-engine` P84):  it asks the server keeper (`ServerKeeper`, in the epic hub), with the same calls the Servers
 * tab's buttons make (`SRV.KeeperLink.ask()`).
 * - `start | stop | restart <server> [--repo <name>]`:  `page-server` (or `page`), `editor`, or one of the repo's own
 *   servers by its name;  the repo:  `--repo`, else the one this checkout is of, else the hub's default
 * - `status [--repo <name>] [--json]`:  main's servers as the keeper last saw them, one line each
 * - the hub is started first when it isn't running (`Hub.ensure()`):  the keeper lives in it
 * - Plural on purpose:  `epic hub` is the hub itself, `epic server` this checkout's own page server.
 * - Why:  sessions killed main's editors by their process numbers and started every server in the main checkout by
 *   hand, and three editors ended up on 3000, 3001 and 3002;  the command guard (`ServerGuard`) now refuses that,
 *   naming this instead.
 ****************/
export class Servers {
  /** the epic home:  the repo list, the hub */
  readonly home?: string

  /** - `home`:  default the epic home */
  constructor({ home }: { home?: string } = {}) {
    this.home = home
  }

  /** Run `epic servers <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[], cwd = process.cwd()): Promise<number> {
    const { positional, flags } = parseVerbArgs(args)
    const [verb, named] = positional
    const repo = this.repoFor(typeof flags.repo === "string" ? flags.repo : undefined, cwd)
    switch (verb) {
      case "status":
        return this.status(repo, flags.json === true)
      case "start":
      case "stop":
      case "restart": {
        if (!named)
          throw new EpicCommandError(`${verb}:  which server?  epic servers ${verb} page-server | editor | <its name>`)
        return this.act(verb, repo, serverNamed(named))
      }
      default:
        throw new EpicCommandError(`unknown verb '${verb ?? ""}':  start, stop, restart or status`)
    }
  }

  /** `start`, `stop`, `restart`:  asked of the keeper, its answer in one line */
  private async act(action: SRV.KeeperAction, repo: Repo, server: string): Promise<number> {
    if (server === "hub")
      throw new EpicCommandError(
        "the hub keeps the other servers, so it isn't started or stopped this way:  epic hub kick makes it look now"
      )
    await new Hub(this.hubOptions()).ensure()
    const answer = await new SRV.KeeperLink().ask(action, { checkout: repo.checkout, server })
    if (!answer)
      throw new EpicCommandError("the server keeper isn't answering:  epic hub kick, then try again", EXIT.ERRORS)
    const where = answer.base ? `, at ${answer.base}/` : ""
    CLI.out(`${repo.name}'s ${server}:  ${answer.state ?? "asked"}${where}`)
    if (server === "editor" && action !== "stop")
      CLI.out("(the editor comes back with its page server, which restarts)")
    return EXIT.OK
  }

  /** `status`:  main's servers of `repo`, as the keeper last looked */
  private async status(repo: Repo, json: boolean): Promise<number> {
    await new Hub(this.hubOptions()).ensure()
    const keeper = new SRV.KeeperLink().running()
    if (!keeper) throw new EpicCommandError("the server keeper isn't running:  epic hub kick", EXIT.ERRORS)
    const response = await fetch(`${keeper.base}${SRV.KEEPER_API}`, { signal: AbortSignal.timeout(STATUS_WAIT_MS) })
    const answer = (await response.json()) as ServersAnswer
    const rows = answer.servers.filter((row) => !row.worktree && (row.id === "hub" || row.repo === repo.name))
    if (json) CLI.out(JSON.stringify({ handsOff: answer.handsOff === true, servers: rows }, null, 2))
    else {
      if (answer.handsOff) CLI.out("Hands off is on (the Servers tab):  the keeper starts and stops nothing by itself.")
      for (const row of rows) CLI.out(statusLine(row))
    }
    return EXIT.OK
  }

  /** the repo asked for:  `--repo`, else the one `cwd` is a checkout of, else the hub's default */
  private repoFor(name: string | undefined, cwd: string): Repo {
    const repos = new RepoList(this.hubOptions()).repos()
    if (!repos.length) throw new EpicCommandError("the epic hub serves no repos yet:  epic repos add <checkout>")
    if (name) {
      const repo = repos.find((each) => each.name === name)
      if (!repo) throw new EpicCommandError(`no repo named ${name}:  ${repos.map((each) => each.name).join(", ")}`)
      return repo
    }
    const main = EpicConfig.ofSetUp(cwd) ? EpicConfig.mainOf(cwd) : undefined
    return (
      repos.find((each) => main && RealPath.same(each.checkout, main)) ??
      repos.find((each) => each.isDefault) ??
      repos[0]!
    )
  }

  /** the home, for `Hub` and `RepoList` */
  private hubOptions(): { home?: string } {
    return this.home ? { home: this.home } : {}
  }
}

/** a server as typed (`page-server`, `page`, `editor`, an own server's name) as the keeper names it */
function serverNamed(typed: string): string {
  return PAGE_SERVER_NAMES.has(typed) ? "page server" : typed
}

/** one server's line:  its name, state, address and why */
function statusLine(row: KeptServer): string {
  const name = row.name.padEnd(12)
  const state = row.state.padEnd(9)
  return `${name} ${state} ${row.address ?? ""}${row.why ? `  (${row.why})` : ""}`.trimEnd()
}

/** What a page server may be typed as. */
const PAGE_SERVER_NAMES = new Set(["page-server", "page", "page server", "pageserver"])

/** How long `status` waits for the keeper. */
const STATUS_WAIT_MS = 15_000
