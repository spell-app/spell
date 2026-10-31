import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { RepoList, RepoListError } from "spell/epic/server/RepoList"
import type { Repo } from "spell/epic/server/server.types"

import { EXIT, EpicCommandError, parseVerbArgs, stringFlag } from "./command.types"

/****************
 * ### `Repos`
 * `epic repos <verb>`:  the code repos the machine's epic server serves
 * (`RepoList`, `~/.spell-epic/repos.json5`;  epic `epic-eject` P7).
 * - `add [<checkout>] [--name <name>] [--default]`:
 *   register the repo `<checkout>` is in (default:  this one), as its folder's name or `<name>`
 *   - `--default`:  served at `/` from now on
 * - `list [--json]`:  every repo, its epic folder and URL prefix, the default marked
 * - `epic repo <verb>`, the old name, still works a while (epic `epic-engine` P56, Q63):
 *   "the epic repo" is the one holding the epic pages, not one of these
 * - `remove <name>`:  unregister it
 * - `default <name>`:  serve it at `/`
 * - The server picks up a change at its next `epic hub ensure` (it restarts when the list is newer than it).
 ****************/
export class Repos {
  /** the list */
  readonly list: RepoList

  /** - `list`:  default the home folder's (`~/.spell-epic`, or `SPELL_EPIC_HOME`) */
  constructor({ list = new RepoList() }: { list?: RepoList } = {}) {
    this.list = list
  }

  /** Run `epic repos <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["default", "json"])
    const [verb, target] = positional
    try {
      switch (verb) {
        case "add": {
          const name = stringFlag(flags.name)
          const repo = this.list.add(target ?? Git.mainRoot(), { name, isDefault: flags.default === true })
          CLI.out(`added ${Repos.line(repo)}`)
          return EXIT.OK
        }
        case "list": {
          const repos = this.list.repos()
          if (flags.json) CLI.out(JSON.stringify(repos, null, 2))
          else CLI.out(repos.length ? repos.map(Repos.line).join("\n") : "no repos yet:  epic repos add <checkout>")
          return EXIT.OK
        }
        case "remove": {
          if (!target) throw new EpicCommandError("remove:  which repo?  epic repos remove <name>")
          if (!this.list.remove(target))
            throw new EpicCommandError(`no repo "${target}":  epic repos list`, EXIT.ERRORS)
          CLI.out(`removed ${target}`)
          return EXIT.OK
        }
        case "default": {
          if (!target) throw new EpicCommandError("default:  which repo?  epic repos default <name>")
          this.list.setDefault(target)
          CLI.out(`${target} is served at / now`)
          return EXIT.OK
        }
        default:
          throw new EpicCommandError(`unknown verb '${verb ?? ""}':  add, list, remove or default`)
      }
    } catch (error) {
      if (error instanceof RepoListError) throw new EpicCommandError(error.message, EXIT.ERRORS)
      throw error
    }
  }

  /** `repo` on one line:  `spell-app  /r/spell-app/ (and /)  <checkout>  content <folder>`. */
  static line(repo: Repo): string {
    const at = repo.isDefault ? `${repo.prefix} (and /)` : repo.prefix
    return `${repo.name}  ${at}  ${repo.checkout}  content ${repo.content}`
  }
}
