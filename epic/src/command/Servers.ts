import { join } from "node:path"

import { CLI } from "spell/cli"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { RepoList } from "spell/epic/server/RepoList"
import type { Repo } from "spell/epic/server/server.types"

import { EpicCommandError, parseVerbArgs } from "./command.types"

/****************
 * ### `Servers`
 * `epic servers <verb>`:  another name for `spell server start | stop | restart | status` (epic `epic-engine` P85),
 * which asks Spell's server keeper about a MAIN checkout's servers (`spell/server/keeper`).
 * - `<verb> [<server>] [...]`:  the same words passed on to `spell server`, run in the repo's main checkout, its exit
 *   code and output unchanged;  `<server>`:  `page-server`, `editor`, or a name `spell keeper add` registered
 * - `--repo <name>`:  which repo's main checkout, by its name in the hub's list;  else the one this checkout is of,
 *   else the hub's default
 * - Plural on purpose:  `epic hub` is the hub itself, `epic server` this checkout's own page server.
 * - Why it's still here:  agents and the command guard's messages learned it in P84;  the keeper is Spell's now, so
 *   `spell server ...` is the name to teach.
 ****************/
export class Servers {
  /** the epic home:  the repo list */
  readonly home?: string

  /** the `spell` bin it runs:  the kit's, beside this code */
  readonly spellBin: string

  /** - `home`:  default the epic home;  `spellBin`:  default the kit's `bin/spell.mjs` (a test hands its own) */
  constructor({ home, spellBin = join(CLI.KIT_ROOT, "bin", "spell.mjs") }: { home?: string; spellBin?: string } = {}) {
    this.home = home
    this.spellBin = spellBin
  }

  /** Run `epic servers <args>`;  resolves to `spell server`'s exit code.  Throws `EpicCommandError` for a bad verb. */
  async run(args: string[], cwd = process.cwd()): Promise<number> {
    const [verb] = parseVerbArgs(args).positional
    if (!verb || !VERBS.has(verb))
      throw new EpicCommandError(`unknown verb '${verb ?? ""}':  start, stop, restart or status (spell server's)`)
    const { repo, rest } = withoutRepo(args)
    const checkout = this.checkoutFor(repo, cwd)
    return CLI.runChild(process.execPath, [this.spellBin, "server", ...rest], { cwd: checkout })
  }

  /** the main checkout asked for:  `--repo`, else the one `cwd` is a checkout of, else the hub's default, else `cwd` */
  checkoutFor(name: string | undefined, cwd: string): string {
    const repos: Repo[] = new RepoList(this.home ? { home: this.home } : {}).repos()
    if (name) {
      const repo = repos.find((each) => each.name === name)
      if (!repo)
        throw new EpicCommandError(`no repo named ${name}:  ${repos.map((each) => each.name).join(", ") || "none"}`)
      return repo.checkout
    }
    const main = EpicConfig.ofSetUp(cwd) ? EpicConfig.mainOf(cwd) : undefined
    if (main) return main
    return (repos.find((each) => each.isDefault) ?? repos[0])?.checkout ?? cwd
  }
}

/** `spell server`'s verbs this passes on. */
const VERBS = new Set(["start", "stop", "restart", "status"])

/** `args` without `--repo <name>` (or `--repo=<name>`), and the name */
export function withoutRepo(args: string[]): { repo?: string; rest: string[] } {
  const rest: string[] = []
  let repo: string | undefined
  for (let at = 0; at < args.length; at++) {
    const arg = args[at]!
    if (arg === "--repo") repo = args[++at]
    else if (arg.startsWith("--repo=")) repo = arg.slice("--repo=".length)
    else rest.push(arg)
  }
  return { ...(repo && { repo }), rest }
}
