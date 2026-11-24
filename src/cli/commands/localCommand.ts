import { spawnSync } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"

import { CLI } from "spell/cli"
import { KIT_FILE, kitProblem, kitSetting, SPELL_KIT } from "spell/cli/kitCheckout"
import { PathLink, type PathLinkResult, type PathUnlinkResult } from "spell/cli/PathLink"

import { EPIC_BIN, type EpicRunner, MachineTools, type MachineSwitch } from "./localMachine"
import { type SpellServer, spellServers, stopServers } from "./localServers"
import { CHECKOUT_BINS, LINKED_COMMANDS, localTools } from "./localTools"
import { ProjectWorktrees } from "./localWorktrees"

/**
 * `spell local [status | on [checkout] | off]`:  run your own Spell checkout in a project that installs `spell` from
 * npm, for you alone (epic `repo-split` T70).
 * - `on` writes the project's `KIT_FILE`, `.spell/kit.json5`, naming the checkout;  every published bin reads it and runs
 *   the checkout's own instead (`kitCheckoutBin()`).  `SPELL_KIT`, when set, wins over it.
 * - The project:  the nearest folder from where it was started up with a `package.json`.
 * - The checkout:  `checkout`, else the one this `spell` runs from when it's a checkout, else `~/www/spell`;
 *   it must be installed (`yarn install` there), or nothing is written.
 * - Keeps the file out of git:  adds `/.spell/` to the project's `.gitignore` when git doesn't ignore it yet.
 * - A copy in each of the project's git worktrees (`ProjectWorktrees`, T72):  a `spell` from npm older than T72 reads
 *   only its own folder's
 * - Puts `spell` and `epic` on your `PATH` too, linked to the checkout, as `yarn cli:install` does
 *   (`PathLink.linkFor()`, epic `repo-split` T71):  so you type `spell`, not `yarn spell`, here and in the checkout.
 * - Switches what's machine-wide too (`MachineTools`, T72, reversing J230):  Claude Code's epic plugin and its skills,
 *   and VS Code's extension when the checkout has built one;  and says the epic server, or another server, runs
 *   another copy of Spell
 *   - `--stop`:  stops those servers (`stopServers()`), and starts the epic server again from the checkout:  the
 *     ONLY way it stops anything
 * - `off`:  removes the file and its worktree copies, and each `PATH` link and the plugin once no project runs a
 *   checkout, when `spell local` changed them (`PathLink.unlinkFor()`, `MachineTools.switchOff()`);  a link you made
 *   yourself stays, and so does VS Code's extension
 * - `status` (the default):  says which Spell runs here, and why, and every way Spell runs here, each with whether
 *   it follows the checkout (`localTools()`);  changes nothing.
 * - `probes`:  what it asks the machine, for tests:  NEVER the real Claude Code, VS Code or servers in a test
 * - Throws `CliError` for a checkout that can't run, a checkout named to `off` or `status`, or another verb.
 */
