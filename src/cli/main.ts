/**
 * The `spell` command's entry, run by `bin/spell.mjs`:  every folder's commands, then the command line.
 * - Loads only what `spell help` needs:  commander, and each repo's command list (`spellRepos()`, `commandLists()`).
 *   A command's action imports its own work when it runs, so `spell pony` never loads spell.
 * - `spell --version`:  each folder's version, the kit's first.
 * - NOT in the barrel:  importing it runs the command line.
 */
import { CLI } from "spell/cli"

// output piped into e.g. `head`, which closed it:  nothing more to say
process.stdout.on("error", (error: NodeJS.ErrnoException) => error.code === "EPIPE" && process.exit(0))

const repos = CLI.spellRepos()
const program = CLI.spellProgram().version(
  repos.map((repo) => `${repo.name} ${repo.version}`).join("\n"),
  "-V, --version",
  "each folder's version"
)
CLI.addRepoCommands(program, await CLI.commandLists(repos))
CLI.addHelp(program)
await program.parseAsync()
