import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"

import { isProcessAlive } from "./Heartbeat"

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

/** How long `ask()` waits:  a server's start may take two minutes (`PidFile`'s `START_LIMIT_MS`). */
const ASK_WAIT_MS = 150_000