export async function localCommand(
  verb = "status",
  checkout?: string,
  options: CLI.LocalOptions = {},
  probes: LocalProbes = {}
): Promise<number> {
  if (!LOCAL_VERBS.includes(verb)) throw new CLI.CliError(`unknown verb '${verb}':  ${LOCAL_VERBS.join(", ")}`)
  if (checkout && verb !== "on") throw new CLI.CliError(`spell local ${verb} takes no checkout`)
  if (options.stop && verb !== "on") throw new CLI.CliError("--stop goes with spell local on")
  const from = process.env.INIT_CWD ?? process.cwd()
  const project = CLI.findCheckout("package.json", from, from)
  const file = join(project, KIT_FILE)
  const machine = new MachineTools({ run: probes.run })
  if (verb === "status") return report(project, options, probes)
  if (verb === "off") {
    const had = existsSync(file)
    rmSync(file, { force: true })
    const worktrees = new ProjectWorktrees(project).unfollow()
    const links = LINKED_COMMANDS.map((command) => ({ command, ...new PathLink({ command }).unlinkFor(project) }))
    const plugin = machine.switchOff(project)
    if (options.json) {
      const removed = had ? file : undefined
      CLI.out(JSON.stringify({ project, off: true, removed, worktrees, links, plugin }, null, 2))
    } else {
      CLI.out(had ? `npm's spell runs here again:  removed ${CLI.relativePath(file)}` : "npm's spell runs here already")
      if (worktrees.length)
        CLI.out(
          `- removed your checkout's setting from ${count(worktrees.length, "worktree")} (its other working copies)`
        )
      for (const link of links) {
        const line = unlinkLine(link, had)
        if (line) CLI.out(line)
      }
      for (const line of pluginOffLines(plugin, project, probes)) CLI.out(line)
    }
    warnVariable()
    return CLI.EXIT.OK
  }
  const kit = checkoutToUse(checkout)
  const problem = kitProblem(kit)
  if (problem) throw new CLI.CliError(`can't run your checkout:  ${problem}`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, kitFileText(kit))
  const ignored = keepOutOfGit(project)
  const worktrees = new ProjectWorktrees(project).follow(kitFileText(kit))
  const links = LINKED_COMMANDS.filter((command) => existsSync(join(kit, CHECKOUT_BINS[command]))).map((command) => ({
    command,
    ...new PathLink({ command }).linkFor(project, join(kit, CHECKOUT_BINS[command]))
  }))
  const plugin = machine.switchOn(project, kit)
  // under Vitest, never the machine's processes (`spell.test.ts` runs the real spell)
  const servers = (probes.servers ?? (process.env.VITEST ? [] : spellServers(kit))).filter((server) => !server.isYours)
  const stopped = options.stop ? stopServers(servers, probes.kill) : []
  const restarted = stopped.some((server) => server.kind === "epic") ? startEpicServer(kit, machine) : undefined
  if (options.json) {
    CLI.out(JSON.stringify({ project, kit, file, ignored, worktrees, links, plugin, servers, stopped }, null, 2))
  } else {
    CLI.out(`Here, spell runs your checkout now:  ${shortPath(kit)}`)
    CLI.out(`- written:  ${CLI.relativePath(file)}, yours alone`)
    if (ignored) CLI.out(`- added /.spell/ to ${CLI.relativePath(ignored)}, so git leaves it out`)
    if (worktrees.length)
      CLI.out(
        `- this project's ${count(worktrees.length, "worktree")} (its other working copies) use your checkout too`
      )
    for (const link of links) for (const line of linkLines(link)) CLI.out(line)
    for (const line of pluginOnLines(plugin, kit)) CLI.out(line)
    for (const line of serverLines(servers, stopped, restarted)) CLI.out(line)
    CLI.out("To go back to the copy from npm, type:  spell local off")
  }
  warnVariable()
  return CLI.EXIT.OK
}

/** What `spell local` asks the machine:  tests hand in their own, so no test touches the real ones. */
export type LocalProbes = {
  /** runs a checkout's `epic` (`MachineTools`) */
  run?: EpicRunner
  /** Spell's servers running now;  default:  asks the system */
  servers?: SpellServer[]
  /** stops a server;  default:  `process.kill()` */
  kill?: (pid: number, signal: NodeJS.Signals) => unknown
  /** VS Code's extensions, for `status` */
  extensions?: () => string | undefined
}

/** `spell local`'s verbs, the default first. */
const LOCAL_VERBS = ["status", "on", "off"]

/** The plugin's row in `localTools()`. */
const PLUGIN_TOOL = "Claude Code's epic plugin"

/** What `on` did to Claude Code's epic plugin, its skills and VS Code's extension, in lines:  the novice voice. */
function pluginOnLines(plugin: MachineSwitch, kit: string): string[] {
  const lines = ["For every project on this computer:"]
  if (plugin.outcome === "failed") {
    return [
      ...lines,
      `- Claude Code's epic plugin didn't change:  ${plugin.problem}`,
      `  Try:  epic plugin install --kit ${kit}`
    ]
  }
  const editor = plugin.changes.filter((change) => EDITOR_CHANGE.test(change))
  const claude = plugin.changes.filter((change) => !EDITOR_CHANGE.test(change))
  if (claude.length) {
    lines.push(
      "- Claude Code's epic plugin and its skills now use your checkout.",
      "  To see the change, type /reload-plugins in each Claude Code session, or start a new one.",
      "  Nothing to do for its old background helpers:  they stop by themselves after each session's next turn."
    )
  } else lines.push("- Claude Code's epic plugin and its skills already used your checkout")
  if (editor.some((change) => EXTENSION_INSTALLED.test(change))) {
    lines.push("- VS Code's epic extension is your checkout's now.  Reload each VS Code window to use it.")
  } else if (editor.length && !plugin.missingExtension)
    lines.push(`- VS Code's epic extension didn't change:  ${editor[0]!.replace(EDITOR_CHANGE, "")}`)
  if (plugin.missingExtension) {
    lines.push(
      "- VS Code's add-on for epic pages is out of date.",
      "  The new version of the add-on has to be built first.  That takes about a minute.",
      "  Type each line below in this terminal, pressing Enter after each:",
      `    cd ${shortPath(join(kit, "epic"))}`,
      "    yarn vscode:package",
      "  When the build says DONE, type spell local on again to put the new version in VS Code."
    )
  }
  return lines
}

