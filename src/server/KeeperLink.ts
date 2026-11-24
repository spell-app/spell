import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"

import { checkoutOf } from "./checkout.ts"
import { isProcessAlive } from "./Heartbeat.ts"
import { Processes } from "./Processes.ts"

/****************
 * ### `KeeperLink`
 * How any program on this machine asks the SERVER KEEPER to start, stop or restart a main checkout's servers
 * (epic `epic-engine` P82):  only the keeper does that, so no worktree's session restarts main's page server by itself.
 * - The keeper:  one program per machine that keeps every project's servers up (the epic hub's `ServerKeeper`).
 *   This side names none of it:  it reads the keeper's record, `~/.spell/server-keeper.json` (`SPELL_KEEPER_FILE`
 *   names another:  the tests'), `{ pid, base, token }`, mode 0600
 * - `ask()`:  POST `<base>/api/servers/<action>` with `{ checkout, server }`, the record's token;  `undefined` when no
 *   keeper runs, so the caller does it itself, as before
 * - Inside the keeper's own process, `ask()` answers `undefined` too:  the keeper does the work, never asks itself
 * - Who asks:  `PageServer.ensure()` / `stop()` / `restart()` for a MAIN checkout (`spell server start|stop`,
 *   `epic server`, the side bar's Restart Page Server, `epic merge`, `/airplane`)
 * - And the servers' own refusal (epic `epic-engine` P84):  `refusedStart()`, which main's page server and main's
 *   editor ask as they start, so an agent's command can't start them behind the keeper's back
 ****************/
export class KeeperLink {
  /** the keeper's record */
  readonly file: string

  /** - `file`:  default `SPELL_KEEPER_FILE`, else `~/.spell/server-keeper.json` */
  constructor(file = process.env[KEEPER_FILE_VARIABLE] ?? join(homedir(), ".spell", "server-keeper.json")) {
    this.file = resolve(file)
  }

  /** The record as written, whoever's it is;  none, or unreadable:  `undefined`. */
  read(): KeeperRecord | undefined {
    try {
      return JSON.parse(readFileSync(this.file, "utf8")) as KeeperRecord
    } catch {
      return undefined
    }
  }

  /** The running keeper's record;  none, its process gone, or this process's own:  `undefined`. */
  running(): KeeperRecord | undefined {
    const record = this.read()
    return record && record.pid !== process.pid && isProcessAlive(record.pid) ? record : undefined
  }

  /**
   * Ask the running keeper to `action` server `server` of `checkout`;  its answer, or `undefined` when no keeper runs.
   * - `wait`:  ms (default `ASK_WAIT_MS`:  a start may take two minutes)
   * - throws `Error` with the keeper's own words when it answers that it couldn't
   */
  async ask<T = KeeperAnswer>(
    action: KeeperAction,
    { checkout, server = "page server", wait = ASK_WAIT_MS }: { checkout: string; server?: string; wait?: number }
  ): Promise<T | undefined> {
    const keeper = this.running()
    if (!keeper) return undefined
    let response: Response
    try {
      response = await fetch(`${keeper.base}${KEEPER_API}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-server-token": keeper.token },
        body: JSON.stringify({ checkout: resolve(checkout), server }),
        signal: AbortSignal.timeout(wait)
      })
    } catch {
      // a keeper that doesn't answer is no keeper:  the caller does it itself
      return undefined
    }
    const body = (await response.json().catch(() => ({}))) as T & { error?: string }
    if (!response.ok) throw new Error(body.error ?? `the server keeper answered ${response.status}`)
    return body
  }

  /**
   * Why a server of checkout `checkout` mustn't start now, or `undefined` when it may (epic `epic-engine` P84).
   * - Refused only when ALL of these hold:
   *   - an AGENT runs it:  the mark Claude Code and Codex put on every command they run (`AGENT_MARKS`);
   *     the person's own terminal carries none, so they still start it by hand (Owen's pick, A)
   *   - the keeper didn't start it:  no `SPELL_KEEPER_START` in its environment (`KEEPER_START_VARIABLE`), and its
   *     parent isn't the keeper's process (a keeper on code from before P84 sets no mark)
   *   - `checkout` is a MAIN checkout, not a worktree:  a worktree's servers are its session's own
   *   - not a test run (`VITEST`, `CI`):  tests start page servers in scratch checkouts
   *   - and the agent's process is one of its PARENTS (`agentAbove()`):  a person's terminal can carry the agent's
   *     mark too, inherited (a VS Code window opened from a Claude Code session gives every terminal in it
   *     `CLAUDECODE=1`), and was refused as "Claude Code ran this";  the processes can't be listed:  the mark alone
   * - The mark is a mark, not a secret:  it stops an agent's mistake, not an agent set on getting round it.
   * - A person forces a start with `spell server local|start --force`, which sets the keeper's mark
   *   (`KEEPER_START_VARIABLE`);  an agent's `--force` in a main checkout is still refused by the command guard
   * - `env`, `ppid`:  default this process's;  `lineage`:  its parents, nearest first (default the process table's);
   *   the tests hand their own
   * - NEVER throws
   */
  refusedStart(
    server: string,
    checkout: string,
    {
      env = process.env,
      ppid = process.ppid,
      lineage
    }: { env?: Record<string, string | undefined>; ppid?: number; lineage?: Lineage } = {}
  ): string | undefined {
    if (env.VITEST || env.CI || env[KEEPER_START_VARIABLE]) return undefined
    const agent = KeeperLink.agentOf(env)
    if (!agent) return undefined
    const where = checkoutOf(checkout)
    if (!where || where.worktree !== undefined) return undefined
    if (this.read()?.pid === ppid) return undefined
    if (!KeeperLink.agentAbove(env, lineage ?? lineageOf(process.pid))) return undefined
    const name = server === "page server" ? "page-server" : server
    // the repo, as `epic repos add` names it unless told otherwise:  its main checkout's folder
    const repo = basename(where.main)
    return (
      `${server}:  not started.  Only the server keeper starts ${where.main}'s ${server}, and ${agent} ran this.\n` +
      `Ask the keeper instead:  epic servers start ${name} --repo ${repo}\n` +
      `(A worktree's own servers are yours to start.  A person starting it by hand:  add --force.)`
    )
  }

  /**
   * Whether an agent's process is among `lineage`, this process's parents:  `env`'s mark is then the agent's own,
   * not one a person's terminal inherited.
   * - an agent's own setting (`SPELL_EPIC_AGENT`):  always
   * - Claude Code's process, by the pid it hands its commands (`CLAUDE_PID`), else by its program's name (`claude`);
   *   Codex's by its program's name (`codex`)
   * - `lineage` empty (the process table can't be read):  `true`, the mark alone, as before
   */
  static agentAbove(env: Record<string, string | undefined>, lineage: Lineage): boolean {
    if (env.SPELL_EPIC_AGENT?.trim() || !lineage.length) return true
    const agentPid = Number(env.CLAUDE_PID) || undefined
    return lineage.some(
      ({ pid, command }) => pid === agentPid || AGENT_PROGRAMS.has(basename(command))
    )
  }

  /**
   * The agent whose mark is on `env`, by name (`Claude Code`, `Codex`), or `undefined` for none:  the person's own.
   * - `SPELL_EPIC_AGENT`, an agent's own setting, counts too
   * - the same marks as spell-epic's `EpicHome.agent()`:  a small copy here, as the server package imports no other
   */
  static agentOf(env: Record<string, string | undefined> = process.env): string | undefined {
    if (env.SPELL_EPIC_AGENT?.trim()) return env.SPELL_EPIC_AGENT.trim()
    return AGENT_MARKS.find(([variable]) => env[variable])?.[1]
  }

  /** SIDE EFFECT:  write this process's record, readable by this machine's person only (the keeper's start) */
  write(record: KeeperRecord): void {
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, `${JSON.stringify(record)}\n`, { mode: 0o600 })
    chmodSync(this.file, 0o600)
  }

