import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, readlinkSync, realpathSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"

import { isOlder } from "spell/cli/kitCheckout"
import { PathLink } from "spell/cli/PathLink"

import { VSIX } from "./localMachine"
import { type SpellServer, spellServers } from "./localServers"
import { ProjectWorktrees } from "./localWorktrees"

/**
 * Every way Spell runs in a project, and whether each one follows the checkout `spell local on` named
 * (epic `repo-split` T71):  what `spell local status` lists, so you can check it yourself.
 * - `spell` and `epic` typed in a terminal:  the links on your `PATH` (`PathLink`)
 * - `yarn spell` / `npx spell`:  the project's own install, which hands off to the checkout from 0.8.13
 * - the project's git worktrees:  each follows the main checkout's file (T72)
 * - machine-wide (T72):  Claude Code's `epic@spell` plugin, its skills (`~/.claude/skills/`), VS Code's epic
 *   extension, and the epic server (`epic hub`);  `spell local on` switches the first three, and `--stop` restarts
 *   the epic server from the checkout
 * - Spell's other servers running another copy of Spell (an old checkout, an npm install):  `spell local on --stop`
 * - the project's code that imports `spell/...`:  always the install in `node_modules`;  nothing can redirect it
 * - Reads Claude Code's files, never writes them;  names no big folder (`spell/cli` imports none).
 */
export function localTools(project: string, kit: string | undefined, options: LocalToolsOptions = {}): LocalTool[] {
  const env = options.env ?? process.env
  const home = options.home ?? homedir()
  const installed = installedSpell(project)
  const follows = (path: string | undefined) => !!kit && !!path && isInside(path, kit)
  const tools: LocalTool[] = []

  for (const command of LINKED_COMMANDS) {
    const status = new PathLink({ command, env, home }).status()
    const handsOff = !kit && !!installed && !!status && !status.target.includes("/node_modules/")
    const bin = CHECKOUT_BINS[command]
    const runs = status && (status.target.endsWith(`/${bin}`) ? status.target.slice(0, -bin.length - 1) : status.target)
    tools.push({
      tool: `${command}, typed in a terminal`,
      runs: handsOff ? `this project's install, handed to by ${runs}` : runs,
      follows: follows(status?.target),
      note:
        status &&
        `${status.link}:  ${!status.isLink ? "a file, not a link" : status.madeByLocal ? "spell local added it" : "you added it"}`,
      fix: !status
        ? `type yarn ${command === "spell" ? "spell" : "spell epic"} here, or run spell local on`
        : kit && !follows(status.target)
          ? "run spell local on again"
          : undefined
    })
  }

  const canHandOff = !!installed?.version && !isOlder(installed.version, FIRST_KIT_FILE_RELEASE)
  tools.push({
    tool: "yarn spell, npx spell",
    runs: installed && (kit && canHandOff ? kit : installed.folder),
    follows: !!kit && !!installed && (canHandOff || isInside(installed.folder, kit)),
    fix: kit && installed && !canHandOff ? `update spell here to ${FIRST_KIT_FILE_RELEASE} or later` : undefined
  })

  const plugin = claudePlugin(env, home)
  const pluginFollows = follows(plugin?.folder)
  tools.push({
    tool: "Claude Code's epic plugin",
    runs:
      plugin &&
      `${plugin.folder}${plugin.version && !plugin.folder.endsWith(plugin.version) ? ` (${plugin.version})` : ""}`,
    follows: pluginFollows,
    fix:
      kit && !pluginFollows
        ? "run spell local on again;  then /reload-plugins in Claude Code"
        : !kit && plugin && isCheckout(plugin.folder) && installed
          ? `to switch it back, type ${BACK_TO_NPM_PLUGIN} here;  then /reload-plugins in Claude Code`
          : undefined
  })

  tools.push(skillsRow(join(env.CLAUDE_CONFIG_DIR ?? join(home, ".claude"), "skills"), kit))
  tools.push(extensionRow(kit, home, options.extensions ?? listExtensions))
  if (kit) tools.push(...serverRows(options.servers ?? (IN_TESTS ? [] : spellServers(kit))))
  const worktrees = new ProjectWorktrees(project)
  if (kit && worktrees.folders.length) {
    const behind = worktrees.notFollowing
    tools.push({
      tool: "this project's worktrees",
      runs: behind.length ? `${behind.length} of ${worktrees.folders.length} without your checkout's setting` : kit,
      follows: !behind.length,
      note: behind.length ? behind.join(", ") : undefined,
      fix: behind.length ? "run spell local on again" : undefined
    })
  }

  tools.push({
    tool: "this project's code that imports spell",
    runs: installed && `${installed.folder}${installed.version ? ` (${installed.version})` : ""}`,
    follows: !!kit && !!installed && isInside(installed.folder, kit),
    fix:
      kit && installed && !isInside(installed.folder, kit)
        ? "that's normal:  your project's own code always uses the copy npm installed"
        : undefined
  })
  return tools
}

