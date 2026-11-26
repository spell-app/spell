/**
 * The `spell` command's entry, run by `bin/spell.mjs`:  every folder's commands, then the command line.
 * - Loads only what `spell help` needs:  commander, and each repo's command list (`spellRepos()`, `commandLists()`).
 *   A command's action imports its own work when it runs, so `spell pony` never loads spell.
 * - `spell --version`:  the one package's, `spell 0.8.6`:  every folder shares it (epic `repo-split` P20),
 *   so no line per folder, under its old repo's name
 * - Before the command:  the server keeper started in the background when none runs (`ensureKeeperSoon()`)
 * - NOT in the barrel:  importing it runs the command line.
 */
import { CLI } from "spell/cli"
import { ensureKeeperSoon } from "spell/cli/keeperEnsure"

// output piped into e.g. `head`, which closed it:  nothing more to say
process.stdout.on("error", (error: NodeJS.ErrnoException) => error.code === "EPIPE" && process.exit(0))

// Spell's server keeper, started in the background when none runs (epic `editor` P48)
ensureKeeperSoon()

const repos = CLI.spellRepos()
const [kit] = repos
const program = CLI.spellProgram().version(`${kit!.name} ${kit!.version}`, "-V, --version", "spell's version")
CLI.addRepoCommands(program, await CLI.commandLists(repos))
CLI.addHelp(program)
await program.parseAsync()