  /** SIDE EFFECT:  remove the record when it's `pid`'s (default this process's):  the keeper's stop */
  removeIfOurs(pid = process.pid): void {
    try {
      if ((JSON.parse(readFileSync(this.file, "utf8")) as KeeperRecord).pid === pid) rmSync(this.file)
    } catch {
      // none, or unreadable:  nothing of ours
    }
  }
}

/** The keeper's record:  its process, its address, the token its writes need. */
export type KeeperRecord = { pid: number; base: string; token: string }

/**
 * What the keeper does to a server, when asked.
 * - `stop`:  stopped, and LEFT stopped until a `start` (`spell server stop` in a main checkout)
 * - `restart`:  on its code now;  a page server's editor kept up for the next one
 */
export type KeeperAction = "start" | "stop" | "restart"

/** The keeper's answer to `ask()`:  the server's address once started, and whether it started just now. */
export type KeeperAnswer = { base?: string; port?: number; pid?: number; launched?: boolean; state?: string }

/** The keeper's calls, on its own server. */
export const KEEPER_API = "/api/servers"

/** The variable naming another keeper record (the tests'). */
export const KEEPER_FILE_VARIABLE = "SPELL_KEEPER_FILE"

/**
 * The mark the server keeper puts in the environment of what it starts (epic `epic-engine` P84):  main's page server,
 * and through it main's editor, may then start though an agent's session started the hub (`refusedStart()`).
 */
export const KEEPER_START_VARIABLE = "SPELL_KEEPER_START"

/**
 * The mark each agent leaves on the commands it runs, and its name:  Claude Code's `CLAUDECODE=1`, Codex's
 * `CODEX_THREAD_ID`.  The twin of spell-epic's `AGENT_MARKS` (`EpicHome`), which keeps the reasons.
 */
const AGENT_MARKS: readonly (readonly [variable: string, agent: string])[] = [
  ["CLAUDECODE", "Claude Code"],
  ["CODEX_THREAD_ID", "Codex"]
]

/** A process's parents, nearest first:  each one's pid and program's path (`KeeperLink.agentAbove()`). */
export type Lineage = { pid: number; command: string }[]

/** The programs an agent runs as:  Claude Code's `claude`, Codex's `codex`. */
const AGENT_PROGRAMS = new Set(["claude", "codex"])

/** How far up `lineageOf()` looks. */
const LINEAGE_DEPTH = 12

/** `pid`'s parents, nearest first (`Processes.table()`);  none when the processes can't be listed.  NEVER throws. */
function lineageOf(pid: number): Lineage {
  try {
    const table = Processes.table()
    const lineage: Lineage = []
    for (let at = table.get(pid)?.ppid; at && at > 1 && lineage.length < LINEAGE_DEPTH; at = table.get(at)?.ppid)
      lineage.push({ pid: at, command: table.get(at)?.command ?? "" })
    return lineage
  } catch {
    return []
  }
}

/** How long `ask()` waits:  a server's start may take two minutes (`PidFile`'s `START_LIMIT_MS`). */
const ASK_WAIT_MS = 150_000
