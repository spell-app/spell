import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve, sep } from "node:path"

// By the server's package entry (its `exports`, epic `repo-split` P6):  the hooks load this file with plain `node`
// (types stripped), and find the server package in `node_modules` (spell-app's, linked in:  `portal:`), as
// `EpicConfig` does.  Its finder of the web
// servers on this machine, by process:  what `spell server prune` / `epic server prune` run.
import { orphanServers, serverProcesses } from "spell/server/page/prune"
import type { OrphanServer, ServerProcess } from "spell/server/page/prune"
import { RealPath } from "spell/server/RealPath"

import { HOME_ENV, HOME_FOLDER } from "spell/epic/server/server.types.ts"

/****************
 * ### `CheckoutServers`
 * The web servers a CHECKOUT runs (its page server, the editor's vite ...), stopped as the checkout goes
 * (epic `epic-engine` I53).
 * - Why:  removing a worktree left its servers running, and nothing ever stopped them:  on 2026-10-19,
 *   `spell server prune` found 128 of them, left by 44 removed checkouts.
 * - Found the way `epic server prune` finds them:  spell-app's `prune.ts` (`serverProcesses()`, `orphanServers()`),
 *   BY PROCESS (`ps`, `lsof`), never by pid file:  a checkout's `.spell-server.json` goes with its folder.
 *   - a server's checkout:  its `--root`, else the folder above its script's `packages/` or `node_modules/`
 *   - `prune.ts` must stay loadable by plain `node`:  the hooks' tests run it so
 * - Two ways in:
 *   - `stop()`:  a checkout ABOUT TO GO, its servers stopped first.  Every removal our tooling does:
 *     - the `WorktreeRemove` hook ([worktree.mjs](../../hooks/worktree.mjs)):  `ExitWorktree` remove, an agent's
 *       worktree as the agent finishes
 *     - `epic worktree remove`:  `/isolate done` (`/epic done`), `/worktrees`' clean-up (`Stock`)
 *     - `epic worktree move`:  the old folder goes too
 *   - `atSessionStart()`:  the safety net, the `SessionStart` hook ([server-prune.mjs](../../hooks/server-prune.mjs)):
 *     the servers whose checkout is ALREADY gone, as `epic server prune` stops them;  at most once an hour
 *     (`STAMP`, `INTERVAL_MS`)
 * - NEVER a live checkout's servers:  a server is stopped only when its checkout and its working folder are both
 *   gone, or both in the checkout being removed (`prune.ts`' rule, `orphanServers()`)
 * - `SIGTERM`, then up to `WAIT_MS` for them to exit, so the folder's removal doesn't race their last writes
 * - Its position:  node's own modules, `prune.ts` by the server package's entry (`spell/server/page/prune`)
 *   and the server's constants by path, so plain `node` loads it.
 *   NEVER an alias, an `enum` or a parameter property.
 * - All `static`:  the only state is the machine's processes and the stamp file.
 ****************/
export class CheckoutServers {
  /**
   * Stop the servers of checkout `checkout`, about to be removed;  returns those it stopped.
   * - its servers:  every page or vite server whose checkout AND working folder are in it (`of()`)
   * - `processes`:  default the machine's (`serverProcesses()`);  tests pass their own
   * - `waitMs`:  how long to wait for them to exit
   */
  static stop(
    checkout: string,
    { processes = serverProcesses(), waitMs = CheckoutServers.WAIT_MS }: StopOptions = {}
  ): OrphanServer[] {
    return CheckoutServers.kill(CheckoutServers.of(checkout, processes), waitMs)
  }

  /**
   * The servers among `processes` that serve checkout `checkout`:  `prune.ts`' orphans, with the checkout taken as
   * gone already.
   * - pure but for a look at the disk:  everything outside `checkout` is judged as it is
   * - only servers IN the checkout:  one elsewhere whose checkout is gone is the session-start prune's
   */
  static of(checkout: string, processes: ServerProcess[]): OrphanServer[] {
    const folders = CheckoutServers.forms(checkout)
    const inCheckout = (path?: string) => !!path && folders.some((folder) => inside(path, folder))
    return orphanServers(processes, (path) => !inCheckout(path) && existsSync(path)).filter(
      (server) => inCheckout(server.checkout) || inCheckout(server.cwd)
    )
  }

  /**
   * Stop the servers whose checkout is GONE, as `epic server prune` does;  returns those it stopped.
   * - `within`:  only those whose checkout was in that folder (tests:  their scratch folder, never the machine's)
   */
  static pruneGone({
    processes = serverProcesses(),
    waitMs = CheckoutServers.WAIT_MS,
    within
  }: PruneOptions = {}): OrphanServer[] {
    const orphans = orphanServers(processes, existsSync)
    const folders = within ? CheckoutServers.forms(within) : undefined
    return CheckoutServers.kill(
      folders ? orphans.filter((it) => folders.some((folder) => inside(it.checkout, folder))) : orphans,
      waitMs
    )
  }

