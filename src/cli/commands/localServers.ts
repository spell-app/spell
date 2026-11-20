import { existsSync, readFileSync, realpathSync } from "node:fs"
import { join } from "node:path"

import { checkoutOf } from "spell/server/checkout"
import { kindOf, type ServerKind, type ServerProcess, serverProcesses } from "spell/server/page/prune"

/**
 * The servers of Spell's own running on this machine, and which copy of Spell each runs (epic `repo-split` T72):
 * for `spell local status`, which lists the ones NOT running your checkout, and `spell local on --stop`, which stops
 * them.
 * - Found the way `spell server prune` finds servers (`serverProcesses()`):  page servers, the epic server
 *   (`epic hub serve`), vite dev servers;  a vite server counts only when it runs from a Spell checkout
 *   (a project's own vite is its own business)
 * - Yours:  run from your checkout, or a worktree of it (the same main checkout, links followed)
 * - Not yours:  an older checkout somewhere else (a folder Spell moved out of), an npm install, a folder that's gone
 * - NEVER stops anything by itself:  `stopServers()` is only for a command the person typed
 */
export function spellServers(kit: string, processes: ServerProcess[] = serverProcesses()): SpellServer[] {
  const kitMain = mainOf(kit)
  const servers: SpellServer[] = []
  for (const process of processes) {
    const kind = kindOf(process.command)
    const copy = kind && copyOf(process.command, kind)
    if (!kind || !copy) continue
    if (kind === "vite" && existsSync(copy) && !isSpellCheckout(copy)) continue
    const isYours = !!kitMain && !copy.includes("/node_modules/") && mainOf(copy) === kitMain
    servers.push({ ...process, kind, copy, isYours })
  }
  return servers
}

/**
 * Stop `servers`, with `SIGTERM`;  the ones stopped.
 * - a server gone already (the vite server a page server started goes with it) counts as stopped
 * - SIDE EFFECT:  signals processes;  only for a command the person typed that says so (`spell local on --stop`)
 */
export function stopServers(
  servers: SpellServer[],
  kill: (pid: number, signal: NodeJS.Signals) => unknown = (pid, signal) => process.kill(pid, signal)
): SpellServer[] {
  const stopped: SpellServer[] = []
  for (const server of servers) {
    try {
      kill(server.pid, "SIGTERM")
      stopped.push(server)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") stopped.push(server)
    }
  }
  return stopped
}

/** A server of Spell's, and the copy of Spell it runs. */
export type SpellServer = ServerProcess & {
  kind: ServerKind
  /** the copy of Spell it runs from:  a checkout's root, or an install's `node_modules/spell` */
  copy: string
  /** whether that copy is your checkout, or a worktree of it */
  isYours: boolean
}

/** What a server's command names before the copy's own files, by kind. */
const COPY_OF: Record<ServerKind, RegExp> = {
  page: /(\/\S+?)\/(?:(?:packages\/)?server\/src|(?:src|dist)\/server)\/page\/cli\.[jt]s\s/,
  epic: /(\/\S+?)(?:\/dist)?\/epic\/(?:bin\/epic|(?:src\/)?cli\/epicMain\.[jt]s)\s|(\/\S+?\/spell-epic)\/bin\/epic\s/,
  vite: /(\/\S+?)\/node_modules\//
}

/** The copy of Spell `command` runs from;  `undefined` when it names none. */
function copyOf(command: string, kind: ServerKind): string | undefined {
  const match = COPY_OF[kind].exec(command)
  return match?.[1] ?? match?.[2]
}

/** The main checkout `folder` is in, its real path;  `undefined` outside git, or when it's gone. */
function mainOf(folder: string): string | undefined {
  try {
    const main = existsSync(folder) ? checkoutOf(folder)?.main : undefined
    return main && realpathSync(main)
  } catch {
    return undefined
  }
}

/** Whether `folder` is a checkout of Spell:  its `package.json` is named `spell`. */
function isSpellCheckout(folder: string): boolean {
  try {
    return (JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { name?: string }).name === "spell"
  } catch {
    return false
  }
}
