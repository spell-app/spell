import { existsSync, readFileSync, realpathSync } from "node:fs"
import { homedir } from "node:os"
import { join, relative } from "node:path"

import { isOlder } from "spell/cli/kitCheckout"
import { PathLink } from "spell/cli/PathLink"

/**
 * Every way Spell runs in a project, and whether each one follows the checkout `spell local on` named
 * (epic `repo-split` T71):  what `spell local status` lists, so you can check it yourself.
 * - `spell` and `epic` typed in a terminal:  the links on your `PATH` (`PathLink`)
 * - `yarn spell` / `npx spell`:  the project's own install, which hands off to the checkout from 0.8.13
 * - Claude Code's `epic@spell` plugin:  its own copy, which `spell local` never switches;  `epic plugin install`
 *   does, and is printed as the fix
 * - the project's code that imports `spell/...`:  always the install in `node_modules`;  nothing can redirect it
 * - Reads Claude Code's list of plugins, never writes it;  names no big folder (`spell/cli` imports none).
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
        ? `to switch it, type epic plugin install --kit ${kit} here;  then /reload-plugins in Claude Code`
        : !kit && plugin && isCheckout(plugin.folder) && installed
          ? `to switch it back, type ${BACK_TO_NPM_PLUGIN} here;  then /reload-plugins in Claude Code`
          : undefined
  })

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

/** The first release whose bins read `.spell/kit.json5`. */
const FIRST_KIT_FILE_RELEASE = "0.8.13"

/** `localTools()`'s options:  tests pass their own. */
export type LocalToolsOptions = {
  /** default:  `process.env` (`PATH`, `CLAUDE_CONFIG_DIR`) */
  env?: NodeJS.ProcessEnv
  /** default:  `os.homedir()` */
  home?: string
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