  /**
   * The SESSION-START prune:  `pruneGone()`, unless it ran less than `INTERVAL_MS` ago.
   * - the stamp:  `STAMP` in the epic home (`~/.spell-epic`, `SPELL_EPIC_HOME`), the time it last ran;
   *   written BEFORE the prune, so a prune that fails still waits its hour
   * - `ran`:  whether it ran;  `stopped`:  what it stopped
   * - `home`, `now`:  tests'
   */
  static atSessionStart({
    home = CheckoutServers.homeFolder(),
    now = Date.now(),
    ...prune
  }: SessionStartOptions = {}): { ran: boolean; stopped: OrphanServer[] } {
    const stamp = join(home, CheckoutServers.STAMP)
    const last = Date.parse(readText(stamp).trim())
    if (now - last < CheckoutServers.INTERVAL_MS) return { ran: false, stopped: [] }
    mkdirSync(home, { recursive: true })
    writeFileSync(stamp, `${new Date(now).toISOString()}\n`)
    return { ran: true, stopped: CheckoutServers.pruneGone(prune) }
  }

  /**
   * One line for `servers` stopped:  `stopped 2 servers (page pid 123 port 4747, vite pid 124)`, or `""` for none.
   * - static:  pure
   */
  static said(servers: OrphanServer[]): string {
    if (!servers.length) return ""
    const each = servers.map(({ kind, pid, port }) => `${kind} pid ${pid}${port ? ` port ${port}` : ""}`)
    return `stopped ${servers.length} server${servers.length === 1 ? "" : "s"} (${each.join(", ")})`
  }

  /**
   * spell-epic's home folder:  `$SPELL_EPIC_HOME`, else `~/.spell-epic` (`RepoList.homeFolder()`'s rule).
   * - read on every call, for tests
   */
  static homeFolder(): string {
    return process.env[HOME_ENV] || join(homedir(), HOME_FOLDER)
  }

  /** The session-start prune's stamp, in the epic home:  when it last ran. */
  static readonly STAMP = "server-prune.stamp"

  /** The session-start prune runs at most once in this long:  an hour. */
  static readonly INTERVAL_MS = 60 * 60 * 1000

  /** How long `stop()` waits for the servers it signalled to exit. */
  static readonly WAIT_MS = 3000

  /**
   * `SIGTERM` each of `servers`, then wait up to `waitMs` for them to exit;  returns them.
   * - waits BLOCKING (`Atomics.wait()`):  every caller is a short command or a hook, and stays synchronous
   */
  private static kill(servers: OrphanServer[], waitMs: number): OrphanServer[] {
    for (const { pid } of servers) {
      try {
        process.kill(pid, "SIGTERM")
      } catch (error) {
        // ESRCH:  gone already, with its parent page server, as the editor's vite does
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error
      }
    }
    for (const end = Date.now() + waitMs; servers.some(({ pid }) => alive(pid)) && Date.now() < end;)
      Atomics.wait(PAUSE, 0, 0, 50)
    return servers
  }

  /** `path` as given, and its real path when that differs (`/tmp` -> `/private/tmp`):  `lsof` gives real ones. */
  private static forms(path: string): string[] {
    const given = resolve(path)
    const real = RealPath.of(given)
    return real === given ? [given] : [given, real]
  }
}

/** `CheckoutServers.stop()`'s options:  see there. */
export type StopOptions = { processes?: ServerProcess[]; waitMs?: number }

/** `CheckoutServers.pruneGone()`'s options:  see there. */
export type PruneOptions = StopOptions & { within?: string }

/** `CheckoutServers.atSessionStart()`'s options:  see there. */
export type SessionStartOptions = PruneOptions & { home?: string; now?: number }

/** What `kill()` waits on, 50ms at a time:  nothing ever wakes it. */
const PAUSE = new Int32Array(new SharedArrayBuffer(4))

/** Whether `path` is `folder` or inside it. */
function inside(path: string, folder: string): boolean {
  return path === folder || path.startsWith(folder.endsWith(sep) ? folder : `${folder}${sep}`)
}

/**
 * Whether process `pid` still runs.
 * - a copy of the kit's `SRV.isProcessAlive()`:  plain `node` loads this file, and can't load the kit's `PidFile`
 */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM:  it runs, as someone else
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
}

/** `file`'s text, or `""` when it can't be read. */
function readText(file: string): string {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return ""
  }
}
