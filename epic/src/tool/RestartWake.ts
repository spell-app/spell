import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import JSON5 from "json5"

// By their files, with their `.ts`:  plain `node` loads this file (the `restarted` hook)
import { ClaudeHome } from "spell/epic/config/ClaudeHome.ts"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { EpicHome } from "spell/epic/config/EpicHome.ts"

/****************
 * ### `RestartWake`
 * Wakes an epic's session that VS Code started again (a restart, a window reload) when the restart cut off its
 * helper agents, so it resumes them by itself (epic `epic-engine` I310).
 * - Why:  after a restart, `mockup`'s session sat idle for an hour waiting on four agents that were gone, and only
 *   resumed them when Owen asked what it was doing;  epic-engine's did the same, several times.
 * - `lineFor(cwd)`:  the plugin's `SessionStart` hook (`hooks/restarted.mjs`, `asyncRewake`) asks it for the session
 *   starting in `cwd`;  a line wakes the session (the hook prints it to stderr and exits 2), none leaves it be
 * - CUT OFF:  an agent still on the epic's running list (`AgentList`, its `agents.json5`) that started before every
 *   live Claude Code session in the epic's worktree did (`ClaudeHome.liveSessions()`'s `startedAt`), this one included
 *   - a helper agent lives inside the session that started it, so one older than every session there has no session
 *     left to run in
 *   - an agent started by a session still running (another tab in the same window) is left alone
 *   - one listed more than `STALE_MS` (2 days) is a leftover nobody marked done:  left alone too
 * - ONCE per batch:  several tabs starting together share one announcement, `<epic home>/restarts/<epic>.json`
 *   (`{ names, at }`);  the same agents again within `ONCE_MS` wake nobody
 * - No agents cut off:  no line.  The inbox poller's own `SessionStart` hook starts listening by itself, so an idle
 *   session needs nothing.
 * - Its position:  node's own modules, `json5`, and the epic config and Claude's folder by their files, so plain
 *   `node` loads it.  NOT `AgentList`, which loads the kit's server barrel.
 * - NEVER throws:  a list that can't be read wakes nobody.
 ****************/
export class RestartWake {
  /** The announcements' folder:  `<epic home>/restarts`. */
  static get folder(): string {
    return EpicHome.subfolder("restarts")
  }

  /**
   * The line that wakes the session starting in `cwd`, for its epic's agents a restart cut off;  `undefined` for none.
   * - `sessions`:  the live sessions;  default Claude Code's registry (a test hands its own)
   * - SIDE EFFECT:  records the announcement, so the next tab starting there stays quiet
   */
  static lineFor(
    cwd: string,
    { now = Date.now(), sessions = ClaudeHome.liveSessions() }: RestartWakeProps = {}
  ): string | undefined {
    try {
      const config = EpicConfig.of(cwd)
      const epic = config.worktreeNameOf(cwd)
      if (!epic) return undefined
      const list = join(EpicConfig.contentOf(config.main), "epics", epic, "agents.json5")
      if (!existsSync(list)) return undefined
      const agents = JSON5.parse(readFileSync(list, "utf8")) as ListedAgent[]
      const oldestSession = Math.min(
        now,
        ...sessions.filter((session) => config.worktreeNameOf(session.cwd) === epic).map(startOf)
      )
      const cutOff = agents.filter((agent) => {
        const started = Date.parse(agent.started)
        return started < oldestSession && now - started <= STALE_MS
      })
      if (cutOff.length === 0) return undefined
      const names = cutOff.map((agent) => agent.name).sort()
      if (RestartWake.announced(epic, names, now)) return undefined
      RestartWake.announce(epic, names, now)
      return RestartWake.wording(epic, cutOff)
    } catch {
      return undefined
    }
  }

  /** The line for `cutOff`, epic `epic`'s agents a restart cut off:  each with its id and task, then what to do. */
  static wording(epic: string, cutOff: ListedAgent[]): string {
    const each = cutOff.map((agent) => `${agent.name} (${agent.taskId ?? "no id"}, "${agent.task}")`).join(", ")
    const count = cutOff.length === 1 ? "1 agent" : `${cutOff.length} agents`
    return (
      `📬 ${epic}:  the restart cut off ${count}:  ${each}.  ` +
      "Resume each now with SendMessage to its id:  its work and transcript are saved.  " +
      `One with no id:  start it again from its task.  Then start \`epic inbox wait ${epic}\` again, in the ` +
      'background.  (The epic skill, "After a restart".)'
    )
  }

  /** Whether `names` of epic `epic` were announced within `ONCE_MS` of `now`. */
  static announced(epic: string, names: string[], now = Date.now()): boolean {
    const file = RestartWake.fileOf(epic)
    if (!existsSync(file)) return false
    const last = JSON.parse(readFileSync(file, "utf8")) as { names?: string[]; at?: string }
    const age = now - Date.parse(last.at ?? "")
    return age >= 0 && age <= ONCE_MS && JSON.stringify(last.names) === JSON.stringify(names)
  }

  /** Record that `names` of epic `epic` were announced at `now`. */
  static announce(epic: string, names: string[], now = Date.now()): void {
    mkdirSync(RestartWake.folder, { recursive: true })
    writeFileSync(RestartWake.fileOf(epic), JSON.stringify({ names, at: new Date(now).toISOString() }))
  }

  /** Epic `epic`'s announcement file. */
  static fileOf(epic: string): string {
    return join(RestartWake.folder, `${epic}.json`)
  }
}

/** When a live session started, ms;  a record without `startedAt`:  now, so it never makes an agent look cut off. */
function startOf(session: { startedAt?: number }): number {
  return Number.isFinite(session.startedAt) ? session.startedAt! : Date.now()
}

/**
 * An agent listed longer than this is a leftover, never woken for:  2 days.
 * - drawable-thing's `plan-doc` agent sat on its list from 2026-10-12;  restarting a month-old task would be wrong
 */
const STALE_MS = 2 * 24 * 60 * 60_000

/** How long one batch's announcement keeps the next tab quiet:  10 minutes. */
const ONCE_MS = 10 * 60_000

/** `RestartWake.lineFor()`'s options. */
export type RestartWakeProps = {
  /** now, ms;  a test sets it */
  now?: number
  /** the live Claude Code sessions;  default `ClaudeHome.liveSessions()` */
  sessions?: { cwd?: string; startedAt?: number }[]
}

/** One agent on an epic's running list, as this reads it (`AgentList`'s `RunningAgent`). */
export type ListedAgent = {
  /** its full name, `epic-engine-aaa` */
  name: string
  /** what it does */
  task: string
  /** when it was added, ISO */
  started: string
  /** Claude Code's id for it:  what `SendMessage` resumes */
  taskId?: string
}