/** The commands `spell local on` puts on the `PATH`, and each one's bin in a checkout. */
export const LINKED_COMMANDS = ["spell", "epic"] as const

/** Each linked command's bin, from a checkout's root. */
export const CHECKOUT_BINS: Record<(typeof LINKED_COMMANDS)[number], string> = {
  spell: "bin/spell.mjs",
  epic: "epic/bin/epic"
}

/** Claude Code's skills of the epic plugin:  where their links in `folder` lead, and whether they follow `kit`. */
function skillsRow(folder: string, kit: string | undefined): LocalTool {
  const targets = existsSync(folder)
    ? readdirSync(folder, { withFileTypes: true })
        .filter((entry) => entry.isSymbolicLink())
        .map((entry) => resolve(folder, readlinkSync(join(folder, entry.name))))
        .filter((target) => EPIC_SKILL.test(target))
    : []
  const copies = [...new Set(targets.map((target) => dirname(realOrAsIs(target))))]
  const follows = !!kit && !!copies.length && copies.every((copy) => isInside(copy, kit))
  return {
    tool: "Claude Code's epic skills",
    runs: copies.length ? `${copies[0]}${copies.length > 1 ? ` and ${copies.length - 1} more` : ""}` : undefined,
    follows,
    note: copies.length ? `${targets.length} links in ${folder}` : undefined,
    fix: kit && copies.length && !follows ? "run spell local on again;  then /reload-plugins in Claude Code" : undefined
  }
}

/**
 * VS Code's epic extension:  its version, against the checkout's;  `list` is `code --list-extensions --show-versions`.
 * - the same version:  it follows unless the checkout's `.vsix` was built after VS Code installed its copy (its folder
 *   in `~/.vscode/extensions/`), as `epic plugin install` decides
 */