/** What `off` did to Claude Code's epic plugin, in lines;  none when there's nothing to say.  The novice voice. */
function pluginOffLines(plugin: MachineSwitch, project: string, probes: LocalProbes): string[] {
  if (plugin.outcome === "switched") {
    return [
      "For every project on this computer:",
      "- Claude Code's epic plugin and its skills use the copy npm installed in this project again.",
      "  To see the change, type /reload-plugins in each Claude Code session, or start a new one.",
      "- VS Code keeps the epic extension it has."
    ]
  }
  if (plugin.outcome === "in-use") {
    const others = plugin.projects!.length
    return [
      `- Claude Code's epic plugin still uses your checkout, since ${count(others, "other project")} need it.  Nothing to do.`
    ]
  }
  if (plugin.outcome === "no-install" || plugin.outcome === "failed") {
    return [`- Claude Code's epic plugin didn't change:  ${plugin.problem}`]
  }
  const row = localTools(project, undefined, { extensions: () => undefined, servers: probes.servers }).find(
    (tool) => tool.tool === PLUGIN_TOOL
  )
  return row?.runs && row.fix ? [`- Claude Code's epic plugin still runs ${shortPath(row.runs)}.`, `  ${row.fix}`] : []
}

/** What `on` found and did about servers running another copy of Spell, in lines:  the novice voice. */
function serverLines(servers: SpellServer[], stopped: SpellServer[], restarted: string | undefined): string[] {
  if (!servers.length) return []
  const named = (server: SpellServer) =>
    `${server.kind === "epic" ? "the epic page server" : `a ${server.kind} server`} of ${shortPath(server.copy)} ` +
    `(pid ${server.pid}${server.port ? `, port ${server.port}` : ""})`
  if (!stopped.length) {
    return [
      `${count(servers.length, "program")} still run another copy of Spell, so they don't use your checkout:`,
      ...servers.map((server) => `- ${named(server)}`),
      "To stop them so your checkout takes over, type:  spell local on --stop"
    ]
  }
  const lines = ["Stopped:", ...stopped.map((server) => `- ${named(server)}`)]
  if (restarted === "ok") lines.push("Started again, from your checkout:  the epic page server")
  else if (restarted) lines.push(`The epic page server didn't start again from your checkout:  ${restarted}`)
  if (stopped.some((server) => server.kind === "page")) {
    lines.push("If you need your checkout's page server, start it:  spell server start, in your checkout")
  }
  return lines
}

/** Start the epic server from `kit` (`epic hub start`):  `ok`, or why it didn't.  NEVER throws. */
function startEpicServer(kit: string, machine: MachineTools): string {
  try {
    const ran = machine.run(join(kit, EPIC_BIN), ["hub", "start"], kit)
    return ran.status === 0 ? "ok" : ((ran.stderr || ran.stdout).trim().split("\n").at(-1) ?? "")
  } catch (error) {
    return (error as Error).message
  }
}

/** A change `epic plugin install` made to the editor's extension:  it names the editor first. */
const EDITOR_CHANGE = /^(?:VS Code|Cursor):\s+/

/** The change that says the editor took the extension;  NOT "... isn't installed", which names one it didn't. */
const EXTENSION_INSTALLED = /:\s+extension \S+ \S+ installed/

/** `amount` and `noun`, plural unless it's 1. */
function count(amount: number, noun: string): string {
  return `${amount} ${noun}${amount === 1 ? "" : "s"}`
}

