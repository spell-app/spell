import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { basename, dirname, join } from "node:path"

import { ActiveTime } from "./ActiveTime"
import type { TimeSpan, WorkMeasure } from "./command.types"
import { Sessions } from "./Sessions"

/****************
 * ### `WorkTime`
 * How long Claude WORKED on a phase, or a background agent on its task, from Claude Code's transcripts
 * (epic `epic-engine` P41):  never the time waiting on Owen (`ActiveTime`'s rules).
 * - Where the transcripts are (Claude Code's folder, `projects/<slug>/`):
 *   - a session's:  `<session id>.jsonl`
 *   - the background agents it started:  `<session id>/subagents/agent-<id>.jsonl`, each with a
 *     `agent-<id>.meta.json` whose `description` starts with the agent's full name, as the session named it
 *     (`epic-engine-p40: build P40 Shared Page Patch`:  the root `CLAUDE.md`'s rule for delegated work)
 * - A PHASE's time (`ofPhase()`):
 *   - its own agents, when it had any:  every agent of the epic's sessions named for it (`<epic>-p40`, `-p40-docs`)
 *     or saying it in its description (`build P40 ...`), that ran while it was active;  each counted whole
 *   - else the epic's sessions' work while the phase was active (from its `active` to its `done`)
 *   - side by side, counted once:  wall clock, not added up
 * - An AGENT's time (`ofAgent()`):  its own transcript, whole.
 * - Its position:  below `Sessions`, which finds the sessions;  node's own modules otherwise.
 ****************/
export class WorkTime {
  /** the sessions, in Claude Code's folder:  STATIC for the object's life */
  readonly sessions: Sessions

  /** - `home`:  Claude Code's folder (default `Sessions.claudeHome()`) */
  constructor({ home }: { home?: string } = {}) {
    this.sessions = new Sessions({ home })
  }

  /**
   * How long phase `phase` (`P40`, `P11.1`) of epic `epic` took, while it was active (`window`).
   * - its own agents' time, else its sessions' time inside `window` (see the class)
   * - none found:  `{ minutes: 0 }`
   */
  ofPhase({ epic, phase, window }: { epic: string; phase: string; window: TimeSpan }): WorkMeasure {
    const sessions = this.sessionsOf(epic, window)
    const named = WorkTime.phasePattern(epic, phase)
    const agents = sessions.flatMap((session) =>
      this.agentsOf(session).filter((agent) => named.test(agent.description))
    )
    const agentSpans = agents.map((agent) => ({ agent, spans: ActiveTime.spans(readFileSync(agent.path, "utf8")) }))
    const ran = agentSpans.filter(({ spans }) => spans.some((span) => span.to >= window.from && span.from <= window.to))
    if (ran.length)
      return {
        minutes: ActiveTime.minutes(ran.flatMap(({ spans }) => spans)),
        agents: ran.map(({ agent }) => agent.name),
        sessions: []
      }
    const spans = sessions.flatMap((session) => ActiveTime.spans(readFileSync(session, "utf8"), window))
    return { minutes: ActiveTime.minutes(spans), agents: [], sessions: sessions.map((it) => basename(it, ".jsonl")) }
  }

  /**
   * How long agent `name` (its full name, `epic-engine-p41`) has worked:  its transcript, whole;
   * `undefined` when none is found.
   * - looked for among session `sessionId`'s agents (default:  this session's, `CLAUDE_CODE_SESSION_ID`),
   *   else among the sessions of epic `epic`
   * - the newest (last written), when one name was used twice
   */
  ofAgent(
    name: string,
    { sessionId = process.env.CLAUDE_CODE_SESSION_ID, epic }: AgentLookup = {}
  ): number | undefined {
    const first = sessionId ? this.sessions.transcriptOf(sessionId) : undefined
    const found =
      this.newestAgent(first ? [first] : [], name) ?? (epic ? this.newestAgent(this.sessionsOf(epic), name) : undefined)
    return found && ActiveTime.minutes(ActiveTime.spans(readFileSync(found.path, "utf8")))
  }

  /** The newest agent called `name` among the agents of session transcripts `sessions`;  `undefined` for none. */
  private newestAgent(sessions: string[], name: string): AgentTranscript | undefined {
    return sessions
      .flatMap((session) => this.agentsOf(session))
      .filter((agent) => agent.name === name)
      .sort((a, b) => statSync(a.path).mtimeMs - statSync(b.path).mtimeMs)
      .at(-1)
  }

  ////////////////
  // ## Finding the transcripts
  ////////////////

  /**
   * The transcripts of epic `epic`'s sessions (titled for it, or that worked in its worktree:  `Sessions.named()`),
   * those still working after `window` began.
   */
  private sessionsOf(epic: string, window?: TimeSpan): string[] {
    const since = window ? new Date(window.from).toISOString() : ""
    return this.sessions
      .named(epic)
      .filter((session) => session.last >= since)
      .map((session) => this.sessions.transcriptOf(session.id))
      .filter((path): path is string => !!path)
  }

  /** The background agents session transcript `session` started, oldest file name first. */
  private agentsOf(session: string): AgentTranscript[] {
    const folder = join(dirname(session), basename(session, ".jsonl"), "subagents")
    if (!existsSync(folder)) return []
    return readdirSync(folder)
      .filter((file) => file.endsWith(".meta.json"))
      .sort()
      .flatMap((file) => {
        const path = join(folder, file.replace(/\.meta\.json$/, ".jsonl"))
        const description = WorkTime.descriptionIn(join(folder, file))
        return existsSync(path) && description ? [{ path, description, name: WorkTime.agentName(description) }] : []
      })
  }

  ////////////////
  // ## Statics:  names
  ////////////////

  /** The agent's name in its `description` (`epic-engine-p40: build P40 ...` -> `epic-engine-p40`):  its first word. */
  static agentName(description: string): string {
    return description.split(/[:\s]/, 1)[0]!
  }

  /**
   * The descriptions of phase `phase`'s agents (`P40`):  named `<epic>-p40` (or `-p40-<x>`), or saying `P40`.
   * - static:  pure
   */
  static phasePattern(epic: string, phase: string): RegExp {
    const number = phase.replace(/^p/i, "").replace(/\./g, "\\.")
    const name = `${epic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-p${number}`
    return new RegExp(`^${name}(?![.\\d])|\\bP${number}(?![.\\d])`, "i")
  }

  /** The `description` in an agent's meta file;  `undefined` when it won't read. */
  private static descriptionIn(file: string): string | undefined {
    try {
      const meta = JSON.parse(readFileSync(file, "utf8")) as { description?: unknown }
      return typeof meta.description === "string" ? meta.description : undefined
    } catch {
      return undefined
    }
  }
}

/** Where `ofAgent()` looks. */
export type AgentLookup = {
  /** the session that started it */
  sessionId?: string
  /** else the epic whose sessions to look in */
  epic?: string
}

/** One background agent's transcript, and how its session named it. */
type AgentTranscript = {
  /** its `.jsonl` */
  path: string
  /** its meta file's `description` */
  description: string
  /** its full name, the description's first word */
  name: string
}