function extensionRow(kit: string | undefined, home: string, list: () => string | undefined): LocalTool {
  const manifest = join(kit ?? "", dirname(VSIX), "package.json")
  const own = kit && existsSync(manifest) ? (JSON.parse(readFileSync(manifest, "utf8")) as Record<string, string>) : {}
  const id = `${own.publisher ?? "spell-app"}.${own.name ?? "spell-epic"}`.toLowerCase()
  const line = (list() ?? "").split(/\r?\n/).find((each) => each.trim().toLowerCase().startsWith(`${id}@`))
  const installed = line?.trim().split("@")[1]
  const unbuilt = kit && !existsSync(join(kit, VSIX))
  const copy = join(home, ".vscode", "extensions", `${id}-${installed}`)
  const rebuilt =
    !unbuilt &&
    installed === own.version &&
    existsSync(copy) &&
    statSync(join(kit!, VSIX)).mtimeMs > statSync(copy).mtimeMs
  const follows = !!kit && !!installed && !!own.version && !isOlder(installed, own.version) && !rebuilt
  return {
    tool: "VS Code's epic extension",
    runs: installed && `VS Code's, version ${installed}${own.version ? ` (your checkout's:  ${own.version})` : ""}`,
    follows,
    fix:
      !kit || follows || !own.version
        ? undefined
        : unbuilt
          ? `build it first:  cd ${join(kit, "epic")} && yarn vscode:package;  then run spell local on again`
          : "run spell local on again;  then reload VS Code's windows"
  }
}

/** The epic server's row, and one for each other server running another copy of Spell. */
function serverRows(servers: SpellServer[]): LocalTool[] {
  const where = (server: SpellServer) =>
    `${server.copy} (pid ${server.pid}${server.port ? `, port ${server.port}` : ""})`
  const hubs = servers.filter((server) => server.kind === "epic")
  const rows: LocalTool[] = [
    {
      tool: "the epic page server",
      runs: hubs.length ? hubs.map(where).join(", ") : undefined,
      follows: !!hubs.length && hubs.every((hub) => hub.isYours),
      fix: hubs.some((hub) => !hub.isYours)
        ? "type spell local on --stop to start it again from your checkout"
        : undefined
    }
  ]
  const others = servers.filter((server) => server.kind !== "epic" && !server.isYours)
  for (const server of others) {
    rows.push({
      tool: `a ${server.kind === "page" ? "page" : "vite"} server`,
      runs: where(server),
      follows: false,
      fix: "type spell local on --stop to stop it"
    })
  }
  return rows
}

/** `code --list-extensions --show-versions`;  `undefined` when VS Code's command isn't there.  NEVER throws. */
function listExtensions(): string | undefined {
  if (IN_TESTS) return undefined
  const ran = spawnSync("code", ["--list-extensions", "--show-versions"], { encoding: "utf8", timeout: 15_000 })
  return ran.status === 0 ? ran.stdout : undefined
}

/**
 * Under Vitest:  the machine's VS Code and processes are never asked, even by the real `spell` a test runs as a
 * program (`spell.test.ts`), so no output depends on the machine
 */
const IN_TESTS = !!process.env.VITEST

/** A link's target that's one of the epic plugin's skills, in any copy of it. */
const EPIC_SKILL = /\/(?:spell-)?epic\/skills\/[^/]+\/?$/

/** `path`'s real path;  as it is when it's gone. */
function realOrAsIs(path: string): string {
  return existsSync(path) ? realpathSync(path) : path
}

/** The first release whose bins read `.spell/kit.json5`. */
const FIRST_KIT_FILE_RELEASE = "0.8.13"

/** `localTools()`'s options:  tests pass their own. */
export type LocalToolsOptions = {
  /** default:  `process.env` (`PATH`, `CLAUDE_CONFIG_DIR`) */
  env?: NodeJS.ProcessEnv
  /** default:  `os.homedir()` */
  home?: string
  /** VS Code's extensions, as `code --list-extensions --show-versions` prints them;  default:  asks VS Code */
  extensions?: () => string | undefined
  /** Spell's servers running on this machine;  default:  asks the system (`spellServers()`) */
  servers?: SpellServer[]
}

/** One way Spell runs in a project. */
export type LocalTool = {
  /** what it is, in words:  `epic, typed in a terminal` */
  tool: string
  /** the folder it runs from, links followed;  `undefined` when it isn't there at all */
  runs: string | undefined
  /** whether it runs the checkout `spell local on` named */
  follows: boolean
  /** more about where it is:  a `PATH` link, and who put it there */
  note?: string
  /** what to do about it, in words, when there's something to do */
  fix?: string
}

/** The project's install of `spell`:  its folder, links followed, and version;  `undefined` when there's none. */
function installedSpell(project: string): { folder: string; version?: string } | undefined {
  const manifest = join(project, "node_modules", "spell", "package.json")
  if (!existsSync(manifest)) return undefined
  const { version } = JSON.parse(readFileSync(manifest, "utf8")) as { version?: string }
  return { folder: realpathSync(join(project, "node_modules", "spell")), version }
}

/**
 * Claude Code's `epic@spell` plugin, from its list of installed plugins:  the folder it runs from, links followed,
 * and its version;  `undefined` when it isn't installed.  NEVER throws.
 */
function claudePlugin(env: NodeJS.ProcessEnv, home: string): { folder: string; version?: string } | undefined {
  try {
    const claude = env.CLAUDE_CONFIG_DIR ?? join(home, ".claude")
    const list = JSON.parse(readFileSync(join(claude, "plugins", "installed_plugins.json"), "utf8")) as {
      plugins?: Record<string, { installPath?: string; version?: string }[]>
    }
    const entry = list.plugins?.[PLUGIN]?.[0]
    if (!entry?.installPath) return undefined
    const folder = existsSync(entry.installPath) ? realpathSync(entry.installPath) : entry.installPath
    return { folder, version: entry.version }
  } catch {
    return undefined
  }
}

/** The command that turns Claude Code's epic plugin back to the project's npm install. */
export const BACK_TO_NPM_PLUGIN = "yarn spell epic plugin install"

/**
 * Whether the plugin's `folder` is a checkout's, not a copy npm or Claude Code installed:  `epic plugin install`
 * from a checkout links Claude Code's cache to its `epic/`.
 */
function isCheckout(folder: string): boolean {
  return !/\/node_modules\/|\/\.claude\/plugins\/|\/_npx\//.test(folder)
}

/** The plugin's name in Claude Code. */
const PLUGIN = "epic@spell"

/** Whether `path`, links followed, is inside `folder`. */
function isInside(path: string, folder: string): boolean {
  try {
    const from = relative(realpathSync(folder), existsSync(path) ? realpathSync(path) : path)
    return !from.startsWith("..") && !from.startsWith("/")
  } catch {
    return false
  }
}
