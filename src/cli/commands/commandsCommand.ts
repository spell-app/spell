import chalk from "chalk"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { contentFolderOf } from "spell/server/contentFolder"
import { DataFile } from "spell/server/DataFile"
import { kitFolders } from "spell/server/kitFolders"
import { CLI } from "spell/cli"

/**
 * `spell commands [list|check]`:  every command the repos have, against the commands page.
 * - the commands:  yarn scripts, `spell` commands, `epic` verbs, skills
 * - the page's data:  `commands.json5` (`guides/dev/commands/`, in the shared content folder), which maps each command
 *   to the operations it does
 * - `list` (default):  every command, with whether the page names it (`✓` / `✗`)
 * - `check`:  just the problems:  commands the page never names, and names on the page no command has
 *   - exits 1 if there are any
 *   - run it after adding, renaming or removing a command
 * - `--json`:  `{ commands: [{ name, surface, named }], missing, stale }`
 * - Which checkout:  the nearest kit from the current folder up (`findCheckout(KIT_MARKER)`), so a worktree checks
 *   its own.  Its page's data:  in the kit's content folder (`contentFolderOf()`).
 * - What counts:  `commandSources()`;  what the page names:  `pageNames()`.
 * - Throws `CliError` for another verb, or no page.
 */
export async function commandsCommand(verb = "list", options: CLI.CommandsOptions = {}): Promise<number> {
  if (verb !== "list" && verb !== "check") throw new CLI.CliError(`unknown verb '${verb}':  list or check`)
  const root = CLI.findCheckout(CLI.KIT_MARKER)
  const content = contentFolderOf(root) ?? root
  const file = join(content, CLI.COMMANDS_JSON)
  const data = DataFile.read<CommandsData>(file)
  if (!data) throw new CLI.CliError(`no ${CLI.COMMANDS_JSON} in ${content}`)
  const commands = commandSources(root, data.sources)
  const named = pageNames(data)
  const missing = commands.filter((command) => !named.has(command.name)).map((command) => command.name)
  const known = new Set(commands.map((command) => command.name))
  // the page is shared by every checkout (epic `shared-content`):  a yarn row of a package THIS checkout lacks (a
  // repo not cloned here) is another checkout's, not stale
  const here = packageNames(root)
  const unknown = [...named].filter((name) => !known.has(name)).sort()
  const elsewhere = unknown.filter((name) => isYarnName(name) && !here.has(name.split(" ")[0]!))
  const stale = unknown.filter((name) => !elsewhere.includes(name))
  const ok = missing.length === 0 && stale.length === 0

  if (options.json) {
    const listed = commands.map((command) => ({ ...command, named: named.has(command.name) }))
    CLI.out(JSON.stringify({ commands: listed, missing, stale }, null, 2))
  } else if (verb === "list") {
    for (const command of commands) {
      const mark = named.has(command.name) ? chalk.green("✓") : chalk.red("✗")
      CLI.out(`${mark} ${command.surface.padEnd(5)}  ${command.name}`)
    }
    if (stale.length) CLI.out(`\n${chalk.red("on the page, but no such command:")}\n  ${stale.join("\n  ")}`)
  } else {
    if (missing.length) CLI.out(`${chalk.red("not on the commands page:")}\n  ${missing.join("\n  ")}`)
    if (stale.length) CLI.out(`${chalk.red("on the commands page, but no such command:")}\n  ${stale.join("\n  ")}`)
    if (elsewhere.length) {
      const packages = [...new Set(elsewhere.map((name) => name.split(" ")[0]))].join(", ")
      CLI.err(chalk.dim(`(${elsewhere.length} rows for packages this checkout doesn't have:  ${packages})`))
    }
    if (ok) CLI.err(chalk.green(`${commands.length} commands, every one on the commands page`))
    else CLI.err(`fix:  ${DataFile.found(file)} (rows' cli / skill / yarn names)`)
  }
  return verb === "check" && !ok ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** The yarn package names kit `root` has, as the page writes them:  `root`, `ui-site`, each repo's package. */
function packageNames(root: string): Set<string> {
  return new Set(packageManifests(root).map(([name]) => name))
}

/**
 * Each yarn package's `package.json` in kit `root`, as `[page name, absolute path]`:
 * - the kit's own, as `root`
 * - each of its folders (`kitFolders()`:  `parser/`, `ui/` ...), by its package's name, the old repo's
 *   (`spell-parser`, `spell-app` ...:  their scripts' page names since epic `repo-split` P11)
 * - Spell UI's site, `ui-site`
 * - only the ones that are there
 */
function packageManifests(root: string): Array<[string, string]> {
  const found: Array<[string, string]> = [["root", join(root, "package.json")]]
  for (const [name, dir] of folders(root)) found.push([name, join(dir, "package.json")])
  const ui = folders(root).get("spell-ui")
  if (ui) found.push(["ui-site", join(ui, "site", "package.json")])
  return found.filter(([, file]) => existsSync(file))
}

/** The kit's folders, by their package's name (`spell-epic` => `<root>/epic`), in the kit's order. */
function folders(root: string): Map<string, string> {
  return new Map(
    kitFolders(root).map((dir) => [(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { name: string }).name, dir])
  )
}

/** A yarn command's page name, `<package> <script>`:  not a skill (`/name`), a `spell` or an `epic` command. */
function isYarnName(name: string): boolean {
  return !name.startsWith("/") && !name.startsWith("spell ") && !name.startsWith("epic ")
}

/**
 * Every command in kit `root`, sorted by surface then name, each in the page's name form.
 * - yarn:  `<package> <script>` for each package `packageManifests()` finds (the kit's is `root`);  keys starting
 *   with `/` are section labels, not scripts
 * - CLI:  `spell <command>` and `spell <group> <command>`, from every repo's command list (`cliSources()`);
 *   `epic <verb>`, from spell-epic's `EpicProgram.ts`.  NOTE: the SOURCE, not this process's commander program:
 *   the checkout checked may not be the one `spell` runs from.
 * - skills:  `/<name>` for each `SKILL.md` in the kit's and each folder's `.claude/skills/*`, and the engine's
 *   `skills/*`;  plus `sources.userSkills` found in `~/.claude/skills`;  minus `sources.ignore`
 */
export function commandSources(root: string, sources: CommandsData["sources"] = {}, home = homedir()): CommandSource[] {
  const found: CommandSource[] = []
  for (const [name, path] of packageManifests(root)) {
    const { scripts = {} } = JSON.parse(readFileSync(path, "utf8")) as { scripts?: Record<string, string> }
    for (const script of Object.keys(scripts)) {
      if (!script.startsWith("/")) found.push({ surface: "yarn", name: `${name} ${script}` })
    }
  }
  for (const { file, receiver, groups } of cliSources(root)) {
    for (const name of commandNames(readFileSync(file, "utf8"), receiver, groups)) found.push({ surface: "cli", name })
  }
  const engine = folders(root).get(ENGINE)
  const skillFolders = [join(root, ".claude", "skills"), ...(engine ? [join(engine, "skills")] : [])].concat(
    [...folders(root).values()].map((dir) => join(dir, ".claude", "skills"))
  )
  for (const folder of skillFolders) {
    if (!existsSync(folder)) continue
    for (const name of readdirSync(folder)) {
      if (existsSync(join(folder, name, "SKILL.md"))) found.push({ surface: "skill", name: `/${name}` })
    }
  }
  for (const name of sources.userSkills ?? []) {
    if (existsSync(join(home, ".claude", "skills", name, "SKILL.md")))
      found.push({ surface: "skill", name: `/${name}` })
  }
  const ignore = new Set(sources.ignore ?? [])
  const unique = new Map(found.filter((it) => !ignore.has(it.name)).map((it) => [it.name, it]))
  const order = { cli: 0, skill: 1, yarn: 2 }
  return [...unique.values()].sort((a, b) => order[a.surface] - order[b.surface] || a.name.localeCompare(b.name))
}

/**
 * The files whose command calls are the CLI's, in kit `root`, with how to read each:
 * - every repo's command list (`"spell": { "commands" }`, `spellRepos()`):  `spell.command("x")` is `spell x`,
 *   and a group's own (`const server = spell.command("server")`, then `server.command("start")`) `spell server start`
 * - spell-epic's `EpicProgram.ts`:  `epic.command("send")` is `epic send` (its verbs' own verbs aren't listed)
 */
function cliSources(root: string): { file: string; receiver: string; groups: boolean }[] {
  const lists = CLI.spellRepos(root).flatMap((repo) => (repo.commands ? [repo.commands] : []))
  const folder = folders(root).get(ENGINE)
  const engine = folder ? join(folder, EPIC_PROGRAM) : ""
  return [
    ...lists.map((file) => ({ file, receiver: "spell", groups: true })),
    ...(engine && existsSync(engine) ? [{ file: engine, receiver: "epic", groups: false }] : [])
  ]
}

/**
 * The command names `text` declares, in the page's form:  `<receiver>.command("x")` is `<receiver> x`.
 * - `groups`:  a group declared as `const <var> = <known>.command("x")` makes `<var>` a receiver too, its commands
 *   `<receiver> x <name>`
 * - So keep each command's name a literal at its call.
 */
export function commandNames(text: string, receiver: string, groups: boolean): string[] {
  const prefixes = new Map([[receiver, receiver]])
  if (groups) {
    for (const [, variable, owner, name] of text.matchAll(/\bconst\s+(\w+)\s*=\s*(\w+)\s*\.command\("([\w-]+)"/g)) {
      const prefix = prefixes.get(owner!)
      if (prefix) prefixes.set(variable!, `${prefix} ${name}`)
    }
  }
  const names: string[] = []
  for (const [, owner, name] of text.matchAll(/\b(\w+)\s*\.command\("([\w-]+)"/g)) {
    const prefix = prefixes.get(owner!)
    if (prefix) names.push(`${prefix} ${name}`)
  }
  return names
}

/** The folder of the epic engine's package:  its `epic` command and the plugin's skills (`skills/`). */
const ENGINE = "spell-epic"

/** The `epic` command's verbs, from the engine's folder. */
const EPIC_PROGRAM = join("src", "cli", "EpicProgram.ts")

/** Every command name the page's rows give, in any surface's `names`. */
export function pageNames(data: CommandsData): Set<string> {
  const names = new Set<string>()
  for (const family of data.families ?? []) {
    for (const row of family.rows ?? []) {
      for (const cell of [row.cli, row.skill, row.yarn]) for (const name of [cell?.names ?? []].flat()) names.add(name)
    }
  }
  return names
}

/**
 * The parts of `commands.json5` this reads;  its full shape:  spell-epic's `src/tools/_assets/commands.js`'s header.
 * - `sources.userSkills`:  skills in `~/.claude/skills` that count, e.g. `session`
 * - `sources.ignore`:  commands that need no row, e.g. `/solid-2` (reference only, runs nothing)
 */
export type CommandsData = {
  sources?: { userSkills?: string[]; ignore?: string[] }
  families?: { rows?: { cli?: CommandCell; skill?: CommandCell; yarn?: CommandCell }[] }[]
}

/** One surface's cell of a row:  the commands that do the operation. */
type CommandCell = { names?: string | string[] }

/** One command the repos have:  which surface, and its name in the page's form (`root ts`, `/epic`). */
export type CommandSource = { surface: "cli" | "skill" | "yarn"; name: string }
