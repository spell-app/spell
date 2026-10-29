import { existsSync } from "node:fs"

import { Processes } from "spell/server/Processes"

/**
 * `spell server prune`:  find the web servers left running by checkouts that are gone, and stop them.
 * - Why:  removing a worktree leaves its page server (and the editor's vite server, its child) running,
 *   and nothing else ever stops them:  their `.spell-server.json` went with the folder.
 * - So they're found by PROCESS, not by pid file:
 *   - `ps` lists the page servers (`.../src/server/page/cli.ts serve`, the kit's;  `.../server/src/...` before epic `repo-split` P14, `.../packages/server/...` before P9)
 *     and the vite dev servers (`.../node_modules/vite.../ dev`)
 *   - `Processes` gives each one's working folder, and the port it listens on (`lsof`, `/proc`, or PowerShell)
 * - A server is an orphan when its checkout AND its working folder are both gone:
 *   one whose checkout exists is NEVER stopped (`orphanServers()`).
 */

/** What runs a page server:  its entry point, run with `serve`;  the kit's `src/server/`, or its old `server/src/`. */
const PAGE_SERVER = /\/(?:(?:packages\/)?server\/src|src\/server)\/page\/cli\.ts\s+serve\b/

/** What runs a vite dev server, through Vite+ or vite itself. */
const VITE_SERVER =
  /(?:^|[\s/])node_modules\/(?:vite-plus\/bin\/vp|vite\/bin\/vite\.js|vite\/dist\/vite\/node\/cli\.js|\.bin\/vite|\.bin\/vp)\s+dev\b/

/** A web server, as `ps` and `lsof` show it. */
export type ServerProcess = {
  pid: number
  command: string
  /** its working folder;  missing when `lsof` couldn't say */
  cwd?: string
  /** the port it listens on;  missing when it listens on none (yet) */
  port?: number
}

/** The kinds of server `prune` looks for. */
export const SERVER_KINDS = ["page", "vite"] as const

/** One of `SERVER_KINDS`. */
export type ServerKind = (typeof SERVER_KINDS)[number]

/** A server whose checkout is gone. */
export type OrphanServer = ServerProcess & {
  kind: ServerKind
  /** the checkout it served, which no longer exists */
  checkout: string
}

/**
 * The servers among `processes` whose checkout is gone, page servers first.
 * - its checkout:  a page server's `--root`, else the folder holding `/packages/` or `/node_modules/`
 *   in its command, else its working folder
 * - an orphan:  neither its checkout nor its working folder `exists()`
 * - a process that's neither kind, or with no folder to judge by, is never an orphan
 * - Pure:  `exists` is the only look at the disk.
 */
export function orphanServers(processes: ServerProcess[], exists: (path: string) => boolean): OrphanServer[] {
  const orphans: OrphanServer[] = []
  for (const server of processes) {
    const kind = kindOf(server.command)
    if (!kind) continue
    const checkout = checkoutOf(server)
    if (!checkout || exists(checkout)) continue
    if (server.cwd && exists(server.cwd)) continue
    orphans.push({ ...server, kind, checkout })
  }
  return orphans.sort((a, b) => SERVER_KINDS.indexOf(a.kind) - SERVER_KINDS.indexOf(b.kind))
}

/** `command`'s kind of server, or `undefined` for anything else. */
function kindOf(command: string): ServerKind | undefined {
  if (PAGE_SERVER.test(command)) return "page"
  if (VITE_SERVER.test(command)) return "vite"
  return undefined
}

/** The checkout `process` serves, from its command line, else its working folder. */
function checkoutOf({ command, cwd }: ServerProcess): string | undefined {
  const root = /\s--root\s+(\S+)/.exec(command)?.[1]
  if (root) return root
  const script = /(\/\S+?)\/(?:packages|node_modules)\//.exec(command)?.[1]
  return script ?? cwd
}

/**
 * Every page server and vite dev server running on this machine, with its folder and port.
 * - SIDE EFFECT:  asks the system (`Processes`), on macOS, Linux and Windows
 * - NEVER throws:  a tool that's missing or fails gives what it could
 */
export function serverProcesses(): ServerProcess[] {
  const servers = [...Processes.table({ args: true })]
    // Windows writes its paths with `\`:  the patterns read `/`
    .map(([pid, { command }]) => ({ pid, command: command.replace(/\\/g, "/") }))
    .filter((it) => it.pid !== process.pid && kindOf(it.command))
  if (!servers.length) return []
  const pids = servers.map((it) => it.pid)
  const cwds = Processes.folderOf(pids)
  const ports = Processes.portsOf(pids)
  return servers.map((server) => {
    const cwd = cwds.get(server.pid)
    const port = ports.get(server.pid)
    return { ...server, ...(cwd && { cwd }), ...(port && { port }) }
  })
}

/**
 * Stop the servers whose checkout is gone (`orphanServers()`), with `SIGTERM`;  returns them.
 * - `dryRun`:  stop nothing, only say which
 * - a server already gone by the time it's signalled counts as stopped
 */
export function pruneServers({ dryRun = false } = {}): OrphanServer[] {
  const orphans = orphanServers(serverProcesses(), existsSync)
  if (dryRun) return orphans
  for (const orphan of orphans) {
    try {
      process.kill(orphan.pid, "SIGTERM")
    } catch (error) {
      // ESRCH:  it went with its parent page server, as the editor's vite does
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error
    }
  }
  return orphans
}

/**
 * `orphans` as lines for the terminal, grouped by checkout:  `would stop` with `dryRun`, else `stopped`.
 * - none:  one line saying so
 */
export function pruneReport(orphans: OrphanServer[], { dryRun = false } = {}): string {
  if (!orphans.length) return "no servers left by removed checkouts"
  const byCheckout = new Map<string, OrphanServer[]>()
  for (const orphan of orphans) byCheckout.set(orphan.checkout, [...(byCheckout.get(orphan.checkout) ?? []), orphan])
  const lines = [
    `${dryRun ? "would stop" : "stopped"} ${plural(orphans.length, "server")} of ${plural(byCheckout.size, "removed checkout")}:`
  ]
  for (const [checkout, servers] of byCheckout) {
    lines.push(`  ${checkout}`)
    for (const { kind, pid, port } of servers) lines.push(`    ${kind}  pid ${pid}${port ? `  port ${port}` : ""}`)
  }
  return lines.join("\n")
}

/** `count` and `noun`, plural unless it's 1:  `1 server`, `3 servers`. */
function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}