/** `status`:  which Spell runs in `project`, what said so, and every way Spell runs there (`localTools()`). */
function report(project: string, options: CLI.LocalOptions, probes: LocalProbes): number {
  const named = kitSetting(project)
  const problem = named && kitProblem(named.kit)
  const tools = localTools(project, named?.kit, { extensions: probes.extensions, servers: probes.servers })
  if (options.json) CLI.out(JSON.stringify({ project, ...named, problem, tools }, null, 2))
  else {
    if (!named) CLI.out("Here, spell runs npm's copy:  no .spell/kit.json5, and SPELL_KIT isn't set")
    else {
      const by = named.namedBy === SPELL_KIT ? SPELL_KIT : CLI.relativePath(named.namedBy)
      CLI.out(`Here, spell runs your checkout:  ${shortPath(named.kit)} (named by ${by})`)
      if (problem) CLI.out(`- but it can't run:  ${problem}`)
    }
    for (const tool of tools) {
      const mark = !named ? "" : tool.follows ? "  [your checkout]" : "  [NOT your checkout]"
      CLI.out(`- ${tool.tool}:  ${tool.runs ? shortPath(tool.runs) : "not here"}${tool.runs ? mark : ""}`)
      if (tool.note) CLI.out(`  ${shortPath(tool.note)}`)
      if (tool.fix) CLI.out(`  ${tool.fix}`)
    }
  }
  return problem ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** What `on` did to one command on the `PATH`, in lines:  the novice voice (`epic voice check`). */
function linkLines(path: PathLinkResult & { command: string }): string[] {
  const link = shortPath(path.link)
  const { command } = path
  const lines =
    path.outcome === "blocked"
      ? [`- left ${link} as it is:  something else put that file there, so you still type yarn ${command}`]
      : path.outcome === "kept"
        ? [`- typing ${command} ran your checkout already`]
        : path.outcome === "repointed"
          ? [
              `- typing ${command} runs your checkout now, from any folder (${link})`,
              `- before, it ran ${checkoutOf(path.before!)};  spell local off goes back to that`
            ]
          : /* if (path.outcome === "linked") */ [
              `- typing ${command} runs your checkout now, from any folder (${link})`
            ]
  if (path.outcome !== "blocked" && !path.isOnPath) {
    lines.push(
      `NOTE:  your terminal can't find ${command} yet.  Add ${shortPath(dirname(path.link))} to your PATH setting;`,
      `  until then, type yarn spell.`
    )
  }
  return lines
}

/** What `off` did to one command on the `PATH`, in a line;  `undefined` to say nothing.  The novice voice. */
function unlinkLine(path: PathUnlinkResult & { command: string }, had: boolean): string | undefined {
  const { command } = path
  if (path.outcome === "removed") return `- removed the ${command} command spell local added (${shortPath(path.link!)})`
  if (path.outcome === "restored") {
    return `- typing ${command} runs ${checkoutOf(path.target!)} again, as before spell local`
  }
  if (!had) return undefined
  if (path.outcome === "in-use") {
    const count = path.projects!.length
    return `- left the ${command} command in place:  ${count} other project${count === 1 ? "" : "s"} still use your checkout`
  }
  if (path.outcome === "not-ours") return `- left the ${command} command in place:  it was there before spell local`
  return undefined
}

/** The checkout a command's bin (`bin/spell.mjs`, `epic/bin/epic`) is in, short;  any other file as it is. */
function checkoutOf(bin: string): string {
  const own = Object.values(CHECKOUT_BINS).find((path) => bin.endsWith(`/${path}`))
  return shortPath(own ? bin.slice(0, -own.length - 1) : bin)
}

/** The checkout to name:  `checkout`, else the one this `spell` runs from when it's a checkout, else `~/www/spell`. */
function checkoutToUse(checkout?: string): string {
  if (checkout) return resolve(checkout.replace(/^~(?=\/|$)/, homedir()))
  if (existsSync(join(CLI.KIT_ROOT, "src", "cli", "main.ts"))) return CLI.KIT_ROOT
  return join(homedir(), "www", "spell")
}

/** The file's text:  the checkout, by `~/` when it's under the home folder. */
function kitFileText(kit: string): string {
  return [
    "// The Spell checkout `spell` runs here, instead of npm's:  yours alone, never committed.",
    "// Written by `spell local on`;  `spell local off` removes it.",
    `{ kit: ${JSON.stringify(shortPath(kit))} }`,
    ""
  ].join("\n")
}

/**
 * Adds `/.spell/` to `project`'s `.gitignore` when git doesn't ignore `KIT_FILE` yet;  the `.gitignore` changed, or
 * `undefined` (already ignored, or no git there).
 */
function keepOutOfGit(project: string): string | undefined {
  const check = spawnSync("git", ["check-ignore", "-q", KIT_FILE], { cwd: project })
  // 0:  ignored;  1:  not ignored;  128:  no git repo here
  if (check.status !== 1) return undefined
  const gitignore = join(project, ".gitignore")
  const before = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : ""
  const gap = before && !before.endsWith("\n") ? "\n\n" : before ? "\n" : ""
  appendFileSync(gitignore, `${gap}# each person's own Spell settings (spell local):  never committed\n/.spell/\n`)
  return gitignore
}

/** One line when `SPELL_KIT` is set:  it wins over the project's file. */
function warnVariable(): void {
  const variable = process.env[SPELL_KIT]?.trim()
  if (variable) CLI.out(`NOTE:  ${SPELL_KIT}=${variable} is set, and wins over this project's file while it is`)
}

/** `path`, with `~/` for the home folder. */
function shortPath(path: string): string {
  const fromHome = relative(homedir(), path)
  return fromHome && !fromHome.startsWith("..") ? `~/${fromHome}` : path
}
